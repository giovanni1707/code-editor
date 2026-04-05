/**
 * src/explorer.js
 * File explorer sidebar — renders the file list, handles
 * create / rename / delete, and opens files in panels.
 */

'use strict';

/* ── Which panel receives a file click ───────────────────────── */
// Track the last panel the user interacted with
let _focusedPanel = 'left';
function setFocusedPanel(side) { _focusedPanel = side; }

/* ── Render the file list ────────────────────────────────────── */
function renderExplorer() {
  const list = document.getElementById('sidebarFileList');
  if (!list) return;
  list.innerHTML = '';

  const files = getFilesSorted();

  if (!files.length) {
    const hint = document.createElement('div');
    hint.style.cssText = 'padding:12px 12px;font-size:11px;color:var(--txt2);';
    hint.textContent = 'No files yet. Click + to create one.';
    list.appendChild(hint);
    return;
  }

  files.forEach(file => {
    const row = document.createElement('div');
    row.className   = 'explorer-item';
    row.dataset.id  = file.id;

    // Highlight if open in left or right panel
    const inLeft  = state.panelTabs.left.activeId  === file.id;
    const inRight = state.panelTabs.right.activeId === file.id;
    if (inLeft)  row.classList.add('active-left');
    if (inRight) row.classList.add('active-right');

    // Dot
    const dot = document.createElement('span');
    dot.className = 'lang-dot';
    dot.style.cssText = `background:${extColor(file.name)};width:7px;height:7px;border-radius:50%;flex-shrink:0;`;

    // Name
    const name = document.createElement('span');
    name.className   = 'file-name';
    name.textContent = file.name;

    // Action buttons (shown on hover)
    const actions = document.createElement('span');
    actions.className = 'file-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className   = 'explorer-action-btn';
    renameBtn.title       = 'Rename';
    renameBtn.textContent = '✎';
    renameBtn.addEventListener('click', ev => {
      ev.stopPropagation();
      _startRename(row, file.id, name);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className   = 'explorer-action-btn';
    deleteBtn.title       = 'Delete';
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', ev => {
      ev.stopPropagation();
      if (!confirm(`Delete "${file.name}"?`)) return;
      deleteFile(file.id);
      renderExplorer();
      ['left', 'right'].forEach(side => renderTabBar(side));
    });

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(dot);
    row.appendChild(name);
    row.appendChild(actions);

    // Click → open in focused panel
    row.addEventListener('click', () => {
      openFileInPanel(_focusedPanel, file.id);
      renderExplorer();
    });

    // Double-click → rename inline
    row.addEventListener('dblclick', ev => {
      ev.stopPropagation();
      _startRename(row, file.id, name);
    });

    list.appendChild(row);
  });
}

/* ── Inline rename ───────────────────────────────────────────── */
function _startRename(row, fileId, nameEl) {
  if (row.querySelector('.rename-input')) return; // already renaming

  const file  = state.project.files[fileId];
  const input = document.createElement('input');
  input.type      = 'text';
  input.className = 'rename-input';
  input.value     = file.name;

  nameEl.style.display = 'none';
  row.insertBefore(input, nameEl.nextSibling);
  input.focus();
  input.select();

  const commit = () => {
    const newName = input.value.trim();
    if (newName && newName !== file.name) {
      renameFile(fileId, newName);
      // Re-render tab bars since filename changed
      ['left', 'right'].forEach(side => renderTabBar(side));
    }
    input.remove();
    nameEl.style.display = '';
    renderExplorer();
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter')  { ev.preventDefault(); commit(); }
    if (ev.key === 'Escape') { input.remove(); nameEl.style.display = ''; }
  });
}

/* ── New file dialog ─────────────────────────────────────────── */
function promptNewFile() {
  const name = prompt('File name (e.g. index.html, style.css, main.js):');
  if (!name || !name.trim()) return;
  const id = createFile(name.trim());
  if (!id) return;
  renderExplorer();
  // Open in focused panel automatically
  openFileInPanel(_focusedPanel, id);
  renderExplorer();
}

/* ── Sidebar toggle ──────────────────────────────────────────── */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const btn     = document.getElementById('sidebarToggleBtn');
  const hidden  = sidebar.classList.toggle('hidden');
  btn.classList.toggle('on', !hidden);
  // Save preference
  try { localStorage.setItem('ce:sidebarHidden', hidden ? '1' : '0'); } catch (_) {}
}

/* ── Sidebar resizer ─────────────────────────────────────────── */
function wireSidebarResizer() {
  const resizer = document.getElementById('sidebarResizer');
  const sidebar = document.getElementById('sidebar');
  if (!resizer || !sidebar) return;

  let dragging = false, startX, startW;

  resizer.addEventListener('mousedown', e => {
    dragging = true;
    startX   = e.clientX;
    startW   = sidebar.getBoundingClientRect().width;
    document.body.style.userSelect = 'none';
    _shieldOn('col-resize');
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const w = Math.max(140, Math.min(480, startW + (e.clientX - startX)));
    sidebar.style.width = w + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    _shieldOff();
    try { localStorage.setItem('ce:sidebarW', sidebar.getBoundingClientRect().width); } catch (_) {}
  });
}

/* ── Wire everything ─────────────────────────────────────────── */
function wireExplorer() {
  const newBtn = document.getElementById('newFileBtn');
  if (newBtn) newBtn.addEventListener('click', promptNewFile);

  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleSidebar);

  wireSidebarResizer();

  // Track which panel was last clicked
  ['left', 'right'].forEach(side => {
    const col = side === 'left' ? el.colLeft : el.colRight;
    col.addEventListener('mousedown', () => setFocusedPanel(side));
  });

  // Restore sidebar width
  try {
    const w = localStorage.getItem('ce:sidebarW');
    if (w) document.getElementById('sidebar').style.width = (+w) + 'px';
    const hidden = localStorage.getItem('ce:sidebarHidden') === '1';
    if (hidden) {
      document.getElementById('sidebar').classList.add('hidden');
      sidebarToggleBtn && sidebarToggleBtn.classList.remove('on');
    }
  } catch (_) {}
}
