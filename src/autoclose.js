/**
 * core/autoclose.js
 * Auto-close brackets, quotes, and tags in code textareas.
 * Also handles: smart Enter inside {}, auto-indent, Backspace pair deletion,
 * and Emmet-like abbreviation expansion on Tab.
 */

'use strict';

const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
const CLOSERS = new Set(Object.values(PAIRS));
const OPENERS = new Set(Object.keys(PAIRS));

/* ── Emmet abbreviation table ────────────────────────────────── */
const EMMET = {
  // HTML boilerplate
  '!': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
</head>
<body>
  |
</body>
</html>`,

  // Block elements
  'div':     '<div>|</div>',
  'section': '<section>|</section>',
  'article': '<article>|</article>',
  'main':    '<main>|</main>',
  'header':  '<header>|</header>',
  'footer':  '<footer>|</footer>',
  'nav':     '<nav>|</nav>',
  'aside':   '<aside>|</aside>',

  // Text elements
  'p':       '<p>|</p>',
  'h1':      '<h1>|</h1>',
  'h2':      '<h2>|</h2>',
  'h3':      '<h3>|</h3>',
  'h4':      '<h4>|</h4>',
  'h5':      '<h5>|</h5>',
  'h6':      '<h6>|</h6>',
  'span':    '<span>|</span>',
  'strong':  '<strong>|</strong>',
  'em':      '<em>|</em>',
  'small':   '<small>|</small>',
  'blockquote': '<blockquote>|</blockquote>',
  'pre':     '<pre>|</pre>',
  'code':    '<code>|</code>',

  // Links & media
  'a':       '<a href="|"></a>',
  'img':     '<img src="|" alt="" />',
  'video':   '<video src="|" controls></video>',
  'audio':   '<audio src="|" controls></audio>',
  'iframe':  '<iframe src="|" frameborder="0"></iframe>',

  // Lists
  'ul':      '<ul>\n  <li>|</li>\n</ul>',
  'ol':      '<ol>\n  <li>|</li>\n</ol>',
  'li':      '<li>|</li>',
  'dl':      '<dl>\n  <dt>|</dt>\n  <dd></dd>\n</dl>',

  // Table
  'table':   '<table>\n  <thead>\n    <tr>\n      <th>|</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td></td>\n    </tr>\n  </tbody>\n</table>',
  'tr':      '<tr>|</tr>',
  'td':      '<td>|</td>',
  'th':      '<th>|</th>',

  // Form elements
  'form':     '<form action="|" method="post">\n</form>',
  'input':    '<input type="text" name="|" />',
  'input:text':     '<input type="text" name="|" placeholder="" />',
  'input:email':    '<input type="email" name="|" placeholder="" />',
  'input:password': '<input type="password" name="|" />',
  'input:number':   '<input type="number" name="|" />',
  'input:checkbox': '<input type="checkbox" name="|" />',
  'input:radio':    '<input type="radio" name="|" />',
  'input:submit':   '<input type="submit" value="|" />',
  'input:file':     '<input type="file" name="|" />',
  'input:hidden':   '<input type="hidden" name="|" />',
  'button':   '<button type="button">|</button>',
  'btn':      '<button type="button">|</button>',
  'textarea': '<textarea name="|" rows="4" cols="50"></textarea>',
  'select':   '<select name="|">\n  <option value=""></option>\n</select>',
  'label':    '<label for="|"></label>',

  // Semantic / misc
  'figure':   '<figure>\n  <img src="|" alt="" />\n  <figcaption></figcaption>\n</figure>',
  'details':  '<details>\n  <summary>|</summary>\n</details>',
  'dialog':   '<dialog id="|">\n</dialog>',
  'template': '<template id="|">\n</template>',
  'slot':     '<slot name="|"></slot>',
  'link':     '<link rel="stylesheet" href="|" />',
  'script':   '<script src="|"></script>',
  'style':    '<style>\n  |\n</style>',
  'meta':     '<meta name="|" content="" />',
};

/**
 * Try to expand an Emmet abbreviation at the cursor.
 * Returns true if expanded, false otherwise.
 */
function _tryEmmet(ta, lang) {
  // Only expand in HTML tab
  if (lang !== 'html') return false;

  const s        = ta.selectionStart;
  const val      = ta.value;
  const lineStart = val.lastIndexOf('\n', s - 1) + 1;
  const lineText  = val.slice(lineStart, s);
  const abbr      = lineText.trim();

  if (!abbr || !(abbr in EMMET)) return false;

  const indent   = lineText.match(/^(\s*)/)[1];
  let snippet    = EMMET[abbr];

  // Indent multiline snippets to match current indentation
  if (snippet.includes('\n')) {
    snippet = snippet
      .split('\n')
      .map((line, i) => i === 0 ? line : indent + line)
      .join('\n');
  }

  // Find cursor position marker '|' in snippet
  const cursorPos = snippet.indexOf('|');
  const clean     = snippet.replace('|', '');

  // Replace the abbreviation on the current line with the snippet
  ta.value = val.slice(0, lineStart) + indent + clean + val.slice(s);
  const newCursor = lineStart + indent.length + (cursorPos === -1 ? clean.length : cursorPos);
  ta.selectionStart = ta.selectionEnd = newCursor;
  return true;
}

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

function wireAutoClose(ta, lang) {
  ta.addEventListener('keydown', e => {
    const s      = ta.selectionStart;
    const end    = ta.selectionEnd;
    const val    = ta.value;
    const charAt = val[s] || '';
    const before = val[s - 1] || '';
    const hasSelection = s !== end;

    /* ── Tab: Emmet expansion ──────────────────────────────── */
    if (e.key === 'Tab' && !hasSelection) {
      if (_tryEmmet(ta, lang)) {
        e.preventDefault();
        _notifyChange(ta);
        return;
      }
      // Default tab: insert 2 spaces
      e.preventDefault();
      ta.value = val.slice(0, s) + '  ' + val.slice(s);
      ta.selectionStart = ta.selectionEnd = s + 2;
      _notifyChange(ta);
      return;
    }

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
    Object.entries(tabsFor(side)).forEach(([lang, t]) => {
      if (t.ta) wireAutoClose(t.ta, lang);
    });
  });
}
