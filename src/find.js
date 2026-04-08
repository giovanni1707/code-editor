/**
 * core/find.js
 * Find & Replace panel, per-panel, triggered by Ctrl+F / Ctrl+H.
 * Highlights all matches in the hl-layer via <mark> spans.
 * Navigates with Enter / Shift+Enter / arrow buttons.
 */

'use strict';

/* ── State ───────────────────────────────────────────────────── */
const FIND = {
  left:  { open: false, mode: 'find', query: '', replace: '', matches: [], idx: 0 },
  right: { open: false, mode: 'find', query: '', replace: '', matches: [], idx: 0 },
};

/* ── DOM helpers ─────────────────────────────────────────────── */
function _fels(side) {
  const sfx = side === 'left' ? 'L' : 'R';
  return {
    bar:        document.getElementById('findBar'     + sfx),
    queryInput: document.getElementById('findQuery'   + sfx),
    replInput:  document.getElementById('findReplace' + sfx),
    count:      document.getElementById('findCount'   + sfx),
    prevBtn:    document.getElementById('findPrev'    + sfx),
    nextBtn:    document.getElementById('findNext'    + sfx),
    replBtn:    document.getElementById('findDoRepl'  + sfx),
    replAllBtn: document.getElementById('findReplAll' + sfx),
    closeBtn:   document.getElementById('findClose'   + sfx),
    caseBtn:    document.getElementById('findCase'    + sfx),
    regexBtn:   document.getElementById('findRegex'   + sfx),
    replRow:    document.getElementById('findReplRow' + sfx),
  };
}

