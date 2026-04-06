/**
 * core/live-preview.js
 * Builds a live HTML document from the three tabs of a given panel
 * and renders it in that panel's own iframe.
 */

'use strict';

/* ── Console interceptor injected into every preview doc ────────── */
const CONSOLE_BRIDGE = `<script>
(function(){
  var _p = window.parent;
  var _side = '__SIDE__';
  function _send(level, args, loc) {
    var serialized = Array.prototype.map.call(args, function(a) {
      if (a === null) return null;
      if (a === undefined) return undefined;
      var t = typeof a;
      if (t === 'string' || t === 'number' || t === 'boolean') return a;
      try { return JSON.parse(JSON.stringify(a)); } catch(e) { return String(a); }
    });
    try { _p.postMessage({ __source: 'ce-preview', side: _side, level: level, args: serialized, loc: loc || null }, '*'); } catch(e){}
  }
  /* Expose globally so user script catch blocks can call it */
  window.__ceLog = _send;
  /* Patterns from third-party libraries that should not surface in the console */
  var _ignore = [/\[Namespace Methods\]/i, /Invalid component or \$destroy/i];
  function _filtered(level, args) {
    var first = args && args[0];
    if (typeof first === 'string') {
      for (var i = 0; i < _ignore.length; i++) {
        if (_ignore[i].test(first)) return;
      }
    }
    _send(level, args);
  }
  ['log','warn','error','info'].forEach(function(m) {
    var orig = console[m].bind(console);
    console[m] = function() { orig.apply(console, arguments); _filtered(m, arguments); };
  });
  var origClear = console.clear.bind(console);
  console.clear = function() { origClear(); try { _p.postMessage({ __source: 'ce-preview', side: _side, level: 'clear', args: [] }, '*'); } catch(e){} };
  var _jsOffset = __JS_LINE_OFFSET__;
  window.addEventListener('error', function(e) {
    var msg = e.message || '';
    /* Ignore opaque cross-origin errors from CDN scripts — the browser
       masks them as "Script error." with no line info for security reasons.
       Also ignore known third-party library internal warnings. */
    if (!e.lineno && !e.colno && msg === 'Script error.') return true;
    if (!e.filename || e.filename === '') return true; // no source = third-party
    var userLine = e.lineno ? Math.max(1, e.lineno - _jsOffset) : null;
    var loc = userLine ? 'line ' + userLine + (e.colno ? ', col ' + e.colno : '') : null;
    _send('error', [msg], loc);
    return true; /* prevent default red error in page */
  });
  window.addEventListener('unhandledrejection', function(e) {
    _send('error', ['Unhandled Promise rejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))]);
  });
})();
\x3C/script>`;

function _countLines(str) {
  let n = 0;
  for (let i = 0; i < str.length; i++) if (str[i] === '\n') n++;
  return n;
}

/* ── Build virtual path for a project file (folder chain/name) ── */
function _virtualPath(file) {
  const parts = [file.name];
  let parentId = file.parentId;
  while (parentId) {
    const folder = state.project.folders[parentId];
    if (!folder) break;
    parts.unshift(folder.name);
    parentId = folder.parentId;
  }
  return parts.join('/');
}

/* ── Pre-build a lookup map: every suffix → file ─────────────── */
function _buildPathIndex() {
  const index = new Map(); // suffix → file (longest suffix wins)
  Object.values(state.project.files).forEach(file => {
    const vp = _virtualPath(file);
    // Index every suffix: "css/main.css", "main.css"
    const parts = vp.split('/');
    for (let i = 0; i < parts.length; i++) {
      const suffix = parts.slice(i).join('/');
      if (!index.has(suffix)) index.set(suffix, file);
    }
  });
  return index;
}

