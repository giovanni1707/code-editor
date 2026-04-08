/**
 * core/autoclose.js
 * Auto-close brackets, quotes, and tags in code textareas.
 * Also handles: smart Enter inside {}/[]/()/etc., auto-indent,
 * Backspace pair deletion, Emmet abbreviation expansion on Tab,
 * and CSS property shortcuts.
 */

'use strict';

const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
const CLOSERS = new Set(Object.values(PAIRS));
const OPENERS = new Set(Object.keys(PAIRS));

/* ═══════════════════════════════════════════════════════════════
   EMMET — Static lookup (HTML boilerplate, void elements, etc.)
═══════════════════════════════════════════════════════════════ */
const EMMET_STATIC = {
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
  'link:css':   '<link rel="stylesheet" href="|" />',
  'link:favicon':'<link rel="icon" href="|" type="image/x-icon" />',
  'script:src': '<script src="|"></script>',
  'meta:utf':   '<meta charset="UTF-8" />',
  'meta:vp':    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  'input:text':     '<input type="text" name="|" placeholder="" />',
  'input:email':    '<input type="email" name="|" placeholder="" />',
  'input:password': '<input type="password" name="|" />',
  'input:number':   '<input type="number" name="|" />',
  'input:checkbox': '<input type="checkbox" name="|" />',
  'input:radio':    '<input type="radio" name="|" />',
  'input:submit':   '<input type="submit" value="|" />',
  'input:file':     '<input type="file" name="|" />',
  'input:hidden':   '<input type="hidden" name="|" />',
  'input:range':    '<input type="range" name="|" min="0" max="100" />',
  'input:color':    '<input type="color" name="|" />',
  'input:date':     '<input type="date" name="|" />',
  'form:get':  '<form action="|" method="get">\n</form>',
  'form:post': '<form action="|" method="post">\n</form>',
};

/* Void (self-closing) HTML elements */
const VOID_TAGS = new Set([
  'area','base','br','col','embed','hr','img','input',
  'link','meta','param','source','track','wbr',
]);

/* ═══════════════════════════════════════════════════════════════
   EMMET — Dynamic HTML abbreviation parser
   Supports: tag, .class, #id, [attr=val], *N, parent>child
═══════════════════════════════════════════════════════════════ */

/**
 * Parse an Emmet-like HTML abbreviation.
 * Returns the expanded snippet string with | as cursor marker.
 * Returns null if it doesn't look like an Emmet abbreviation.
 */
function _parseEmmetHtml(abbr, indent) {
  // Check static table first (highest priority)
  if (abbr in EMMET_STATIC) return EMMET_STATIC[abbr];

  // Handle child operator: div>span*3
  const childIdx = abbr.indexOf('>');
  if (childIdx > 0) {
    const parent = abbr.slice(0, childIdx);
    const child  = abbr.slice(childIdx + 1);
    const childSnippet = _parseEmmetHtml(child, indent + '  ');
    if (!childSnippet) return null;
    const parentEl = _parseEmmetEl(parent);
    if (!parentEl) return null;
    const { tag, attrs } = parentEl;
    if (VOID_TAGS.has(tag)) return null;
    const innerLines = childSnippet.split('\n').map(l => indent + '  ' + l).join('\n');
    return `<${tag}${attrs}>\n${innerLines}\n${indent}</${tag}>`;
  }

  // Handle sibling operator: div+p
  const sibIdx = abbr.indexOf('+');
  if (sibIdx > 0) {
    const a = _parseEmmetHtml(abbr.slice(0, sibIdx), indent);
    const b = _parseEmmetHtml(abbr.slice(sibIdx + 1), indent);
    if (!a || !b) return null;
    return a + '\n' + indent + b;
  }

  // Repetition: li*3
  const repMatch = abbr.match(/^(.+)\*(\d+)$/);
  if (repMatch) {
    const base = repMatch[1];
    const count = +repMatch[2];
    const items = [];
    for (let i = 1; i <= count; i++) {
      const sn = _parseEmmetEl(base, i, count);
      if (!sn) return null;
      const { tag, attrs, inner } = sn;
      if (VOID_TAGS.has(tag)) {
        items.push(`<${tag}${attrs} />`);
      } else {
        const cursor = i === 1 ? '|' : '';
        items.push(`<${tag}${attrs}>${inner || cursor}</${tag}>`);
      }
    }
    return items.join('\n' + indent);
  }

  // Single element
  const el = _parseEmmetEl(abbr);
  if (!el) return null;
  const { tag, attrs } = el;
  if (VOID_TAGS.has(tag)) return `<${tag}${attrs} />`;
  return `<${tag}${attrs}>|</${tag}>`;
}

