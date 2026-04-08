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
  el.stgLines.checked           = state.settings.lineNums;
  el.stgFontSize.value          = state.settings.fontSize;
  el.stgFontSizeVal.textContent = state.settings.fontSize + 'px';
  el.stgWrap.checked            = state.settings.wordWrap;
  el.stgAutoPlay.checked        = state.settings.autoPlay;
  el.stgSemiPause.checked       = state.settings.semiPause;
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
  });

  el.stgSemiPause.addEventListener('change', () => {
    state.settings.semiPause = el.stgSemiPause.checked;
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

  document.addEventListener('fullscreenchange', () => {
    el.fsBtn.title = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen (F11)';
  });

  // Per-panel mode buttons
  el.modeBtnsL.forEach(b => b.addEventListener('click', () => setPanelMode('left',  b.dataset.mode)));
  el.modeBtnsR.forEach(b => b.addEventListener('click', () => setPanelMode('right', b.dataset.mode)));
}

/* ── Keyboard shortcuts ──────────────────────────────────────── */
function wireKeyboard() {
  document.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey;
    const inTA = document.activeElement?.classList.contains('code-ta');

    // Format active tab (Alt+Shift+F)
    if (e.altKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      const side = document.activeElement?.closest('#colRight') ? 'right' : 'left';
      formatActive(side);
      return;
    }

    // Toggle sidebar (Ctrl+B)
    if (ctrl && e.key === 'b') { e.preventDefault(); toggleSidebar(); return; }

    // Layout cycling
    if (ctrl && e.key === '\\') { e.preventDefault(); cycleLayout(); return; }

    // Settings / theme / fullscreen
    if (ctrl && e.key === ',')  { e.preventDefault(); openSettings();     return; }
    if (ctrl && e.shiftKey && e.key === 'T') { e.preventDefault(); toggleTheme(); return; }
    if (e.key === 'F11')    { e.preventDefault(); toggleFullscreen(); return; }

    // Ctrl+` — toggle active panel's console
    if (ctrl && e.key === '`') {
      e.preventDefault();
      const side = document.activeElement?.closest('#colLeft') ? 'left' : 'right';
      toggleConsole(side);
      return;
    }

    // Ctrl+F — Find, Ctrl+H — Replace
    if (ctrl && (e.key === 'f' || e.key === 'h')) {
      e.preventDefault();
      const side = document.activeElement?.closest('#colRight') ? 'right' : 'left';
      toggleFind(side, e.key === 'h' ? 'replace' : 'find');
      return;
    }

    // Escape — close find bar if open
    if (e.key === 'Escape') {
      closeSettings();
      ['left','right'].forEach(side => { if (FIND[side].open) closeFind(side); });
      return;
    }

    // Space / R — typewriter controls for both panels when not in a textarea
    if (!inTA) {
      if (e.key === ' ') {
        e.preventDefault();
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
    }

    // Tab → 2 spaces inside any code textarea
    if (e.key === 'Tab' && inTA) {
      e.preventDefault();
      const ta  = document.activeElement;
      const s   = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value  = ta.value.slice(0, s) + '  ' + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = s + 2;

      ['left', 'right'].forEach(side => {
        Object.entries(tabsFor(side)).forEach(([lang, t]) => {
          if (t.ta === ta) {
            refreshHL(t.ta, t.hl, lang);
            updateGutter(t.ta, t.gutter);
          }
        });
      });
    }
  });
}
