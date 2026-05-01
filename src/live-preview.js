/**
 * core/live-preview.js
 * Builds a live HTML document from the three tabs of a given panel
 * and renders it in that panel's own iframe.
 */

'use strict';

/* ── Console interceptor injected into every preview doc ────────── */
const CONSOLE_BRIDGE = `<script>
(function(){
  var _p = window.parent !== window ? window.parent : window.top;
  var _side = '__SIDE__';
  function _send(level, args) {
    var serialized = Array.prototype.map.call(args, function(a) {
      if (a === null) return null;
      if (a === undefined) return undefined;
      var t = typeof a;
      if (t === 'string' || t === 'number' || t === 'boolean') return a;
      try { return JSON.parse(JSON.stringify(a)); } catch(e) { return String(a); }
    });
    try { _p.postMessage({ __source: 'ce-preview', side: _side, level: level, args: serialized }, '*'); } catch(e){}
  }
  /* Expose globally so user script catch blocks can call it */
  window.__ceLog = _send;
  ['log','warn','error','info'].forEach(function(m) {
    var orig = console[m].bind(console);
    console[m] = function() {
      orig.apply(console, arguments);
      _send(m, arguments);
    };
  });
  var origClear = console.clear.bind(console);
  console.clear = function() { origClear(); try { _p.postMessage({ __source: 'ce-preview', side: _side, level: 'clear', args: [] }, '*'); } catch(e){} };
  window.addEventListener('error', function(e) {
    var msg = e.message || '';
    /* Ignore opaque cross-origin errors from CDN scripts — the browser
       masks them as "Script error." with no line info for security reasons.
       Also ignore known third-party library internal warnings. */
    if (!e.lineno && !e.colno && msg === 'Script error.') return true;
    if (!e.filename || e.filename === '') return true; // no source = third-party
    _send('error', [msg]);
    return true; /* prevent default red error in page */
  });
  window.addEventListener('unhandledrejection', function(e) {
    _send('error', ['Unhandled Promise rejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))]);
  });
})();
\x3C/script>`;


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

