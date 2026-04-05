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
  const blob = new Blob([content], { type: mime });
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
