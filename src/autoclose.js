/**
 * core/autoclose.js
 * Auto-close brackets, quotes, and tags in code textareas.
 * Also handles: smart Enter inside {}, auto-indent, Backspace pair deletion.
 */

'use strict';

const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
const CLOSERS = new Set(Object.values(PAIRS));
const OPENERS = new Set(Object.keys(PAIRS));

function _insert(ta, before, after, offset = before.length) {
  const s   = ta.selectionStart;
  const e   = ta.selectionEnd;
  const val = ta.value;
  ta.value  = val.slice(0, s) + before + val.slice(e, e) + after + val.slice(e);
  ta.selectionStart = ta.selectionEnd = s + offset;
}

function _notifyChange(ta) {
  // Fire synthetic input so highlight/gutter/save all update
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function wireAutoClose(ta) {
  ta.addEventListener('keydown', e => {
    const s      = ta.selectionStart;
    const end    = ta.selectionEnd;
    const val    = ta.value;
    const charAt = val[s] || '';
    const before = val[s - 1] || '';
    const hasSelection = s !== end;

    /* ── Wrap selection in pair ────────────────────────────── */
    if (hasSelection && OPENERS.has(e.key)) {
      e.preventDefault();
      const sel    = val.slice(s, end);
      const close  = PAIRS[e.key];
      ta.value     = val.slice(0, s) + e.key + sel + close + val.slice(end);
      ta.selectionStart = s + 1;
      ta.selectionEnd   = end + 1;
      _notifyChange(ta);
      return;
    }

    /* ── Skip over closing char if already there ───────────── */
    if (!hasSelection && CLOSERS.has(e.key) && charAt === e.key) {
      // For quotes: only skip if the char ahead matches what was auto-inserted
      e.preventDefault();
      ta.selectionStart = ta.selectionEnd = s + 1;
      return;
    }

    /* ── Auto-close opener ─────────────────────────────────── */
    if (!hasSelection && OPENERS.has(e.key)) {
      // Don't auto-close quotes if the cursor is inside a word
      const isQuote = e.key === '"' || e.key === "'" || e.key === '`';
      if (isQuote) {
        const wordChar = /\w/;
        if (wordChar.test(before) || wordChar.test(charAt)) return; // let browser handle
        // If same quote already follows, just skip
        if (charAt === e.key) {
          e.preventDefault();
          ta.selectionStart = ta.selectionEnd = s + 1;
          return;
        }
      }
      e.preventDefault();
      _insert(ta, e.key, PAIRS[e.key]);
      _notifyChange(ta);
      return;
    }

    /* ── Backspace: delete pair ────────────────────────────── */
    if (e.key === 'Backspace' && !hasSelection && s > 0) {
      const open  = val[s - 1];
      const close = val[s];
      if (PAIRS[open] && PAIRS[open] === close) {
        e.preventDefault();
        ta.value = val.slice(0, s - 1) + val.slice(s + 1);
        ta.selectionStart = ta.selectionEnd = s - 1;
        _notifyChange(ta);
        return;
      }
    }

    /* ── Enter: smart indent inside {} ────────────────────── */
    if (e.key === 'Enter' && !hasSelection) {
      const open  = val[s - 1];
      const close = val[s];
      if (open === '{' && close === '}') {
        e.preventDefault();
        // Get the current line's indentation
        const lineStart = val.lastIndexOf('\n', s - 1) + 1;
        const indent    = val.slice(lineStart, s).match(/^(\s*)/)[1];
        const inner     = indent + '  ';
        ta.value = val.slice(0, s) + '\n' + inner + '\n' + indent + val.slice(s);
        ta.selectionStart = ta.selectionEnd = s + 1 + inner.length;
        _notifyChange(ta);
        return;
      }

      // Normal Enter: preserve indentation of current line
      e.preventDefault();
      const lineStart = val.lastIndexOf('\n', s - 1) + 1;
      const indent    = val.slice(lineStart, s).match(/^(\s*)/)[1];
      ta.value = val.slice(0, s) + '\n' + indent + val.slice(s);
      ta.selectionStart = ta.selectionEnd = s + 1 + indent.length;
      _notifyChange(ta);
    }
  });
}

function wireAllAutoClose() {
  ['left', 'right'].forEach(side => {
    Object.values(tabsFor(side)).forEach(t => {
      if (t.ta) wireAutoClose(t.ta);
    });
  });
}
