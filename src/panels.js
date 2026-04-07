/**
 * core/panels.js
 * Tab switching, per-panel mode switching, layout (split/full), and resizer.
 * Both panels are fully symmetric and fully independent.
 */

'use strict';

/* ════════════════════════════════════════════════════════════════
   TAB SWITCHING
════════════════════════════════════════════════════════════════ */
function switchTab(side, lang) {
  state.activeTab[side] = lang;
  state.session.activeTab[side] = lang;
  saveSession();
  const tabs = tabsFor(side);

  Object.entries(tabs).forEach(([l, t]) => {
    t.btn.classList.toggle('active', l === lang);
  });

  const mode = state.panelMode[side];
  if (mode === 'edit' || mode === 'live') {
    showEditorSurfaces(side, lang);
  }

  if (side === 'left') {
    el.sbFileName.textContent = `index.${LANG_META[lang].ext}`;
  }

  const t = tabs[lang];
  refreshHL(t.ta, t.hl, lang);
  updateGutter(t.ta, t.gutter);
  t.ta.focus();

  if (mode === 'live') scheduleLivePreview(side);
}

function showEditorSurfaces(side, lang) {
  Object.entries(tabsFor(side)).forEach(([l, t]) => {
    t.surface.style.display = l === lang ? '' : 'none';
  });
}

function hideEditorSurfaces(side) {
  Object.values(tabsFor(side)).forEach(t => t.surface.style.display = 'none');
}

function wireTabButtons(side) {
  Object.entries(tabsFor(side)).forEach(([lang, t]) => {
    t.btn.addEventListener('click', () => switchTab(side, lang));
  });
}

/* ════════════════════════════════════════════════════════════════
   PER-PANEL MODE SWITCHING
════════════════════════════════════════════════════════════════ */
function setPanelMode(side, mode) {
  stopTw(side);
  removeDynStyles(side);
  state.panelMode[side] = mode;
  state.session.panelMode[side] = mode;
  saveSession();

  const btns = modeBtns(side);
  btns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

  const isTw   = mode === 'raw';
  const isLive = mode === 'live';
  const out    = outEl(side);
  const lp     = side === 'left' ? el.livePreviewL : el.livePreviewR;

  const prog = progressEl(side);
  prog.style.width   = '0%';
  prog.style.display = isTw ? 'none' : '';

  const col = side === 'left' ? el.colLeft : el.colRight;

  if (isTw) {
    col.classList.remove('live-split');
    col.classList.remove('mode-edit');
    hideEditorSurfaces(side);
    out.classList.add('visible');
    out.innerHTML = '';
    lp.classList.remove('visible');
  } else if (isLive) {
    col.classList.add('live-split');
    col.classList.remove('mode-edit');
    showEditorSurfaces(side, state.activeTab[side]);
    out.classList.remove('visible');
    lp.classList.add('visible');
    renderLivePreview(side);
  } else {
    // edit
    col.classList.remove('live-split');
    col.classList.add('mode-edit');
    showEditorSurfaces(side, state.activeTab[side]);
    out.classList.remove('visible');
    lp.classList.remove('visible');
    scheduleConsoleRun(side);
  }

  // Playback controls
  const playWrap = side === 'left' ? el.playWrapL : el.playWrapR;
  playWrap.style.display = isTw ? 'flex' : 'none';

  // Reset pause button
  const pauseBtn = side === 'left' ? el.pauseBtnL : el.pauseBtnR;
  pauseBtn.textContent = '⏸ Pause';
  pauseBtn.classList.remove('paused');

  // Auto-play
  if (isTw && state.settings.autoPlay) startTw(side);
}

/* ════════════════════════════════════════════════════════════════
   PLAYBACK WIRING  (per side)
════════════════════════════════════════════════════════════════ */
function wirePlayback(side) {
  const runBtn   = side === 'left' ? el.runBtnL   : el.runBtnR;
  const pauseBtn = side === 'left' ? el.pauseBtnL : el.pauseBtnR;
  const resetBtn = side === 'left' ? el.resetBtnL : el.resetBtnR;

  runBtn.addEventListener('click', () => {
    const m = state.panelMode[side];
    if (m === 'raw') restartTw(side);
    else setPanelMode(side, 'raw');
  });
  pauseBtn.addEventListener('click', () => togglePause(side));
  resetBtn.addEventListener('click', () => restartTw(side));
}


function setPlaybackVisible(side, visible) {
  const wrap = side === 'left' ? el.playWrapL : el.playWrapR;
  wrap.style.display = visible ? 'flex' : 'none';
}

/* ════════════════════════════════════════════════════════════════
   COPY & CLEAR  (per side)
════════════════════════════════════════════════════════════════ */
function copyActive(side) {
  navigator.clipboard.writeText(activeTab(side).ta.value).then(() => toast('Copied!'));
}

function clearActive(side) {
  const lang = state.activeTab[side];
  const t = activeTab(side);
  t.ta.value = '';
  refreshHL(t.ta, t.hl, lang);
  updateGutter(t.ta, t.gutter);
  if (state.panelMode[side] === 'live') scheduleLivePreview(side);
  // Persist clear to project file
  const fid = state.panelTabs[side].activeId;
  if (fid && state.project.files[fid]) {
    state.project.files[fid].content = '';
    saveProject();
  }
}

