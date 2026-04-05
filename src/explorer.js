/**
 * src/explorer.js
 * File explorer sidebar with folder tree support.
 *
 * Tree nodes are rendered as a flat list with `padding-left` depth indent.
 * Folders collapse/expand in-place. Right-click or action buttons give
 * access to rename / delete / new-file-inside / new-folder-inside.
 */

'use strict';

/* ── Which panel receives a file click ───────────────────────── */
let _focusedPanel = 'left';
function setFocusedPanel(side) { _focusedPanel = side; }

/* ── Context-menu state ──────────────────────────────────────── */
let _ctxMenu = null;

function _closeCtxMenu() {
  if (_ctxMenu) { _ctxMenu.remove(); _ctxMenu = null; }
}

function _showCtxMenu(x, y, items) {
  _closeCtxMenu();
  const menu = document.createElement('div');
  menu.className = 'explorer-ctx-menu';
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';

  items.forEach(item => {
    if (item === '-') {
      const sep = document.createElement('div');
      sep.className = 'ctx-sep';
      menu.appendChild(sep);
      return;
    }
    const btn = document.createElement('button');
    btn.className   = 'ctx-item';
    btn.textContent = item.label;
    btn.addEventListener('click', () => { _closeCtxMenu(); item.action(); });
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  _ctxMenu = menu;

  // Close on next click anywhere
  setTimeout(() => document.addEventListener('click', _closeCtxMenu, { once: true }), 0);
}

/* ── Render the full tree ────────────────────────────────────── */
function renderExplorer() {
  const list = document.getElementById('sidebarFileList');
  if (!list) return;
  list.innerHTML = '';

  const nodes = getTreeFlat();

  if (!nodes.length) {
    const hint = document.createElement('div');
    hint.className = 'explorer-empty';
    hint.textContent = 'No files yet. Use the buttons above to get started.';
    list.appendChild(hint);
    return;
  }

  nodes.forEach(node => {
    if (node.type === 'folder') {
      list.appendChild(_makeFolderRow(node));
    } else {
      list.appendChild(_makeFileRow(node));
    }
  });
}

/* ── Build a folder row ──────────────────────────────────────── */
function _makeFolderRow({ item: folder, depth }) {
  const INDENT = 14;
  const row = document.createElement('div');
  row.className      = 'explorer-item explorer-folder';
  row.dataset.id     = folder.id;
  row.style.paddingLeft = (8 + depth * INDENT) + 'px';

  // Arrow ▶ / ▼
  const arrow = document.createElement('span');
  arrow.className   = 'folder-arrow';
  arrow.textContent = folder.collapsed ? '▶' : '▼';

  // Icon
  const icon = document.createElement('span');
  icon.className   = 'folder-icon';
  icon.textContent = folder.collapsed ? '📁' : '📂';

  // Name
  const nameEl = document.createElement('span');
  nameEl.className   = 'file-name';
  nameEl.textContent = folder.name;

  // Action buttons
  const actions = _makeActions([
    { label: '📄',  title: 'New file in folder',   fn: () => _promptNewFile(folder.id)   },
    { label: '📁',  title: 'New folder inside',    fn: () => _promptNewFolder(folder.id)  },
    { label: '✎',   title: 'Rename folder',        fn: () => _startRename(row, folder.id, nameEl, 'folder') },
    { label: '🗑',  title: 'Delete folder',        fn: () => _confirmDelete('folder', folder) },
  ]);

  row.appendChild(arrow);
  row.appendChild(icon);
  row.appendChild(nameEl);
  row.appendChild(actions);

  // Click → toggle collapse
  row.addEventListener('click', e => {
    if (e.target.closest('.file-actions')) return;
    if (e.target.classList.contains('rename-input')) return;
    toggleFolderCollapse(folder.id);
    renderExplorer();
  });

  // Double-click → rename
  row.addEventListener('dblclick', e => {
    e.stopPropagation();
    _startRename(row, folder.id, nameEl, 'folder');
  });

  // Right-click → context menu
  row.addEventListener('contextmenu', e => {
    e.preventDefault();
    _showCtxMenu(e.clientX, e.clientY, [
      { label: 'New File Here',   action: () => _promptNewFile(folder.id)   },
      { label: 'New Folder Here', action: () => _promptNewFolder(folder.id)  },
      '-',
      { label: 'Rename',          action: () => _startRename(row, folder.id, nameEl, 'folder') },
      { label: 'Delete',          action: () => _confirmDelete('folder', folder) },
    ]);
  });

  return row;
}

/* ── Build a file row ────────────────────────────────────────── */
function _makeFileRow({ item: file, depth }) {
  const INDENT = 14;
  const row = document.createElement('div');
  row.className      = 'explorer-item';
  row.dataset.id     = file.id;
  row.style.paddingLeft = (8 + depth * INDENT + 16) + 'px'; // +16 for arrow space

  const inLeft  = state.panelTabs.left.activeId  === file.id;
  const inRight = state.panelTabs.right.activeId === file.id;
  if (inLeft)  row.classList.add('active-left');
  if (inRight) row.classList.add('active-right');

  // Colour dot
  const dot = document.createElement('span');
  dot.className = 'lang-dot';
  dot.style.cssText = `background:${extColor(file.name)};width:7px;height:7px;border-radius:50%;flex-shrink:0;`;

  // Name
  const nameEl = document.createElement('span');
  nameEl.className   = 'file-name';
  nameEl.textContent = file.name;

  // Action buttons
  const actions = _makeActions([
    { label: '✎', title: 'Rename', fn: () => _startRename(row, file.id, nameEl, 'file') },
    { label: '🗑', title: 'Delete', fn: () => _confirmDelete('file', file) },
  ]);

  row.appendChild(dot);
  row.appendChild(nameEl);
  row.appendChild(actions);

  // Click → open file
  row.addEventListener('click', e => {
    if (e.target.closest('.file-actions')) return;
    if (e.target.classList.contains('rename-input')) return;
    openFileInPanel(_focusedPanel, file.id);
    renderExplorer();
  });

  // Double-click → rename
  row.addEventListener('dblclick', e => {
    e.stopPropagation();
    _startRename(row, file.id, nameEl, 'file');
  });

  // Right-click → context menu
  row.addEventListener('contextmenu', e => {
    e.preventDefault();
    _showCtxMenu(e.clientX, e.clientY, [
      { label: 'Open in Left Panel',  action: () => { openFileInPanel('left',  file.id); renderExplorer(); } },
      { label: 'Open in Right Panel', action: () => { openFileInPanel('right', file.id); renderExplorer(); } },
      '-',
      { label: 'Rename', action: () => _startRename(row, file.id, nameEl, 'file') },
      { label: 'Delete', action: () => _confirmDelete('file', file) },
    ]);
  });

  return row;
}

/* ── Build action-button strip ───────────────────────────────── */
function _makeActions(defs) {
  const wrap = document.createElement('span');
  wrap.className = 'file-actions';
  defs.forEach(({ label, title, fn }) => {
    const btn = document.createElement('button');
    btn.className   = 'explorer-action-btn';
    btn.title       = title;
    btn.textContent = label;
    btn.addEventListener('click', e => { e.stopPropagation(); fn(); });
    wrap.appendChild(btn);
  });
  return wrap;
}

/* ── Inline rename ───────────────────────────────────────────── */
function _startRename(row, id, nameEl, type) {
  if (row.querySelector('.rename-input')) return;

  const item  = type === 'folder' ? state.project.folders[id] : state.project.files[id];
  if (!item) return;

  const input = document.createElement('input');
  input.type      = 'text';
  input.className = 'rename-input';
  input.value     = item.name;

  nameEl.style.display = 'none';
  row.insertBefore(input, nameEl.nextSibling);
  input.focus();
  input.select();

  const commit = () => {
    const newName = input.value.trim();
    if (newName && newName !== item.name) {
      if (type === 'folder') renameFolder(id, newName);
      else { renameFile(id, newName); ['left','right'].forEach(s => renderTabBar(s)); }
    }
    input.remove();
    nameEl.style.display = '';
    renderExplorer();
  };

  input.addEventListener('blur',   commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { input.remove(); nameEl.style.display = ''; }
  });
}

/* ── Delete confirmation ─────────────────────────────────────── */
function _confirmDelete(type, item) {
  const label = type === 'folder' ? `folder "${item.name}" and all its contents` : `"${item.name}"`;
  if (!confirm(`Delete ${label}?`)) return;
  if (type === 'folder') deleteFolder(item.id);
  else deleteFile(item.id);
  renderExplorer();
  ['left','right'].forEach(s => renderTabBar(s));
}

/* ── New file prompt ─────────────────────────────────────────── */
function _promptNewFile(parentId = null) {
  const name = prompt('File name (e.g. index.html, style.css, app.js):');
  if (!name || !name.trim()) return;
  const id = createFile(name.trim(), parentId);
  if (!id) return;
  // Expand parent folder if it was collapsed
  if (parentId && state.project.folders[parentId]) {
    state.project.folders[parentId].collapsed = false;
    saveProject();
  }
  renderExplorer();
  openFileInPanel(_focusedPanel, id);
  renderExplorer();
}

/* ── New folder prompt ───────────────────────────────────────── */
function _promptNewFolder(parentId = null) {
  const name = prompt('Folder name:');
  if (!name || !name.trim()) return;
  // Expand parent folder if collapsed
  if (parentId && state.project.folders[parentId]) {
    state.project.folders[parentId].collapsed = false;
    saveProject();
  }
  createFolder(name.trim(), parentId);
  renderExplorer();
}

/* ── Sidebar header button handlers (called from HTML) ───────── */
function promptNewFile()   { _promptNewFile(null);   }
function promptNewFolder() { _promptNewFolder(null);  }

/* ════════════════════════════════════════════════════════════════
   PROJECT IMPORT
════════════════════════════════════════════════════════════════ */

/* Extensions we skip entirely (binaries, lock files, etc.) */
const SKIP_EXTS = new Set([
  'png','jpg','jpeg','gif','webp','svg','ico','bmp','tiff','avif',
  'mp4','webm','mp3','wav','ogg','flac',
  'woff','woff2','ttf','otf','eot',
  'pdf','zip','gz','tar','rar','7z',
  'exe','dll','so','dylib','bin','dat',
  'DS_Store','lock',
]);

/* Folders we always skip */
const SKIP_DIRS = new Set([
  'node_modules','.git','.svn','.hg','__pycache__',
  '.next','.nuxt','dist','build','.cache','.vscode',
  'coverage','.nyc_output','vendor',
]);

function _shouldSkipFile(name) {
  const ext = name.split('.').pop().toLowerCase();
  return SKIP_EXTS.has(ext) || name.startsWith('.');
}

function _shouldSkipDir(name) {
  return SKIP_DIRS.has(name) || name.startsWith('.');
}

/* ── Clear current project and reset panel tabs ──────────────── */
function _clearProject() {
  state.project.files   = {};
  state.project.folders = {};
  state.panelTabs.left  = { openIds: [], activeId: null };
  state.panelTabs.right = { openIds: [], activeId: null };
  // Clear physical surfaces
  ['left','right'].forEach(side => {
    ['html','css','js'].forEach(lang => {
      const t = tabsFor(side)[lang];
      t.ta.value = '';
      refreshHL(t.ta, t.hl, lang);
      updateGutter(t.ta, t.gutter);
    });
  });
}

/* ── Import via File System Access API (Chrome/Edge) ─────────── */
async function importViaDirectoryPicker() {
  let dirHandle;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'read' });
  } catch (e) {
    if (e.name !== 'AbortError') toast('Could not open folder: ' + e.message, 3000);
    return;
  }

  toast('Importing…', 60000); // long-lived toast
  _clearProject();

  await _readDirectoryHandle(dirHandle, null);

  saveProject();
  savePanelTabs();
  renderExplorer();
  ['left','right'].forEach(s => renderTabBar(s));
  toast('Project imported: ' + dirHandle.name, 3000);
}

