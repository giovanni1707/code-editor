/**
 * src/squiggles.js
 * Red wavy underlines under JS syntax errors in the JS textarea.
 *
 * Approach:
 *   1. On every input event (debounced), run the textarea value through
 *      `new Function()` / eval inside a try/catch to catch SyntaxErrors.
 *   2. Parse the error message to extract a line number.
 *   3. Compute the pixel bounding box of that line using the mirror-div
 *      technique and render a wavy-underline <div> in an overlay.
 *
 * Limitations:
 *   - Only catches SyntaxErrors (not runtime errors).
 *   - Line number extraction is heuristic (browser-dependent error messages).
 *   - Multi-error highlighting not possible with this method; shows first error only.
 */

'use strict';

/* ── Try to parse JS and extract error info ──────────────────── */

/**
 * Returns { line, col, message } (1-based) if `code` has a SyntaxError,
 * or null if the code is valid.
 *
 * Uses Acorn — the same parser powering ESLint, Babel, and webpack.
 * Acorn gives exact, browser-consistent line+col pointing to the precise
 * character where the error occurred, not a heuristic approximation.
 *
 * Falls back to new Function() if Acorn is not yet loaded.
 */
function _checkSyntax(code) {
  // ── Acorn path (preferred) ────────────────────────────────────────
  if (typeof acorn !== 'undefined') {
    try {
      acorn.parse(code, {
        ecmaVersion: 'latest',
        sourceType:  'module',   // allows import/export
      });
      return null; // no error
    } catch (err) {
      // Acorn SyntaxError has .loc.line / .loc.column (0-based col → +1)
      // and .pos (character offset) as a fallback
      const line = err.loc ? err.loc.line       : 1;
      const col  = err.loc ? err.loc.column + 1 : 1; // convert 0-based → 1-based
      // Clean up message: Acorn appends " (N:N)" — strip it for display
      const message = (err.message || '').replace(/\s*\(\d+:\d+\)$/, '');
      return { line, col, message };
    }
  }

  // ── Fallback: new Function() ─────────────────────────────────────
  try {
    new Function(code); // eslint-disable-line no-new-func
    return null;
  } catch (err) {
    if (!(err instanceof SyntaxError)) return null;
    let line = null, col = null;
    if (err.lineNumber) { line = err.lineNumber; col = err.columnNumber || 0; }
    if (line === null && err.stack) {
      const m = err.stack.match(/<anonymous>:(\d+):(\d+)/);
      if (m) { line = +m[1]; col = +m[2]; }
    }
    if (line === null) line = 1;
    line = Math.max(1, line - 2); // Function() wrapper adds 2 lines
    return { line, col: col || 0, message: err.message };
  }
}

/* ── Mirror-div helpers ──────────────────────────────────────── */
let _sqMirror = null;
function _getMirror() {
  if (_sqMirror) return _sqMirror;
  _sqMirror = document.createElement('div');
  _sqMirror.style.cssText = [
    'position:fixed','top:0','left:0','visibility:hidden',
    'pointer-events:none','overflow:hidden','white-space:pre-wrap',
    'word-wrap:break-word','z-index:-1',
  ].join(';');
  document.body.appendChild(_sqMirror);
  return _sqMirror;
}

/** Copy textarea layout styles to mirror and size/position it. */
function _syncMirror(ta) {
  const mirror = _getMirror();
  const cs = getComputedStyle(ta);
  [
    'fontFamily','fontSize','fontWeight','fontStyle','letterSpacing',
    'lineHeight','paddingTop','paddingRight','paddingBottom','paddingLeft',
    'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
    'boxSizing','tabSize','whiteSpace','wordWrap','overflowWrap',
  ].forEach(p => { mirror.style[p] = cs[p]; });
  const rect = ta.getBoundingClientRect();
  mirror.style.width  = rect.width  + 'px';
  mirror.style.height = rect.height + 'px';
  mirror.style.top    = rect.top    + 'px';
  mirror.style.left   = rect.left   + 'px';
  return mirror;
}

/**
 * Returns the viewport-relative { top, left, bottom, right, lineHeight }
 * of the given 1-based line number in `ta`.
 */
