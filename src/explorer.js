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

/* ── Drag-and-drop: move file or folder into another folder ──── */
let _dragId   = null;   // id being dragged
let _dragType = null;   // 'file' | 'folder'

function _onDragStart(e, id, type) {
  _dragId   = id;
  _dragType = type;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
  e.currentTarget.classList.add('dragging');
}

function _onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.explorer-item.drag-over').forEach(el2 => el2.classList.remove('drag-over'));
  _dragId = _dragType = null;
}

function _onDragOver(e, targetFolderId) {
  if (!_dragId) return;
  // Prevent dropping a folder into itself or its own descendant
  if (_dragType === 'folder' && _isSelfOrDescendant(_dragId, targetFolderId)) return;
  // Prevent no-op (already in this folder)
  const item = _dragType === 'file' ? state.project.files[_dragId] : state.project.folders[_dragId];
  if (item && item.parentId === targetFolderId) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function _onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function _onDrop(e, targetFolderId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!_dragId) return;
  if (_dragType === 'folder' && _isSelfOrDescendant(_dragId, targetFolderId)) return;

  const dragId   = _dragId;
  const dragType = _dragType;

  // Capture old parentId before mutating state
  const oldParentId = dragType === 'file'
    ? state.project.files[dragId]?.parentId
    : state.project.folders[dragId]?.parentId;

  if (oldParentId === targetFolderId) return; // no-op

  if (_fsIsLinked()) {
    await _fsMoveItem(dragId, dragType, oldParentId, targetFolderId);
  }

  // Update state
  if (dragType === 'file' && state.project.files[dragId]) {
    state.project.files[dragId].parentId = targetFolderId;
  } else if (dragType === 'folder' && state.project.folders[dragId]) {
    state.project.folders[dragId].parentId = targetFolderId;
  }

  if (targetFolderId && state.project.folders[targetFolderId]) {
    state.project.folders[targetFolderId].collapsed = false;
  }

  saveProject();
  renderExplorer();
}

async function _onDropRoot(e) {
  e.preventDefault();
  if (!_dragId) return;

  const dragId   = _dragId;
  const dragType = _dragType;
  const oldParentId = dragType === 'file'
    ? state.project.files[dragId]?.parentId
    : state.project.folders[dragId]?.parentId;

  if (oldParentId === null) return; // already at root

  if (_fsIsLinked()) {
    await _fsMoveItem(dragId, dragType, oldParentId, null);
  }

  if (dragType === 'file'   && state.project.files[dragId])   state.project.files[dragId].parentId   = null;
  if (dragType === 'folder' && state.project.folders[dragId]) state.project.folders[dragId].parentId = null;

  saveProject();
  renderExplorer();
}

/* ── Move a file or folder on disk ──────────────────────────── */
async function _fsMoveItem(id, type, oldParentId, newParentId) {
  try {
    const srcDirHandle = await _getDirHandleForFolder(oldParentId);
    const dstDirHandle = await _getDirHandleForFolder(newParentId);

    if (type === 'file') {
      const file = state.project.files[id];
      if (!file) return;
      // Flush textarea if this file is active
      let content = file.content || '';
      ['left','right'].forEach(side => {
        if (state.panelTabs[side].activeId !== id) return;
        const lang = extToLang(file.name);
        const ta = tabsFor(side)[lang]?.ta;
        if (ta) content = ta.value;
      });
      // Delete old first, then create new — prevents duplicates
      await srcDirHandle.removeEntry(file.name).catch(() => {});
      const newHandle = await dstDirHandle.getFileHandle(file.name, { create: true });
      const writable  = await newHandle.createWritable();
      await writable.write(content);
      await writable.close();
      _fsHandles[id] = newHandle;

    } else {
      const folder = state.project.folders[id];
      if (!folder) return;
      // Delete old folder first, then recreate at destination
      await srcDirHandle.removeEntry(folder.name, { recursive: true }).catch(() => {});
      const newSubHandle = await dstDirHandle.getDirectoryHandle(folder.name, { create: true });
      await _fsCopyDir(newSubHandle, id);
    }
  } catch (e) {
    toast('Move on disk failed: ' + e.message, 3000);
  }
}

