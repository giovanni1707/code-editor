/**
 * color-picker.js
 * Inline color swatches + picker for CSS color values.
 *
 * After each highlight refresh on a CSS (or JS/HTML) surface,
 * we scan the raw textarea content for color literals and place
 * small colored squares in a lightweight overlay layer.
 * Clicking a swatch opens a floating color picker that writes
 * the new value back to the textarea.
 */

'use strict';

/* ── Color regex ─────────────────────────────────────────────── */
const COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\(\s*[\d.%,\s]+\)|hsla?\(\s*[\d.%,\s]+\)/g;

/* ── Swatch layer registry ───────────────────────────────────── */
const _swatchLayers = new WeakMap(); // ta → div.cp-swatch-layer

/* ── Active picker state ─────────────────────────────────────── */
let _activePicker = null; // { input, onClose }

/* ── Floating picker element (shared, created once) ─────────── */
let _pickerEl = null;

function _getPickerEl() {
  if (_pickerEl) return _pickerEl;
  _pickerEl = document.createElement('div');
  _pickerEl.className = 'cp-float';
  _pickerEl.innerHTML = `
    <div class="cp-float-preview"></div>
    <input class="cp-float-hex" type="text" maxlength="9" spellcheck="false" placeholder="#rrggbb" />
    <input class="cp-float-native" type="color" tabindex="-1" />
    <div class="cp-float-row">
      <button class="cp-float-btn cp-float-ok">✓ Apply</button>
      <button class="cp-float-btn cp-float-cancel">✕</button>
    </div>
  `;
  document.body.appendChild(_pickerEl);

  const preview = _pickerEl.querySelector('.cp-float-preview');
  const hexInput = _pickerEl.querySelector('.cp-float-hex');
  const nativeInput = _pickerEl.querySelector('.cp-float-native');

  // Sync: native → hex → preview
  nativeInput.addEventListener('input', () => {
    hexInput.value = nativeInput.value;
    preview.style.background = nativeInput.value;
  });

  // Sync: hex text → native → preview
  hexInput.addEventListener('input', () => {
    const v = hexInput.value.trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(v)) {
      nativeInput.value = v.length <= 7 ? v : v.slice(0, 7);
      preview.style.background = v;
    }
  });

  _pickerEl.querySelector('.cp-float-ok').addEventListener('click', () => {
    if (_activePicker) _activePicker.apply(hexInput.value.trim());
    _closePicker();
  });
  _pickerEl.querySelector('.cp-float-cancel').addEventListener('click', _closePicker);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _pickerEl.classList.contains('cp-show')) _closePicker();
    if (e.key === 'Enter'  && _pickerEl.classList.contains('cp-show')) {
      if (_activePicker) _activePicker.apply(hexInput.value.trim());
      _closePicker();
    }
  }, true);

  return _pickerEl;
}

function _closePicker() {
  const p = _getPickerEl();
  p.classList.remove('cp-show');
  _activePicker = null;
}

function _openPicker(anchorEl, currentColor, applyFn) {
  const p    = _getPickerEl();
  const hex  = _toHex(currentColor);
  const hexInput    = p.querySelector('.cp-float-hex');
  const nativeInput = p.querySelector('.cp-float-native');
  const preview     = p.querySelector('.cp-float-preview');

  hexInput.value    = hex || currentColor;
  nativeInput.value = hex || '#000000';
  preview.style.background = currentColor;

  // Position near anchor
  const rect   = anchorEl.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  p.style.left = Math.min(rect.left + scrollX, window.innerWidth - 220) + 'px';
  p.style.top  = (rect.bottom + scrollY + 4) + 'px';
  p.classList.add('cp-show');

  _activePicker = { apply: applyFn };
  hexInput.focus();
  hexInput.select();
}

