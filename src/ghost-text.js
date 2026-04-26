/**
 * src/ghost-text.js
 * Inline ghost-text suggestions (VS Code–style).
 *
 * A <div class="ghost-layer"> mirrors the textarea's full text layout.
 * The predicted suffix is rendered as a <span class="ghost-suffix"> inside it,
 * positioned at the caret by splitting the text into before/after parts.
 * Tab accepts the suggestion; any other character or movement dismisses it.
 */

'use strict';

/* ── Per-textarea ghost state ───────────────────────────────── */
// Map from textarea element → { layer, suffix, partial, timer }
const _ghostMap = new WeakMap();

/* ── Pick the best single suggestion for a partial ─────────── */
function _suggest(partial, lang, ta) {
  if (!partial) return '';

  const dot    = partial.lastIndexOf('.');
  const hasDot = dot !== -1;

  if (hasDot) {
    // Dotted member — only look in DH_MEMBERS
    const ns     = partial.slice(0, dot);
    const typed  = partial.slice(dot + 1).toLowerCase();
    const members = DH_MEMBERS[ns];
    if (!members) return '';
    const hit = members.find(m => m.toLowerCase().startsWith(typed) && m !== partial.slice(dot + 1));
    return hit ? ns + '.' + hit : '';
  }

  const lc = partial.toLowerCase();

  // Priority order: DH globals → DH $ methods → JS keywords → JS builtins → user words
  const lists = [
    DH_GLOBALS,
    DH_MEMBERS['$'],
    JS_KEYWORDS,
    JS_BUILTINS,
  ];

  for (const list of lists) {
    const hit = list.find(w => w.toLowerCase().startsWith(lc) && w !== partial);
    if (hit) return hit;
  }

  // User-defined words as last resort (length > 2 only)
  const userWords = (ta.value.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || []);
  const seen = new Set([partial]);
  for (const w of userWords) {
    if (w.length > 2 && w.toLowerCase().startsWith(lc) && !seen.has(w)) return w;
    seen.add(w);
  }

  return '';
}

/* ── Sync ghost layer scroll to match textarea ──────────────── */
function _syncScroll(ta, layer) {
  layer.scrollTop  = ta.scrollTop;
  layer.scrollLeft = ta.scrollLeft;
}

/* ── Render ghost suffix into the layer ─────────────────────── */
function _render(ta, layer, partial, suggestion) {
  if (!suggestion || !partial) { layer.style.display = 'none'; return; }

  const suffix = suggestion.slice(partial.length);
  if (!suffix) { layer.style.display = 'none'; return; }

  const pos    = ta.selectionStart;
  const before = ta.value.slice(0, pos);
  const after  = ta.value.slice(pos);

  // Build layer content: text-before (invisible) + ghost-suffix + text-after (invisible)
  layer.innerHTML = '';

  const pre = document.createTextNode(before);
  layer.appendChild(pre);

  const ghostSpan = document.createElement('span');
  ghostSpan.className   = 'ghost-suffix';
  ghostSpan.textContent = suffix;
  layer.appendChild(ghostSpan);

  const post = document.createTextNode(after);
  layer.appendChild(post);

  _syncScroll(ta, layer);
  layer.style.display = 'block';
}

/* ── Clear ghost for a textarea ─────────────────────────────── */
function _clearGhost(ta) {
  const g = _ghostMap.get(ta);
  if (!g) return;
  g.layer.style.display = 'none';
  g.suffix  = '';
  g.partial = '';
  clearTimeout(g.timer);
}

/* ── Accept ghost suggestion (Tab pressed) ───────────────────── */
function _acceptGhost(ta) {
  const g = _ghostMap.get(ta);
  if (!g || !g.suffix) return false;

  const pos        = ta.selectionStart;
  const val        = ta.value;
  const suffix     = g.suffix;

  ta.value = val.slice(0, pos) + suffix + val.slice(pos);
  ta.selectionStart = ta.selectionEnd = pos + suffix.length;
  ta.dispatchEvent(new Event('input', { bubbles: true }));

  _clearGhost(ta);
  return true;
}

/* ── Schedule a ghost suggestion after a short debounce ─────── */
function _schedule(ta, lang) {
  const g = _ghostMap.get(ta);
  if (!g) return;

  clearTimeout(g.timer);
  g.timer = setTimeout(() => {
    if (!state.settings.autocomplete) { _clearGhost(ta); return; }

    // Get the word/token before the cursor (including dots for member access)
    const val    = ta.value;
    const pos    = ta.selectionStart;
    const before = val.slice(0, pos);
    const m      = before.match(/[a-zA-Z_$][a-zA-Z0-9_$.]*$/);
    const partial = m ? m[0] : '';

    if (!partial || partial.length < 2) { _clearGhost(ta); return; }

    const suggestion = _suggest(partial, lang, ta);
    if (!suggestion || suggestion === partial) { _clearGhost(ta); return; }

    const suffix = suggestion.slice(partial.length);
    if (!suffix) { _clearGhost(ta); return; }

    g.partial    = partial;
    g.suffix     = suffix;
    g.suggestion = suggestion;

    _render(ta, g.layer, partial, suggestion);
  }, 120); // slight debounce so it doesn't flash on every keystroke
}

/* ── Create ghost layer for one textarea ────────────────────── */
function _createLayer(ta) {
  const inner = ta.closest('.editor-inner');
  if (!inner) return null;

  const layer = document.createElement('div');
  layer.className = 'ghost-layer';
  layer.setAttribute('aria-hidden', 'true');
  // Insert between hl-layer (z-index:1) and textarea (z-index:2)
  inner.appendChild(layer);

  return layer;
}

/* ── Wire ghost text to one textarea ────────────────────────── */
function _wireGhost(ta, lang) {
  const layer = _createLayer(ta);
  if (!layer) return;

  const g = { layer, suffix: '', partial: '', suggestion: '', timer: null };
  _ghostMap.set(ta, g);

  // Input: schedule a new suggestion
  ta.addEventListener('input', () => {
    if (!state.settings.autocomplete) { _clearGhost(ta); return; }
    _clearGhost(ta); // clear immediately so it doesn't linger while typing
    _schedule(ta, lang);
  });

  // Scroll: keep layer in sync
  ta.addEventListener('scroll', () => _syncScroll(ta, layer));

  // Tab: accept ghost or fall through to normal tab behaviour
  ta.addEventListener('keydown', e => {
    if (e.key === 'Tab' && g.suffix) {
      // Only intercept if dropdown is NOT open (autocomplete dropdown takes priority)
      const drop = document.getElementById('acDropdown');
      if (drop && drop.classList.contains('visible')) return;
      e.preventDefault();
      _acceptGhost(ta);
    } else if (g.suffix) {
      // Any navigation or non-printable key dismisses the ghost
      if (e.key === 'Escape' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
        _clearGhost(ta);
      }
    }
  }, true);

  // Blur: clear ghost
  ta.addEventListener('blur', () => _clearGhost(ta));

  // Click / selection change: clear ghost
  ta.addEventListener('mousedown', () => _clearGhost(ta));
}

/* ── Public API ─────────────────────────────────────────────── */
function wireGhostText() {
  ['left', 'right'].forEach(side => {
    const tabs = tabsFor(side);
    Object.entries(tabs).forEach(([lang, t]) => {
      if (t.ta) _wireGhost(t.ta, lang);
    });
  });
}