/* ── Strip query string and hash from a URL path ─────────────── */
function _stripQuery(path) {
  return path.replace(/[?#].*$/, '');
}

/* ── Resolve a relative ref against the HTML file's virtual path  */
function _resolvePath(htmlVirtualPath, ref) {
  const baseDir = htmlVirtualPath.includes('/')
    ? htmlVirtualPath.slice(0, htmlVirtualPath.lastIndexOf('/') + 1)
    : '';
  const combined = baseDir + ref;
  const parts = combined.split('/');
  const out = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.') out.push(p);
  }
  return out.join('/');
}

/* ── Find a project file for a given href/src value ──────────── */
function _findProjectFile(ref, htmlVirtualPath, index) {
  // Skip external URLs
  if (/^https?:\/\//i.test(ref) || ref.startsWith('//') || ref.startsWith('data:')) return null;

  const clean = _stripQuery(ref);

  // Try fully resolved path first, then the raw cleaned ref
  const candidates = [
    _resolvePath(htmlVirtualPath, clean),
    clean,
    // Also try stripping the first path segment (project root folder name)
    clean.includes('/') ? clean.slice(clean.indexOf('/') + 1) : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    // Exact match
    if (index.has(candidate)) return index.get(candidate);
    // Strip leading path segments one by one
    const parts = candidate.split('/');
    for (let i = 1; i < parts.length; i++) {
      const suffix = parts.slice(i).join('/');
      if (index.has(suffix)) return index.get(suffix);
    }
  }
  return null;
}

/* ── Inline all resolvable <link> and <script src> in HTML ───── */
function _inlineAssets(html, htmlVirtualPath) {
  const index = _buildPathIndex();

  // <link rel="stylesheet" href="...">  →  <style>...</style>
  html = html.replace(
    /<link\b([^>]*)>/gi,
    (match, attrs) => {
      if (!/rel=["']stylesheet["']/i.test(attrs)) return match;
      const m = attrs.match(/\bhref=["']([^"']+)["']/i);
      if (!m) return match;
      const file = _findProjectFile(m[1], htmlVirtualPath, index);
      if (!file) return match;
      return `<style>/* inlined: ${m[1]} */\n${file.content || ''}\n</style>`;
    }
  );

  // <script src="...">...</script>  →  <script>...</script>
  // Use a two-pass approach: first find all opening <script> tags with src,
  // then replace the full tag including its closing </script>
  html = html.replace(
    /<script\b([^>]*\bsrc=["'][^"']+["'][^>]*)>([\s\S]*?)<\/script>/gi,
    (match, attrs, inner) => {
      const m = attrs.match(/\bsrc=["']([^"']+)["']/i);
      if (!m) return match;
      const file = _findProjectFile(m[1], htmlVirtualPath, index);
      if (!file) return match;
      // Drop src attribute, keep others (e.g. defer, async — but not type="module"
      // since inlined scripts can't be modules)
      const otherAttrs = attrs
        .replace(/\bsrc=["'][^"']+["']/i, '')
        .replace(/\btype=["']module["']/i, '')
        .trim();
      return `<script${otherAttrs ? ' ' + otherAttrs : ''}>/* inlined: ${m[1]} */\n${file.content || ''}\n\x3C/script>`;
    }
  );

  return html;
}

/* ── Gather HTML/CSS/JS from open project files ──────────────── */
function _getPreviewSources(side) {
  // Flush current textarea content to the active file first
  if (typeof flushAllPanels === 'function') flushAllPanels();

  const activeId = state.panelTabs[side].activeId;
  const activeFile = activeId ? state.project.files[activeId] : null;
  const activeExt  = activeFile ? activeFile.name.split('.').pop().toLowerCase() : '';

  const openIds = state.panelTabs[side].openIds;
  const files   = openIds.map(id => state.project.files[id]).filter(Boolean);

  // Priority: always use the active file's type first, then fall back to any open file
  const findExt = exts => {
    // 1. Active file matches requested type → use it
    if (activeFile && exts.includes(activeExt)) return activeFile.content || '';
    // 2. Otherwise find first open file of that type
    const f = files.find(f => exts.includes(f.name.split('.').pop().toLowerCase()));
    return f ? f.content : '';
  };

  // Determine htmlFile: active file if it's HTML, otherwise first open HTML
  const isActiveHtml = activeFile && ['html','htm'].includes(activeExt);
  const htmlFile = isActiveHtml
    ? activeFile
    : files.find(f => ['html','htm'].includes(f.name.split('.').pop().toLowerCase()));

  return {
    html:            findExt(['html', 'htm']),
    css:             findExt(['css', 'scss', 'less']),
    js:              findExt(['js', 'ts', 'mjs', 'jsx', 'tsx']),
    htmlVirtualPath: htmlFile ? _virtualPath(htmlFile) : 'index.html',
  };
}

function buildLiveDoc(side) {
  const src  = _getPreviewSources(side);
  let   html = src.html || tabsFor(side).html.ta.value;
  const css  = src.css  || tabsFor(side).css.ta.value;
  const js   = src.js   || tabsFor(side).js.ta.value;
  const bridge = CONSOLE_BRIDGE.replace('__SIDE__', side);

  const CURSOR_RESET = `<style>a,button,[onclick],label,select,input[type="submit"],input[type="button"],input[type="reset"],input[type="checkbox"],input[type="radio"],input[type="range"],[role="button"],summary{cursor:pointer}</style>`;

  // If the HTML tab already contains a full document, inline referenced assets first
  if (/<!DOCTYPE|<html/i.test(html)) {
    let doc = _inlineAssets(html, src.htmlVirtualPath);
    doc = doc.replace('</head>', `${CURSOR_RESET}\n</head>`);
    // Only inject the editor CSS/JS panes if the user has content in them AND
    // they are not already referenced inside the HTML (avoid double-injection)
    if (css && !src.html) doc = doc.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
    // Calculate JS offset before inserting bridge
    const headEnd  = doc.indexOf('<head>') + '<head>'.length + 1;
    const beforeJs = doc.slice(0, doc.indexOf('</body>'));
    const jsOffset = _countLines(bridge) + _countLines(beforeJs.slice(headEnd)) + 3;
    const finalBr  = bridge.replace('__JS_LINE_OFFSET__', jsOffset);
    doc = doc.replace('<head>', `<head>\n${finalBr}`);
    if (js && !src.html) doc = doc.replace('</body>',
      `<script>\ntry{\n${js}\n}catch(e){window.__ceLog('error',[e.toString()]);}\n\x3C/script>\n</body>`);
    return doc;
  }

  // Build the final document with a dummy offset first, then measure the real offset
  const finalBridgeDummy = bridge.replace('__JS_LINE_OFFSET__', '0');

  const beforeJs = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${finalBridgeDummy}
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; font-size: 14px; }
    a, button, [onclick], label, select, input[type="submit"], input[type="button"],
    input[type="reset"], input[type="checkbox"], input[type="radio"], input[type="range"],
    [role="button"], summary { cursor: pointer; }
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
try {
`;
  // jsOffset = number of lines before user JS line 1 in the actual rendered doc
  const jsOffset    = _countLines(beforeJs);
  const finalBridge = bridge.replace('__JS_LINE_OFFSET__', jsOffset);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${finalBridge}
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; font-size: 14px; }
    a, button, [onclick], label, select, input[type="submit"], input[type="button"],
    input[type="reset"], input[type="checkbox"], input[type="radio"], input[type="range"],
    [role="button"], summary { cursor: pointer; }
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
try {
${js}
} catch(e) {
  window.__ceLog('error', [e.toString()]);
}
  \x3C/script>
</body>
</html>`;
}

const _previewBlobUrls = { left: null, right: null };

function renderLivePreview(side) {
  clearConsole(side);
  const frame = side === 'left' ? el.previewFrameL : el.previewFrameR;
  // Revoke previous blob URL to avoid memory leak
  if (_previewBlobUrls[side]) {
    URL.revokeObjectURL(_previewBlobUrls[side]);
    _previewBlobUrls[side] = null;
  }
  const blob = new Blob([buildLiveDoc(side)], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  _previewBlobUrls[side] = url;
  frame.src = url;
}

/* ── Hidden console iframes (always present, never visible) ──── */
const _consoleFrames = {};

function _getConsoleFrame(side) {
  if (_consoleFrames[side]) return _consoleFrames[side];
  const f = document.createElement('iframe');
  f.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden;pointer-events:none;';
  f.setAttribute('sandbox', 'allow-scripts');
  document.body.appendChild(f);
  _consoleFrames[side] = f;
  return f;
}

const _consoleBlobUrls = { left: null, right: null };

function runConsoleOnly(side) {
  clearConsole(side);
  const frame = _getConsoleFrame(side);
  if (_consoleBlobUrls[side]) {
    URL.revokeObjectURL(_consoleBlobUrls[side]);
    _consoleBlobUrls[side] = null;
  }
  const blob = new Blob([buildLiveDoc(side)], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  _consoleBlobUrls[side] = url;
  frame.src = url;
}

const _liveDebounce    = { left: null, right: null };
const _consoleDebounce = { left: null, right: null };

function scheduleLivePreview(side) {
  clearTimeout(_liveDebounce[side]);
  _liveDebounce[side] = setTimeout(() => renderLivePreview(side), 280);
}

function scheduleConsoleRun(side) {
  // Clear immediately so stale errors/logs vanish as soon as the user types
  clearConsole(side);
  clearTimeout(_consoleDebounce[side]);
  _consoleDebounce[side] = setTimeout(() => runConsoleOnly(side), 300);
}

/* ── Wire the refresh + popout buttons ───────────────────────── */
function _popout(side) {
  const doc = buildLiveDoc(side);
  const blob = new Blob([doc], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const tab  = window.open(url, '_blank');
  // Revoke the blob URL after the tab has had time to load it
  if (tab) tab.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
  else URL.revokeObjectURL(url); // blocked by popup blocker — clean up immediately
}

function wireLivePreview() {
  el.refreshBtnL.addEventListener('click', () => renderLivePreview('left'));
  el.refreshBtnR.addEventListener('click', () => renderLivePreview('right'));
  el.popoutBtnL.addEventListener('click',  () => _popout('left'));
  el.popoutBtnR.addEventListener('click',  () => _popout('right'));
}
