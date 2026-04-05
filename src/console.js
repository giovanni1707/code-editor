/**
 * core/console.js
 * Per-panel console drawer. Each panel has its own independent console.
 * Messages are forwarded from the preview iframe via postMessage with a `side` tag.
 * The console can be shown as a bottom drawer (default) or as a right side-pane
 * (split mode), toggled by the ⊞ Split button inside the drawer.
 */

'use strict';

/* ── Per-panel console state ─────────────────────────────────── */
const CON = {
  left:  { open: false, entries: [], filter: 'all', split: false, userClosed: false },
  right: { open: false, entries: [], filter: 'all', split: false, userClosed: false },
};

/* ── Helpers ─────────────────────────────────────────────────── */
function _fmt(val) {
  if (val === null)      return '<span class="cn-null">null</span>';
  if (val === undefined) return '<span class="cn-undef">undefined</span>';
  if (typeof val === 'boolean') return `<span class="cn-bool">${val}</span>`;
  if (typeof val === 'number')  return `<span class="cn-num">${val}</span>`;
  if (typeof val === 'string') {
    const s = val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<span class="cn-str">"${s}"</span>`;
  }
  if (typeof val === 'object') {
    try {
      const s = JSON.stringify(val, null, 2)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return `<span class="cn-obj">${s}</span>`;
    } catch { return String(val); }
  }
  return String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _levelIcon(level) {
  return { log: '', warn: '⚠', error: '✖', info: 'ℹ' }[level] || '';
}

/* ── DOM refs by side ────────────────────────────────────────── */
function _els(side) {
  return side === 'left' ? {
    col:       el.colLeft,
    drawer:    el.consoleDrawerL,
    list:      el.consoleListL,
    clearBtn:  el.consoleClearBtnL,
    splitBtn:  el.consoleSplitBtnL,
    closeBtn:  el.consoleCloseBtnL,
    toggleBtn: el.consoleToggleBtnL,
    badge:     el.consoleBadgeL,
    filters:   el.consoleFiltersL,
    resizer:   el.consoleResizerL,
    sidePane:  el.cnSidePaneL,
    sideList:  el.cnSideListL,
    sideClear: el.cnSideClearBtnL,
    sideClose: el.cnSideCloseBtnL,
    sideFilters: el.cnSideFiltersL,
    sideResizer: el.cnSideResizerL,
  } : {
    col:       el.colRight,
    drawer:    el.consoleDrawerR,
    list:      el.consoleListR,
    clearBtn:  el.consoleClearBtnR,
    splitBtn:  el.consoleSplitBtnR,
    closeBtn:  el.consoleCloseBtnR,
    toggleBtn: el.consoleToggleBtnR,
    badge:     el.consoleBadgeR,
    filters:   el.consoleFiltersR,
    resizer:   el.consoleResizerR,
    sidePane:  el.cnSidePaneR,
    sideList:  el.cnSideListR,
    sideClear: el.cnSideClearBtnR,
    sideClose: el.cnSideCloseBtnR,
    sideFilters: el.cnSideFiltersR,
    sideResizer: el.cnSideResizerR,
  };
}

/* ── Rendering ───────────────────────────────────────────────── */
function _buildHTML(side) {
  const c = CON[side];
  const entries = c.filter === 'all'
    ? c.entries
    : c.entries.filter(e => e.level === c.filter);

  if (entries.length === 0) {
    return '<div class="cn-empty">No output yet. Run JS to see console messages.</div>';
  }
  return entries.map(e => {
    const fmt = (e.level === 'error' || e.level === 'warn')
      ? val => {
          if (typeof val === 'string') {
            return val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          }
          return _fmt(val);
        }
      : _fmt;
    const locBadge = e.loc
      ? `<span class="cn-loc">${e.loc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`
      : '';
    return `<div class="cn-row cn-${e.level}">` +
      `<span class="cn-icon">${_levelIcon(e.level)}</span>` +
      `<span class="cn-body">${e.args.map(fmt).join(' ')}</span>` +
      locBadge +
    `</div>`;
  }).join('');
}

function renderConsole(side) {
  const c    = CON[side];
  const refs = _els(side);
  const html = _buildHTML(side);

  // Render into whichever list is currently visible
  if (c.split) {
    refs.sideList.innerHTML = html;
    refs.sideList.scrollTop = refs.sideList.scrollHeight;
  } else {
    refs.list.innerHTML = html;
    refs.list.scrollTop = refs.list.scrollHeight;
  }
}

function updateBadge(side) {
  const c    = CON[side];
  const refs = _els(side);
  const errors = c.entries.filter(e => e.level === 'error').length;
  const warns  = c.entries.filter(e => e.level === 'warn').length;
  refs.badge.textContent = c.entries.length;
  refs.badge.style.display = c.entries.length ? '' : 'none';
  refs.badge.className = 'cn-badge' + (errors ? ' cn-badge-err' : warns ? ' cn-badge-warn' : '');
}

/* ── Split mode ──────────────────────────────────────────────── */
function setConsoleSplit(side, on) {
  const c    = CON[side];
  const refs = _els(side);
  c.split = on;

  refs.col.classList.toggle('console-split', on);
  refs.splitBtn.classList.toggle('active', on);

  if (on) {
    // Close the bottom drawer, open the side pane
    c.open = true;
    refs.drawer.classList.remove('open');
    refs.toggleBtn.classList.add('active');
    // Sync side pane filter buttons to current filter
    refs.sideFilters.forEach(b => b.classList.toggle('active', b.dataset.filter === c.filter));
    renderConsole(side);
  } else {
    // Restore bottom drawer state
    if (c.open) {
      refs.drawer.classList.add('open');
    }
    renderConsole(side);
  }

  state.session.consoleSplit[side] = on;
  state.session.consoleOpen[side]  = c.open;
  saveSession();
}

/* ── Public API ──────────────────────────────────────────────── */
function consoleReceive(side, level, args, loc) {
  CON[side].entries.push({ level, args, loc: loc || null });
  updateBadge(side);
  const c = CON[side];
  if (c.split || c.open) renderConsole(side);
  else if (level === 'error' && !c.userClosed) openConsole(side);
}

function openConsole(side) {
  const c    = CON[side];
  const refs = _els(side);
  c.open = true;
  c.userClosed = false;
  if (!c.split) {
    refs.drawer.classList.add('open');
  }
  refs.toggleBtn.classList.add('active');
  renderConsole(side);
  state.session.consoleOpen[side] = true;
  saveSession();
}

function closeConsole(side) {
  const c    = CON[side];
  const refs = _els(side);
  c.open = false;
  c.userClosed = true;  // prevent auto-reopen on next error
  if (c.split) {
    // Closing in split mode = exit split mode entirely
    setConsoleSplit(side, false);
    c.open = false;
    refs.drawer.classList.remove('open');
  } else {
    refs.drawer.classList.remove('open');
  }
  refs.toggleBtn.classList.remove('active');
  state.session.consoleOpen[side] = false;
  saveSession();
}

function toggleConsole(side) {
  if (CON[side].open) {
    closeConsole(side);
  } else {
    CON[side].userClosed = false;
    openConsole(side);
  }
}

function clearConsole(side) {
  CON[side].entries = [];
  updateBadge(side);
  const c = CON[side];
  if (c.split || c.open) renderConsole(side);
}

/* ── Wire one panel's console ────────────────────────────────── */
function _wireOneSide(side) {
  const refs = _els(side);
  const sfx  = side === 'left' ? 'L' : 'R';
  const $id  = id => document.getElementById(id + sfx);

  $id('consoleToggleBtn').addEventListener('click', () => toggleConsole(side));
  $id('consoleClearBtn' ).addEventListener('click', () => clearConsole(side));
  $id('consoleCloseBtn' ).addEventListener('click', () => closeConsole(side));
  $id('consoleSplitBtn' ).addEventListener('click', () => setConsoleSplit(side, !CON[side].split));

  // Side pane actions
  $id('cnSideClearBtn').addEventListener('click', () => clearConsole(side));
  $id('cnSideCloseBtn').addEventListener('click', () => setConsoleSplit(side, false));

  // Drawer filter buttons
  refs.filters.forEach(btn => {
    btn.addEventListener('click', () => {
      refs.filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      CON[side].filter = btn.dataset.filter;
      // Keep side pane filters in sync
      refs.sideFilters.forEach(b => b.classList.toggle('active', b.dataset.filter === btn.dataset.filter));
      renderConsole(side);
    });
  });

  // Side pane filter buttons
  refs.sideFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      refs.sideFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      CON[side].filter = btn.dataset.filter;
      // Keep drawer filters in sync
      refs.filters.forEach(b => b.classList.toggle('active', b.dataset.filter === btn.dataset.filter));
      renderConsole(side);
    });
  });

  // Drag-to-resize (bottom drawer)
  let dragging = false, startY, startH;
  refs.resizer.addEventListener('mousedown', e => {
    dragging = true;
    startY = e.clientY;
    startH = refs.drawer.offsetHeight;
    document.body.style.userSelect = 'none';
    _shieldOn('ns-resize');
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = startY - e.clientY;
    const h = Math.max(80, Math.min(window.innerHeight * 0.6, startH + delta));
    refs.drawer.style.setProperty('--cn-h', h + 'px');
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    _shieldOff();
    const h = refs.drawer.offsetHeight;
    if (h > 0) { state.session.consoleHeight[side] = h; saveSession(); }
  });

  // Drag-to-resize (side pane)
  let sDragging = false, sStartX, sStartW;
  refs.sideResizer.addEventListener('mousedown', e => {
    sDragging = true;
    sStartX = e.clientX;
    sStartW = refs.sidePane.offsetWidth;
    document.body.style.userSelect = 'none';
    _shieldOn('col-resize');
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!sDragging) return;
    const delta = sStartX - e.clientX;  // dragging left = wider pane
    const w = Math.max(160, Math.min(window.innerWidth * 0.6, sStartW + delta));
    refs.sidePane.style.flex = `0 0 ${w}px`;
  });
  document.addEventListener('mouseup', () => {
    if (!sDragging) return;
    sDragging = false;
    document.body.style.userSelect = '';
    _shieldOff();
    const w = refs.sidePane.offsetWidth;
    if (w > 0) { state.session.consolePaneW[side] = w; saveSession(); }
  });
}

/* Expose CON so app.js can read open/split state on restore */
function consoleState(side) { return CON[side]; }

function wireConsole() {
  _wireOneSide('left');
  _wireOneSide('right');

  // Route messages from iframes to the correct panel's console
  window.addEventListener('message', e => {
    if (!e.data || e.data.__source !== 'ce-preview') return;
    const { side, level, args, loc } = e.data;
    if (!side || !CON[side]) return;
    if (level === 'clear') { clearConsole(side); return; }
    consoleReceive(side, level, args, loc);
  });
}
