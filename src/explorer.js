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

  // parentId mutation tracked reactively; _v bump covers the collapsed = false change
  state.project._v++;
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
  // parentId mutation tracked reactively by explorer effect
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

  // Drop target (receive internal moves OR external files into this folder)
  row.addEventListener('dragover', e => {
    if (_dragId) { _onDragOver(e, folder.id); return; }
    if (Array.from(e.dataTransfer.types || []).includes('Files')) {
      e.preventDefault();
      e.stopPropagation(); // don't bubble to sidebar ext handler
      e.dataTransfer.dropEffect = 'copy';
      row.classList.add('drag-over');
    }
  });
  row.addEventListener('dragleave', e => {
    _onDragLeave(e);
  });
  row.addEventListener('drop', e => {
    if (_dragId) { _onDrop(e, folder.id); return; }
    if (Array.from(e.dataTransfer.types || []).includes('Files')) {
      e.stopPropagation();
      row.classList.remove('drag-over');
      const sidebar = document.getElementById('sidebar');
      sidebar?.classList.remove('ext-drag-over');
      _handleExternalDrop(e, sidebar, folder.id);
    }
  });

  // Click → toggle collapse
  row.addEventListener('click', e => {
    if (e.target.closest('.file-actions')) return;
    if (e.target.classList.contains('rename-input')) return;
    toggleFolderCollapse(folder.id); // reactive: collapsed mutation triggers explorer effect
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
    openFileInPanel(_focusedPanel, file.id); // reactive: activeId mutation triggers explorer + tab effects
  });

  // Double-click → rename
  row.addEventListener('dblclick', e => {
    e.stopPropagation();
    _startRename(row, file.id, nameEl, 'file');
  });

  // Right-click → context menu
  row.addEventListener('contextmenu', e => {
    e.preventDefault();
    const items = [
      { label: 'Open in Left Panel',  action: () => openFileInPanel('left',  file.id) },
      { label: 'Open in Right Panel', action: () => openFileInPanel('right', file.id) },
      '-',
    ];
    // Show save/revert options only when autosave is off and file has unsaved changes
    if (!state.settings.autosave && isFileDirty(file.id)) {
      items.push({ label: '💾 Save Changes', action: () => _saveFileChanges(file.id) });
      items.push({ label: '↩ Revert Changes', action: () => _revertFileChanges(file.id, file.name) });
      items.push('-');
    }
    items.push({ label: 'Rename', action: () => _startRename(row, file.id, nameEl, 'file') });
    items.push({ label: 'Delete', action: () => _confirmDelete('file', file) });
    _showCtxMenu(e.clientX, e.clientY, items);
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

    if (!newName || newName === item.name) return; // no state change, explorer unchanged

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

      renameFile(id, newName); // reactive: name mutation triggers explorer + tab-bar effects

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

    // explorer and tab-bar re-render handled by reactive effects
  };

  input.addEventListener('blur',   commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { input.remove(); nameEl.style.display = ''; }
  });
}

/* ── Save / Revert unsaved changes ──────────────────────────── */
function _saveFileChanges(fileId) {
  // Flush textarea content → project state, then persist
  flushAllPanels();
  saveProject();
  markTabDirty(fileId, false);
  toast('Saved', 1500);
}

function _revertFileChanges(fileId, fileName) {
  _showRevertModal(fileId, fileName);
}

