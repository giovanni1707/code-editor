/**
 * core/formatter.js
 * Code formatter using Prettier (browser standalone build).
 * Formats the active tab of a given panel in-place.
 */

'use strict';

const PRETTIER_PARSER = { js: 'babel', css: 'css', html: 'html' };

async function formatActive(side) {
  if (typeof prettier === 'undefined') {
    toast('Prettier not loaded yet — try again in a moment');
    return;
  }

  const lang   = state.activeTab[side];
  const t      = activeTab(side);
  const code   = t.ta.value;
  if (!code.trim()) return;

  const parser  = PRETTIER_PARSER[lang];
  // Prettier 3.x standalone exposes plugins on window.prettierPlugins
  const plugins = [
    window.prettierPlugins?.babel,
    window.prettierPlugins?.html,
    window.prettierPlugins?.postcss,
    window.prettierPlugins?.estree,
  ].filter(Boolean);

  try {
    const formatted = await prettier.format(code, {
      parser,
      plugins,
      printWidth:        80,
      tabWidth:          2,
      useTabs:           false,
      semi:              true,
      singleQuote:       true,
      trailingComma:     'es5',
      bracketSpacing:    true,
      arrowParens:       'avoid',
      htmlWhitespaceSensitivity: 'css',
      endOfLine:         'lf',
    });

    if (formatted === code) { toast('Already formatted'); return; }

    // Preserve approximate cursor line
    const linesBefore = code.slice(0, t.ta.selectionStart).split('\n').length;
    t.ta.value = formatted;
    const lines = formatted.split('\n');
    let pos = 0;
    for (let i = 0; i < Math.min(linesBefore - 1, lines.length - 1); i++) {
      pos += lines[i].length + 1;
    }
    t.ta.selectionStart = t.ta.selectionEnd = pos;

    refreshHL(t.ta, t.hl, lang);
    updateGutter(t.ta, t.gutter);
    if (state.panelMode[side] === 'live') scheduleLivePreview(side);
    toast('Formatted with Prettier');
  } catch (err) {
    // Prettier throws on syntax errors — show the message
    toast('Prettier: ' + err.message.split('\n')[0]);
  }
}

function wireFormatter() {
  el.fmtBtnL.addEventListener('click', () => formatActive('left'));
  el.fmtBtnR.addEventListener('click', () => formatActive('right'));
}