/* ── Convert relative ES module imports to blob: URLs ────────── */
// Recursively creates blob URLs for each imported project file so that
// import { x } from './foo.js' works inside a blob: URL iframe.
function _moduleToBlob(content, virtualPath, index, cache = new Map()) {
  if (cache.has(virtualPath)) return cache.get(virtualPath);

  // Rewrite relative import/export specifiers to blob: URLs
  const rewritten = content.replace(
    /\b(import|export)\b([\s\S]*?)\bfrom\s*(['"])(\.{1,2}\/[^'"]+)\3/g,
    (match, kw, middle, q, specifier) => {
      const resolved = _resolvePath(virtualPath, specifier);
      const file = index.get(resolved) ||
        // fallback: strip leading segments
        (() => { const p = resolved.split('/'); for (let i=1;i<p.length;i++) { const f=index.get(p.slice(i).join('/')); if(f) return f; } return null; })();
      if (!file) return match;
      const depContent = _moduleToBlob(file.content || '', _virtualPath(file), index, cache);
      const depBlob = new Blob([depContent], { type: 'application/javascript' });
      const depUrl  = URL.createObjectURL(depBlob);
      return `${kw}${middle}from ${q}${depUrl}${q}`;
    }
  );

  cache.set(virtualPath, rewritten);
  return rewritten;
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
      // Drop only the src attribute; preserve type="module" and all other attrs
      const otherAttrs = attrs
        .replace(/\bsrc=["'][^"']+["']/i, '')
        .trim();
      const isModule = /\btype=["']module["']/i.test(attrs);
      // For module scripts, rewrite relative imports to blob: URLs so they resolve
      const fileContent = isModule
        ? _moduleToBlob(file.content || '', _virtualPath(file), index, new Map())
        : (file.content || '');
      return `<script${otherAttrs ? ' ' + otherAttrs : ''}>/* inlined: ${m[1]} */\n${fileContent}\n\x3C/script>`;
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
    _activeFile:     activeFile,
    htmlVirtualPath: htmlFile ? _virtualPath(htmlFile) : 'index.html',
  };
}

/* ── Lightweight Markdown → HTML renderer ────────────────────── */
function _mdToHtml(md) {
  // Escape HTML entities in a string (for code blocks)
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Fenced code blocks first (``` ... ```)
  md = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="language-${lang || 'text'}">${esc(code.trimEnd())}</code></pre>`);

  // Horizontal rule
  md = md.replace(/^(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '<hr>');

  // ATX headings
  md = md.replace(/^(#{1,6})\s+(.+)$/gm, (_, h, t) =>
    `<h${h.length}>${t.trim()}</h${h.length}>`);

  // Blockquote
  md = md.replace(/^>\s?(.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered list items  → wrap later
  md = md.replace(/^[\*\-\+]\s+(.+)$/gm, '<li>$1</li>');
  // Ordered list items
  md = md.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> runs in <ul>
  md = md.replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g,
    block => `<ul>${block}</ul>`);

  // Inline: bold, italic, inline code, links, images
  const inline = s => s
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');

  // Wrap bare paragraphs (lines not already wrapped in a block tag)
  md = md.split(/\n{2,}/).map(block => {
    block = block.trim();
    if (!block) return '';
    if (/^<(h[1-6]|ul|ol|li|pre|blockquote|hr)/.test(block)) return block;
    return `<p>${inline(block.replace(/\n/g, ' '))}</p>`;
  }).join('\n');

  return md;
}

function buildLiveDoc(side) {
  const src  = _getPreviewSources(side);

  // ── Markdown preview ─────────────────────────────────────────
  const activeFile = src._activeFile;
  if (activeFile) {
    const ext = activeFile.name.split('.').pop().toLowerCase();
    if (ext === 'md') {
      const bridge = CONSOLE_BRIDGE.replace('__SIDE__', side);
      const body   = _mdToHtml(activeFile.content || '');
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${bridge}
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 760px;
           margin: 0 auto; padding: 24px 32px; line-height: 1.7;
           color: #24292f; background: #fff; }
    h1,h2,h3,h4,h5,h6 { margin: 1.4em 0 .5em; font-weight: 600; line-height: 1.3; }
    h1 { font-size: 2em; border-bottom: 1px solid #d8dee4; padding-bottom: .3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #d8dee4; padding-bottom: .3em; }
    p  { margin: .8em 0; }
    a  { color: #0969da; }
    code { background: #f6f8fa; border-radius: 4px; padding: 2px 5px;
           font-family: 'Fira Code', monospace; font-size: .9em; }
    pre  { background: #f6f8fa; border-radius: 6px; padding: 16px; overflow: auto;
           line-height: 1.5; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #d0d7de; margin: 0; padding: 0 1em;
                 color: #57606a; }
    ul, ol { padding-left: 2em; margin: .8em 0; }
    li { margin: .3em 0; }
    hr { border: none; border-top: 1px solid #d8dee4; margin: 1.5em 0; }
    img { max-width: 100%; }
  </style>
</head>
<body>${body}</body>
</html>`;
    }
  }

  let   html = src.html || tabsFor(side).html.ta.value;
  const css  = src.css  || tabsFor(side).css.ta.value;
  const js   = src.js   || tabsFor(side).js.ta.value;
  const bridge = CONSOLE_BRIDGE.replace('__SIDE__', side);

  const CURSOR_RESET = `<style>a,button,[onclick],label,select,input[type="submit"],input[type="button"],input[type="reset"],input[type="checkbox"],input[type="radio"],input[type="range"],[role="button"],summary{cursor:pointer}</style>`;

  // If the HTML tab already contains a full document, inline referenced assets first
  if (/<!DOCTYPE|<html/i.test(html)) {
    let doc = _inlineAssets(html, src.htmlVirtualPath);

    // Use case-insensitive replacements to handle any casing the user wrote
    const replaceCI = (str, search, replacement) => {
      const idx = str.search(new RegExp(search.replace(/[<>/]/g, c => '\\' + c), 'i'));
      if (idx === -1) return str;
      return str.slice(0, idx) + replacement + str.slice(idx + search.length);
    };

    // Inject bridge as very first child of <head> so it runs before any user script.
    // Fall back to prepending before <body> if <head> is absent.
    const finalBr = bridge;
    if (/<head[\s>]/i.test(doc)) {
      doc = replaceCI(doc, '<head>', `<head>\n${finalBr}`);
    } else {
      doc = replaceCI(doc, '<body>', `${finalBr}\n<body>`);
    }

    // Inject cursor reset and optional CSS
    doc = replaceCI(doc, '</head>', `${CURSOR_RESET}\n</head>`);
    if (css && !src.html) doc = replaceCI(doc, '</head>', `<style>\n${css}\n</style>\n</head>`);

    // Inject optional JS pane content before </body>
    if (js && !src.html) {
      const _isModule = /^\s*(import\s|export\s|export\s*default)/m.test(js);
      const _tag = _isModule
        ? `<script type="module">\n${js}\n\x3C/script>`
        : `<script>\ntry{\n${js}\n}catch(e){window.__ceLog('error',[e.toString()]);}\n\x3C/script>`;
      doc = replaceCI(doc, '</body>', `${_tag}\n</body>`);
    }
    return doc;
  }

  const finalBridge = bridge;

  // Detect ES module syntax — import/export at the top level require type="module"
  const isModule = /^\s*(import\s|export\s|export\s*default)/m.test(js);
  let jsContent = js;
  if (isModule) {
    // Rewrite relative imports to blob: URLs so they resolve inside the blob: iframe
    const activeId = state.panelTabs[side]?.activeId;
    const activeFile = activeId ? state.project.files[activeId] : null;
    const vPath = activeFile ? _virtualPath(activeFile) : 'index.js';
    jsContent = _moduleToBlob(js, vPath, _buildPathIndex(), new Map());
  }
  const scriptTag = isModule
    ? `<script type="module">\n${jsContent}\n\x3C/script>`
    : `<script>\ntry {\n${js}\n} catch(e) {\n  window.__ceLog('error', [e.toString()]);\n}\n\x3C/script>`;

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
  ${scriptTag}
</body>
</html>`;
}

/* ── Raw-mode live preview: build doc with partial typed code ─── */
function buildLiveDocRaw(side, partialCode) {
  // Use partial code for the active tab's language; read full content for other tabs.
  // Do NOT call flushAllPanels here — too expensive per tick; read textarea values directly.
  const activeId   = state.panelTabs[side].activeId;
  const activeFile = activeId ? state.project.files[activeId] : null;
  const activeExt  = activeFile ? activeFile.name.split('.').pop().toLowerCase() : 'html';

  const openIds = state.panelTabs[side].openIds;
  const files   = openIds.map(id => state.project.files[id]).filter(Boolean);
  // Read textarea values directly (no flush needed) for non-active tabs
  const tabs = tabsFor(side);

  const findExt = exts => {
    if (activeFile && exts.includes(activeExt)) return partialCode;
    const f = files.find(f => exts.includes(f.name.split('.').pop().toLowerCase()));
    if (!f) return '';
    // Try to read from the textarea if it's one of the standard tabs
    const ext = f.name.split('.').pop().toLowerCase();
    const tabKey = ext === 'html' || ext === 'htm' ? 'html' : ext === 'css' ? 'css' : ext === 'js' ? 'js' : null;
    if (tabKey && tabs[tabKey]?.ta) return tabs[tabKey].ta.value;
    return f.content || '';
  };

  const isActiveHtml = activeFile && ['html','htm'].includes(activeExt);
  const htmlFile = isActiveHtml ? activeFile
    : files.find(f => ['html','htm'].includes(f.name.split('.').pop().toLowerCase()));

  const src = {
    html:            findExt(['html','htm']),
    css:             findExt(['css','scss','less']),
    js:              findExt(['js','ts','mjs','jsx','tsx']),
    _activeFile:     activeFile,
    htmlVirtualPath: htmlFile ? _virtualPath(htmlFile) : 'index.html',
  };

  const CURSOR_RESET = `<style>a,button,[onclick],label,select,input[type="submit"],input[type="button"],input[type="reset"],input[type="checkbox"],input[type="radio"],input[type="range"],[role="button"],summary{cursor:pointer}</style>`;

  const css = src.css;
  const js  = src.js;

  // Strip any trailing incomplete tag from the partial HTML so the browser's
  // HTML parser never enters a broken state (e.g. an unclosed <script attribute
  // would cause everything after it to be treated as script text / raw data).
  const safeHtml = src.html.replace(/<[^>]*$/, '');

  // No CONSOLE_BRIDGE during raw typing — it's a <script> block and if the
  // partial user code contains an unclosed tag the parser corruption would
  // render bridge source as visible text. Console output is not useful mid-type.
  const isModule = /^\s*(import\s|export\s|export\s*default)/m.test(js);
  const scriptTag = js
    ? (isModule
        ? `<script type="module">\n${js}\n\x3C/script>`
        : `<script>\ntry {\n${js}\n} catch(e) {}\n\x3C/script>`)
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${CURSOR_RESET}
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; font-size: 14px; }
    a, button, [onclick], label, select, input[type="submit"], input[type="button"],
    input[type="reset"], input[type="checkbox"], input[type="radio"], input[type="range"],
    [role="button"], summary { cursor: pointer; }
    ${css}
  </style>
</head>
<body>
  ${safeHtml}
  ${scriptTag}
</body>
</html>`;
}

