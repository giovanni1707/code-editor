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

/* ── Starter boilerplate by extension ───────────────────────── */
function _starterContent(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'html': case 'htm':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <script src="main.js"><\/script>
</body>
</html>`;
    case 'css': case 'scss': case 'less': case 'sass':
      return `*, *::before, *::after {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n}\n`;
    case 'js': case 'mjs': case 'cjs':
      return `'use strict';\n\n`;
    case 'ts':
      return `\n`;
    case 'jsx':
      return `function App() {\n  return (\n    <div>\n      <h1>Hello</h1>\n    </div>\n  );\n}\n\nexport default App;\n`;
    case 'tsx':
      return `import React from 'react';\n\nconst App: React.FC = () => {\n  return <div>Hello</div>;\n};\n\nexport default App;\n`;
    case 'json':
      return `{\n  \n}\n`;
    case 'md':
      return `# Title\n\n`;
    case 'svg':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  \n</svg>\n`;
    default:
      return '';
  }
}

function _nextOrder(parentId, collection) {
  const siblings = Object.values(collection).filter(x => x.parentId === parentId);
  return siblings.length ? Math.max(...siblings.map(x => x.order ?? 0)) + 1000 : 1000;
}

function createFile(name, parentId = null) {
  name = name.trim();
  if (!name) return null;
  name = _uniqueFileName(name, parentId);
  const id = uid();
  const order = _nextOrder(parentId, state.project.files);
  state.project.files[id] = { id, name, content: _starterContent(name), parentId, order };
  state.project._v++;
  return id;
}

function renameFile(id, newName) {
  newName = newName.trim();
  if (!newName || !state.project.files[id]) return false;
  state.project.files[id].name = newName; // reactive: tracked via property access
  return true;
}

function deleteFile(id) {
  if (!state.project.files[id]) return;
  delete state.project.files[id]; // delete not tracked by proxy
  state.project._v++;              // notify reactive effects
  ['left', 'right'].forEach(side => {
    const pt = state.panelTabs[side];
    pt.openIds = pt.openIds.filter(i => i !== id);
    if (pt.activeId === id)
      pt.activeId = pt.openIds[pt.openIds.length - 1] || null;
  });
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
  const order = _nextOrder(parentId, state.project.folders);
  state.project.folders[id] = { id, name, parentId, collapsed: false, order };
  state.project._v++; // notify reactive effects (add not tracked by proxy)
  return id;
}

function renameFolder(id, newName) {
  newName = newName.trim();
  if (!newName || !state.project.folders[id]) return false;
  state.project.folders[id].name = newName; // reactive: tracked via property access
  return true;
}

function deleteFolder(id) {
  if (!state.project.folders[id]) return;
  // Recursively delete children
  _deleteFolderContents(id);
  delete state.project.folders[id]; // delete not tracked by proxy
  state.project._v++;                // notify reactive effects
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
  // reactive: .collapsed mutation triggers explorer + project-save effects
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
  // Folders first, then files — each group sorted by order (fallback: name)
  const _byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);

  const folders = Object.values(state.project.folders)
    .filter(f => f.parentId === parentId)
    .sort(_byOrder);

  const files = Object.values(state.project.files)
    .filter(f => f.parentId === parentId)
    .sort(_byOrder);

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
