/**
 * minimap.js
 * Canvas-based minimap for each editor panel.
 * Shows a scaled-down code overview with a viewport indicator.
 * Toggleable via Settings → Editor → Minimap.
 */

'use strict';

/* ── Per-surface minimap registry ────────────────────────────── */
// Each entry: { wrap, canvas, ctx, viewport, ta }
const _minimaps = new WeakMap(); // surface element → minimap data

const MM_W  = 80;   // minimap canvas width (px)
const MM_PX = 2;    // pixels per character column
const MM_LH = 2;    // pixels per line row

/* ── Measure a monospace character width (cached) ─────────────── */
let _charW = null;
function _getCharW() {
  if (_charW !== null) return _charW;
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const style  = getComputedStyle(document.documentElement);
  const fs     = style.getPropertyValue('--editor-font-size').trim() || '13px';
  const ff     = style.getPropertyValue('--font-mono').trim() || 'monospace';
  ctx.font     = `${fs} ${ff}`;
  _charW       = ctx.measureText('x').width || 7.8;
  return _charW;
}

/* ── Build minimap for one editor surface ─────────────────────── */
function _buildMinimapForSurface(surface) {
  if (_minimaps.has(surface)) return;

  const ta = surface.querySelector('textarea.code-ta');
  if (!ta) return;

  const wrap     = document.createElement('div');
  wrap.className = 'minimap-wrap';

  const canvas     = document.createElement('canvas');
  canvas.className = 'minimap-canvas';
  canvas.width     = MM_W;
  canvas.height    = 1; // resized dynamically
  const ctx        = canvas.getContext('2d');

  const viewport     = document.createElement('div');
  viewport.className = 'minimap-viewport';

  wrap.appendChild(canvas);
  wrap.appendChild(viewport);
  surface.appendChild(wrap);

  const data = { wrap, canvas, ctx, viewport, ta };
  _minimaps.set(surface, data);

  // Click/drag to scroll
  let _dragging = false;
  function _scrollToY(clientY) {
    const rect    = canvas.getBoundingClientRect();
    const pct     = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const maxScroll = ta.scrollHeight - ta.clientHeight;
    ta.scrollTop  = pct * maxScroll;
    _syncViewport(data);
  }
  wrap.addEventListener('mousedown', e => { _dragging = true; _scrollToY(e.clientY); e.preventDefault(); });
  document.addEventListener('mousemove', e => { if (_dragging) _scrollToY(e.clientY); });
  document.addEventListener('mouseup',   () => { _dragging = false; });

  // Keep minimap in sync with textarea scroll & resize
  ta.addEventListener('scroll', () => _syncViewport(data));
  new ResizeObserver(() => updateMinimapSurface(surface)).observe(surface);

  _drawMinimap(data);
}

/* ── Sync the viewport indicator position ────────────────────── */
function _syncViewport(data) {
  const { canvas, viewport, ta } = data;
  const totalH = canvas.height;
  if (totalH <= 0) return;

  const lines    = ta.value.split('\n').length;
  const lineH    = parseFloat(getComputedStyle(ta).lineHeight) || 21;
  const totalPx  = lines * lineH;

  const visH    = ta.clientHeight;
  const scrollH = ta.scrollHeight;

  const vRatio  = visH / Math.max(scrollH, visH);
  const vH      = Math.max(20, vRatio * totalH);
  const scrollPct = scrollH > visH ? ta.scrollTop / (scrollH - visH) : 0;
  const vTop    = scrollPct * (totalH - vH);

  viewport.style.top    = vTop + 'px';
  viewport.style.height = vH  + 'px';
}

/* ── Draw the minimap canvas ─────────────────────────────────── */
function _drawMinimap(data) {
  const { canvas, ctx, ta } = data;
  const isDark = !document.documentElement.classList.contains('light');

  const lines   = ta.value.split('\n');
  const nLines  = lines.length;
  const H       = Math.max(nLines * MM_LH, ta.clientHeight || 200);

  canvas.height = H;
  canvas.style.height = H + 'px';

  // Background
  ctx.fillStyle = isDark ? '#0d1117' : '#f6f8fa';
  ctx.fillRect(0, 0, MM_W, H);

  const textColor    = isDark ? 'rgba(200,210,220,0.55)' : 'rgba(50,60,80,0.50)';
  const commentColor = isDark ? 'rgba(120,130,140,0.45)' : 'rgba(130,140,150,0.45)';
  const stringColor  = isDark ? 'rgba(100,200,130,0.50)' : 'rgba(30,140,60,0.50)';
  const kwColor      = isDark ? 'rgba(120,160,255,0.55)' : 'rgba(30,80,200,0.50)';

  lines.forEach((line, i) => {
    const y = i * MM_LH;
    const trimmed = line.trimStart();
    if (!trimmed) return;

    const indent = line.length - trimmed.length;
    const x0     = Math.min(indent * MM_PX, MM_W - 1);

    // Detect line category
    let color;
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
      color = commentColor;
    } else if (trimmed.startsWith('"') || trimmed.startsWith("'") || trimmed.startsWith('`')) {
      color = stringColor;
    } else if (/^(function|const|let|var|class|import|export|return|if|else|for|while|switch|case)\b/.test(trimmed)) {
      color = kwColor;
    } else {
      color = textColor;
    }

    ctx.fillStyle = color;
    // Draw non-whitespace content as a bar
    const contentW = Math.min((trimmed.length) * MM_PX, MM_W - x0);
    ctx.fillRect(x0, y, contentW, MM_LH - 1);
  });

  _syncViewport(data);
}

/* ── Public: update one surface's minimap ─────────────────────── */
function updateMinimapSurface(surface) {
  const data = _minimaps.get(surface);
  if (!data) return;
  _charW = null; // reset cached char width (font may have changed)
  _drawMinimap(data);
}

/* ── Public: update all visible minimaps ─────────────────────── */
function updateAllMinimaps() {
  ['left', 'right'].forEach(side => {
    const tabs = tabsFor(side);
    Object.values(tabs).forEach(t => {
      if (t.surface) updateMinimapSurface(t.surface);
    });
  });
}

/* ── Public: apply minimap setting (show / hide) ─────────────── */
function applyMinimap(on) {
  ['left', 'right'].forEach(side => {
    const tabs = tabsFor(side);
    Object.values(tabs).forEach(t => {
      if (!t.surface) return;
      if (on && !_minimaps.has(t.surface)) {
        _buildMinimapForSurface(t.surface);
      }
      const data = _minimaps.get(t.surface);
      if (data) {
        data.wrap.classList.toggle('mm-on', on);
        if (on) _drawMinimap(data);
      }
    });
  });
}

/* ── Public: update minimap for the active textarea in a panel ── */
function updateMinimapForSide(side) {
  const t = activeTab(side);
  if (t && t.surface) updateMinimapSurface(t.surface);
}
