/**
 * core/themes.js
 * Syntax highlight color schemes.
 * Each scheme defines token colors for both dark and light UI themes.
 * Applied via a <style> tag injected into <head>.
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────
   COLOR SCHEMES
   Each entry: { id, name, dark: {tokens}, light: {tokens} }
   Tokens: keyword, string, number, boolean, function, class,
           comment, operator, punctuation, property, tag,
           attrName, selector, variable, regex, base (plain text)
───────────────────────────────────────────────────────────────── */
const COLOR_SCHEMES = [
  {
    id: 'vscode-dark',
    name: 'VS Code Dark+',
    dark: {
      base:        '#d4d4d4',
      keyword:     '#569cd6',
      string:      '#ce9178',
      number:      '#b5cea8',
      boolean:     '#569cd6',
      function:    '#dcdcaa',
      class:       '#4ec9b0',
      comment:     '#6a9955',
      operator:    '#d4d4d4',
      punctuation: '#d4d4d4',
      property:    '#9cdcfe',
      tag:         '#569cd6',
      attrName:    '#9cdcfe',
      selector:    '#d7ba7d',
      atrule:      '#c586c0',
      variable:    '#9cdcfe',
      regex:       '#d16969',
    },
    light: {
      base:        '#3b3b3b',
      keyword:     '#0070c1',
      string:      '#a31515',
      number:      '#098658',
      boolean:     '#0070c1',
      function:    '#795e26',
      class:       '#267f99',
      comment:     '#008000',
      operator:    '#3b3b3b',
      punctuation: '#3b3b3b',
      property:    '#001080',
      tag:         '#800000',
      attrName:    '#e50000',
      selector:    '#800000',
      atrule:      '#af00db',
      variable:    '#001080',
      regex:       '#811f3f',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    dark: {
      base:        '#f8f8f2',
      keyword:     '#f92672',
      string:      '#e6db74',
      number:      '#ae81ff',
      boolean:     '#ae81ff',
      function:    '#a6e22e',
      class:       '#a6e22e',
      comment:     '#75715e',
      operator:    '#f8f8f2',
      punctuation: '#f8f8f2',
      property:    '#66d9ef',
      tag:         '#f92672',
      attrName:    '#a6e22e',
      selector:    '#a6e22e',
      atrule:      '#f92672',
      variable:    '#f8f8f2',
      regex:       '#e6db74',
    },
    light: {
      base:        '#272822',
      keyword:     '#f92672',
      string:      '#a67c00',
      number:      '#7c4dff',
      boolean:     '#7c4dff',
      function:    '#4caf50',
      class:       '#00897b',
      comment:     '#8c8c8c',
      operator:    '#272822',
      punctuation: '#272822',
      property:    '#0097a7',
      tag:         '#f44336',
      attrName:    '#388e3c',
      selector:    '#388e3c',
      atrule:      '#e91e63',
      variable:    '#272822',
      regex:       '#f57c00',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    dark: {
      base:        '#f8f8f2',
      keyword:     '#ff79c6',
      string:      '#f1fa8c',
      number:      '#bd93f9',
      boolean:     '#bd93f9',
      function:    '#50fa7b',
      class:       '#8be9fd',
      comment:     '#6272a4',
      operator:    '#ff79c6',
      punctuation: '#f8f8f2',
      property:    '#66d9ef',
      tag:         '#ff79c6',
      attrName:    '#50fa7b',
      selector:    '#50fa7b',
      atrule:      '#ff79c6',
      variable:    '#f8f8f2',
      regex:       '#f1fa8c',
    },
    light: {
      base:        '#282a36',
      keyword:     '#d63a76',
      string:      '#c0a000',
      number:      '#7c4dff',
      boolean:     '#7c4dff',
      function:    '#1e8c3a',
      class:       '#006d7a',
      comment:     '#6272a4',
      operator:    '#d63a76',
      punctuation: '#282a36',
      property:    '#0097a7',
      tag:         '#d63a76',
      attrName:    '#1e8c3a',
      selector:    '#1e8c3a',
      atrule:      '#d63a76',
      variable:    '#282a36',
      regex:       '#c0a000',
    },
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    dark: {
      base:        '#e6edf3',
      keyword:     '#ff7b72',
      string:      '#a5d6ff',
      number:      '#79c0ff',
      boolean:     '#79c0ff',
      function:    '#d2a8ff',
      class:       '#ffa657',
      comment:     '#8b949e',
      operator:    '#e6edf3',
      punctuation: '#e6edf3',
      property:    '#79c0ff',
      tag:         '#7ee787',
      attrName:    '#79c0ff',
      selector:    '#7ee787',
      atrule:      '#ff7b72',
      variable:    '#ffa657',
      regex:       '#a5d6ff',
    },
    light: {
      base:        '#24292f',
      keyword:     '#cf222e',
      string:      '#0a3069',
      number:      '#0550ae',
      boolean:     '#0550ae',
      function:    '#8250df',
      class:       '#953800',
      comment:     '#6e7781',
      operator:    '#24292f',
      punctuation: '#24292f',
      property:    '#0550ae',
      tag:         '#116329',
      attrName:    '#0550ae',
      selector:    '#116329',
      atrule:      '#cf222e',
      variable:    '#953800',
      regex:       '#0a3069',
    },
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    dark: {
      base:        '#839496',
      keyword:     '#859900',
      string:      '#2aa198',
      number:      '#d33682',
      boolean:     '#cb4b16',
      function:    '#268bd2',
      class:       '#b58900',
      comment:     '#586e75',
      operator:    '#839496',
      punctuation: '#839496',
      property:    '#268bd2',
      tag:         '#859900',
      attrName:    '#93a1a1',
      selector:    '#859900',
      atrule:      '#6c71c4',
      variable:    '#cb4b16',
      regex:       '#2aa198',
    },
    light: {
      base:        '#657b83',
      keyword:     '#859900',
      string:      '#2aa198',
      number:      '#d33682',
      boolean:     '#cb4b16',
      function:    '#268bd2',
      class:       '#b58900',
      comment:     '#93a1a1',
      operator:    '#657b83',
      punctuation: '#657b83',
      property:    '#268bd2',
      tag:         '#859900',
      attrName:    '#586e75',
      selector:    '#859900',
      atrule:      '#6c71c4',
      variable:    '#cb4b16',
      regex:       '#2aa198',
    },
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    dark: {
      base:        '#d6deeb',
      keyword:     '#c792ea',
      string:      '#ecc48d',
      number:      '#f78c6c',
      boolean:     '#ff5874',
      function:    '#82aaff',
      class:       '#ffcb8b',
      comment:     '#637777',
      operator:    '#7fdbca',
      punctuation: '#d6deeb',
      property:    '#80cbc4',
      tag:         '#7fdbca',
      attrName:    '#addb67',
      selector:    '#addb67',
      atrule:      '#c792ea',
      variable:    '#d7dbe0',
      regex:       '#5ca7e4',
    },
    light: {
      base:        '#403f53',
      keyword:     '#994cc3',
      string:      '#c96765',
      number:      '#aa0982',
      boolean:     '#bc5454',
      function:    '#4876d6',
      class:       '#111111',
      comment:     '#989fb1',
      operator:    '#0c969b',
      punctuation: '#403f53',
      property:    '#0c969b',
      tag:         '#0c969b',
      attrName:    '#4876d6',
      selector:    '#4876d6',
      atrule:      '#994cc3',
      variable:    '#403f53',
      regex:       '#5ca7e4',
    },
  },
  {
    id: 'one-dark',
    name: 'One Dark',
    dark: {
      base:        '#abb2bf',
      keyword:     '#c678dd',
      string:      '#98c379',
      number:      '#d19a66',
      boolean:     '#d19a66',
      function:    '#61afef',
      class:       '#e5c07b',
      comment:     '#5c6370',
      operator:    '#abb2bf',
      punctuation: '#abb2bf',
      property:    '#e06c75',
      tag:         '#e06c75',
      attrName:    '#d19a66',
      selector:    '#e06c75',
      atrule:      '#c678dd',
      variable:    '#e06c75',
      regex:       '#98c379',
    },
    light: {
      base:        '#383a42',
      keyword:     '#a626a4',
      string:      '#50a14f',
      number:      '#986801',
      boolean:     '#986801',
      function:    '#4078f2',
      class:       '#c18401',
      comment:     '#a0a1a7',
      operator:    '#383a42',
      punctuation: '#383a42',
      property:    '#e45649',
      tag:         '#e45649',
      attrName:    '#986801',
      selector:    '#e45649',
      atrule:      '#a626a4',
      variable:    '#e45649',
      regex:       '#50a14f',
    },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    dark: {
      base:        '#a9b1d6',
      keyword:     '#bb9af7',
      string:      '#9ece6a',
      number:      '#ff9e64',
      boolean:     '#ff9e64',
      function:    '#7aa2f7',
      class:       '#2ac3de',
      comment:     '#565f89',
      operator:    '#89ddff',
      punctuation: '#a9b1d6',
      property:    '#73daca',
      tag:         '#f7768e',
      attrName:    '#bb9af7',
      selector:    '#73daca',
      atrule:      '#bb9af7',
      variable:    '#c0caf5',
      regex:       '#b4f9f8',
    },
    light: {
      base:        '#343b58',
      keyword:     '#9854f1',
      string:      '#485e30',
      number:      '#965027',
      boolean:     '#965027',
      function:    '#34548a',
      class:       '#0f4b6e',
      comment:     '#9699a3',
      operator:    '#006c86',
      punctuation: '#343b58',
      property:    '#006c86',
      tag:         '#8c4351',
      attrName:    '#9854f1',
      selector:    '#006c86',
      atrule:      '#9854f1',
      variable:    '#343b58',
      regex:       '#006c86',
    },
  },
];

/* ─── Style tag that holds the active scheme ──────────────────── */
let _schemeStyleEl = null;

function _getSchemeStyle() {
  if (!_schemeStyleEl) {
    _schemeStyleEl = document.createElement('style');
    _schemeStyleEl.id = 'ce-color-scheme';
    document.head.appendChild(_schemeStyleEl);
  }
  return _schemeStyleEl;
}

function _buildSchemeCSS(scheme) {
  const d = scheme.dark;
  const l = scheme.light;
  const targets = ['pre.hl-layer', '.output-surface'];

  function tokensFor(t, prefix) {
    return `
${prefix} { color: ${t.base}; }
${prefix} .token.keyword                          { color: ${t.keyword}     !important; }
${prefix} .token.string, ${prefix} .token.attr-value { color: ${t.string}  !important; }
${prefix} .token.template-string .token.string,
${prefix} .token.template-string                  { color: ${t.string}     !important; }
${prefix} .token.template-punctuation             { color: ${t.string}     !important; }
${prefix} .token.interpolation-punctuation,
${prefix} .token.interpolation                    { color: ${t.keyword}    !important; }
${prefix} .token.number                           { color: ${t.number}     !important; }
${prefix} .token.boolean, ${prefix} .token.constant { color: ${t.boolean}  !important; }
${prefix} .token.function, ${prefix} .token.method { color: ${t.function}  !important; }
${prefix} .token.class-name                       { color: ${t.class}      !important; }
${prefix} .token.comment, ${prefix} .token.prolog,
${prefix} .token.cdata                            { color: ${t.comment}    !important; font-style: italic; }
${prefix} .token.operator                         { color: ${t.operator}   !important; }
${prefix} .token.punctuation                      { color: ${t.punctuation}!important; }
${prefix} .token.property                         { color: ${t.property}   !important; }
${prefix} .token.tag                              { color: ${t.tag}        !important; }
${prefix} .token.attr-name                        { color: ${t.attrName}   !important; }
${prefix} .token.selector                         { color: ${t.selector}   !important; }
${prefix} .token.atrule, ${prefix} .token.rule    { color: ${t.atrule}     !important; }
${prefix} .token.variable, ${prefix} .token.parameter { color: ${t.variable} !important; }
${prefix} .token.regex, ${prefix} .token.important { color: ${t.regex}     !important; }`;
  }

  const darkCSS = targets.map(t => tokensFor(d, t)).join('\n');
  const lightCSS = targets.map(t => tokensFor(l, `:root.light ${t}`)).join('\n');
  return darkCSS + '\n' + lightCSS;
}

function applyColorScheme(schemeId) {
  const scheme = COLOR_SCHEMES.find(s => s.id === schemeId) || COLOR_SCHEMES[0];
  state.settings.colorScheme = scheme.id; // reactive settings effect handles persistence
  _getSchemeStyle().textContent = _buildSchemeCSS(scheme);
  refreshAllHL();
  // Update active card in grid
  document.querySelectorAll('.scheme-card').forEach(c => {
    c.classList.toggle('active', c.dataset.scheme === scheme.id);
  });
}

function _buildSchemeGrid() {
  const grid = document.getElementById('schemeGrid');
  if (!grid) return;
  const isDark = state.settings.theme !== 'light';
  grid.innerHTML = COLOR_SCHEMES.map(s => {
    const t      = isDark ? s.dark : s.light;
    const active = (state.settings.colorScheme || 'vscode-dark') === s.id ? 'active' : '';
    const dots   = [t.keyword, t.string, t.number, t.function, t.class, t.comment]
      .map(c => `<span class="scheme-dot" style="background:${c}"></span>`)
      .join('');
    return `<div class="scheme-card ${active}" data-scheme="${s.id}" title="${s.name}">
      <span class="scheme-name">${s.name}</span>
      <div class="scheme-preview">${dots}</div>
    </div>`;
  }).join('');

  grid.addEventListener('click', e => {
    const card = e.target.closest('.scheme-card');
    if (card) applyColorScheme(card.dataset.scheme);
  });
}

function wireColorScheme() {
  // Apply saved scheme on boot
  const saved = state.settings.colorScheme || 'vscode-dark';
  applyColorScheme(saved);
}

function openColorSchemePicker() {
  // Rebuild grid each time settings opens (theme may have changed)
  _buildSchemeGrid();
}