async function _readDirectoryHandle(handle, parentId) {
  for await (const [name, entry] of handle) {
    if (entry.kind === 'directory') {
      if (_shouldSkipDir(name)) continue;
      const folderId = uid();
      state.project.folders[folderId] = { id: folderId, name, parentId, collapsed: false };
      await _readDirectoryHandle(entry, folderId);
    } else {
      if (_shouldSkipFile(name)) continue;
      try {
        const file    = await entry.getFile();
        const content = await file.text();
        const id      = uid();
        state.project.files[id] = { id, name, content, parentId };
      } catch (_) { /* skip unreadable files */ }
    }
  }
}

/* ── Import via <input webkitdirectory> fallback ─────────────── */
async function importViaFileInput(fileList) {
  if (!fileList.length) return;

  toast('Importing…', 60000);
  _clearProject();

  // fileList entries have .webkitRelativePath = "rootDir/sub/file.txt"
  // Build folder map first
  const folderMap = {}; // path → folderId  (path without leading root)

  const getOrCreateFolder = (parts, upTo) => {
    // parts = ['src','components'], upTo = index of last segment to create
    let parentId = null;
    for (let i = 0; i <= upTo; i++) {
      const pathKey = parts.slice(0, i + 1).join('/');
      if (!folderMap[pathKey]) {
        if (_shouldSkipDir(parts[i])) return null; // bail
        const id = uid();
        state.project.folders[id] = { id, name: parts[i], parentId, collapsed: false };
        folderMap[pathKey] = id;
      }
      if (folderMap[pathKey] === null) return null;
      parentId = folderMap[pathKey];
    }
    return parentId;
  };

  const reads = Array.from(fileList).map(file => new Promise(resolve => {
    const parts = file.webkitRelativePath.split('/');
    // parts[0] = root folder name (skip it — it becomes the project name)
    const fileParts  = parts.slice(1);       // without root
    const fileName   = fileParts[fileParts.length - 1];
    const dirParts   = fileParts.slice(0, -1);

    if (_shouldSkipFile(fileName)) return resolve();
    // Check if any directory segment should be skipped
    if (dirParts.some(_shouldSkipDir)) return resolve();

    const reader = new FileReader();
    reader.onload = e => {
      let parentId = null;
      if (dirParts.length) {
        parentId = getOrCreateFolder(dirParts, dirParts.length - 1);
        if (parentId === null) return resolve(); // inside a skipped dir
      }
      const id = uid();
      state.project.files[id] = { id, name: fileName, content: e.target.result, parentId };
      resolve();
    };
    reader.onerror = () => resolve();
    reader.readAsText(file);
  }));

  await Promise.all(reads);

  const rootName = fileList[0].webkitRelativePath.split('/')[0] || 'Project';
  saveProject();
  savePanelTabs();
  renderExplorer();
  ['left','right'].forEach(s => renderTabBar(s));
  toast('Project imported: ' + rootName, 3000);
}

