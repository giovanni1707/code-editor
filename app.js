/**
 * app.js — Entry point.
 * Loads after all core/*.js scripts. Calls init() to boot the editor.
 *
 * Load order in editor.html:
 *   core/state.js → core/dom.js → core/editor.js → core/typewriter.js
 *   → core/panels.js → core/live-preview.js → core/console.js → core/ui.js → app.js
 */

'use strict';

/* ── Starter content per tab ─────────────────────────────────── */
const STARTER = {
  left:  { html: '', css: '', js: '' },
  right: { html: '', css: '', js: '' },
}; 

/* ════════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════════ */
function init() {
  // 1. Build DOM ref maps
  buildTabRefs();

  // 2. Load persisted settings + session
  const isFirstVisit = !localStorage.getItem('ce:session');
  loadSettings();
  loadSession();

  // 3. Apply visual settings
  applyTheme();
  applyFontSize(state.settings.fontSize);
  applyWrap();

  // 4. Seed content — use saved content if available, else starter
  const sess = state.session;
  Object.entries(STARTER).forEach(([side, langs]) => {
    const tabs    = tabsFor(side);
    const saved   = sess.editorContent[side];
    Object.entries(langs).forEach(([lang, starterCode]) => {
      tabs[lang].ta.value = (saved[lang] !== null && saved[lang] !== undefined)
        ? saved[lang]
        : starterCode;
    });
  });

  // 5. Wire all events
  wireAllTextareas();
  wireAllAutoClose();
  wireTabButtons('left');
  wireTabButtons('right');
  wirePanelActions('left');
  wirePanelActions('right');
  wirePlayback('left');
  wirePlayback('right');
  wireLivePreview();
  wireConsole();
  wireFormatter();
  wireFind();
  wireExport();
  wireExportMenus();
  wireColorScheme();
  wireToolbar();
  wireSettings();
  wireKeyboard();
  wireAutoComplete();
  wireSquiggles();

  // 6. Initial UI state
  el.speedRange.value     = state.settings.speed;
  el.speedNum.textContent = state.settings.speed;
  el.lineNumBtnL.classList.toggle('active', state.settings.lineNums);
  el.lineNumBtnR.classList.toggle('active', state.settings.lineNums);
  setPlaybackVisible('left',  false);
  setPlaybackVisible('right', false);

  // 7. Restore tabs & modes from session
  switchTab('left',  sess.activeTab.left);
  switchTab('right', sess.activeTab.right);
  setPanelMode('left',  sess.panelMode.left);
  setPanelMode('right', sess.panelMode.right);

  // 8. Restore layout
  applyLayout(sess.layout);

  // 9. Resizer (must come before restoring split position)
  initResizer();

  // 10. Restore vertical split position
  if (sess.layout === 'split' && sess.splitPct !== 50) {
    const pct = sess.splitPct;
    el.colLeft.style.flex  = `0 0 ${pct}%`;
    el.colRight.style.flex = `0 0 ${100 - pct}%`;
  }

  // 11. Restore live h-resizer (preview pane widths)
  ['left', 'right'].forEach(side => {
    const w = sess.livePaneW[side];
    if (!w) return;
    const wrap = side === 'left' ? el.liveWrapL : el.liveWrapR;
    const editorPane = wrap.querySelector('.panel-editor-pane');
    const lp = side === 'left' ? el.livePreviewL : el.livePreviewR;
    const total = wrap.getBoundingClientRect().width;
    if (total > 0) {
      editorPane.style.flex = `0 0 ${w}px`;
      lp.style.flex         = `0 0 ${total - w}px`;
    }
  });

  // 12. Restore console state
  ['left', 'right'].forEach(side => {
    const refs = side === 'left' ? {
      drawer: el.consoleDrawerL, sidePane: el.cnSidePaneL,
      col: el.colLeft, splitBtn: el.consoleSplitBtnL,
      toggleBtn: el.consoleToggleBtnL,
    } : {
      drawer: el.consoleDrawerR, sidePane: el.cnSidePaneR,
      col: el.colRight, splitBtn: el.consoleSplitBtnR,
      toggleBtn: el.consoleToggleBtnR,
    };

    const h = sess.consoleHeight[side];
    if (h) refs.drawer.style.setProperty('--cn-h', h + 'px');

    const pw = sess.consolePaneW[side];
    if (pw) {
      (side === 'left' ? el.cnSidePaneL : el.cnSidePaneR).style.flex = `0 0 ${pw}px`;
    }

    if (sess.consoleSplit[side]) {
      // Restore split pane mode
      setConsoleSplit(side, true);
    } else if (sess.consoleOpen[side]) {
      refs.drawer.classList.add('open');
      refs.toggleBtn.classList.add('active');
      consoleState(side).open = true;
    }
  });

  // 13. Highlight & gutter all tabs
  refreshAllHL();
  updateAllGutters();

  // 14. Status bar
  const activeLSide = sess.activeTab.left;
  updateStatus(tabsFor('left')[activeLSide].ta);

  if (isFirstVisit) {
    toast('Ready — each panel has its own Edit / Raw / Live modes', 3000);
  } else {
    toast('Session restored', 2000);
  }
}

init();
