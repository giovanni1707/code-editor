/**
 * src/global-search.js
 * Ctrl+Shift+F — search across all project files, click result to navigate.
 */

'use strict';

let _gsOpen      = false;
let _gsResults   = [];   // [{ file, lineNum, lineText, matchStart, matchEnd }]

/* ── DOM refs ────────────────────────────────────────────────── */
let _gsOverlay, _gsInput, _gsCaseBtn, _gsRegexBtn, _gsList, _gsCount;

function _buildGsDom() {
  if (_gsOverlay) return;

  _gsOverlay = document.createElement('div');
  _gsOverlay.id        = 'gsOverlay';
  _gsOverlay.className = 'gs-overlay';

  const box = document.createElement('div');
  box.className = 'gs-box';

  // Header
  const header = document.createElement('div');
  header.className = 'gs-header';

  _gsInput = document.createElement('input');
  _gsInput.type        = 'text';
  _gsInput.className   = 'gs-input';
  _gsInput.placeholder = 'Search across all files…';
  _gsInput.setAttribute('autocomplete', 'off');
  _gsInput.setAttribute('spellcheck',   'false');

  _gsCaseBtn  = _mkToggleBtn('Aa', 'Case sensitive',  'gs-toggle');
  _gsRegexBtn = _mkToggleBtn('.*', 'Use regular expression', 'gs-toggle');

  _gsCount = document.createElement('span');
  _gsCount.className = 'gs-count';

  const closeBtn = document.createElement('button');
  closeBtn.className   = 'gs-close';
  closeBtn.textContent = '×';
  closeBtn.title       = 'Close (Esc)';
  closeBtn.addEventListener('click', closeGlobalSearch);

  header.appendChild(_gsInput);
  header.appendChild(_gsCaseBtn);
  header.appendChild(_gsRegexBtn);
  header.appendChild(_gsCount);
  header.appendChild(closeBtn);

  _gsList = document.createElement('div');
  _gsList.className = 'gs-list';

  box.appendChild(header);
  box.appendChild(_gsList);
  _gsOverlay.appendChild(box);
  document.body.appendChild(_gsOverlay);

  // Events
  _gsOverlay.addEventListener('mousedown', e => {
    if (e.target === _gsOverlay) closeGlobalSearch();
  });

  let _debounce;
  _gsInput.addEventListener('input', () => {
    clearTimeout(_debounce);
    _debounce = setTimeout(_gsRun, 180);
  });
  _gsInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeGlobalSearch(); }
  });
  _gsCaseBtn.addEventListener('click',  () => { _gsCaseBtn.classList.toggle('active');  _gsRun(); });
  _gsRegexBtn.addEventListener('click', () => { _gsRegexBtn.classList.toggle('active'); _gsRun(); });
}

function _mkToggleBtn(text, title, cls) {
  const btn = document.createElement('button');
  btn.className   = cls;
  btn.textContent = text;
  btn.title       = title;
  return btn;
}

/* ── Build search regex ──────────────────────────────────────── */
function _gsRegex(query) {
  if (!query) return null;
  const caseSensitive = _gsCaseBtn.classList.contains('active');
  const useRegex      = _gsRegexBtn.classList.contains('active');
  const flags         = 'g' + (caseSensitive ? '' : 'i');
  try {
    return useRegex
      ? new RegExp(query, flags)
      : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  } catch { return null; }
}

/* ── Escape HTML for display ─────────────────────────────────── */
function _gsEsc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Run search across all project files ─────────────────────── */
function _gsRun() {
  _gsList.innerHTML = '';
  _gsResults = [];
  const query = _gsInput.value;
  const re    = _gsRegex(query);

  if (!re) {
    _gsCount.textContent = '';
    return;
  }

  const files = Object.values(state.project.files);
  let totalMatches = 0;
  const MAX_RESULTS = 500;

  for (const file of files) {
    const content = file.content || '';
    const lines   = content.split('\n');
    const fileMatches = [];

    for (let ln = 0; ln < lines.length; ln++) {
      const line = lines[ln];
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        fileMatches.push({ file, lineNum: ln + 1, lineText: line, matchStart: m.index, matchEnd: m.index + m[0].length });
        totalMatches++;
        if (totalMatches >= MAX_RESULTS) break;
      }
      if (totalMatches >= MAX_RESULTS) break;
    }

    if (fileMatches.length) {
      _gsResults.push(...fileMatches);
      _gsRenderFileGroup(file, fileMatches, query);
    }
    if (totalMatches >= MAX_RESULTS) break;
  }

  _gsCount.textContent = totalMatches
    ? `${totalMatches}${totalMatches >= MAX_RESULTS ? '+' : ''} result${totalMatches !== 1 ? 's' : ''}`
    : 'No results';
}