/* ── Entry point — pick best method ─────────────────────────── */
async function importProject() {
  if (typeof window.showDirectoryPicker === 'function') {
    await importViaDirectoryPicker();
  } else {
    // Fallback: trigger hidden <input>
    document.getElementById('importFolderInput').click();
  }
}

/* ── Sidebar toggle ──────────────────────────────────────────── */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const btn     = document.getElementById('sidebarToggleBtn');
  const hidden  = sidebar.classList.toggle('hidden');
  btn.classList.toggle('on', !hidden);
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
    sidebar.style.width = Math.max(140, Math.min(480, startW + e.clientX - startX)) + 'px';
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
  document.getElementById('newFileBtn')   ?.addEventListener('click', promptNewFile);
  document.getElementById('newFolderBtn') ?.addEventListener('click', promptNewFolder);
  document.getElementById('sidebarToggleBtn')?.addEventListener('click', toggleSidebar);

  document.getElementById('importBtn')?.addEventListener('click', importProject);

  // Fallback <input> handler
  const importInput = document.getElementById('importFolderInput');
  if (importInput) {
    importInput.addEventListener('change', () => {
      if (importInput.files.length) importViaFileInput(importInput.files);
      importInput.value = ''; // reset so same folder can be re-imported
    });
  }

  wireSidebarResizer();

  // Track which panel was last clicked
  ['left', 'right'].forEach(side => {
    const col = side === 'left' ? el.colLeft : el.colRight;
    col.addEventListener('mousedown', () => setFocusedPanel(side));
  });

  // Close context menu on scroll
  document.getElementById('sidebarFileList')?.addEventListener('scroll', _closeCtxMenu);

  // Restore sidebar width + visibility
  try {
    const w = localStorage.getItem('ce:sidebarW');
    if (w) document.getElementById('sidebar').style.width = (+w) + 'px';
    if (localStorage.getItem('ce:sidebarHidden') === '1') {
      document.getElementById('sidebar').classList.add('hidden');
      document.getElementById('sidebarToggleBtn')?.classList.remove('on');
    }
  } catch (_) {}
}
