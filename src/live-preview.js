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

/* ── Gather HTML/CSS/JS from open project files ──────────────── */
function _getPreviewSources(side) {
  // Flush current textarea content to the active file first
  if (typeof flushAllPanels === 'function') flushAllPanels();

  const openIds = state.panelTabs[side].openIds;
  const files   = openIds.map(id => state.project.files[id]).filter(Boolean);

  const find = exts => {
    const f = files.find(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return exts.includes(ext);
    });
    return f ? f.content : '';
  };

  return {
    html: find(['html', 'htm']),
    css:  find(['css', 'scss', 'less']),
    js:   find(['js', 'ts', 'mjs', 'jsx', 'tsx']),
  };
}

function buildLiveDoc(side) {
  const src  = _getPreviewSources(side);
  const html = src.html || tabsFor(side).html.ta.value;
  const css  = src.css  || tabsFor(side).css.ta.value;
  const js   = src.js   || tabsFor(side).js.ta.value;
  const bridge = CONSOLE_BRIDGE.replace('__SIDE__', side);

  // If the HTML tab already contains a full document, inject CSS/JS into it
  const CURSOR_RESET = `<style>a,button,[onclick],label,select,input[type="submit"],input[type="button"],input[type="reset"],input[type="checkbox"],input[type="radio"],input[type="range"],[role="button"],summary{cursor:pointer}</style>`;

  if (/<!DOCTYPE|<html/i.test(html)) {
    let doc = html;
    doc = doc.replace('</head>', `${CURSOR_RESET}\n</head>`);
    if (css) doc = doc.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
    // Calculate JS offset before inserting bridge (bridge goes into <head>)
    const headEnd   = doc.indexOf('<head>') + '<head>'.length + 1; // +1 for \n
    const beforeJs  = doc.slice(0, doc.indexOf('</body>'));
    const jsOffset  = _countLines(bridge) + _countLines(beforeJs.slice(headEnd)) + 3;
    const finalBr   = bridge.replace('__JS_LINE_OFFSET__', jsOffset);
    doc = doc.replace('<head>', `<head>\n${finalBr}`);
    if (js) doc = doc.replace('</body>',
      `<script>\ntry{\n${js}\n}catch(e){window.__ceLog('error',[e.toString()]);}\n\x3C/script>\n</body>`);
    return doc;
  }

  // Build the prefix to count its lines and know where JS lands
  const prefix = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  BRIDGE_PLACEHOLDER
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; font-size: 14px; }
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
try {
`;
  // JS starts at: lines in prefix (with bridge substituted) + 1
  const bridgePlaceholderLines = _countLines('  BRIDGE_PLACEHOLDER');
  const bridgeLines = _countLines(bridge);
  const prefixLines = _countLines(prefix) - bridgePlaceholderLines + bridgeLines;
  const jsOffset    = prefixLines; // line number in doc where user JS line 1 sits

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

function renderLivePreview(side) {
  clearConsole(side);
  const frame = side === 'left' ? el.previewFrameL : el.previewFrameR;
  frame.srcdoc = buildLiveDoc(side);
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

function runConsoleOnly(side) {
  clearConsole(side);
  const frame = _getConsoleFrame(side);
  frame.srcdoc = buildLiveDoc(side);
}

const _liveDebounce    = { left: null, right: null };
const _consoleDebounce = { left: null, right: null };

function scheduleLivePreview(side) {
  clearTimeout(_liveDebounce[side]);
  _liveDebounce[side] = setTimeout(() => renderLivePreview(side), 280);
}

function scheduleConsoleRun(side) {
  clearTimeout(_consoleDebounce[side]);
  _consoleDebounce[side] = setTimeout(() => runConsoleOnly(side), 400);
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