/* ── Match finding ───────────────────────────────────────────── */
function _buildRegex(f) {
  if (!f.query) return null;
  try {
    const flags = 'g' + (f.caseSensitive ? '' : 'i');
    return f.useRegex
      ? new RegExp(f.query, flags)
      : new RegExp(f.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  } catch { return null; }
}

function _findMatches(ta, f) {
  const re = _buildRegex(f);
  if (!re) return [];
  const matches = [];
  let m;
  while ((m = re.exec(ta.value)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    if (m[0].length === 0) re.lastIndex++; // avoid infinite loop on zero-length match
  }
  return matches;
}

/* ── Highlight matches in hl-layer ──────────────────────────── */
function _highlightMatches(side) {
  const f    = FIND[side];
  const tabs = tabsFor(side);
  const lang = state.activeTab[side];
  const t    = tabs[lang];
  if (!t || !t.hl) return;

  // Re-run Prism then inject <mark> spans around matches
  const prismLang = LANG_META[lang].prism;
  const grammar   = Prism.languages[prismLang] || Prism.languages.javascript;
  const highlighted = Prism.highlight(t.ta.value, grammar, prismLang);

  if (!f.query || f.matches.length === 0) {
    t.hl.querySelector('code').innerHTML = highlighted;
    return;
  }

  // Build a plain-text → html-offset map by walking the highlighted HTML
  // Simpler approach: rebuild with marks by replacing in plain text positions
  // We work on the raw value and insert mark tags at byte positions,
  // then re-highlight (Prism will strip them). Instead we overlay marks via
  // a separate absolutely-positioned layer — but that's complex.
  // Best practical approach: mark the current match by scrolling textarea to it.
  // Highlight all matches with a CSS class by rebuilding HTML with <mark> wrapped.

  // Strategy: replace Prism output — find text node positions.
  // Cleanest: use a temporary div to walk text nodes.
  const tmp = document.createElement('div');
  tmp.innerHTML = highlighted;

  const re = _buildRegex(f);
  if (!re) { t.hl.querySelector('code').innerHTML = highlighted; return; }

  // Walk text nodes and wrap matches
  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  // Build full plain text offset map
  let offset = 0;
  const nodeMap = textNodes.map(n => {
    const start = offset;
    offset += n.textContent.length;
    return { node: n, start, end: offset };
  });

  // Find all match ranges
  re.lastIndex = 0;
  const plainText = t.ta.value;
  const ranges = [];
  let m2;
  while ((m2 = re.exec(plainText)) !== null) {
    ranges.push({ start: m2.index, end: m2.index + m2[0].length });
    if (m2[0].length === 0) re.lastIndex++;
  }

  // For each text node, split and wrap matching portions
  for (let ni = nodeMap.length - 1; ni >= 0; ni--) {
    const nm = nodeMap[ni];
    const overlapping = ranges.filter(r => r.start < nm.end && r.end > nm.start);
    if (overlapping.length === 0) continue;

    const frag = document.createDocumentFragment();
    let localPos = 0;
    const text = nm.node.textContent;

    for (const r of overlapping) {
      const ls = Math.max(0, r.start - nm.start);
      const le = Math.min(text.length, r.end - nm.start);
      if (ls > localPos) frag.appendChild(document.createTextNode(text.slice(localPos, ls)));
      const mark = document.createElement('mark');
      mark.className = 'find-match';
      mark.textContent = text.slice(ls, le);
      frag.appendChild(mark);
      localPos = le;
    }
    if (localPos < text.length) frag.appendChild(document.createTextNode(text.slice(localPos)));
    nm.node.parentNode.replaceChild(frag, nm.node);
  }

  // Mark current match
  const marks = tmp.querySelectorAll('mark.find-match');
  if (marks[f.idx]) marks[f.idx].classList.add('find-match-current');

  t.hl.querySelector('code').innerHTML = tmp.innerHTML;
}

/* ── Update count display ────────────────────────────────────── */
function _updateCount(side) {
  const f    = FIND[side];
  const refs = _fels(side);
  if (!f.query) {
    refs.count.textContent = '';
    refs.queryInput.classList.remove('find-no-match');
    return;
  }
  if (f.matches.length === 0) {
    refs.count.textContent = 'No results';
    refs.queryInput.classList.add('find-no-match');
  } else {
    refs.count.textContent = `${f.idx + 1} / ${f.matches.length}`;
    refs.queryInput.classList.remove('find-no-match');
  }
}

/* ── Scroll textarea to current match ───────────────────────── */
function _scrollToMatch(side, focusTa = false) {
  const f  = FIND[side];
  const ta = activeTab(side).ta;
  if (!f.matches.length) return;
  const m = f.matches[f.idx];
  // Only focus the textarea when navigating explicitly (not while user is typing in find bar)
  if (focusTa) {
    ta.focus();
    ta.selectionStart = m.start;
    ta.selectionEnd   = m.end;
  } else {
    // Set selection without stealing focus so find input keeps focus while typing
    try { ta.selectionStart = m.start; ta.selectionEnd = m.end; } catch (_) {}
  }
  // Scroll into view
  const lh = parseInt(getComputedStyle(ta).lineHeight) || 20;
  const lineNum = ta.value.slice(0, m.start).split('\n').length - 1;
  ta.scrollTop = Math.max(0, lineNum * lh - ta.clientHeight / 2);
}

/* ── Run search ──────────────────────────────────────────────── */
function _runFind(side, focusTa = false) {
  const f  = FIND[side];
  const ta = activeTab(side).ta;
  f.matches = _findMatches(ta, f);
  if (f.idx >= f.matches.length) f.idx = 0;
  _updateCount(side);
  _highlightMatches(side);
  if (f.matches.length) _scrollToMatch(side, focusTa);
}

/* ── Navigate ────────────────────────────────────────────────── */
function findNext(side, keepFocus = false) {
  const f    = FIND[side];
  const refs = _fels(side);
  if (!f.matches.length) return;
  f.idx = (f.idx + 1) % f.matches.length;
  _updateCount(side);
  _highlightMatches(side);
  _scrollToMatch(side, !keepFocus);
  if (keepFocus) refs.queryInput.focus();
}

function findPrev(side, keepFocus = false) {
  const f    = FIND[side];
  const refs = _fels(side);
  if (!f.matches.length) return;
  f.idx = (f.idx - 1 + f.matches.length) % f.matches.length;
  _updateCount(side);
  _highlightMatches(side);
  _scrollToMatch(side, !keepFocus);
  if (keepFocus) refs.queryInput.focus();
}

/* ── Replace ─────────────────────────────────────────────────── */
function findReplace(side) {
  const f  = FIND[side];
  const ta = activeTab(side).ta;
  if (!f.matches.length) return;
  const m   = f.matches[f.idx];
  const val = ta.value;
  ta.value  = val.slice(0, m.start) + f.replace + val.slice(m.end);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  _runFind(side);
}

function findReplaceAll(side) {
  const f  = FIND[side];
  const ta = activeTab(side).ta;
  if (!f.matches.length) return;
  const re  = _buildRegex(f);
  if (!re) return;
  ta.value  = ta.value.replace(re, f.replace);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  _runFind(side);
  toast(`Replaced ${f.matches.length} occurrences`);
}

/* ── Open / close ────────────────────────────────────────────── */
function openFind(side, mode = 'find') {
  const f    = FIND[side];
  const refs = _fels(side);
  f.open = true;
  f.mode = mode;
  refs.bar.classList.add('open');
  refs.replRow.style.display = mode === 'replace' ? '' : 'none';
  refs.queryInput.focus();
  refs.queryInput.select();
  if (f.query) _runFind(side);
}

function closeFind(side) {
  const f    = FIND[side];
  const refs = _fels(side);
  f.open = false;
  refs.bar.classList.remove('open');
  // Clear highlights
  f.query = '';
  _highlightMatches(side);
  refs.queryInput.value = '';
  refs.count.textContent = '';
  refs.queryInput.classList.remove('find-no-match');
}

function toggleFind(side, mode) {
  FIND[side].open && FIND[side].mode === mode ? closeFind(side) : openFind(side, mode);
}

/* ── Wire one panel ──────────────────────────────────────────── */
function _wireFindPanel(side) {
  const refs = _fels(side);
  const f    = FIND[side];

  f.caseSensitive = false;
  f.useRegex      = false;

  refs.queryInput.addEventListener('input', () => {
    f.query = refs.queryInput.value;
    f.idx   = 0;
    _runFind(side);
  });

  refs.queryInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // keepFocus=true: Enter in find bar keeps focus in the find bar
      e.shiftKey ? findPrev(side, true) : findNext(side, true);
    }
    if (e.key === 'Escape') closeFind(side);
  });

  refs.replInput.addEventListener('input', () => { f.replace = refs.replInput.value; });
  refs.replInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); findReplace(side); }
    if (e.key === 'Escape') closeFind(side);
  });

  refs.prevBtn.addEventListener('click',    () => findPrev(side, true));
  refs.nextBtn.addEventListener('click',    () => findNext(side, true));
  refs.replBtn.addEventListener('click',    () => findReplace(side));
  refs.replAllBtn.addEventListener('click', () => findReplaceAll(side));
  refs.closeBtn.addEventListener('click',   () => closeFind(side));

  refs.caseBtn.addEventListener('click', () => {
    f.caseSensitive = !f.caseSensitive;
    refs.caseBtn.classList.toggle('active', f.caseSensitive);
    _runFind(side);
  });

  refs.regexBtn.addEventListener('click', () => {
    f.useRegex = !f.useRegex;
    refs.regexBtn.classList.toggle('active', f.useRegex);
    _runFind(side);
  });
}

function wireFind() {
  _wireFindPanel('left');
  _wireFindPanel('right');
}