function wirePanelActions(side) {
  const lineBtn  = side === 'left' ? el.lineNumBtnL : el.lineNumBtnR;
  const copyBtn  = side === 'left' ? el.copyBtnL    : el.copyBtnR;
  const clearBtn = side === 'left' ? el.clearBtnL   : el.clearBtnR;

  lineBtn.addEventListener('click', () => {
    state.settings.lineNums = !state.settings.lineNums;
    el.lineNumBtnL.classList.toggle('active', state.settings.lineNums);
    el.lineNumBtnR.classList.toggle('active', state.settings.lineNums);
    updateAllGutters();
    saveSettings();
  });

  copyBtn.addEventListener('click',  () => copyActive(side));
  clearBtn.addEventListener('click', () => clearActive(side));
}

/* ════════════════════════════════════════════════════════════════
   LAYOUT  (split / left-full / right-full)
════════════════════════════════════════════════════════════════ */
const LAYOUTS = ['split', 'right-full', 'left-full'];

function applyLayout(layout) {
  state.layout = layout;

  const isSplit = layout === 'split';
  const isRF    = layout === 'right-full';
  const isLF    = layout === 'left-full';

  el.colLeft.style.display   = isRF  ? 'none' : '';
  el.colRight.style.display  = isLF  ? 'none' : '';
  el.vResizer.style.display  = isSplit ? '' : 'none';

  // Reset flex widths when returning to split
  if (isSplit) {
    el.colLeft.style.flex  = '';
    el.colRight.style.flex = '';
  } else if (isRF) {
    el.colRight.style.flex = '1';
  } else {
    el.colLeft.style.flex = '1';
  }

  // Update button icon
  el.layoutBtn.textContent = layout === 'split'       ? '⊟'
                           : layout === 'right-full'  ? '▷'
                           :                            '◁';
  el.layoutBtn.title = layout === 'split'      ? 'Right panel full (Ctrl+\\)'
                     : layout === 'right-full' ? 'Left panel full (Ctrl+\\)'
                     :                           'Split view (Ctrl+\\)';

  el.sbLayout.textContent = layout === 'split' ? 'SPLIT'
                          : layout === 'right-full' ? 'RIGHT'
                          : 'LEFT';
  state.session.layout = layout;
  saveSettings();
  saveSession();
}

function cycleLayout() {
  const idx = LAYOUTS.indexOf(state.layout);
  applyLayout(LAYOUTS[(idx + 1) % LAYOUTS.length]);
}

/* ════════════════════════════════════════════════════════════════
   DRAG RESIZERS
════════════════════════════════════════════════════════════════ */
/* ── Drag shield — blocks iframes from stealing mouse events ── */
let _shield = null;
function _shieldOn(cursor) {
  if (!_shield) {
    _shield = document.createElement('div');
    _shield.style.cssText =
      'position:fixed;inset:0;z-index:9999;cursor:' + cursor;
    document.body.appendChild(_shield);
  } else {
    _shield.style.cursor = cursor;
  }
}
function _shieldOff() {
  if (_shield) { _shield.remove(); _shield = null; }
}

function initResizer() {
  // ── Vertical resizer between left and right columns ──────────
  let vDragging = false;
  el.vResizer.addEventListener('mousedown', e => {
    vDragging = true;
    el.vResizer.classList.add('active');
    document.body.style.userSelect = 'none';
    _shieldOn('col-resize');
    e.preventDefault();
  });
  let _vPct = 50;
  document.addEventListener('mousemove', e => {
    if (!vDragging) return;
    const main = document.getElementById('main');
    const rect  = main.getBoundingClientRect();
    let pct     = (e.clientX - rect.left) / rect.width * 100;
    pct         = Math.max(15, Math.min(85, pct));
    _vPct = pct;
    el.colLeft.style.flex  = `0 0 ${pct}%`;
    el.colRight.style.flex = `0 0 ${100 - pct}%`;
  });
  document.addEventListener('mouseup', () => {
    if (!vDragging) return;
    vDragging = false;
    el.vResizer.classList.remove('active');
    document.body.style.cursor = document.body.style.userSelect = '';
    _shieldOff();
    state.session.splitPct = _vPct;
    saveSession();
  });

  // ── Internal horizontal resizer per panel (for live-split) ───
  _initHResizer('left',  el.hResizerL, el.liveWrapL);
  _initHResizer('right', el.hResizerR, el.liveWrapR);
}

function _initHResizer(side, resizer, wrap) {
  let dragging = false, startX, startEditorW, startPreviewW;
  const lp = side === 'left' ? el.livePreviewL : el.livePreviewR;

  resizer.addEventListener('mousedown', e => {
    const editorPane = wrap.querySelector('.panel-editor-pane');
    dragging      = true;
    startX        = e.clientX;
    startEditorW  = editorPane.getBoundingClientRect().width;
    startPreviewW = lp.getBoundingClientRect().width;
    resizer.classList.add('active');
    document.body.style.userSelect = 'none';
    _shieldOn('col-resize');
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = e.clientX - startX;
    const total = startEditorW + startPreviewW;
    const editorW = Math.max(120, Math.min(total - 120, startEditorW + delta));
    // Use percentages so the split scales when sidebar/window is resized
    const editorPct  = editorW / total * 100;
    const previewPct = 100 - editorPct;
    const editorPane = wrap.querySelector('.panel-editor-pane');
    editorPane.style.flex = `0 0 ${editorPct}%`;
    lp.style.flex         = `0 0 ${previewPct}%`;
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('active');
    document.body.style.userSelect = '';
    _shieldOff();
    // Save as percentage so it restores correctly at any window/sidebar width
    const editorPane = wrap.querySelector('.panel-editor-pane');
    const total = wrap.getBoundingClientRect().width;
    const w = editorPane.getBoundingClientRect().width;
    if (total > 0) { state.session.livePaneW[side] = w / total * 100; saveSession(); }
  });
}
