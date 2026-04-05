/**
 * core/export.js
 * Export panel content as a self-contained HTML file,
 * or download individual HTML / CSS / JS files.
 */

'use strict';

function _buildExportDoc(side) {
  const tabs = tabsFor(side);
  const html = tabs.html.ta.value;
  const css  = tabs.css.ta.value;
  const js   = tabs.js.ta.value;

  // If already a full document, inject CSS and JS
  if (/<!DOCTYPE|<html/i.test(html)) {
    let doc = html;
    if (css) doc = doc.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
    if (js)  doc = doc.replace('</body>', `<script>\n${js}\n\x3C/script>\n</body>`);
    return doc;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Exported</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; }
${css}
  </style>
</head>
<body>
${html}
  <script>
${js}
  \x3C/script>
</body>
</html>`;
}

function _download(filename, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBundle(side) {
  _download('index.html', _buildExportDoc(side), 'text/html');
  toast('Downloaded index.html');
}

function exportFile(side, lang) {
  const tabs = tabsFor(side);
  const ext  = LANG_META[lang].ext;
  const mime = lang === 'js' ? 'text/javascript' : lang === 'css' ? 'text/css' : 'text/html';
  _download(`index.${ext}`, tabs[lang].ta.value, mime);
  toast(`Downloaded index.${ext}`);
}

function wireExport() { /* export UI removed */ }
function wireExportMenus() { /* export UI removed */ }

/* ════════════════════════════════════════════════════════════════
   SAVE PROJECT TO COMPUTER
════════════════════════════════════════════════════════════════ */

/**
 * Build a flat list of { path: 'folder/sub/file.ext', content: '...' }
 * for every file in the project, preserving folder structure.
 */
function _getProjectFileList() {
  // Flush active editor content into state first
  if (typeof flushAllPanels === 'function') flushAllPanels();

  // Find the single root folder (if all files share one top-level folder,
  // strip it so files are written directly into the chosen save directory)
  const rootFolders = Object.values(state.project.folders).filter(f => !f.parentId);
  const stripRoot   = rootFolders.length === 1 ? rootFolders[0].id : null;

  function folderPathStripped(folderId) {
    if (!folderId) return '';
    const parts = [];
    let cur = folderId;
    while (cur) {
      const f = state.project.folders[cur];
      if (!f) break;
      // Skip the single root folder so it isn't duplicated in the path
      if (cur !== stripRoot) parts.unshift(f.name);
      cur = f.parentId;
    }
    return parts.join('/');
  }

  return Object.values(state.project.files).map(file => {
    const dir  = folderPathStripped(file.parentId);
    const path = dir ? dir + '/' + file.name : file.name;
    return { path, content: file.content || '' };
  });
}

/* ── Save via File System Access API (Chrome/Edge) ───────────── */
async function _saveViaFSA(files) {
  let dirHandle;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch (e) {
    if (e.name !== 'AbortError') toast('Could not open folder: ' + e.message, 3000);
    return false;
  }

  // Helper: get-or-create nested directory handle
  async function getDir(handle, parts) {
    let cur = handle;
    for (const part of parts) {
      cur = await cur.getDirectoryHandle(part, { create: true });
    }
    return cur;
  }

  let count = 0;
  for (const { path, content } of files) {
    const parts    = path.split('/');
    const fileName = parts.pop();
    const dirH     = await getDir(dirHandle, parts);
    const fileH    = await dirH.getFileHandle(fileName, { create: true });
    const writable  = await fileH.createWritable();
    await writable.write(content);
    await writable.close();
    count++;
  }

  toast(`Project saved — ${count} file${count !== 1 ? 's' : ''} written`, 3000);
  return true;
}

/* ── Save project ZIP as download (using fflate) ─────────────── */
function _saveAsZip(files) {
  const projectName = _guessProjectName();
  const enc = new TextEncoder();

  // Build fflate input: { 'path/to/file.js': Uint8Array }
  const zipInput = {};
  for (const { path, content } of files) {
    zipInput[path] = enc.encode(content);
  }

  fflate.zip(zipInput, { level: 6 }, (err, data) => {
    if (err) { toast('ZIP error: ' + err.message, 3000); return; }
    const blob = new Blob([data], { type: 'application/zip' });
    _download(projectName + '.zip', blob, 'application/zip');
    toast(`Downloaded ${projectName}.zip — ${files.length} file${files.length !== 1 ? 's' : ''}`, 3000);
  });
}

function _guessProjectName() {
  // Use the root folder name if there's exactly one root folder
  const rootFolders = Object.values(state.project.folders).filter(f => !f.parentId);
  if (rootFolders.length === 1) return rootFolders[0].name;
  // Fall back to first HTML file name without extension
  const html = Object.values(state.project.files).find(f => f.name.endsWith('.html'));
  if (html) return html.name.replace(/\.html?$/i, '');
  return 'project';
}

/* ── Entry point: try FSA first, fall back to ZIP download ───── */
async function saveProjectToDisk() {
  const files = _getProjectFileList();
  if (!files.length) { toast('No files to save', 2000); return; }
  _saveAsZip(files);
}

function wireSaveProject() {
  document.getElementById('saveProjectBtn')?.addEventListener('click', saveProjectToDisk);
}
