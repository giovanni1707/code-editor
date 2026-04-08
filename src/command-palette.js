/**
 * src/command-palette.js
 * Ctrl+P quick-open: fuzzy-search all project files and open in the active panel.
 */

'use strict';

let _cpOpen = false;
let _cpIdx  = 0;
let _cpResults = [];

/* ── DOM refs (created once) ─────────────────────────────────── */
let _cpOverlay, _cpInput, _cpList;

function _buildCpDom() {
  if (_cpOverlay) return;

  _cpOverlay = document.createElement('div');
  _cpOverlay.id        = 'cpOverlay';
  _cpOverlay.className = 'cp-overlay';

  const box = document.createElement('div');
  box.className = 'cp-box';

  _cpInput = document.createElement('input');
  _cpInput.type        = 'text';
  _cpInput.id          = 'cpInput';
  _cpInput.className   = 'cp-input';
  _cpInput.placeholder = 'Open file…';
  _cpInput.setAttribute('autocomplete', 'off');
  _cpInput.setAttribute('spellcheck',   'false');

  _cpList = document.createElement('div');
  _cpList.id        = 'cpList';
  _cpList.className = 'cp-list';

  box.appendChild(_cpInput);
  box.appendChild(_cpList);
  _cpOverlay.appendChild(box);
  document.body.appendChild(_cpOverlay);

  // Close on backdrop click
  _cpOverlay.addEventListener('mousedown', e => {
    if (e.target === _cpOverlay) closeCommandPalette();
  });

  _cpInput.addEventListener('input', () => _cpRender(_cpInput.value));
  _cpInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); _cpMove(1);  return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); _cpMove(-1); return; }
    if (e.key === 'Enter')     { e.preventDefault(); _cpConfirm(); return; }
    if (e.key === 'Escape')    { closeCommandPalette(); return; }
  });
}

/* ── Fuzzy score: higher = better match ─────────────────────── */
function _fuzzy(str, query) {
  if (!query) return 1;
  const s = str.toLowerCase();
  const q = query.toLowerCase();
  // Exact substring match scores highest
  if (s.includes(q)) return 2 + (s.startsWith(q) ? 1 : 0);
  // Character-by-character sequential match
  let si = 0, qi = 0, score = 0;
  while (si < s.length && qi < q.length) {
    if (s[si] === q[qi]) { score++; qi++; }
    si++;
  }
  return qi === q.length ? score / q.length : 0;
}

/* ── Highlight matching characters in the label ─────────────── */
function _highlight(name, query) {
  if (!query) return _escHtml(name);
  const q = query.toLowerCase();
  let result = '', qi = 0;
  for (let i = 0; i < name.length; i++) {
    const ch = name[i];
    if (qi < q.length && ch.toLowerCase() === q[qi]) {
      result += `<mark>${_escHtml(ch)}</mark>`;
      qi++;
    } else {
      result += _escHtml(ch);
    }
  }
  return result;
}

function _escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Build file path label (folder/name) ─────────────────────── */
function _filePath(file) {
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

/* ── Render result list ──────────────────────────────────────── */
function _cpRender(query) {
  const files = Object.values(state.project.files);

  _cpResults = files
    .map(f => ({ file: f, path: _filePath(f), score: _fuzzy(_filePath(f), query) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 20);

  _cpIdx = 0;
  _cpList.innerHTML = '';

  if (!_cpResults.length) {
    const empty = document.createElement('div');
    empty.className   = 'cp-empty';
    empty.textContent = files.length ? 'No matching files' : 'No files in project';
    _cpList.appendChild(empty);
    return;
  }

  _cpResults.forEach((r, i) => {
    const item = document.createElement('div');
    item.className = 'cp-item' + (i === 0 ? ' cp-active' : '');

    // Name (bold) + directory prefix (dimmed)
    const dir  = r.path.includes('/') ? r.path.slice(0, r.path.lastIndexOf('/') + 1) : '';
    const name = r.file.name;

    item.innerHTML =
      (dir ? `<span class="cp-dir">${_escHtml(dir)}</span>` : '') +
      `<span class="cp-name">${_highlight(name, query)}</span>`;

    item.addEventListener('mousedown', e => {
      e.preventDefault();
      _cpIdx = i;
      _cpConfirm();
    });
    _cpList.appendChild(item);
  });
}

function _cpMove(delta) {
  const items = _cpList.querySelectorAll('.cp-item');
  if (!items.length) return;
  items[_cpIdx]?.classList.remove('cp-active');
  _cpIdx = Math.max(0, Math.min(items.length - 1, _cpIdx + delta));
  const active = items[_cpIdx];
  active?.classList.add('cp-active');
  active?.scrollIntoView({ block: 'nearest' });
}

function _cpConfirm() {
  const r = _cpResults[_cpIdx];
  if (!r) return;
  closeCommandPalette();
  openFileInPanel(_focusedPanel, r.file.id);
}

/* ── Public API ──────────────────────────────────────────────── */
function openCommandPalette() {
  _buildCpDom();
  _cpOpen = true;
  _cpOverlay.classList.add('cp-show');
  _cpInput.value = '';
  _cpRender('');
  _cpInput.focus();
}

function closeCommandPalette() {
  if (!_cpOverlay) return;
  _cpOpen = false;
  _cpOverlay.classList.remove('cp-show');
}

function wireCommandPalette() {
  _buildCpDom();
}