/* ── Convert any CSS color to hex (best-effort) ─────────────── */
function _toHex(color) {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    return '#' + color[1]+color[1]+color[2]+color[2]+color[3]+color[3];
  }
  // Use canvas to resolve computed color
  const ctx = (_toHex._canvas = _toHex._canvas || document.createElement('canvas').getContext('2d'));
  ctx.fillStyle = color;
  const computed = ctx.fillStyle;
  if (/^#[0-9a-fA-F]{6}$/.test(computed)) return computed;
  // Convert rgb(r,g,b)
  const m = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (m) return '#' + [m[1],m[2],m[3]].map(n => (+n).toString(16).padStart(2,'0')).join('');
  return null;
}

/* ── Get or create the swatch overlay layer ─────────────────── */
function _getSwatchLayer(ta) {
  if (_swatchLayers.has(ta)) return _swatchLayers.get(ta);
  const inner = ta.closest('.editor-inner');
  if (!inner) return null;
  const layer = document.createElement('div');
  layer.className = 'cp-swatch-layer';
  inner.appendChild(layer);
  _swatchLayers.set(ta, layer);
  return layer;
}

/* ── Convert character offset to pixel position ─────────────── */
function _offsetToPx(ta, offset) {
  const text  = ta.value.slice(0, offset);
  const lines = text.split('\n');
  const lineNo = lines.length - 1;
  const colNo  = lines[lineNo].length;

  const style  = getComputedStyle(ta);
  const lineH  = parseFloat(style.lineHeight) || 21;
  const padT   = parseFloat(style.paddingTop)  || 14;
  const padL   = parseFloat(style.paddingLeft) || 14;

  const canvas = _offsetToPx._canvas || (_offsetToPx._canvas = document.createElement('canvas'));
  const ctx    = canvas.getContext('2d');
  ctx.font     = `${style.fontSize} ${style.fontFamily}`;
  const charW  = ctx.measureText('x').width;

  return {
    x: padL + colNo * charW - ta.scrollLeft,
    y: padT + lineNo * lineH - ta.scrollTop + lineH / 2 - 5, // vertically centred in line
  };
}

/* ── Build/refresh swatch layer for a textarea ──────────────── */
function refreshColorSwatches(ta) {
  const layer = _getSwatchLayer(ta);
  if (!layer) return;
  layer.innerHTML = '';

  const code    = ta.value;
  let   match;
  COLOR_RE.lastIndex = 0;

  while ((match = COLOR_RE.exec(code)) !== null) {
    const colorStr = match[0];
    const offset   = match.index;
    const { x, y } = _offsetToPx(ta, offset);

    // Skip swatches that are scrolled out of view
    if (x < -20 || x > ta.clientWidth + 20) continue;
    if (y < -10 || y > ta.clientHeight + 20) continue;

    const swatch = document.createElement('span');
    swatch.className = 'cp-swatch';
    swatch.style.left       = (x - 16) + 'px'; // place just before the color text
    swatch.style.top        = y + 'px';
    swatch.style.background = colorStr;
    swatch.title            = colorStr;

    swatch.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      _openPicker(swatch, colorStr, newColor => {
        if (!newColor || newColor === colorStr) return;
        // Replace the color value in the textarea
        const pos = ta.value.indexOf(colorStr, offset - 5); // fuzzy find near offset
        if (pos === -1) return;
        ta.value = ta.value.slice(0, pos) + newColor + ta.value.slice(pos + colorStr.length);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    layer.appendChild(swatch);
  }
}

/* ── Wire color picker to a textarea ────────────────────────── */
function wireColorPicker(ta) {
  // Rebuild swatches after any content change or scroll
  ta.addEventListener('input',  () => refreshColorSwatches(ta));
  ta.addEventListener('scroll', () => refreshColorSwatches(ta));
}

/* ── Wire all textareas ──────────────────────────────────────── */
function wireAllColorPickers() {
  ['left', 'right'].forEach(side => {
    Object.values(tabsFor(side)).forEach(t => {
      if (t.ta) wireColorPicker(t.ta);
    });
  });
}

/* ── Refresh swatches after highlight (called from refreshHL) ── */
function refreshAllColorSwatches() {
  ['left', 'right'].forEach(side => {
    Object.values(tabsFor(side)).forEach(t => {
      if (t.ta) refreshColorSwatches(t.ta);
    });
  });
}
