/**
 * core/ui.js
 * Toolbar wiring, settings modal, toast, keyboard shortcuts, fullscreen,
 * and theme toggle.
 */

'use strict';

/* ── Theme ───────────────────────────────────────────────────── */
function applyTheme() {
  const dark = state.settings.theme === 'dark';
  document.documentElement.classList.toggle('light', !dark);
  document.getElementById('prism-dark').disabled  = !dark;
  document.getElementById('prism-light').disabled =  dark;
}

function toggleTheme() {
  // Mutating state.settings.theme triggers the reactive theme effect (auto-saves + applies theme)
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  refreshAllHL();
  openColorSchemePicker();
}

/* ── Fullscreen ──────────────────────────────────────────────── */
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
}

/* ── Toast ───────────────────────────────────────────────────── */
let _toastTimer;
function toast(msg, ms = 2000) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
}

/* ── Settings modal ──────────────────────────────────────────── */
function openSettings() {
  // Input values are kept in sync by the reactive settings-modal effect in setupReactivity()
  el.settingsOverlay.classList.add('open');
  openColorSchemePicker();
}
function closeSettings() {
  el.settingsOverlay.classList.remove('open');
}

function wireSettings() {
  el.settingsBtn.addEventListener('click', openSettings);
  el.closeSettings.addEventListener('click', closeSettings);
  el.settingsOverlay.addEventListener('click', e => {
    if (e.target === el.settingsOverlay) closeSettings();
  });

  // Each mutation triggers the reactive settings persistence effect (no explicit saveSettings needed)
  el.stgLines.addEventListener('change', () => {
    state.settings.lineNums = el.stgLines.checked;
    // lineNumBtnL/R classes updated by reactive effect
    updateAllGutters();
  });

  el.stgFontSize.addEventListener('input', () => {
    const px = +el.stgFontSize.value;
    state.settings.fontSize = px;
    el.stgFontSizeVal.textContent = px + 'px';
    applyFontSize(px);
    updateAllGutters();
    refreshAllHL();
  });

  el.stgWrap.addEventListener('change', () => {
    state.settings.wordWrap = el.stgWrap.checked;
    applyWrap();
  });

  el.stgAutoPlay.addEventListener('change', () => {
    state.settings.autoPlay = el.stgAutoPlay.checked;
    const apd = document.getElementById('stgAutoPlayDelay');
    if (apd) apd.disabled = !el.stgAutoPlay.checked;
  });

  document.getElementById('stgAutoPlayDelay')?.addEventListener('input', e => {
    const v = +e.target.value;
    state.settings.autoPlayDelay = v;
    const lbl = document.getElementById('stgAutoPlayDelayVal');
    if (lbl) lbl.textContent = v === 0 ? 'Off' : v + 's';
  });

  el.stgSemiPause.addEventListener('change', () => {
    state.settings.semiPause = el.stgSemiPause.checked;
  });

  el.stgTabSize.addEventListener('change', () => {
    state.settings.tabSize = +el.stgTabSize.value;
  });

  // Minimap removed from UI — no listener needed

  document.getElementById('stgAutosave')?.addEventListener('change', e => {
    state.settings.autosave = e.target.checked;
  });

  document.getElementById('stgAutocomplete')?.addEventListener('change', e => {
    state.settings.autocomplete = e.target.checked;
    if (!e.target.checked) {
      // Clear any active ghost text across all textareas
      document.querySelectorAll('.ghost-layer').forEach(l => { l.style.display = 'none'; });
    }
  });

  document.getElementById('stgSquiggles')?.addEventListener('change', e => {
    state.settings.squiggles = e.target.checked;
    if (!e.target.checked) clearAllSquiggles();
  });

  document.getElementById('stgDhDocs')?.addEventListener('change', e => {
    state.settings.dhDocs = e.target.checked;
  });

  document.getElementById('stgHumanTyping')?.addEventListener('change', e => {
    state.settings.humanTyping = e.target.checked;
  });

  document.getElementById('clearCacheBtn').addEventListener('click', () => {
    if (!confirm('Clear all saved data and reload?')) return;
    localStorage.clear();
    location.reload();
  });
}

/* ── Brightness control ──────────────────────────────────────── */
function applyBrightness(val) {
  document.getElementById('main').style.filter =
    val === 100 ? '' : `brightness(${val}%)`;
}

/* ── Zen mode (hide toolbar) ─────────────────────────────────── */
function toggleZen() {
  document.body.classList.toggle('zen');
}

