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
  hl.querySelector('code').innerHTML = Prism.highlight(ta.value, grammar, prismLang);
  hl.scrollTop  = ta.scrollTop;
  hl.scrollLeft = ta.scrollLeft;
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
  gutter.textContent = Array.from({ length: count }, (_, i) => i + 1).join('\n');
  gutter.scrollTop   = ta.scrollTop;
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
    scheduleContentSave(side, lang, t.ta.value);
  });
  t.ta.addEventListener('scroll', () => {
    t.hl.scrollTop    = t.ta.scrollTop;
    t.hl.scrollLeft   = t.ta.scrollLeft;
    t.gutter.scrollTop = t.ta.scrollTop;
  });
  t.ta.addEventListener('click',  () => updateStatus(t.ta));
  t.ta.addEventListener('keyup',  () => updateStatus(t.ta));
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
    state.session.editorContent[side][lang] = value;
    saveSession();
  }, 600);
}
