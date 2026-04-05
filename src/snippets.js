/**
 * src/snippets.js
 * JS snippet expansion triggered by Tab in autoclose.js.
 * Uses the same | cursor-marker convention as EMMET in autoclose.js.
 */

'use strict';

const JS_SNIPPETS = {
  // Console
  'clog':  'console.log(|)',
  'cdir':  'console.dir(|)',
  'cwar':  'console.warn(|)',
  'cerr':  'console.error(|)',
  'ctab':  'console.table(|)',
  'ctim':  'console.time("|")',
  'ctime': 'console.timeEnd("|")',

  // Functions
  'fn':    'function |(params) {\n  \n}',
  'afn':   'const | = () => {\n  \n}',
  'asy':   'async function |(params) {\n  \n}',
  'aafn':  'const | = async () => {\n  \n}',
  'ife':   '(function () {\n  |\n})();',
  'aife':  '(async function () {\n  |\n})();',

  // Classes
  'cl':    'class | {\n  constructor() {\n    \n  }\n}',
  'clex':  'class | extends Base {\n  constructor() {\n    super();\n    \n  }\n}',

  // Variables
  'co':    'const | = ',
  'le':    'let | = ',

  // Modules
  'imp':   "import | from '';",
  'imd':   "import | from '|';",
  'exd':   'export default |',
  'exn':   'export const | = ',

  // Loops
  'forof': 'for (const | of iterable) {\n  \n}',
  'forin': 'for (const | in object) {\n  \n}',
  'fori':  'for (let i = 0; i < |; i++) {\n  \n}',
  'fore':  '|.forEach((item) => {\n  \n})',
  'map':   'const | = arr.map((item) => {\n  return item;\n})',
  'filt':  'const | = arr.filter((item) => {\n  return item;\n})',
  'redu':  'const | = arr.reduce((acc, item) => {\n  return acc;\n}, initial)',

  // Async
  'awt':   'await |',
  'prom':  'new Promise((resolve, reject) => {\n  |\n})',
  'then':  '.then((|) => {\n  \n})',
  'fetc':  "fetch('|')\n  .then(res => res.json())\n  .then(data => {\n    console.log(data);\n  })",

  // Error handling
  'try':   'try {\n  |\n} catch (err) {\n  console.error(err);\n}',
  'trycf': 'try {\n  |\n} catch (err) {\n  console.error(err);\n} finally {\n  \n}',

  // Timers
  'sto':   'setTimeout(() => {\n  |\n}, 0)',
  'seti':  'setInterval(() => {\n  |\n}, 1000)',
  'raf':   'requestAnimationFrame(() => {\n  |\n})',

  // DOM
  'qsel':  "document.querySelector('|')",
  'qall':  "document.querySelectorAll('|')",
  'gid':   "document.getElementById('|')",
  'ce':    "document.createElement('|')",
  'ael':   "addEventListener('|', (e) => {\n  \n})",
  'rel':   "removeEventListener('|', handler)",

  // Objects / misc
  'spr':   '{ ...| }',
  'dest':  'const { | } = obj',
  'arr':   'const | = []',
  'obj':   'const | = {}',
  'jstr':  'JSON.stringify(|, null, 2)',
  'jpars': 'JSON.parse(|)',
};

/**
 * Try to expand a JS snippet at the cursor.
 * Returns true if expanded (caller must call e.preventDefault + _notifyChange).
 */
function tryJsSnippet(ta) {
  const s         = ta.selectionStart;
  const val       = ta.value;
  const lineStart = val.lastIndexOf('\n', s - 1) + 1;
  const lineText  = val.slice(lineStart, s);
  const abbr      = lineText.trim();

  if (!abbr || !(abbr in JS_SNIPPETS)) return false;

  const indent  = lineText.match(/^(\s*)/)[1];
  let snippet   = JS_SNIPPETS[abbr];

  // Indent multiline snippets
  if (snippet.includes('\n')) {
    snippet = snippet
      .split('\n')
      .map((line, i) => i === 0 ? line : indent + line)
      .join('\n');
  }

  const cursorPos = snippet.indexOf('|');
  const clean     = snippet.replace('|', '');

  ta.value = val.slice(0, lineStart) + indent + clean + val.slice(s);
  const newCursor = lineStart + indent.length + (cursorPos === -1 ? clean.length : cursorPos);
  ta.selectionStart = ta.selectionEnd = newCursor;
  return true;
}
