/**
 * multi-cursor.js
 * Alt+Click to place extra cursors in a textarea.
 * All extra cursors receive the same keystrokes simultaneously.
 * Escape clears extra cursors.
 */

'use strict';

/* ── Extra cursor positions, keyed by textarea element ────────── */
// Each Set<number> holds character offsets into ta.value
const _extraCursors = new WeakMap(); // ta → Set<number>

/* ── MC overlay layer keyed by textarea ─────────────────────── */
const _mcLayers = new WeakMap(); // ta → div.mc-layer

/* ── Get or create the extra-cursor Set for a textarea ─────── */
function _getCursors(ta) {
  if (!_extraCursors.has(ta)) _extraCursors.set(ta, new Set());
  return _extraCursors.get(ta);
}

/* ── Get or create the cursor overlay layer ─────────────────── */
function _getLayer(ta) {
  if (_mcLayers.has(ta)) return _mcLayers.get(ta);
  const inner = ta.closest('.editor-inner');
  if (!inner) return null;
  const layer = document.createElement('div');
  layer.className = 'mc-layer';
  inner.appendChild(layer);
  _mcLayers.set(ta, layer);
  return layer;
}

/* ── Convert character offset → pixel position in the textarea ── */
function _offsetToCoords(ta, offset) {
  const text   = ta.value.slice(0, offset);
  const lines  = text.split('\n');
  const lineNo = lines.length - 1;
  const colNo  = lines[lineNo].length;

  const style = getComputedStyle(ta);
  const lineH = parseFloat(style.lineHeight) || 21;
  const padT  = parseFloat(style.paddingTop)  || 14;
  const padL  = parseFloat(style.paddingLeft) || 14;

  // Measure char width using a canvas (accurate for monospace)
  const canvas  = _offsetToCoords._canvas || (_offsetToCoords._canvas = document.createElement('canvas'));
  const ctx     = canvas.getContext('2d');
  ctx.font      = `${style.fontSize} ${style.fontFamily}`;
  const charW   = ctx.measureText('x').width;

  const x = padL + colNo * charW - ta.scrollLeft;
  const y = padT + lineNo * lineH - ta.scrollTop;

  return { x, y, lineH };
}

/* ── Redraw all extra cursor markers in the overlay ──────────── */
function _redrawCursors(ta) {
  const layer   = _getLayer(ta);
  if (!layer) return;
  const cursors = _getCursors(ta);

  layer.innerHTML = '';
  cursors.forEach(offset => {
    const { x, y, lineH } = _offsetToCoords(ta, offset);
    const span = document.createElement('span');
    span.className = 'mc-cursor';
    span.style.left   = x + 'px';
    span.style.top    = y + 'px';
    span.style.height = lineH + 'px';
    layer.appendChild(span);
  });
}

/* ── Get character offset at a mouse click position ─────────── */
function _clickToOffset(ta, clientX, clientY) {
  const style  = getComputedStyle(ta);
  const lineH  = parseFloat(style.lineHeight) || 21;
  const padT   = parseFloat(style.paddingTop)  || 14;
  const padL   = parseFloat(style.paddingLeft) || 14;

  const canvas = _offsetToCoords._canvas || (_offsetToCoords._canvas = document.createElement('canvas'));
  const ctx    = canvas.getContext('2d');
  ctx.font     = `${style.fontSize} ${style.fontFamily}`;
  const charW  = ctx.measureText('x').width;

  const rect   = ta.getBoundingClientRect();
  const relY   = clientY - rect.top + ta.scrollTop - padT;
  const relX   = clientX - rect.left + ta.scrollLeft - padL;

  const lineNo = Math.max(0, Math.floor(relY / lineH));
  const colNo  = Math.max(0, Math.round(relX / charW));

  const lines  = ta.value.split('\n');
  const line   = lines[Math.min(lineNo, lines.length - 1)] || '';
  const col    = Math.min(colNo, line.length);

  // Sum up lengths of preceding lines (+1 for each newline)
  let offset = 0;
  for (let i = 0; i < Math.min(lineNo, lines.length - 1); i++) {
    offset += lines[i].length + 1;
  }
  offset += col;
  return Math.min(offset, ta.value.length);
}