/** Returns true if `ancestorId` is `nodeId` or a folder ancestor of it */
function _isSelfOrDescendant(nodeId, ancestorId) {
  if (nodeId === ancestorId) return true;
  let cur = ancestorId;
  while (cur) {
    const f = state.project.folders[cur];
    if (!f) break;
    if (f.parentId === nodeId) return true;
    cur = f.parentId;
  }
  return false;
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

  // Drag source (move folder)
  row.draggable = true;
  row.addEventListener('dragstart', e => _onDragStart(e, folder.id, 'folder'));
  row.addEventListener('dragend',   _onDragEnd);

  // Drop target (receive files/folders into this folder)
  row.addEventListener('dragover',  e => _onDragOver(e, folder.id));
  row.addEventListener('dragleave', _onDragLeave);
  row.addEventListener('drop',      e => _onDrop(e, folder.id));

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

  // Drag source (move file)
  row.draggable = true;
  row.addEventListener('dragstart', e => _onDragStart(e, file.id, 'file'));
  row.addEventListener('dragend',   _onDragEnd);

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

  const commit = async () => {
    const newName = input.value.trim();
    input.remove();
    nameEl.style.display = '';

    if (!newName || newName === item.name) { renderExplorer(); return; }

    if (type === 'folder') {
      // Capture old name and parentId BEFORE renaming state
      const oldName  = item.name;
      const parentId = item.parentId;

      if (_fsIsLinked()) {
        try {
          // Flush active files so content is up to date in state
          ['left','right'].forEach(side => {
            const fid = state.panelTabs[side].activeId;
            if (!fid || !state.project.files[fid]) return;
            const lang = extToLang(state.project.files[fid].name);
            const ta = tabsFor(side)[lang]?.ta;
            if (ta) state.project.files[fid].content = ta.value;
          });

          const parentHandle = await _getDirHandleForFolder(parentId);
          // Create new dir
          const newDirHandle = await parentHandle.getDirectoryHandle(newName, { create: true });
          // Copy all children (reads from state.project.files which has current content)
          await _fsCopyDir(newDirHandle, id);
          // Delete old dir — use oldName captured before state mutation
          await parentHandle.removeEntry(oldName, { recursive: true });
          // Now rename in state
          renameFolder(id, newName);
        } catch (e) {
          toast('Folder rename failed: ' + e.message, 3000);
        }
      } else {
        renameFolder(id, newName);
      }

    } else {
      // File rename
      // Flush current textarea content into state first
      ['left','right'].forEach(side => {
        const fid = state.panelTabs[side].activeId;
        if (fid !== id) return;
        const lang = extToLang(state.project.files[fid]?.name || '');
        const ta = tabsFor(side)[lang]?.ta;
        if (ta) state.project.files[fid].content = ta.value;
      });

      const oldContent = state.project.files[id]?.content || '';
      const oldHandle  = _fsHandles[id];
      const parentId   = state.project.files[id]?.parentId ?? null;

      renameFile(id, newName);
      ['left','right'].forEach(s => renderTabBar(s));

      if (_fsIsLinked() && oldHandle) {
        try {
          const dirHandle = await _getDirHandleForFolder(parentId);
          const newHandle = await dirHandle.getFileHandle(newName, { create: true });
          const writable  = await newHandle.createWritable();
          await writable.write(oldContent);
          await writable.close();
          await dirHandle.removeEntry(oldHandle.name).catch(() => {});
          _fsHandles[id] = newHandle;
        } catch (e) {
          toast('File rename failed: ' + e.message, 3000);
        }
      }
    }

    renderExplorer();
  };

  input.addEventListener('blur',   commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { input.remove(); nameEl.style.display = ''; }
  });
}

/* ── Delete confirmation ─────────────────────────────────────── */
async function _confirmDelete(type, item) {
  const label = type === 'folder' ? `folder "${item.name}" and all its contents` : `"${item.name}"`;
  if (!confirm(`Delete ${label}?`)) return;

  if (type === 'folder') {
    // Remove all file handles for files inside this folder
    if (_fsIsLinked()) {
      Object.values(state.project.files).forEach(f => {
        if (_isInFolder(f.id, item.id)) delete _fsHandles[f.id];
      });
      try {
        const parentHandle = await _getDirHandleForFolder(item.parentId);
        await parentHandle.removeEntry(item.name, { recursive: true });
      } catch (e) { /* ignore */ }
    }
    deleteFolder(item.id);
  } else {
    if (_fsIsLinked() && _fsHandles[item.id]) {
      try {
        const parentHandle = await _getDirHandleForFolder(item.parentId);
        await parentHandle.removeEntry(item.name);
      } catch (e) { /* ignore */ }
      delete _fsHandles[item.id];
    }
    deleteFile(item.id);
  }
  renderExplorer();
  ['left','right'].forEach(s => renderTabBar(s));
}

