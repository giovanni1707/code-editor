/**
 * bracket-colors.js
 * Post-processes the Prism highlight output to wrap matching bracket
 * pairs in depth-coloured spans.  Runs after every refreshHL call.
 *
 * Bracket depth cycles through 6 colours (--br-d0 … --br-d5).
 * Only bracket characters that are NOT inside a Prism token
 * (i.e. raw text nodes) are re-coloured; brackets inside strings
 * or comments keep their Prism colour.
 */

'use strict';

/* ── Bracket depth CSS variables defined in index.html ─────── */
// --br-d0 … --br-d5 cycle through 6 distinctive colours.

const OPEN_BRACKETS  = new Set(['{', '[', '(']);
const CLOSE_BRACKETS = new Set(['}', ']', ')']);

/**
 * Walk the children of a Prism <code> element.
 * Text nodes that are direct children (not inside a Prism token span)
 * may contain raw bracket characters — wrap each in a coloured span.
 *
 * @param {Element} codeEl   The <pre>.hl-layer > <code> element.
 * @param {number}  startDepth  Carry-in depth from previous call.
 * @returns {number}  The depth after processing (for multi-call streaming).
 */
function _colorizeBrackets(codeEl, startDepth) {
  let depth = startDepth;

  // Process only direct text nodes (not inside Prism spans).
  // We do an in-place replacement so existing Prism spans are untouched.
  const childNodes = Array.from(codeEl.childNodes);

  childNodes.forEach(node => {
    if (node.nodeType !== Node.TEXT_NODE) return; // skip element nodes (Prism tokens)

    const text = node.textContent;
    if (!/[{}[\]()]/.test(text)) return; // fast-path: no brackets here

    // Build replacement HTML
    let html = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (OPEN_BRACKETS.has(ch)) {
        const cls = 'br-d' + (depth % 6);
        html += `<span class="${cls}">${ch}</span>`;
        depth++;
      } else if (CLOSE_BRACKETS.has(ch)) {
        depth = Math.max(0, depth - 1);
        const cls = 'br-d' + (depth % 6);
        html += `<span class="${cls}">${ch}</span>`;
      } else {
        // Escape special HTML chars in plain text
        html += ch === '&' ? '&amp;'
              : ch === '<' ? '&lt;'
              : ch === '>' ? '&gt;'
              : ch;
      }
    }

    // Replace the text node with the new HTML fragment
    const frag = document.createRange().createContextualFragment(html);
    node.parentNode.replaceChild(frag, node);
  });

  return depth;
}

/**
 * Apply bracket colorization to one hl-layer element.
 * Called after refreshHL updates the inner HTML.
 */
function applyBracketColors(hlEl) {
  const codeEl = hlEl.querySelector('code');
  if (!codeEl) return;
  _colorizeBrackets(codeEl, 0);
}

/**
 * Apply bracket colorization to all visible hl-layer elements.
 */
function applyAllBracketColors() {
  ['left', 'right'].forEach(side => {
    Object.values(tabsFor(side)).forEach(t => {
      if (t.hl) applyBracketColors(t.hl);
    });
  });
}