const _rawLiveDebounce  = { left: null, right: null };
const _rawLivePending   = { left: null, right: null };

function renderLivePreviewRaw(side, partialCode) {
  if (!_rawLiveActive[side]) return;
  // Buffer the latest partial code and flush after 60 ms — batches per-character
  // calls into one srcdoc write, preventing the streaming-parser artifact where
  // injected <script> content appears as visible body text via document.write().
  _rawLivePending[side] = partialCode;
  if (_rawLiveDebounce[side]) return;
  _rawLiveDebounce[side] = setTimeout(() => {
    _rawLiveDebounce[side] = null;
    const code  = _rawLivePending[side];
    _rawLivePending[side] = null;
    if (!_rawLiveActive[side]) return;
    const frame = side === 'left' ? el.previewFrameL : el.previewFrameR;
    frame.srcdoc = buildLiveDocRaw(side, code);
  }, 60);
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

/* ── Hidden console iframes (recreated each run) ─────────────── */
const _consoleFrames    = {};
const _consoleBlobUrls  = {};

function runConsoleOnly(side) {
  clearConsole(side);
  // Replace the iframe entirely each run — avoids stale cached frames and
  // load-timing races from rapidly changing frame.src.
  const old = _consoleFrames[side];
  if (old) old.remove();

  // Revoke previous blob URL
  if (_consoleBlobUrls[side]) {
    URL.revokeObjectURL(_consoleBlobUrls[side]);
    _consoleBlobUrls[side] = null;
  }

  const f = document.createElement('iframe');
  f.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden;pointer-events:none;';
  document.body.appendChild(f);
  _consoleFrames[side] = f;

  // Use a blob URL instead of srcdoc so the iframe gets a blob: origin,
  // which allows <script type="module"> and ES import statements to work.
  const blob = new Blob([buildLiveDoc(side)], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  _consoleBlobUrls[side] = url;
  f.src = url;
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
  if (el.closeLiveBtnL) el.closeLiveBtnL.addEventListener('click', () => setPanelMode('left',  'edit'));
  if (el.closeLiveBtnR) el.closeLiveBtnR.addEventListener('click', () => setPanelMode('right', 'edit'));
}
