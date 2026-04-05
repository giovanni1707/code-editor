/**
 * src/panel-tabs.js
 * Dynamic file tab bar per panel.
 * Replaces the static HTML/CSS/JS tab buttons with per-file tabs.
 */

'use strict';

/* ── Tab bar container selector per side ─────────────────────── */
function _tabBar(side) {
  return (side === 'left' ? el.colLeft : el.colRight).querySelector('.col-tabs');
}

function _tabsEnd(side) {
  return _tabBar(side).querySelector('.col-tabs-end');
}

/* ── Flush active file content from surface → state ─────────── */
function _flushActive(side) {
  const pt  = state.panelTabs[side];
  const fid = pt.activeId;
  if (!fid || !state.project.files[fid]) return;
  const lang = extToLang(state.project.files[fid].name);
  const ta   = tabsFor(side)[lang].ta;
  state.project.files[fid].content = ta.value;
}

/* ── Load a file's content into the correct physical surface ─── */
function _loadIntoSurface(side, fileId) {
  const file = state.project.files[fileId];
  if (!file) return;
  const lang = extToLang(file.name);
  const ta   = tabsFor(side)[lang].ta;
  const t    = tabsFor(side)[lang];
  ta.value   = file.content || '';
  refreshHL(ta, t.hl, lang);
  updateGutter(ta, t.gutter);
}

/* ── Open a file in a panel ──────────────────────────────────── */
function openFileInPanel(side, fileId) {
  if (!state.project.files[fileId]) return;

  // Flush outgoing file's content before switching
  _flushActive(side);

  const pt = state.panelTabs[side];

  // Add to open list if not already there
  if (!pt.openIds.includes(fileId)) {
    pt.openIds.push(fileId);
  }

  // Set as active
  pt.activeId = fileId;

  // Load content into physical surface
  _loadIntoSurface(side, fileId);

  // Switch the physical surface
  const lang = extToLang(state.project.files[fileId].name);
  switchTab(side, lang);

  // Rebuild the tab bar DOM
  renderTabBar(side);

  // Update status bar filename
  if (side === 'left') el.sbFileName.textContent = state.project.files[fileId].name;

  savePanelTabs();
}

/* ── Close a file tab ────────────────────────────────────────── */
function closeFileTab(side, fileId, e) {
  if (e) e.stopPropagation();

  // Flush before closing if it's the active one
  const pt = state.panelTabs[side];
  if (pt.activeId === fileId) _flushActive(side);
  saveProject();

  pt.openIds = pt.openIds.filter(id => id !== fileId);

  if (pt.activeId === fileId) {
    // Activate neighbouring tab
    pt.activeId = pt.openIds[pt.openIds.length - 1] || null;
    if (pt.activeId) {
      _loadIntoSurface(side, pt.activeId);
      const lang = extToLang(state.project.files[pt.activeId].name);
      switchTab(side, lang);
      if (side === 'left') el.sbFileName.textContent = state.project.files[pt.activeId].name;
    } else {
      // No files open — show empty state
      _showEmptyPanel(side);
    }
  }

  renderTabBar(side);
  savePanelTabs();
}

/* ── Show empty panel when no files are open ─────────────────── */
function _showEmptyPanel(side) {
  // Hide all surfaces
  ['html', 'css', 'js'].forEach(lang => {
    tabsFor(side)[lang].surface.style.display = 'none';
  });
  // Show empty hint
  const col = side === 'left' ? el.colLeft : el.colRight;
  let empty = col.querySelector('.panel-empty');
  if (!empty) {
    empty = document.createElement('div');
    empty.className = 'panel-empty';
    empty.innerHTML = '<span>No file open</span><span style="font-size:11px;color:var(--txt2)">Open a file from the explorer</span>';
    col.querySelector('.panel-editor-pane').appendChild(empty);
  }
  empty.style.display = 'flex';
  if (side === 'left') el.sbFileName.textContent = '—';
}

function _hideEmptyPanel(side) {
  const col   = side === 'left' ? el.colLeft : el.colRight;
  const empty = col.querySelector('.panel-empty');
  if (empty) empty.style.display = 'none';
}

/* ── Render the tab bar for one panel ────────────────────────── */
function renderTabBar(side) {
  const bar    = _tabBar(side);
  const end    = _tabsEnd(side);
  const pt     = state.panelTabs[side];

  // Remove existing dynamic file tabs (keep .col-tabs-end)
  bar.querySelectorAll('.file-tab').forEach(el2 => el2.remove());

  // Insert file tabs before .col-tabs-end
  pt.openIds.forEach(fid => {
    const file   = state.project.files[fid];
    if (!file) return;
    const isActive = fid === pt.activeId;

    const tab = document.createElement('div');
    tab.className  = 'file-tab' + (isActive ? ' active' : '');
    tab.dataset.id = fid;

    const dot = document.createElement('span');
    dot.className = 'lang-dot';
    dot.style.background = extColor(file.name);

    const label = document.createElement('span');
    label.className   = 'file-tab-label';
    label.textContent = file.name;

    const close = document.createElement('span');
    close.className   = 'tab-x';
    close.textContent = '×';
    close.title       = 'Close';
    close.addEventListener('click', ev => closeFileTab(side, fid, ev));

    tab.appendChild(dot);
    tab.appendChild(label);
    tab.appendChild(close);
    tab.addEventListener('click', () => openFileInPanel(side, fid));

    bar.insertBefore(tab, end);
  });

  // Show / hide empty state
  if (pt.activeId && state.project.files[pt.activeId]) {
    _hideEmptyPanel(side);
  }
}

/* ── Flush all open files back to state (call before save/export) */
function flushAllPanels() {
  ['left', 'right'].forEach(side => _flushActive(side));
}