function _isInFolder(fileId, folderId) {
  const file = state.project.files[fileId];
  if (!file) return false;
  let cur = file.parentId;
  while (cur) {
    if (cur === folderId) return true;
    cur = state.project.folders[cur]?.parentId ?? null;
  }
  return false;
}

/* ── New file prompt ─────────────────────────────────────────── */
async function _promptNewFile(parentId = null) {
  const name = prompt('File name (e.g. index.html, style.css, app.js):');
  if (!name || !name.trim()) return;
  const id = createFile(name.trim(), parentId);
  if (!id) return;
  // Expand parent folder if it was collapsed
  if (parentId && state.project.folders[parentId]) {
    state.project.folders[parentId].collapsed = false;
    saveProject();
  }
  // If linked to disk, create the real file on disk immediately
  if (_fsIsLinked()) await fsCreateFile(id, parentId);
  renderExplorer();
  openFileInPanel(_focusedPanel, id);
  renderExplorer();
}

/* ── New folder prompt ───────────────────────────────────────── */
async function _promptNewFolder(parentId = null) {
  const name = prompt('Folder name:');
  if (!name || !name.trim()) return;
  // Expand parent folder if collapsed
  if (parentId && state.project.folders[parentId]) {
    state.project.folders[parentId].collapsed = false;
    saveProject();
  }
  const id = createFolder(name.trim(), parentId);
  // If linked to disk, create the real folder on disk immediately
  if (_fsIsLinked() && id) await fsCreateFolder(id, parentId);
  renderExplorer();
}

/* ── Sidebar header button handlers (called from HTML) ───────── */
function promptNewFile()   { _promptNewFile(null);   }
function promptNewFolder() { _promptNewFolder(null);  }

/* ════════════════════════════════════════════════════════════════
   OPEN FOLDER FOR EDITING (read-write, syncs back to disk)
════════════════════════════════════════════════════════════════ */

// In-memory map: file id → FileSystemFileHandle (not persisted)
const _fsHandles   = {};   // fileId  → FileSystemFileHandle
let   _fsDirHandle = null; // root FileSystemDirectoryHandle
const _fsDirty     = new Set();
const _fsSaveDebounce = {};

function _fsIsLinked() { return !!_fsDirHandle; }

/* Called by editor.js after content is written to state */
function _fsMarkDirty(fileId) {
  if (!_fsDirHandle || !_fsHandles[fileId]) return;
  _fsDirty.add(fileId);
  _renderSidebarTitle();
  clearTimeout(_fsSaveDebounce[fileId]);
  _fsSaveDebounce[fileId] = setTimeout(() => _fsWriteFile(fileId), 1500);
}

async function _fsWriteFile(fileId) {
  const handle = _fsHandles[fileId];
  const file   = state.project.files[fileId];
  if (!handle || !file) return;
  try {
    // Ensure write permission is still granted
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const req = await handle.requestPermission({ mode: 'readwrite' });
      if (req !== 'granted') { toast('Write permission denied for ' + file.name, 3000); return; }
    }
    const writable = await handle.createWritable();
    await writable.write(file.content || '');
    await writable.close();
    _fsDirty.delete(fileId);
    _renderSidebarTitle();
  } catch (e) {
    toast('Save failed – ' + file.name + ': ' + e.message, 4000);
  }
}

