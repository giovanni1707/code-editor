/**
 * app.js — Entry point.
 */

'use strict';

/* ════════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════════ */
function init() {
  // 1. Build DOM ref maps
  buildTabRefs();

  // 2. Load persisted data
  const isFirstVisit = !localStorage.getItem('ce:project');
  loadSettings();
  loadProject();
  loadPanelTabs();
  loadSession();

  // 3. Apply visual settings
  applyTheme();
  applyFontSize(state.settings.fontSize);
  applyWrap();

  // 4. If brand-new install (no project), create default starter files
  if (isFirstVisit || !Object.keys(state.project.files).length) {
    _seedDefaultProject();
  }

  // 5. Validate open file IDs (files may have been deleted)
  ['left', 'right'].forEach(side => {
    const pt = state.panelTabs[side];
    pt.openIds = pt.openIds.filter(id => state.project.files[id]);
    if (pt.activeId && !state.project.files[pt.activeId]) {
      pt.activeId = pt.openIds[pt.openIds.length - 1] || null;
    }
    // If nothing is open, open the first file
    if (!pt.activeId && Object.keys(state.project.files).length) {
      const first = getFilesSorted()[0];
      if (first) { pt.openIds = [first.id]; pt.activeId = first.id; }
    }
  });

  // 6. Load each panel's active file into its physical surface
  ['left', 'right'].forEach(side => {
    const pt = state.panelTabs[side];
    if (pt.activeId && state.project.files[pt.activeId]) {
      const file = state.project.files[pt.activeId];
      const lang = extToLang(file.name);
      tabsFor(side)[lang].ta.value = file.content || '';
    }
  });

  // 7. Wire all events
  wireAllTextareas();
  wireAllAutoClose();
  // wireAllColorPickers(); // color swatches disabled
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
  wireSaveProject();
  wireColorScheme();
  wireToolbar();
  wireSettings();
  wireKeyboard();
  wireAutoComplete();
  wireSquiggles();
  wireExplorer();
  wireCommandPalette();
  wireGlobalSearch();

  // 8. Initial UI state
  // (speedRange, speedNum, lineNumBtns are driven by reactive effects in setupReactivity)
  setPlaybackVisible('left',  false);
  setPlaybackVisible('right', false);

  // 9. Switch to the active file's lang tab per panel
  // (renderExplorer + renderTabBar called by reactive effects in setupReactivity)
  ['left', 'right'].forEach(side => {
    const pt = state.panelTabs[side];
    if (pt.activeId && state.project.files[pt.activeId]) {
      const lang = extToLang(state.project.files[pt.activeId].name);
      switchTab(side, lang);
    }
  });

  // 10. Restore panel modes from session
  const sess = state.session;
  setPanelMode('left',  sess.panelMode.left);
  setPanelMode('right', sess.panelMode.right);

  // 11. Restore layout
  applyLayout(sess.layout);

  // 12. Resizer
  initResizer();

  // 13. Restore vertical split position (also syncs _vPct used by initResizer)
  if (sess.layout === 'split' && sess.splitPct !== 50) {
    setSplitPct(sess.splitPct);
  }

  // 14. Restore live h-resizer (preview pane widths) — only in live mode
  ['left', 'right'].forEach(side => {
    if (sess.panelMode[side] !== 'live') return; // don't constrain editor pane in edit/raw mode
    const w = sess.livePaneW[side];
    if (!w) return;
    const wrap       = side === 'left' ? el.liveWrapL : el.liveWrapR;
    const editorPane = wrap.querySelector('.panel-editor-pane');
    const lp         = side === 'left' ? el.livePreviewL : el.livePreviewR;
    editorPane.style.flex = `0 0 ${w}%`;
    lp.style.flex         = `0 0 ${100 - w}%`;
  });

  // 15. Restore console state
  ['left', 'right'].forEach(side => {
    const refs = side === 'left' ? {
      drawer: el.consoleDrawerL, sidePane: el.cnSidePaneL,
      toggleBtn: el.consoleToggleBtnL,
    } : {
      drawer: el.consoleDrawerR, sidePane: el.cnSidePaneR,
      toggleBtn: el.consoleToggleBtnR,
    };

    const h = sess.consoleHeight[side];
    if (h) refs.drawer.style.setProperty('--cn-h', h + 'px');

    const pw = sess.consolePaneW[side];
    if (pw) {
      (side === 'left' ? el.cnSidePaneL : el.cnSidePaneR).style.flex = `0 0 ${pw}px`;
    }

    if (sess.consoleMuted[side]) {
      consoleState(side).muted = true;
      _updateMuteUI(side);
    }

    if (sess.consoleSplit[side]) {
      setConsoleSplit(side, true);
    } else if (sess.consoleOpen[side]) {
      refs.drawer.classList.add('open');
      refs.toggleBtn.classList.add('active');
      consoleState(side).open = true;
    }
  });

  // 16. Highlight & gutter all tabs — defer to after first paint so layout is complete
  requestAnimationFrame(() => {
    refreshAllHL();
    updateAllGutters();
  });

  // 17. Status bar
  // (sbFileName is driven by the reactive status-bar effect in setupReactivity)
  ['left', 'right'].forEach(side => {
    const lang = state.activeTab[side];
    updateStatus(tabsFor(side)[lang].ta);
  });

  // 18. Save panel tabs so open state is persisted
  savePanelTabs();

  if (isFirstVisit) {
    toast('Welcome! Create files with + in the explorer', 3500);
  } else {
    toast('Session restored', 2000);
  }
}

/* ── Seed default files for first-time users ─────────────────── */
function _seedDefaultProject() {
  const htmlId = uid();
  const cssId  = uid();
  const jsId   = uid();

  state.project.files[htmlId] = { id: htmlId, name: 'index.html', content: '' };
  state.project.files[cssId]  = { id: cssId,  name: 'style.css',  content: '' };
  state.project.files[jsId]   = { id: jsId,   name: 'main.js',    content: '' };

  // Left panel opens index.html by default
  state.panelTabs.left.openIds  = [htmlId];
  state.panelTabs.left.activeId = htmlId;

  // Right panel opens main.js by default
  state.panelTabs.right.openIds  = [jsId];
  state.panelTabs.right.activeId = jsId;

  saveProject();
  savePanelTabs();
}

init();

// Wire reactive effects after DOM refs and initial state are ready
setupReactivity();

// Apply minimap if it was previously enabled (effect fires immediately)
// applyMinimap is also called by the reactive minimap effect above.
