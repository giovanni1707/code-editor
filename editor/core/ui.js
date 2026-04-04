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
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveSettings();
  refreshAllHL();
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

  el.stgLines.addEventListener('change', () => {
    state.settings.lineNums = el.stgLines.checked;
    el.lineNumBtnL.classList.toggle('active', state.settings.lineNums);
    el.lineNumBtnR.classList.toggle('active', state.settings.lineNums);
    updateAllGutters();
    saveSettings();
  });

  el.stgFontSize.addEventListener('input', () => {
    const px = +el.stgFontSize.value;
    state.settings.fontSize = px;
    el.stgFontSizeVal.textContent = px + 'px';
    applyFontSize(px);
    updateAllGutters();
    refreshAllHL();
    saveSettings();
  });

  el.stgWrap.addEventListener('change', () => {
    state.settings.wordWrap = el.stgWrap.checked;
    applyWrap();
    saveSettings();
  });

  el.stgAutoPlay.addEventListener('change', () => {
    state.settings.autoPlay = el.stgAutoPlay.checked;
    saveSettings();
  });

  el.stgSemiPause.addEventListener('change', () => {
    state.settings.semiPause = el.stgSemiPause.checked;
    saveSettings();
  });
}

/* ── Toolbar buttons ─────────────────────────────────────────── */
function wireToolbar() {
  el.speedRange.addEventListener('input', () => {
    state.settings.speed = +el.speedRange.value;
    el.speedNum.textContent = state.settings.speed;
    saveSettings();
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

    // Layout cycling
    if (ctrl && e.key === '\\') { e.preventDefault(); cycleLayout(); return; }

    // Settings / theme / fullscreen
    if (ctrl && e.key === ',')  { e.preventDefault(); openSettings();     return; }
    if (ctrl && e.shiftKey && e.key === 'T') { e.preventDefault(); toggleTheme(); return; }
    if (e.key === 'F11')    { e.preventDefault(); toggleFullscreen(); return; }
    if (e.key === 'Escape') { closeSettings(); return; }

    // Ctrl+` — toggle active panel's console
    if (ctrl && e.key === '`') {
      e.preventDefault();
      // Toggle the console for the panel that contains the focused element
      const side = document.activeElement?.closest('#colLeft') ? 'left' : 'right';
      toggleConsole(side);
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
