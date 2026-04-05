/**
 * src/files.js
 * File CRUD operations for the project file system.
 */

'use strict';

/* ── Create ──────────────────────────────────────────────────── */
function createFile(name) {
  name = name.trim();
  if (!name) return null;
  // Ensure unique name
  const existing = Object.values(state.project.files).map(f => f.name);
  if (existing.includes(name)) {
    // Append a number to make it unique
    let i = 2;
    const base = name.replace(/(\.\w+)$/, '');
    const ext  = name.includes('.') ? '.' + name.split('.').pop() : '';
    while (existing.includes(base + i + ext)) i++;
    name = base + i + ext;
  }
  const id = uid();
  state.project.files[id] = { id, name, content: '' };
  saveProject();
  return id;
}

/* ── Rename ──────────────────────────────────────────────────── */
function renameFile(id, newName) {
  newName = newName.trim();
  if (!newName || !state.project.files[id]) return false;
  state.project.files[id].name = newName;
  saveProject();
  return true;
}

/* ── Delete ──────────────────────────────────────────────────── */
function deleteFile(id) {
  if (!state.project.files[id]) return;
  delete state.project.files[id];
  // Close from any panel that has it open
  ['left', 'right'].forEach(side => {
    const pt = state.panelTabs[side];
    pt.openIds = pt.openIds.filter(i => i !== id);
    if (pt.activeId === id) {
      pt.activeId = pt.openIds[pt.openIds.length - 1] || null;
    }
  });
  saveProject();
  savePanelTabs();
}

/* ── Get sorted file list ────────────────────────────────────── */
function getFilesSorted() {
  return Object.values(state.project.files)
    .sort((a, b) => a.name.localeCompare(b.name));
}