/* ── Toolbar buttons ─────────────────────────────────────────── */
function wireToolbar() {
  el.speedRange.addEventListener('input', () => {
    // Mutating speed triggers the reactive speed-display + persistence effects
    state.settings.speed = +el.speedRange.value;
  });

  const brightnessRange = document.getElementById('brightnessRange');
  const brightnessNum   = document.getElementById('brightnessNum');
  // Restore saved brightness
  const savedBrightness = +(localStorage.getItem('ce:brightness') || 100);
  brightnessRange.value    = savedBrightness;
  brightnessNum.textContent = savedBrightness;
  applyBrightness(savedBrightness);

  brightnessRange.addEventListener('input', () => {
    const val = +brightnessRange.value;
    brightnessNum.textContent = val;
    applyBrightness(val);
    localStorage.setItem('ce:brightness', val);
  });

  el.layoutBtn.addEventListener('click', cycleLayout);
  el.themeBtn.addEventListener('click', toggleTheme);
  el.fsBtn.addEventListener('click', toggleFullscreen);
  document.getElementById('zenBtn')?.addEventListener('click', toggleZen);
  document.getElementById('zenShowBtn')?.addEventListener('click', toggleZen);

  // Track last focused panel via mousedown (not focusin, which fires on programmatic .focus() during init)
  document.getElementById('colLeft')?.addEventListener('mousedown',  () => { _lastFocusedSide = 'left';  });
  document.getElementById('colRight')?.addEventListener('mousedown', () => { _lastFocusedSide = 'right'; });

  // Per-panel find buttons
  ['left', 'right'].forEach(side => {
    const sfx = side === 'left' ? 'L' : 'R';
    document.getElementById('findBtn' + sfx)?.addEventListener('click', () => {
      toggleFind(side, 'find');
    });
  });

  document.addEventListener('fullscreenchange', () => {
    el.fsBtn.title = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen (F11)';
  });

  // Per-panel mode buttons
  el.modeBtnsL.forEach(b => b.addEventListener('click', () => setPanelMode('left',  b.dataset.mode)));
  el.modeBtnsR.forEach(b => b.addEventListener('click', () => setPanelMode('right', b.dataset.mode)));
}

/* ── Track last-focused panel side ──────────────────────────── */
let _lastFocusedSide = 'left';

function _activeSide() {
  // Prefer the element currently under focus; fall back to the last tracked side
  const el = document.activeElement;
  if (el?.closest('#colRight')) return 'right';
  if (el?.closest('#colLeft'))  return 'left';
  return _lastFocusedSide;
}

