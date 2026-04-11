/**
 * core/editor.js
 * Syntax highlighting overlay, line gutter, font/wrap settings,
 * and textarea input/scroll event wiring for both panels.
 */

/* global Prism */
'use strict';

/* ── HTML encode ─────────────────────────────────────────────── */
function encHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── Highlight overlay ───────────────────────────────────────── */
function refreshHL(ta, hl, lang) {
  const prismLang = LANG_META[lang].prism;
  const grammar   = Prism.languages[prismLang] || Prism.languages.javascript;

  // For HTML (markup), ensure embedded JS/CSS inside <script>/<style> tags
  // is highlighted. Prism supports this natively when the markup grammar has
  // the 'script' and 'style' tokens with their inside grammars wired up.
  // Re-extend here in case the component loaded before JS/CSS were ready.
  if (prismLang === 'markup' && Prism.languages.javascript && Prism.languages.css) {
    if (!Prism.languages.markup.script?.inside?.rest?.javascript) {
      Prism.languages.markup.script = {
        pattern: /(<script[\s\S]*?>)[\s\S]*?(?=<\/script>)/i,
        lookbehind: true,
        greedy: true,
        inside: Prism.languages.javascript,
      };
      Prism.languages.markup.style = {
        pattern: /(<style[\s\S]*?>)[\s\S]*?(?=<\/style>)/i,
        lookbehind: true,
        greedy: true,
        inside: Prism.languages.css,
      };
    }
  }

  hl.querySelector('code').innerHTML = Prism.highlight(ta.value, grammar, prismLang);
  const code = hl.querySelector('code');
  code.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;

  // Post-processing: bracket pair colorization
  applyBracketColors(hl);
}

function refreshAllHL() {
  ['left', 'right'].forEach(side => {
    const tabs = tabsFor(side);
    Object.entries(tabs).forEach(([lang, t]) => {
      if (t.ta) refreshHL(t.ta, t.hl, lang);
    });
  });
}

/* ── Line gutter ─────────────────────────────────────────────── */
function updateGutter(ta, gutter) {
  if (!state.settings.lineNums) { gutter.style.display = 'none'; return; }
  gutter.style.display = '';
  const count = ta.value.split('\n').length;
  // Keep numbers in an inner span so we can translate inside the clipping gutter
  let inner = gutter.querySelector('.gutter-inner');
  if (!inner) {
    inner = document.createElement('span');
    inner.className = 'gutter-inner';
    inner.style.cssText = 'display:block;will-change:transform;';
    gutter.textContent = '';
    gutter.appendChild(inner);
  }
  inner.textContent = Array.from({ length: count }, (_, i) => i + 1).join('\n');
  inner.style.transform = `translateY(${-ta.scrollTop}px)`;
}

function updateAllGutters() {
  ['left', 'right'].forEach(side => {
    const tabs = tabsFor(side);
    Object.values(tabs).forEach(t => { if (t.ta) updateGutter(t.ta, t.gutter); });
  });
}

/* ── Font size ───────────────────────────────────────────────── */
function applyFontSize(px) {
  // Use exact pixel line-height so textarea and pre.hl-layer are always identical
  const lh = Math.round(px * 1.65) + 'px';
  document.documentElement.style.setProperty('--editor-font-size', px + 'px');
  document.documentElement.style.setProperty('--editor-line-height', lh);
}

/* ── Word wrap ───────────────────────────────────────────────── */
function applyWrap() {
  const w = state.settings.wordWrap;
  ['LtaHtml','LtaCss','LtaJs','RtaHtml','RtaCss','RtaJs'].forEach(id => {
    const el2 = document.getElementById(id);
    if (!el2) return;
    el2.style.whiteSpace = w ? 'pre-wrap' : 'pre';
    el2.style.overflowX  = w ? 'hidden'   : 'auto';
  });
  ['LhlHtml','LhlCss','LhlJs','RhlHtml','RhlCss','RhlJs'].forEach(id => {
    const el2 = document.getElementById(id);
    if (el2) el2.style.whiteSpace = w ? 'pre-wrap' : 'pre';
  });
}

/* ── Status bar cursor ───────────────────────────────────────── */
function updateStatus(ta) {
  const pos   = ta.selectionStart || 0;
  const lines = ta.value.substring(0, pos).split('\n');
  el.sbLn.textContent  = lines.length;
  el.sbCol.textContent = lines[lines.length - 1].length + 1;
}

/* ── Wire textarea events for one tab entry ──────────────────── */
function wireTextarea(side, lang, t) {
  t.ta.addEventListener('input', () => {
    refreshHL(t.ta, t.hl, lang);
    updateGutter(t.ta, t.gutter);
    updateStatus(t.ta);
    if (state.panelMode[side] === 'live') scheduleLivePreview(side);
    else if (state.panelMode[side] === 'edit') scheduleConsoleRun(side);
    if (state.settings.autosave) {
      scheduleContentSave(side, lang, t.ta.value);
    } else {
      // Mark tab dirty so user knows unsaved changes exist
      const fid = state.panelTabs[side].activeId;
      if (fid) markTabDirty(fid, true);
    }
    // Mark file dirty for disk-sync indicator
    if (typeof _fsMarkDirty === 'function') {
      const fid = state.panelTabs[side].activeId;
      if (fid) _fsMarkDirty(fid);
    }
  });
  t.ta.addEventListener('scroll', () => {
    const code = t.hl.querySelector('code');
    if (code) code.style.transform = `translate(${-t.ta.scrollLeft}px, ${-t.ta.scrollTop}px)`;
    const inner = t.gutter.querySelector('.gutter-inner');
    if (inner) inner.style.transform = `translateY(${-t.ta.scrollTop}px)`;
  });
  t.ta.addEventListener('click',  () => updateStatus(t.ta));
  t.ta.addEventListener('keyup',  () => updateStatus(t.ta));

  // Multi-cursor support (Alt+Click adds extra cursors)
  wireMultiCursor(t.ta, side, lang);
}

/* ── Wire all textareas (called from init after buildTabRefs) ── */
function wireAllTextareas() {
  ['left', 'right'].forEach(side => {
    Object.entries(tabsFor(side)).forEach(([lang, t]) => {
      wireTextarea(side, lang, t);
    });
  });
}

/* ── Debounced content save ──────────────────────────────────── */
const _saveDebounce = {};
function scheduleContentSave(side, lang, value) {
  const key = side + lang;
  clearTimeout(_saveDebounce[key]);
  _saveDebounce[key] = setTimeout(() => {
    // Write to active project file
    const fid = state.panelTabs[side].activeId;
    if (fid && state.project.files[fid]) {
      const fileLang = extToLang(state.project.files[fid].name);
      if (fileLang === lang) {
        state.project.files[fid].content = value;
        saveProject();
        // If a folder is open for editing, queue a disk write
        if (typeof _fsMarkDirty === 'function') _fsMarkDirty(fid);
      }
    }
  }, 600);
}
