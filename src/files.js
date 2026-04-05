/**
 * src/files.js
 * File and folder CRUD for the project tree.
 *
 * Data shapes:
 *   file:   { id, name, content, parentId }   parentId = folderId | null
 *   folder: { id, name, parentId, collapsed }  parentId = folderId | null
 */

'use strict';

/* ════════════════════════════════════════════════════════════════
   FILES
════════════════════════════════════════════════════════════════ */

function createFile(name, parentId = null) {
  name = name.trim();
  if (!name) return null;
  name = _uniqueFileName(name, parentId);
  const id = uid();
  state.project.files[id] = { id, name, content: '', parentId };
  saveProject();
  return id;
}

function renameFile(id, newName) {
  newName = newName.trim();
  if (!newName || !state.project.files[id]) return false;
  state.project.files[id].name = newName;
  saveProject();
  return true;
}

function deleteFile(id) {
  if (!state.project.files[id]) return;
  delete state.project.files[id];
  ['left', 'right'].forEach(side => {
    const pt = state.panelTabs[side];
    pt.openIds = pt.openIds.filter(i => i !== id);
    if (pt.activeId === id)
      pt.activeId = pt.openIds[pt.openIds.length - 1] || null;
  });
  saveProject();
  savePanelTabs();
}

/* ── Ensure unique name within the same parent ───────────────── */
function _uniqueFileName(name, parentId) {
  const siblings = Object.values(state.project.files)
    .filter(f => f.parentId === parentId)
    .map(f => f.name);
  if (!siblings.includes(name)) return name;
  const dot  = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext  = dot > 0 ? name.slice(dot)    : '';
  let i = 2;
  while (siblings.includes(base + i + ext)) i++;
  return base + i + ext;
}

/* ════════════════════════════════════════════════════════════════
   FOLDERS
════════════════════════════════════════════════════════════════ */

function createFolder(name, parentId = null) {
  name = name.trim();
  if (!name) return null;
  name = _uniqueFolderName(name, parentId);
  const id = uid();
  state.project.folders[id] = { id, name, parentId, collapsed: false };
  saveProject();
  return id;
}

function renameFolder(id, newName) {
  newName = newName.trim();
  if (!newName || !state.project.folders[id]) return false;
  state.project.folders[id].name = newName;
  saveProject();
  return true;
}

function deleteFolder(id) {
  if (!state.project.folders[id]) return;
  // Recursively delete children
  _deleteFolderContents(id);
  delete state.project.folders[id];
  saveProject();
  savePanelTabs();
}

function _deleteFolderContents(folderId) {
  // Delete child files
  Object.values(state.project.files).forEach(f => {
    if (f.parentId === folderId) deleteFile(f.id);
  });
  // Recursively delete child folders
  Object.values(state.project.folders).forEach(f => {
    if (f.parentId === folderId) {
      _deleteFolderContents(f.id);
      delete state.project.folders[f.id];
    }
  });
}

function toggleFolderCollapse(id) {
  if (!state.project.folders[id]) return;
  state.project.folders[id].collapsed = !state.project.folders[id].collapsed;
  saveProject();
}

function _uniqueFolderName(name, parentId) {
  const siblings = Object.values(state.project.folders)
    .filter(f => f.parentId === parentId)
    .map(f => f.name);
  if (!siblings.includes(name)) return name;
  let i = 2;
  while (siblings.includes(name + i)) i++;
  return name + i;
}

/* ════════════════════════════════════════════════════════════════
   TREE HELPERS
════════════════════════════════════════════════════════════════ */

/**
 * Build a sorted tree of { type, item, depth, children } nodes
 * for rendering. Returns a flat array in display order.
 */
function getTreeFlat() {
  const result = [];
  _walkTree(null, 0, result);
  return result;
}

function _walkTree(parentId, depth, result) {
  // Folders first (sorted by name), then files (sorted by name)
  const folders = Object.values(state.project.folders)
    .filter(f => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const files = Object.values(state.project.files)
    .filter(f => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  folders.forEach(folder => {
    result.push({ type: 'folder', item: folder, depth });
    if (!folder.collapsed) {
      _walkTree(folder.id, depth + 1, result);
    }
  });

  files.forEach(file => {
    result.push({ type: 'file', item: file, depth });
  });
}

/* Legacy helper kept for backward compat */
function getFilesSorted() {
  return Object.values(state.project.files)
    .sort((a, b) => a.name.localeCompare(b.name));
}