/* ── Keyboard shortcuts ──────────────────────────────────────── */
function wireKeyboard() {
  document.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey;
    const inTA = document.activeElement?.classList.contains('code-ta');
    // True when focus is in ANY text input (find bar, replace, settings inputs, etc.)
    const inAnyInput = !inTA && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

    // Format active tab (Alt+Shift+F)
    if (e.altKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      const side = document.activeElement?.closest('#colRight') ? 'right' : 'left';
      formatActive(side);
      return;
    }

    // Ctrl+Alt+D — select next occurrence
    if (ctrl && e.altKey && e.key === 'd' && inTA) {
      e.preventDefault();
      _selectNextMatch(document.activeElement);
      return;
    }

    // Ctrl+Alt+K — select all occurrences at once
    if (ctrl && e.altKey && e.key === 'k' && inTA) {
      e.preventDefault();
      _selectAllMatches(document.activeElement);
      return;
    }

    // Toggle sidebar (Ctrl+B)
    if (ctrl && e.key === 'b') { e.preventDefault(); toggleSidebar(); return; }

    // Layout cycling
    if (ctrl && e.key === '\\') { e.preventDefault(); cycleLayout(); return; }

    // Settings / theme / fullscreen
    if (ctrl && e.key === ',')  { e.preventDefault(); openSettings();     return; }
    if (ctrl && e.shiftKey && e.key === 'H') { e.preventDefault(); toggleZen();   return; }
    if (ctrl && e.shiftKey && e.key === 'T') { e.preventDefault(); toggleTheme(); return; }
    if (e.key === 'F11')    { e.preventDefault(); toggleFullscreen(); return; }

    // Ctrl+S — manual save
    if (ctrl && e.key === 's') {
      e.preventDefault();
      if (typeof fsSaveAll === 'function' && typeof _fsDirHandle !== 'undefined' && _fsDirHandle) {
        fsSaveAll();
      } else {
        // Flush all panel textareas to localStorage immediately
        if (typeof flushAllPanels === 'function') flushAllPanels();
        saveProject();
        if (typeof clearAllDirty === 'function') clearAllDirty();
        toast('Saved', 1200);
      }
      return;
    }

    // Ctrl+` — toggle active panel's console
    if (ctrl && e.key === '`') {
      e.preventDefault();
      const side = document.activeElement?.closest('#colLeft') ? 'left' : 'right';
      toggleConsole(side);
      return;
    }

    // Ctrl+P — Command palette (quick open file)
    if (ctrl && !e.shiftKey && e.key === 'p') {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    // Ctrl+Shift+F — Global search across all files
    if (ctrl && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      openGlobalSearch();
      return;
    }

    // Ctrl+F — Find, Ctrl+H — Replace
    if (ctrl && (e.key === 'f' || e.key === 'h')) {
      e.preventDefault();
      const side = document.activeElement?.closest('#colRight') ? 'right' : 'left';
      toggleFind(side, e.key === 'h' ? 'replace' : 'find');
      return;
    }

    // Escape — exit zen mode first; otherwise close overlays
    if (e.key === 'Escape') {
      if (document.body.classList.contains('zen')) {
        document.body.classList.remove('zen');
        return;
      }
      closeSettings();
      closeCommandPalette();
      closeGlobalSearch();
      ['left','right'].forEach(side => { if (FIND[side].open) closeFind(side); });
      clearAllExtraCursors();
      return;
    }

    // Ctrl/Cmd + Space — toggle manual step mode on the active raw panel
    if (ctrl && e.key === ' ' && !inTA && !inAnyInput) {
      e.preventDefault();
      const side = _activeSide();
      if (state.panelMode[side] === 'raw') toggleStepMode(side);
      return;
    }

    // Space / R / Enter — typewriter controls only when no input field has focus
    if (!inTA && !inAnyInput) {
      if (e.key === ' ') {
        e.preventDefault();
        // If either panel is in step mode, advance its next character
        let stepped = false;
        if (state.tw.left.stepMode)  { stepChar('left');  stepped = true; }
        if (state.tw.right.stepMode) { stepChar('right'); stepped = true; }
        if (stepped) return;
        // Otherwise normal pause/resume
        if (state.panelMode.left  === 'raw') togglePause('left');
        if (state.panelMode.right === 'raw') togglePause('right');
        return;
      }
      if (e.key === 'r') {
        e.preventDefault();
        if (state.panelMode.left  === 'raw') restartTw('left');
        if (state.panelMode.right === 'raw') restartTw('right');
        return;
      }
      // Enter — start playback when in Raw mode and typewriter hasn't started yet
      if (e.key === 'Enter') {
        let acted = false;
        ['left', 'right'].forEach(side => {
          const tw = state.tw[side];
          if (state.panelMode[side] === 'raw' && !tw.interval && !tw.isDone) {
            e.preventDefault();
            startTw(side);
            acted = true;
          }
        });
        if (acted) return;
      }
    }
    // Note: Tab key in textareas is handled entirely by wireAutoClose (autoclose.js)
    // which supports Emmet, CSS shortcuts, block indent/dedent, and tab-size setting.
  });

  // Alt+] / Alt+[ — cycle sidebar files. Registered in capture phase so it fires
  // before textarea keydown handlers (which would otherwise insert [ or ] characters).
  document.addEventListener('keydown', e => {
    if (!e.altKey || (e.key !== ']' && e.key !== '[')) return;
    e.preventDefault();
    e.stopPropagation();
    const side  = _activeSide();
    const files = getTreeFlat().filter(n => n.type === 'file').map(n => n.item);
    if (files.length < 2) return;
    const cur = state.panelTabs[side].activeId;
    const idx = files.findIndex(f => f.id === cur);
    const next = e.key === ']'
      ? files[(idx + 1) % files.length]
      : files[(idx - 1 + files.length) % files.length];
    openFileInPanel(side, next.id);
  }, { capture: true });

  // Ctrl+C / Ctrl+V — copy/paste sidebar item when focus is on the sidebar
  document.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl || (e.key !== 'c' && e.key !== 'v')) return;
    // Only intercept when focus is inside the sidebar (not in a text editor)
    const inSidebar = document.activeElement?.closest('#sidebar');
    if (!inSidebar) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'c') {
      // Find which row is focused/hovered — use dataset.id on the closest explorer-item
      const row = document.activeElement?.closest('.explorer-item') ||
                  document.querySelector('.explorer-item:hover');
      if (!row) return;
      const id   = row.dataset.id;
      const type = row.classList.contains('explorer-folder') ? 'folder' : 'file';
      _copyItem(id, type);
    } else {
      // Paste into folder under focus, or root
      const row = document.activeElement?.closest('.explorer-item') ||
                  document.querySelector('.explorer-item:hover');
      let destParentId = null;
      if (row) {
        const id = row.dataset.id;
        if (row.classList.contains('explorer-folder')) {
          destParentId = id; // paste inside hovered folder
        } else {
          // paste alongside the file (same parent)
          const file = state.project.files[id];
          destParentId = file?.parentId ?? null;
        }
      }
      _pasteItem(destParentId);
    }
  }, { capture: true });
}