/**
 * Parse a single element abbreviation (tag.class#id[attr=val]{text}).
 * Returns { tag, attrs, inner } or null.
 */
function _parseEmmetEl(abbr, idx = null, total = null) {
  // Abbreviation grammar (simplified):
  //   [tag][.class]...[#id][attr=val]*[{text}]
  let rest = abbr;
  let tag  = 'div'; // default tag
  const classes = [];
  let id    = null;
  const customAttrs = [];
  let innerText = null;

  // Extract {text}
  const textMatch = rest.match(/\{([^}]*)\}$/);
  if (textMatch) {
    innerText = textMatch[1].replace('$', idx || '');
    rest = rest.slice(0, -textMatch[0].length);
  }

  // Extract [attr=val] groups
  rest = rest.replace(/\[([^\]]+)\]/g, (_, content) => {
    customAttrs.push(content);
    return '';
  });

  // Leading tag name (letters, digits, hyphen)
  const tagMatch = rest.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  if (tagMatch) {
    tag  = tagMatch[1].toLowerCase();
    rest = rest.slice(tagMatch[0].length);
  }

  // .class and #id tokens
  const tokens = rest.match(/[.#][a-zA-Z0-9_-]+/g) || [];
  tokens.forEach(t => {
    if (t[0] === '.') classes.push(t.slice(1));
    else              id = t.slice(1);
  });

  // Build attrs string
  let attrs = '';
  if (classes.length) attrs += ` class="${classes.join(' ')}"`;
  if (id)             attrs += ` id="${id}"`;
  if (customAttrs.length) {
    customAttrs.forEach(a => {
      attrs += a.includes('=') ? ` ${a}` : ` ${a}=""`;
    });
  }

  // Replace $ with index in class/id
  if (idx !== null) attrs = attrs.replace(/\$/g, idx);

  const inner = innerText || (idx === 1 ? '|' : '');
  return { tag, attrs, inner };
}

/* ═══════════════════════════════════════════════════════════════
   EMMET — CSS property shortcuts
═══════════════════════════════════════════════════════════════ */
const CSS_PROPS = {
  m:   'margin',       mt:  'margin-top',    mr:  'margin-right',
  mb:  'margin-bottom',ml:  'margin-left',
  p:   'padding',      pt:  'padding-top',   pr:  'padding-right',
  pb:  'padding-bottom',pl: 'padding-left',
  w:   'width',        h:   'height',        mw:  'max-width',  mxw: 'max-width',
  mh:  'max-height',   mnw: 'min-width',     mnh: 'min-height',
  t:   'top',          r:   'right',         b:   'bottom',     l:   'left',
  d:   'display',      pos: 'position',      ov:  'overflow',   ovx: 'overflow-x',
  ovy: 'overflow-y',
  fs:  'font-size',    fw:  'font-weight',   lh:  'line-height',
  ff:  'font-family',  ta:  'text-align',    td:  'text-decoration',
  c:   'color',        bg:  'background',    bgc: 'background-color',
  op:  'opacity',      z:   'z-index',       cur: 'cursor',
  bd:  'border',       br:  'border-radius', bds: 'border-style',
  bdw: 'border-width', bdc: 'border-color',
  fl:  'flex',         flx: 'flex',          fld: 'flex-direction',
  flw: 'flex-wrap',    jc:  'justify-content',ai: 'align-items',
  g:   'gap',          gr:  'grid',
  trs: 'transition',   an:  'animation',     tr:  'transform',
  ls:  'letter-spacing',ws: 'white-space',   visi:'visibility',
  cnt: 'content',
};

// Values that map to no unit
const NO_UNIT = new Set(['z', 'op', 'fw', 'flex', 'flx', 'fl']);

function _tryEmmetCss(ta) {
  const s         = ta.selectionStart;
  const val       = ta.value;
  const lineStart = val.lastIndexOf('\n', s - 1) + 1;
  const lineText  = val.slice(lineStart, s);
  const abbr      = lineText.trim();
  if (!abbr) return false;

  // Match: prop-value1-value2 or prop#hex or propAuto/propNone etc.
  const match = abbr.match(/^([a-z]+)(-?-?)(.*)?$/i);
  if (!match) return false;

  const propKey = match[1].toLowerCase();
  const prop    = CSS_PROPS[propKey];
  if (!prop) return false;

  let rawVal = match[2] + (match[3] || '');
  let value;

  if (!rawVal) {
    // Just the property name, add value placeholder
    value = '|';
  } else if (/^#[0-9a-fA-F]{3,8}$/.test(rawVal.slice(1))) {
    // Color: c-#fff → color: #fff
    value = rawVal.startsWith('-') ? rawVal.slice(1) : rawVal;
  } else {
    // Numeric shorthand: m10, m10-20, m10-20-30-40
    const parts = rawVal.replace(/^-/, '').split('-');
    const noUnit = NO_UNIT.has(propKey);
    value = parts.map(p => {
      if (/^\d+$/.test(p)) return noUnit ? p : p + 'px';
      if (/^\d+p$/.test(p)) return p.slice(0, -1) + '%';
      if (/^\d+e$/.test(p)) return p.slice(0, -1) + 'em';
      if (/^\d+r$/.test(p)) return p.slice(0, -1) + 'rem';
      return p; // keyword like 'auto', 'none', etc.
    }).join(' ');
  }

  const indent     = lineText.match(/^(\s*)/)[1];
  const snippet    = `${prop}: ${value};`;
  const cursorPos  = snippet.indexOf('|');
  const clean      = snippet.replace('|', '');

  ta.value = val.slice(0, lineStart) + indent + clean + val.slice(s);
  const nc = lineStart + indent.length + (cursorPos === -1 ? clean.length - 1 : cursorPos);
  ta.selectionStart = ta.selectionEnd = nc;
  return true;
}

/* ═══════════════════════════════════════════════════════════════
   EMMET — HTML entry point
═══════════════════════════════════════════════════════════════ */
function _tryEmmet(ta, lang) {
  if (lang !== 'html') return false;

  const s         = ta.selectionStart;
  const val       = ta.value;
  const lineStart = val.lastIndexOf('\n', s - 1) + 1;
  const lineText  = val.slice(lineStart, s);
  const abbr      = lineText.trim();
  if (!abbr) return false;

  const indent  = lineText.match(/^(\s*)/)[1];
  const snippet = _parseEmmetHtml(abbr, indent);
  if (!snippet) return false;

  // Indent multiline snippets
  const indented = snippet
    .split('\n')
    .map((line, i) => i === 0 ? line : indent + line)
    .join('\n');

  const cursorPos = indented.indexOf('|');
  const clean     = indented.replace('|', '');

  ta.value = val.slice(0, lineStart) + indent + clean + val.slice(s);
  const newCursor = lineStart + indent.length + (cursorPos === -1 ? clean.length : cursorPos);
  ta.selectionStart = ta.selectionEnd = newCursor;
  return true;
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
function _insert(ta, before, after, offset = before.length) {
  const s   = ta.selectionStart;
  const e   = ta.selectionEnd;
  const val = ta.value;
  ta.value  = val.slice(0, s) + before + val.slice(e, e) + after + val.slice(e);
  ta.selectionStart = ta.selectionEnd = s + offset;
}

function _notifyChange(ta) {
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function _tabWidth() {
  return (state && state.settings && state.settings.tabSize) || 2;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN WIRE
═══════════════════════════════════════════════════════════════ */
function wireAutoClose(ta, lang) {
  ta.addEventListener('keydown', e => {
    const s      = ta.selectionStart;
    const end    = ta.selectionEnd;
    const val    = ta.value;
    const charAt = val[s] || '';
    const before = val[s - 1] || '';
    const hasSelection = s !== end;

    /* ── Tab: Emmet / CSS shortcut / JS snippet / indent ──── */
    if (e.key === 'Tab' && !e.shiftKey) {
      if (!hasSelection) {
        // Try Emmet for HTML
        if (_tryEmmet(ta, lang)) { e.preventDefault(); _notifyChange(ta); return; }
        // Try CSS property shorthand
        if (lang === 'css' && _tryEmmetCss(ta)) { e.preventDefault(); _notifyChange(ta); return; }
        // Try JS snippets
        if (lang === 'js' && tryJsSnippet(ta)) { e.preventDefault(); _notifyChange(ta); return; }
        // Default: insert spaces
        e.preventDefault();
        const spaces = ' '.repeat(_tabWidth());
        ta.value = val.slice(0, s) + spaces + val.slice(s);
        ta.selectionStart = ta.selectionEnd = s + spaces.length;
        _notifyChange(ta);
        return;
      } else {
        // Indent selected block: add one tab-width to each selected line
        e.preventDefault();
        const spaces   = ' '.repeat(_tabWidth());
        const selText  = val.slice(s, end);
        const lineStart = val.lastIndexOf('\n', s - 1) + 1;
        const beforeSel = val.slice(0, lineStart);
        const lines    = val.slice(lineStart, end).split('\n');
        const indented = lines.map(l => spaces + l).join('\n');
        ta.value = beforeSel + indented + val.slice(end);
        ta.selectionStart = lineStart;
        ta.selectionEnd   = lineStart + indented.length;
        _notifyChange(ta);
        return;
      }
    }

    /* ── Shift+Tab: dedent selected / current line ─────────── */
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const tabW    = _tabWidth();
      const lineStart = val.lastIndexOf('\n', s - 1) + 1;
      if (hasSelection) {
        const lines   = val.slice(lineStart, end).split('\n');
        const dedented = lines.map(l => {
          const spaces = l.match(/^ */)[0].length;
          return l.slice(Math.min(spaces, tabW));
        }).join('\n');
        ta.value = val.slice(0, lineStart) + dedented + val.slice(end);
        ta.selectionStart = lineStart;
        ta.selectionEnd   = lineStart + dedented.length;
      } else {
        const lineText  = val.slice(lineStart, s);
        const spaces    = lineText.match(/^ */)[0].length;
        const remove    = Math.min(spaces, tabW);
        ta.value = val.slice(0, lineStart) + val.slice(lineStart + remove);
        ta.selectionStart = ta.selectionEnd = Math.max(lineStart, s - remove);
      }
      _notifyChange(ta);
      return;
    }

    /* ── Wrap selection in pair ────────────────────────────── */
    if (hasSelection && OPENERS.has(e.key)) {
      e.preventDefault();
      const sel   = val.slice(s, end);
      const close = PAIRS[e.key];
      ta.value    = val.slice(0, s) + e.key + sel + close + val.slice(end);
      ta.selectionStart = s + 1;
      ta.selectionEnd   = end + 1;
      _notifyChange(ta);
      return;
    }

    /* ── Skip over closing char if already there ───────────── */
    if (!hasSelection && CLOSERS.has(e.key) && charAt === e.key) {
      e.preventDefault();
      ta.selectionStart = ta.selectionEnd = s + 1;
      return;
    }

    /* ── Auto-close opener ─────────────────────────────────── */
    if (!hasSelection && OPENERS.has(e.key)) {
      const isQuote = e.key === '"' || e.key === "'" || e.key === '`';
      if (isQuote) {
        const wordChar = /\w/;
        if (wordChar.test(before) || wordChar.test(charAt)) return;
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

    /* ── Enter: smart indent ───────────────────────────────── */
    if (e.key === 'Enter' && !hasSelection) {
      const open  = val[s - 1];
      const close = val[s];

      // Smart indent inside {}, [], ()
      if ((open === '{' && close === '}') ||
          (open === '[' && close === ']') ||
          (open === '(' && close === ')')) {
        e.preventDefault();
        const lineStart = val.lastIndexOf('\n', s - 1) + 1;
        const indent    = val.slice(lineStart, s).match(/^(\s*)/)[1];
        const inner     = indent + ' '.repeat(_tabWidth());
        ta.value = val.slice(0, s) + '\n' + inner + '\n' + indent + val.slice(s);
        ta.selectionStart = ta.selectionEnd = s + 1 + inner.length;
        _notifyChange(ta);
        return;
      }

      // Normal Enter: preserve indentation + auto-increase after block openers
      e.preventDefault();
      const lineStart = val.lastIndexOf('\n', s - 1) + 1;
      const currentLine = val.slice(lineStart, s);
      const indent      = currentLine.match(/^(\s*)/)[1];

      // If line ends with : (Python-like), { , or [ — add extra indent
      const trimmedLine = currentLine.trimEnd();
      const lastChar    = trimmedLine[trimmedLine.length - 1];
      const extraIndent = (lastChar === '{' || lastChar === '[' || lastChar === '(')
        ? ' '.repeat(_tabWidth()) : '';

      ta.value = val.slice(0, s) + '\n' + indent + extraIndent + val.slice(s);
      ta.selectionStart = ta.selectionEnd = s + 1 + indent.length + extraIndent.length;
      _notifyChange(ta);
      return;
    }

    /* ── Auto-dedent closing bracket ──────────────────────── */
    if (!hasSelection && (e.key === '}' || e.key === ']' || e.key === ')')) {
      const lineStart   = val.lastIndexOf('\n', s - 1) + 1;
      const currentLine = val.slice(lineStart, s);
      const trimmed     = currentLine.trimEnd();

      // Only dedent if the line contains ONLY whitespace before the bracket
      if (trimmed === '' && currentLine.length >= _tabWidth()) {
        e.preventDefault();
        const tabW    = _tabWidth();
        const newLine = currentLine.slice(0, Math.max(0, currentLine.length - tabW));
        ta.value = val.slice(0, lineStart) + newLine + e.key + val.slice(s);
        ta.selectionStart = ta.selectionEnd = lineStart + newLine.length + 1;
        _notifyChange(ta);
        return;
      }
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