/* Ctrl+S / save button: flush active editors then write only dirty files */
async function fsSaveAll() {
  if (!_fsDirHandle) return;

  // Flush active textarea content into state for both panels
  ['left', 'right'].forEach(side => {
    const fid = state.panelTabs[side].activeId;
    if (!fid || !state.project.files[fid]) return;
    const lang = extToLang(state.project.files[fid].name);
    const ta   = tabsFor(side)[lang]?.ta;
    if (ta) {
      state.project.files[fid].content = ta.value;
      // Mark as dirty so it gets written
      if (_fsHandles[fid]) _fsDirty.add(fid);
    }
  });

  // Cancel pending debounced writes — we're doing it now
  Object.keys(_fsSaveDebounce).forEach(fid => clearTimeout(_fsSaveDebounce[fid]));

  const ids = [..._fsDirty].filter(fid => state.project.files[fid] && _fsHandles[fid]);
  if (!ids.length) {
    toast('Nothing to save', 1500);
    return;
  }

  let saved = 0, failed = 0;
  for (const fid of ids) {
    const handle  = _fsHandles[fid];
    const content = state.project.files[fid].content || '';
    try {
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      _fsDirty.delete(fid);
      saved++;
    } catch (e) {
      try {
        await handle.requestPermission({ mode: 'readwrite' });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        _fsDirty.delete(fid);
        saved++;
      } catch (e2) {
        console.error('Save failed:', state.project.files[fid].name, e2);
        failed++;
      }
    }
  }

  _renderSidebarTitle();
  if (failed) toast(`Saved ${saved}, failed ${failed}`, 3000);
  else toast(`Saved ${saved} file${saved !== 1 ? 's' : ''} to disk ✓`, 2000);
}

/* ── Sidebar title showing project name + dirty indicator ──── */
function _renderSidebarTitle() {
  const titleEl   = document.getElementById('sidebarTitle');
  const closeBtn  = document.getElementById('closeProjectBtn');
  const saveBtn   = document.getElementById('saveToDiskBtn');
  if (!titleEl) return;
  if (!_fsDirHandle) {
    titleEl.textContent = 'EXPLORER';
    titleEl.style.color = '';
    titleEl.title = '';
    if (closeBtn) closeBtn.style.display = 'none';
    if (saveBtn)  saveBtn.style.display  = 'none';
    return;
  }
  const dirty = _fsDirty.size > 0;
  titleEl.textContent = _fsDirHandle.name + (dirty ? '  ●' : '  ✓');
  titleEl.style.color = dirty ? 'var(--yellow, #e3b341)' : 'var(--green, #3fb950)';
  titleEl.title = dirty ? 'Unsaved changes — Ctrl+S to save' : 'All changes saved to disk';
  if (closeBtn) closeBtn.style.display = '';
  if (saveBtn) {
    saveBtn.style.display = '';
    saveBtn.title = dirty ? 'Save changes to disk (Ctrl+S)' : 'All saved ✓';
    saveBtn.style.color = dirty ? 'var(--yellow, #e3b341)' : 'var(--green, #3fb950)';
  }
}

/* ── Open folder with read-write access ──────────────────────── */
async function openFolderForEditing() {
  if (!window.showDirectoryPicker) {
    toast('Your browser does not support the File System Access API', 3000);
    return;
  }
  let dirHandle;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch (e) {
    if (e.name !== 'AbortError') toast('Could not open folder: ' + e.message, 3000);
    return;
  }

  toast('Opening…', 60000);
  _clearProject();

  // Reset FS state
  Object.keys(_fsHandles).forEach(k => delete _fsHandles[k]);
  _fsDirty.clear();
  _fsDirHandle = dirHandle;

  await _readDirRW(dirHandle, null);

  saveProject();
  savePanelTabs();
  renderExplorer();
  ['left','right'].forEach(s => renderTabBar(s));
  _renderSidebarTitle();
  toast(`Opened: ${dirHandle.name} — Ctrl+S saves to disk`, 3000);
}

async function _readDirRW(dirHandle, parentId) {
  for await (const [name, entry] of dirHandle.entries()) {
    if (entry.kind === 'directory') {
      if (_shouldSkipDir(name)) continue;
      const folderId = uid();
      state.project.folders[folderId] = { id: folderId, name, parentId, collapsed: false };
      await _readDirRW(entry, folderId);
    } else {
      if (_shouldSkipFile(name)) continue;
      try {
        const f       = await entry.getFile();
        const content = await f.text();
        const id      = uid();
        state.project.files[id] = { id, name, content, parentId };
        _fsHandles[id] = entry; // keep FileSystemFileHandle for writing back
      } catch (_) {}
    }
  }
}

