/**
 * src/intel-utils.js
 * Shared utilities for Code Intelligence features:
 * caret pixel coordinates, line/col info, word-before-cursor.
 */

'use strict';

/* ── Mirror div (reused across calls) ───────────────────────── */
let _mirror = null;

function _getMirror() {
  if (_mirror) return _mirror;
  _mirror = document.createElement('div');
  _mirror.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'visibility:hidden',
    'pointer-events:none', 'overflow:hidden', 'white-space:pre-wrap',
    'word-wrap:break-word', 'z-index:-1',
  ].join(';');
  document.body.appendChild(_mirror);
  return _mirror;
}

/**
 * Returns {top, left, bottom} — viewport-relative pixel coords of the caret.
 */
function getCaretCoords(ta) {
  const mirror = _getMirror();
  const cs     = getComputedStyle(ta);

  // Copy all text-layout styles from the textarea
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

  // Text before caret + marker span
  const before  = ta.value.slice(0, ta.selectionStart);
  const marker  = document.createElement('span');
  marker.textContent = '|';
  mirror.textContent = '';
  mirror.appendChild(document.createTextNode(before));
  mirror.appendChild(marker);

  // Offset for textarea scroll
  mirror.scrollTop  = ta.scrollTop;
  mirror.scrollLeft = ta.scrollLeft;

  const mr = marker.getBoundingClientRect();
  return { top: mr.top, left: mr.left, bottom: mr.bottom };
}

/**
 * Returns { line (0-based), col (0-based), lineText, lineStart }
 */
function getLineCol(ta) {
  const val   = ta.value;
  const pos   = ta.selectionStart;
  const lines = val.slice(0, pos).split('\n');
  const line  = lines.length - 1;
  const col   = lines[line].length;
  const lineStart = pos - col;
  const lineEnd   = val.indexOf('\n', pos);
  const lineText  = val.slice(lineStart, lineEnd === -1 ? val.length : lineEnd);
  return { line, col, lineText, lineStart };
}

/**
 * Returns the partial word/token directly before the cursor.
 * Stops at whitespace, ;, {, }, (, ), =, :, >, <, !, "
 */
function getWordBefore(ta, extra = '') {
  const val  = ta.value;
  const pos  = ta.selectionStart;
  const stop = /[\s;{}()\[\]=<>!"'`]/;
  let i = pos - 1;
  while (i >= 0 && !stop.test(val[i]) && !extra.includes(val[i])) i--;
  return val.slice(i + 1, pos);
}