/* ── Render a file's result group ────────────────────────────── */
function _gsRenderFileGroup(file, matches, query) {
  // File heading
  const heading = document.createElement('div');
  heading.className = 'gs-file-heading';

  const path = _gsFilePath(file);
  const dir  = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
  const name = file.name;
  heading.innerHTML =
    (dir ? `<span class="gs-file-dir">${_gsEsc(dir)}</span>` : '') +
    `<span class="gs-file-name">${_gsEsc(name)}</span>` +
    `<span class="gs-file-count">${matches.length}</span>`;

  _gsList.appendChild(heading);

  // Individual match rows
  matches.forEach(r => {
    const row = document.createElement('div');
    row.className = 'gs-result';

    const lineNo = document.createElement('span');
    lineNo.className   = 'gs-line-no';
    lineNo.textContent = r.lineNum;

    const text = document.createElement('span');
    text.className = 'gs-line-text';

    // Show max 120 chars, centred around the match
    const MAX = 120;
    let { lineText, matchStart, matchEnd } = r;
    if (lineText.length > MAX) {
      const center = Math.floor((matchStart + matchEnd) / 2);
      const from   = Math.max(0, center - MAX / 2);
      lineText    = (from > 0 ? '…' : '') + lineText.slice(from, from + MAX);
      const offset = from > 0 ? from - 1 : from;
      matchStart -= offset;
      matchEnd   -= offset;
    }

    const before = _gsEsc(lineText.slice(0, matchStart));
    const match  = `<mark>${_gsEsc(lineText.slice(matchStart, matchEnd))}</mark>`;
    const after  = _gsEsc(lineText.slice(matchEnd));
    text.innerHTML = before + match + after;

    row.appendChild(lineNo);
    row.appendChild(text);

    row.addEventListener('click', () => {
      closeGlobalSearch();
      _gsNavigateTo(r);
    });

    _gsList.appendChild(row);
  });
}

/* ── Navigate to a result: open file + scroll to line ────────── */
function _gsNavigateTo(r) {
  openFileInPanel(_focusedPanel, r.file.id);

  // After a tick (to allow file load + surface switch), position cursor
  requestAnimationFrame(() => {
    const side = _focusedPanel;
    const lang = extToLang(r.file.name);
    const ta   = tabsFor(side)[lang]?.ta;
    if (!ta) return;

    // Find the char offset of the target line
    const lines  = ta.value.split('\n');
    let offset = 0;
    for (let i = 0; i < r.lineNum - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1;
    }
    offset += r.matchStart;

    ta.focus();
    ta.setSelectionRange(offset, offset + (r.matchEnd - r.matchStart));

    // Scroll the textarea to show the line
    const lineH    = parseInt(getComputedStyle(ta).lineHeight, 10) || 18;
    ta.scrollTop   = Math.max(0, (r.lineNum - 5) * lineH);
  });
}

/* ── Build display path for a file ──────────────────────────── */
function _gsFilePath(file) {
  const parts = [file.name];
  let pid = file.parentId;
  while (pid) {
    const f = state.project.folders[pid];
    if (!f) break;
    parts.unshift(f.name);
    pid = f.parentId;
  }
  return parts.join('/');
}

/* ── Public API ──────────────────────────────────────────────── */
function openGlobalSearch() {
  _buildGsDom();
  _gsOpen = true;
  _gsOverlay.classList.add('gs-show');
  _gsInput.focus();
  _gsInput.select();
}

function closeGlobalSearch() {
  if (!_gsOverlay) return;
  _gsOpen = false;
  _gsOverlay.classList.remove('gs-show');
}

function wireGlobalSearch() {
  _buildGsDom();
}
