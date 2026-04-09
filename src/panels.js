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
  // Mutating state.session triggers auto-save via reactive session effect
  state.session.activeTab[side] = lang;
  const tabs = tabsFor(side);

  Object.entries(tabs).forEach(([l, t]) => {
    t.btn.classList.toggle('active', l === lang);
  });

  const mode = state.panelMode[side];
  if (mode === 'edit' || mode === 'live') {
    showEditorSurfaces(side, lang);
  }

  const t = tabs[lang];
  refreshHL(t.ta, t.hl, lang);
  updateGutter(t.ta, t.gutter);
  t.ta.focus();

  if (mode === 'live') scheduleLivePreview(side);

  // Update minimap for the now-visible surface
  if (state.settings.minimap && t.surface) updateMinimapSurface(t.surface);
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
  // Mutating state.session triggers auto-save via reactive session effect
  state.session.panelMode[side] = mode;

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
    // Clear any inline flex set by the h-resizer
    const _epTw = (side === 'left' ? el.liveWrapL : el.liveWrapR).querySelector('.panel-editor-pane');
    if (_epTw) _epTw.style.flex = '';
    lp.style.flex = '';
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
    requestAnimationFrame(() => {
      const lang = state.activeTab[side];
      const t = tabsFor(side)[lang];
      if (t && t.ta) { updateGutter(t.ta, t.gutter); refreshHL(t.ta, t.hl, lang); }
    });
  } else {
    // edit
    col.classList.remove('live-split');
    col.classList.add('mode-edit');
    // Clear any inline flex set by the h-resizer so the editor pane fills its container
    const _ep = (side === 'left' ? el.liveWrapL : el.liveWrapR).querySelector('.panel-editor-pane');
    if (_ep) _ep.style.flex = '';
    lp.style.flex = '';
    showEditorSurfaces(side, state.activeTab[side]);
    out.classList.remove('visible');
    lp.classList.remove('visible');
    scheduleConsoleRun(side);
    requestAnimationFrame(() => {
      const lang = state.activeTab[side];
      const t = tabsFor(side)[lang];
      if (t && t.ta) { updateGutter(t.ta, t.gutter); refreshHL(t.ta, t.hl, lang); }
    });
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
  // Persist clear to project file — reactive project-save effect handles persistence
  const fid = state.panelTabs[side].activeId;
  if (fid && state.project.files[fid]) {
    state.project.files[fid].content = '';
  }
}

function wirePanelActions(side) {
  const lineBtn  = side === 'left' ? el.lineNumBtnL : el.lineNumBtnR;
  const copyBtn  = side === 'left' ? el.copyBtnL    : el.copyBtnR;
  const clearBtn = side === 'left' ? el.clearBtnL   : el.clearBtnR;

  lineBtn.addEventListener('click', () => {
    // Mutating lineNums triggers reactive effects: buttons update + settings auto-save
    state.settings.lineNums = !state.settings.lineNums;
    updateAllGutters();
  });

  copyBtn.addEventListener('click',  () => copyActive(side));
  clearBtn.addEventListener('click', () => clearActive(side));
}

/* ════════════════════════════════════════════════════════════════
   LAYOUT  (split / left-full / right-full)
════════════════════════════════════════════════════════════════ */
const LAYOUTS = ['split', 'right-full', 'left-full'];
let _vPct = 50; // shared between applyLayout and initResizer

function applyLayout(layout) {
  // Mutating state.layout triggers reactive effects:
  //   - layout button text/title and status-bar text auto-update
  //   - session auto-saves
  state.layout = layout;
  state.session.layout = layout;

  const isSplit = layout === 'split';
  const isRF    = layout === 'right-full';
  const isLF    = layout === 'left-full';

  el.colLeft.style.display  = isRF    ? 'none' : '';
  el.colRight.style.display = isLF    ? 'none' : '';
  el.vResizer.style.display = isSplit ? ''     : 'none';

  // Set explicit flex basis in split mode so mousemove never switches sizing model
  if (isSplit) {
    el.colLeft.style.flex  = `0 0 ${_vPct}%`;
    el.colRight.style.flex = `0 0 ${100 - _vPct}%`;
  } else if (isRF) {
    el.colRight.style.flex = '1';
  } else {
    el.colLeft.style.flex = '1';
  }
}

function cycleLayout() {
  const idx = LAYOUTS.indexOf(state.layout);
  applyLayout(LAYOUTS[(idx + 1) % LAYOUTS.length]);
}

function setSplitPct(pct) {
  _vPct = pct;
  el.colLeft.style.flex  = `0 0 ${pct}%`;
  el.colRight.style.flex = `0 0 ${100 - pct}%`;
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
  let vDragging = false, vStartX = 0, vStartPct = 50, vTotalW = 0;

  el.vResizer.addEventListener('mousedown', e => {
    // Snapshot totalW once at mousedown — reusing it in mousemove prevents jump
    vTotalW   = el.colLeft.offsetWidth + el.vResizer.offsetWidth + el.colRight.offsetWidth;
    vDragging = true;
    vStartX   = e.clientX;
    vStartPct = vTotalW > 0 ? el.colLeft.offsetWidth / vTotalW * 100 : _vPct;

    el.vResizer.classList.add('active');
    document.body.style.userSelect = 'none';
    _shieldOn('col-resize');
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!vDragging || vTotalW <= 0) return;

    const deltaPct = (e.clientX - vStartX) / vTotalW * 100;
    const pct = Math.max(15, Math.min(85, vStartPct + deltaPct));
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
  });

  // ── Internal horizontal resizer per panel (for live-split) ───
  _initHResizer('left',  el.hResizerL, el.liveWrapL);
  _initHResizer('right', el.hResizerR, el.liveWrapR);
}

function _initHResizer(side, resizer, wrap) {
  let dragging = false, startX = 0, startPct = 50, totalW = 0;
  const lp         = side === 'left' ? el.livePreviewL : el.livePreviewR;
  const editorPane = wrap.querySelector('.panel-editor-pane'); // cached once

  resizer.addEventListener('mousedown', e => {
    totalW   = editorPane.offsetWidth + resizer.offsetWidth + lp.offsetWidth;
    dragging = true;
    startX   = e.clientX;
    startPct = totalW > 0 ? editorPane.offsetWidth / totalW * 100 : 50;

    resizer.classList.add('active');
    document.body.style.userSelect = 'none';
    _shieldOn('col-resize');
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging || totalW <= 0) return;
    const pct = Math.max(15, Math.min(85, startPct + (e.clientX - startX) / totalW * 100));
    editorPane.style.flex = `0 0 ${pct}%`;
    lp.style.flex         = `0 0 ${100 - pct}%`;
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('active');
    document.body.style.userSelect = '';
    _shieldOff();
    if (totalW > 0) { state.session.livePaneW[side] = editorPane.offsetWidth / totalW * 100; }
  });
}