function _lineRect(ta, lineNum) {
  const mirror = _syncMirror(ta);
  const lines  = ta.value.split('\n');
  // Build text up to the end of the target line
  const upTo   = lines.slice(0, lineNum).join('\n');
  // Marker at start of line
  const lineStart = lines.slice(0, lineNum - 1).join('\n').length + (lineNum > 1 ? 1 : 0);

  // Start-of-line marker
  const mStart = document.createElement('span');
  mStart.textContent = '\u200b';
  // End-of-line marker
  const mEnd = document.createElement('span');
  mEnd.textContent = '\u200b';

  mirror.textContent = '';
  mirror.appendChild(document.createTextNode(ta.value.slice(0, lineStart)));
  mirror.appendChild(mStart);
  mirror.appendChild(document.createTextNode(ta.value.slice(lineStart, lineStart + (lines[lineNum - 1] || '').length)));
  mirror.appendChild(mEnd);

  mirror.scrollTop  = ta.scrollTop;
  mirror.scrollLeft = ta.scrollLeft;

  const rs = mStart.getBoundingClientRect();
  const re = mEnd.getBoundingClientRect();

  const cs = getComputedStyle(ta);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;

  return {
    top:        rs.top,
    left:       rs.left,
    bottom:     rs.bottom,
    right:      re.right,
    lineHeight: lh,
  };
}

/* ── Overlay ─────────────────────────────────────────────────── */
const _sqOverlays = new WeakMap();

function _getOverlay(ta) {
  if (_sqOverlays.has(ta)) return _sqOverlays.get(ta);
  const surface = ta.closest('.editor-surface') || ta.parentElement;
  const ov = document.createElement('div');
  ov.className = 'sq-overlay';
  surface.appendChild(ov);
  _sqOverlays.set(ta, ov);
  return ov;
}

/** Remove all squiggles from `ta`. */
function _clearSquiggles(ta) {
  _getOverlay(ta).innerHTML = '';
}

/**
 * Draw a squiggle underline for the given 1-based `lineNum` in `ta`.
 * Also shows a tooltip with `message`.
 */
function _drawSquiggle(ta, lineNum, message) {
  const overlay = _getOverlay(ta);
  overlay.innerHTML = '';

  const taRect     = ta.getBoundingClientRect();
  const parentRect = (ta.closest('.editor-surface') || ta.parentElement).getBoundingClientRect();
  const lr         = _lineRect(ta, lineNum);

  // Skip if line is scrolled out of view
  if (lr.top > taRect.bottom || lr.bottom < taRect.top) return;

  const sq = document.createElement('div');
  sq.className = 'sq-squiggle';
  sq.title     = message;

  // Position: left edge of the textarea content area, width = full content width
  const paddingLeft = parseFloat(getComputedStyle(ta).paddingLeft) || 0;
  sq.style.top    = (lr.bottom - parentRect.top - 3) + 'px'; // just below the text baseline
  sq.style.left   = (taRect.left - parentRect.left + paddingLeft) + 'px';
  sq.style.width  = (taRect.width - paddingLeft * 2) + 'px';

  overlay.appendChild(sq);
}

/* ── Per-textarea wiring ─────────────────────────────────────── */
/* JS-only extensions that should get squiggle checking */
const _JS_EXTS = new Set(['js','ts','jsx','tsx','mjs','cjs']);

function _activeFileIsJs(side) {
  const fid  = state.panelTabs[side].activeId;
  const file = fid && state.project.files[fid];
  if (!file) return false;
  const ext = file.name.split('.').pop().toLowerCase();
  return _JS_EXTS.has(ext);
}

function _wireOne(ta, side) {
  let _timer = null;

  function check() {
    // Only lint real JS/TS files — not markdown, json, etc.
    if (!_activeFileIsJs(side)) { _clearSquiggles(ta); return; }
    const err = _checkSyntax(ta.value);
    if (!err || !ta.value.trim()) {
      _clearSquiggles(ta);
    } else {
      _drawSquiggle(ta, err.line, err.message);
    }
  }

  const schedule = () => {
    // Clear immediately so squiggles don't linger while user is still typing
    _clearSquiggles(ta);
    clearTimeout(_timer);
    _timer = setTimeout(check, 300);
  };

  ta.addEventListener('input',  schedule);
  ta.addEventListener('scroll', () => {
    if (!_activeFileIsJs(side)) { _clearSquiggles(ta); return; }
    const err = _checkSyntax(ta.value);
    if (err && ta.value.trim()) _drawSquiggle(ta, err.line, err.message);
    else _clearSquiggles(ta);
  });
}

/**
 * Wire squiggles to all JS textareas (left + right).
 * Call from app.js after DOM is ready.
 */
function wireSquiggles() {
  ['left', 'right'].forEach(side => {
    const t = tabsFor(side)['js'];
    if (t && t.ta) _wireOne(t.ta, side);
  });
}
