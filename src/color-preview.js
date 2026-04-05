/**
 * src/color-preview.js
 * Inline color swatches for CSS textareas.
 *
 * Approach: on every input/scroll event, scan the textarea value for
 * color tokens, compute each token's pixel position via the mirror-div
 * (getCaretCoords from intel-utils.js), and render small colored <span>
 * badges in an overlay div that sits on top of the textarea.
 */

'use strict';

/* ── Color token regex ───────────────────────────────────────────
   Matches hex (#rgb #rgba #rrggbb #rrggbbaa), rgb/rgba(...),
   hsl/hsla(...), and the 148 named CSS colors.
*/
const COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|rgba?\s*\([^)]*\)|hsla?\s*\([^)]*\)|\b(?:aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|transparent|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen)\b/g;

/** Scan text for color tokens; returns [{index, length, token}] */
function _findColors(text) {
  const hits = [];
  COLOR_RE.lastIndex = 0;
  let m;
  while ((m = COLOR_RE.exec(text)) !== null) {
    hits.push({ index: m.index, length: m[0].length, token: m[0] });
  }
  return hits;
}

/* ── Mirror-div helpers (same technique as intel-utils.js) ───── */
let _cpMirror = null;
function _getMirror() {
  if (_cpMirror) return _cpMirror;
  _cpMirror = document.createElement('div');
  _cpMirror.style.cssText = [
    'position:fixed','top:0','left:0','visibility:hidden',
    'pointer-events:none','overflow:hidden','white-space:pre-wrap',
    'word-wrap:break-word','z-index:-1',
  ].join(';');
  document.body.appendChild(_cpMirror);
  return _cpMirror;
}

/**
 * Returns {top, left, bottom} viewport coords of character at `charIndex`
 * inside `ta`, without disturbing the current selection.
 */
function _coordsAt(ta, charIndex) {
  const mirror = _getMirror();
  const cs     = getComputedStyle(ta);
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

  const before = ta.value.slice(0, charIndex);
  const marker = document.createElement('span');
  marker.textContent = '\u200b'; // zero-width space as anchor
  mirror.textContent = '';
  mirror.appendChild(document.createTextNode(before));
  mirror.appendChild(marker);

  mirror.scrollTop  = ta.scrollTop;
  mirror.scrollLeft = ta.scrollLeft;

  const mr = marker.getBoundingClientRect();
  return { top: mr.top, left: mr.left, bottom: mr.bottom };
}

/* ── Overlay container (one per textarea) ────────────────────── */
const _overlays = new WeakMap();

function _getOverlay(ta) {
  if (_overlays.has(ta)) return _overlays.get(ta);

  const surface = ta.closest('.editor-surface') || ta.parentElement;
  const ov = document.createElement('div');
  ov.className = 'cp-overlay';
  surface.appendChild(ov);
  _overlays.set(ta, ov);
  return ov;
}

/**
 * Re-render all swatch badges for `ta`.
 * Each badge is a tiny colored square positioned at the end of
 * its color token (after the last char) on the same line.
 */
function _renderSwatches(ta) {
  const overlay = _getOverlay(ta);
  overlay.innerHTML = '';

  const raw  = ta.value;
  const hits = _findColors(raw);
  if (!hits.length) return;

  const taRect      = ta.getBoundingClientRect();
  const parentRect  = (ta.closest('.editor-surface') || ta.parentElement).getBoundingClientRect();

  hits.forEach(hit => {
    // Position the swatch at the character just after the token end
    const coords = _coordsAt(ta, hit.index + hit.length);

    // Skip if outside the visible scroll area of the textarea
    if (coords.top < taRect.top - 4 || coords.top > taRect.bottom + 4) return;

    const badge = document.createElement('span');
    badge.className = 'cp-swatch';
    badge.title     = hit.token;
    badge.style.setProperty('--sw', hit.token);
    // Position relative to .editor-surface
    badge.style.left = (coords.left - parentRect.left) + 'px';
    badge.style.top  = (coords.top  - parentRect.top)  + 'px';
    overlay.appendChild(badge);
  });
}

/** Wire color preview to one CSS textarea. */
function _wireOne(ta) {
  let _raf = null;
  const schedule = () => {
    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(() => _renderSwatches(ta));
  };
  ta.addEventListener('input',  schedule);
  ta.addEventListener('scroll', schedule);
  schedule(); // initial pass
}

/**
 * Wire color preview to all CSS textareas (left + right).
 * Call from app.js after DOM is ready.
 */
function wireColorPreview() {
  ['left', 'right'].forEach(side => {
    const t = tabsFor(side)['css'];
    if (t && t.ta) _wireOne(t.ta);
  });
}