/* ── Apply a text edit at all extra cursors ──────────────────── */
// Returns the new extra cursor positions (sorted desc for safe splicing).
function _applyToAllCursors(ta, inputType, data) {
  const cursors  = _getCursors(ta);
  if (!cursors.size) return false;

  const mainStart = ta.selectionStart;
  const mainEnd   = ta.selectionEnd;

  // Collect all positions including main cursor, sorted descending
  // so we can apply changes from the end without shifting earlier offsets.
  const allPositions = [{ start: mainStart, end: mainEnd }, ...Array.from(cursors).map(p => ({ start: p, end: p }))];
  allPositions.sort((a, b) => b.start - a.start);

  let val      = ta.value;
  let mainDelta = 0; // how much main cursor moves

  allPositions.forEach(({ start, end }) => {
    const isMain = (start === mainStart && end === mainEnd);

    if (inputType === 'insertText') {
      const ch = data || '';
      val  = val.slice(0, start) + ch + val.slice(end);
      if (isMain) mainDelta = ch.length - (end - start);
    } else if (inputType === 'insertLineBreak') {
      val  = val.slice(0, start) + '\n' + val.slice(end);
      if (isMain) mainDelta = 1 - (end - start);
    } else if (inputType === 'deleteContentBackward') {
      if (start !== end) {
        val = val.slice(0, start) + val.slice(end);
        if (isMain) mainDelta = -(end - start);
      } else if (start > 0) {
        val = val.slice(0, start - 1) + val.slice(start);
        if (isMain) mainDelta = -1;
      }
    } else if (inputType === 'deleteContentForward') {
      if (start !== end) {
        val = val.slice(0, start) + val.slice(end);
        if (isMain) mainDelta = -(end - start);
      } else if (start < val.length) {
        val = val.slice(0, start) + val.slice(start + 1);
        if (isMain) mainDelta = 0;
      }
    }
  });

  ta.value = val;
  const newMain = Math.max(0, mainStart + mainDelta);
  ta.selectionStart = ta.selectionEnd = newMain;

  // Update extra cursor positions: shift by delta of insertions that happened before them
  const newCursors = new Set();
  cursors.forEach(pos => {
    // Count how many positions in allPositions are strictly before this cursor
    let shift = 0;
    allPositions.forEach(({ start, end }) => {
      if (start > pos) return; // insertion is after this cursor — no shift
      if (inputType === 'insertText')           shift += (data || '').length - (end - start);
      else if (inputType === 'insertLineBreak') shift += 1 - (end - start);
      else if (inputType === 'deleteContentBackward') {
        if (start !== end) shift -= (end - start);
        else if (start > 0) shift -= 1;
      } else if (inputType === 'deleteContentForward') {
        if (start !== end) shift -= (end - start);
        // forward delete at pos ≤ cursor shifts cursor back only if pos < cursor
      }
    });
    const newPos = Math.max(0, pos + shift);
    if (newPos !== newMain) newCursors.add(newPos); // deduplicate with main cursor
  });
  _extraCursors.set(ta, newCursors);
  return true;
}

/* ── Clear all extra cursors for a textarea ──────────────────── */
function clearExtraCursors(ta) {
  const cursors = _getCursors(ta);
  cursors.clear();
  const layer = _mcLayers.get(ta);
  if (layer) layer.innerHTML = '';
}

/* ── Wire multi-cursor for a single textarea ─────────────────── */
function wireMultiCursor(ta, side, lang) {
  // Alt+Click → add extra cursor
  ta.addEventListener('mousedown', e => {
    if (!e.altKey) return;
    e.preventDefault();
    const offset = _clickToOffset(ta, e.clientX, e.clientY);
    _getCursors(ta).add(offset);
    _redrawCursors(ta);
    ta.focus();
  });

  // Intercept typing when there are extra cursors
  ta.addEventListener('beforeinput', e => {
    const cursors = _getCursors(ta);
    if (!cursors.size) return;

    const handled = _applyToAllCursors(ta, e.inputType, e.data);
    if (handled) {
      e.preventDefault();
      // Trigger all dependent updates (highlight, gutter, save, etc.)
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  // Update cursor overlay on scroll
  ta.addEventListener('scroll', () => {
    if (_getCursors(ta).size) _redrawCursors(ta);
  });

  // Update cursor overlay on click (main cursor moved)
  ta.addEventListener('click', () => {
    if (_getCursors(ta).size) _redrawCursors(ta);
  });
}

/* ── Clear cursors for all textareas (called on Escape) ──────── */
function clearAllExtraCursors() {
  ['left', 'right'].forEach(side => {
    Object.values(tabsFor(side)).forEach(t => {
      if (t.ta) clearExtraCursors(t.ta);
    });
  });
}