/* ── Recursively copy a folder's files into a new dir handle ─── */
async function _fsCopyDir(newDirHandle, folderId) {
  // Get files in state that belong to this folder
  const childFiles   = Object.values(state.project.files).filter(f => f.parentId === folderId);
  const childFolders = Object.values(state.project.folders).filter(f => f.parentId === folderId);

  // Copy files
  for (const file of childFiles) {
    try {
      const newFileHandle = await newDirHandle.getFileHandle(file.name, { create: true });
      const writable      = await newFileHandle.createWritable();
      await writable.write(file.content || '');
      await writable.close();
      _fsHandles[file.id] = newFileHandle; // update handle to new location
    } catch (e) { /* skip */ }
  }

  // Recurse into subfolders
  for (const folder of childFolders) {
    const subDir = await newDirHandle.getDirectoryHandle(folder.name, { create: true });
    await _fsCopyDir(subDir, folder.id);
  }
}

/* ── Get the directory handle for a folder id ────────────────── */
function _getDirHandleForFolder(folderId) {
  if (!folderId) return _fsDirHandle; // root
  // Walk up to build path parts, then traverse from root
  const parts = [];
  let cur = folderId;
  while (cur) {
    const f = state.project.folders[cur];
    if (!f) break;
    parts.unshift(f.name);
    cur = f.parentId;
  }
  // Traverse from root handle
  return parts.reduce(async (handlePromise, name) => {
    const handle = await handlePromise;
    return handle.getDirectoryHandle(name, { create: true });
  }, Promise.resolve(_fsDirHandle));
}

/* ── Create a real file on disk and register its handle ──────── */
async function fsCreateFile(fileId, parentFolderId) {
  if (!_fsDirHandle) return;
  const file = state.project.files[fileId];
  if (!file) return;
  try {
    const dirHandle = await _getDirHandleForFolder(parentFolderId);
    const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
    // Write empty content to actually create it on disk
    const writable = await fileHandle.createWritable();
    await writable.write('');
    await writable.close();
    _fsHandles[fileId] = fileHandle;
  } catch (e) {
    toast('Could not create ' + file.name + ' on disk: ' + e.message, 3000);
  }
}

/* ── Create a real folder on disk ────────────────────────────── */
async function fsCreateFolder(folderId, parentFolderId) {
  if (!_fsDirHandle) return;
  const folder = state.project.folders[folderId];
  if (!folder) return;
  try {
    const parentHandle = await _getDirHandleForFolder(parentFolderId);
    await parentHandle.getDirectoryHandle(folder.name, { create: true });
  } catch (e) {
    toast('Could not create folder ' + folder.name + ' on disk: ' + e.message, 3000);
  }
}

/* ── Close project (unlink from disk, clear editor) ─────────── */
function closeProject() {
  if (_fsDirty.size > 0) {
    if (!confirm('You have unsaved changes. Close anyway?')) return;
  }
  // Clear FS link
  Object.keys(_fsHandles).forEach(k => delete _fsHandles[k]);
  _fsDirty.clear();
  _fsDirHandle = null;

  _clearProject();
  saveProject();
  savePanelTabs();
  renderExplorer();
  ['left','right'].forEach(s => renderTabBar(s));
  _renderSidebarTitle();
  toast('Project closed', 2000);
}

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
  return SKIP_EXTS.has(ext) || name.startsWith('.') || ext === 'crswap' || name.endsWith('~');
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
  document.getElementById('openFolderBtn')?.addEventListener('click', openFolderForEditing);
  document.getElementById('closeProjectBtn')?.addEventListener('click', closeProject);
  document.getElementById('saveToDiskBtn')?.addEventListener('click', fsSaveAll);

  // Ctrl+S → save all dirty files to disk (only when a folder is linked)
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (_fsIsLinked()) fsSaveAll();
    }
  });

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
  const fileList = document.getElementById('sidebarFileList');
  fileList?.addEventListener('scroll', _closeCtxMenu);

  // Root drop zone: drop onto empty space → move to root (parentId = null)
  fileList?.addEventListener('dragover', e => {
    if (!_dragId) return;
    if (e.target.closest('.explorer-item')) return; // let the item handle it
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });
  fileList?.addEventListener('drop', e => {
    if (e.target.closest('.explorer-item')) return;
    _onDropRoot(e);
  });

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