function _showRevertModal(fileId, fileName) {
  // Build overlay
  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.style.zIndex = '9999';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.width = '360px';
  modal.innerHTML = `
    <div class="modal-hd">
      <span class="modal-title">↩ Revert Changes</span>
    </div>
    <p style="font-size:13px;color:var(--txt1);margin:0 0 20px">
      Discard unsaved changes to <strong style="color:var(--txt0)">${fileName}</strong>?
      This cannot be undone.
    </p>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button id="_revertCancel"  style="padding:6px 16px;border:1px solid var(--border);border-radius:5px;background:var(--bg3);color:var(--txt0);font-size:12px;cursor:pointer">Cancel</button>
      <button id="_revertConfirm" style="padding:6px 16px;border:1px solid var(--red);border-radius:5px;background:var(--red);color:#fff;font-size:12px;cursor:pointer;font-weight:600">Revert</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  modal.querySelector('#_revertCancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  modal.querySelector('#_revertConfirm').addEventListener('click', () => {
    close();
    // Restore content from last saved project state
    const saved = JSON.parse(localStorage.getItem('ce:project') || 'null');
    const savedFile = saved && saved.files && saved.files[fileId];
    const content = savedFile ? (savedFile.content || '') : '';

    // Write back to state
    if (state.project.files[fileId]) {
      state.project.files[fileId].content = content;
    }

    // Reload into any panel surface that has this file active
    ['left', 'right'].forEach(side => {
      if (state.panelTabs[side].activeId === fileId) {
        const lang = extToLang(state.project.files[fileId].name);
        const t = tabsFor(side)[lang];
        t.ta.value = content;
        refreshHL(t.ta, t.hl, lang);
        updateGutter(t.ta, t.gutter);
      }
    });

    markTabDirty(fileId, false);
    toast('Reverted', 1500);
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
  // _v bump inside deleteFile/deleteFolder triggers explorer + tab-bar effects
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
    // reactive: collapsed mutation triggers explorer effect
  }
  // If linked to disk, create the real file on disk immediately
  if (_fsIsLinked()) await fsCreateFile(id, parentId);
  _renderSidebarTitle();
  openFileInPanel(_focusedPanel, id);
  // createFile already bumped _v; openFileInPanel mutates activeId — both trigger effects
}

/* ── New folder prompt ───────────────────────────────────────── */
async function _promptNewFolder(parentId = null) {
  const name = prompt('Folder name:');
  if (!name || !name.trim()) return;
  // Expand parent folder if collapsed
  if (parentId && state.project.folders[parentId]) {
    state.project.folders[parentId].collapsed = false;
    // reactive: collapsed mutation tracked
  }
  const id = createFolder(name.trim(), parentId);
  // If linked to disk, create the real folder on disk immediately
  if (_fsIsLinked() && id) await fsCreateFolder(id, parentId);
  // createFolder already bumped _v — explorer effect handles re-render
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
  const titleEl  = document.getElementById('sidebarTitle');
  const closeBtn = document.getElementById('closeProjectBtn');
  const saveBtn  = document.getElementById('saveToDiskBtn');
  if (!titleEl) return;

  const hasFiles = Object.keys(state.project.files).length > 0 ||
                   Object.keys(state.project.folders).length > 0;

  // Close button: visible whenever there is an open project (linked or imported)
  if (closeBtn) closeBtn.style.display = hasFiles ? '' : 'none';

  if (!_fsDirHandle) {
    // Imported project (no disk link) — show project name from root folder or generic
    if (hasFiles) {
      const rootFolders = Object.values(state.project.folders).filter(f => !f.parentId);
      const name = rootFolders.length === 1 ? rootFolders[0].name : 'PROJECT';
      titleEl.textContent = name;
      titleEl.style.color = '';
      titleEl.title = 'Imported project (read-only — use 📂 to open for editing)';
    } else {
      titleEl.textContent = 'EXPLORER';
      titleEl.style.color = '';
      titleEl.title = '';
    }
    if (saveBtn) saveBtn.style.display = 'none';
    return;
  }

  // Disk-linked project
  const dirty = _fsDirty.size > 0;
  titleEl.textContent = _fsDirHandle.name + (dirty ? '  ●' : '  ✓');
  titleEl.style.color = dirty ? 'var(--yellow, #e3b341)' : 'var(--green, #3fb950)';
  titleEl.title = dirty ? 'Unsaved changes — Ctrl+S to save' : 'All changes saved to disk';
  if (saveBtn) {
    saveBtn.style.display = '';
    saveBtn.title  = dirty ? 'Save changes to disk (Ctrl+S)' : 'All saved ✓';
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

  saveProject();   // keep explicit: bulk load, want immediate persistence
  savePanelTabs();
  state.project._v++; // single bump triggers explorer + tab-bar effects
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
  saveProject();   // keep explicit: clear is destructive, persist immediately
  savePanelTabs();
  // _clearProject sets files/folders to {} and panelTabs — reactive effects handle re-render
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

  saveProject();   // keep explicit: bulk import, want immediate persistence
  savePanelTabs();
  state.project._v++; // single bump triggers explorer + tab-bar effects
  _renderSidebarTitle();
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
  saveProject();   // keep explicit: bulk import, want immediate persistence
  savePanelTabs();
  state.project._v++; // single bump triggers explorer + tab-bar effects
  _renderSidebarTitle();
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

/* ════════════════════════════════════════════════════════════════
   EXTERNAL DRAG-AND-DROP (files / folders from desktop / OS)
════════════════════════════════════════════════════════════════ */

/* Read a FileSystemEntry tree into state under a given parentId */
async function _importEntry(entry, parentId) {
  if (entry.isFile) {
    if (_shouldSkipFile(entry.name)) return;
    try {
      const file = await new Promise((res, rej) => entry.file(res, rej));
      const content = await file.text();
      const id = uid();
      state.project.files[id] = { id, name: entry.name, content, parentId };
      if (_fsIsLinked()) {
        // If a disk folder is open, write the file there too
        try {
          const dirHandle = await _getDirHandleForFolder(parentId);
          const fh = await dirHandle.getFileHandle(entry.name, { create: true });
          const w  = await fh.createWritable();
          await w.write(content);
          await w.close();
          _fsHandles[id] = fh;
        } catch (_) {}
      }
    } catch (_) {}
  } else if (entry.isDirectory) {
    if (_shouldSkipDir(entry.name)) return;
    const folderId = uid();
    state.project.folders[folderId] = { id: folderId, name: entry.name, parentId, collapsed: false };
    if (_fsIsLinked()) {
      try {
        const dirHandle = await _getDirHandleForFolder(parentId);
        await dirHandle.getDirectoryHandle(entry.name, { create: true });
      } catch (_) {}
    }
    const reader = entry.createReader();
    const readAll = () => new Promise((res, rej) => {
      const all = [];
      const batch = () => reader.readEntries(entries => {
        if (!entries.length) return res(all);
        all.push(...entries);
        batch();
      }, rej);
      batch();
    });
    const children = await readAll();
    for (const child of children) await _importEntry(child, folderId);
  }
}

/* Determine target parentId from the drop point in the sidebar */
function _dropTargetParentId(e) {
  const itemEl = e.target.closest('.explorer-item');
  if (!itemEl) return null; // dropped on empty space → root
  const id = itemEl.dataset.id;
  // If dropped on a folder row → use that folder as parent
  if (itemEl.classList.contains('explorer-folder')) return id;
  // Dropped on a file row → use its parent folder
  const file = state.project.files[id];
  return file ? (file.parentId ?? null) : null;
}

/* Handle an external drop event (DataTransfer contains real OS files) */
async function _handleExternalDrop(e, sidebar, parentIdOverride) {
  e.preventDefault();
  if (sidebar) sidebar.classList.remove('ext-drag-over');

  const items = Array.from(e.dataTransfer.items || []);
  if (!items.length) return;

  const entries = items
    .filter(i => i.kind === 'file')
    .map(i => i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)
    .filter(Boolean);

  if (!entries.length) return;

  const parentId = parentIdOverride !== undefined ? parentIdOverride : _dropTargetParentId(e);

  // Expand the target folder so the user sees the new items
  if (parentId && state.project.folders[parentId]) {
    state.project.folders[parentId].collapsed = false;
  }

  toast('Importing…', 60000);
  for (const entry of entries) await _importEntry(entry, parentId);

  saveProject();
  state.project._v++;
  _renderSidebarTitle();
  toast(`Imported ${entries.length} item${entries.length !== 1 ? 's' : ''}`, 2500);
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
    startW   = sidebar.offsetWidth;   // offsetWidth: integer, no reflow
    sidebar.style.transition = 'none'; // disable CSS transition during drag
    document.body.style.userSelect = 'none';
    _shieldOn('col-resize');
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const w = Math.max(140, Math.min(480, startW + e.clientX - startX));
    sidebar.style.width = w + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    sidebar.style.transition = ''; // restore CSS transition
    document.body.style.userSelect = '';
    _shieldOff();
    try { localStorage.setItem('ce:sidebarW', sidebar.offsetWidth); } catch (_) {}
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

  // ── External drag-and-drop from desktop / OS ────────────────
  const sidebar = document.getElementById('sidebar');
  let _extDragCounter = 0; // track nested dragenter/dragleave pairs

  sidebar?.addEventListener('dragenter', e => {
    if (_dragId) return; // internal drag — ignore
    const hasFiles = Array.from(e.dataTransfer.types || []).includes('Files');
    if (!hasFiles) return;
    _extDragCounter++;
    sidebar.classList.add('ext-drag-over');
    e.preventDefault();
  });

  sidebar?.addEventListener('dragover', e => {
    if (_dragId) return;
    const hasFiles = Array.from(e.dataTransfer.types || []).includes('Files');
    if (!hasFiles) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  sidebar?.addEventListener('dragleave', e => {
    if (_dragId) return;
    _extDragCounter--;
    if (_extDragCounter <= 0) {
      _extDragCounter = 0;
      sidebar.classList.remove('ext-drag-over');
    }
  });

  sidebar?.addEventListener('drop', e => {
    if (_dragId) return; // internal reorder — already handled above
    _extDragCounter = 0;
    const hasFiles = Array.from(e.dataTransfer.types || []).includes('Files');
    if (!hasFiles) return;
    _handleExternalDrop(e, sidebar);
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
