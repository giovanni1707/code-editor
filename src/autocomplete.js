/**
 * src/autocomplete.js
 * CSS property/value autocomplete + HTML tag/attribute autocomplete.
 * Single shared dropdown, keyboard navigable, Tab/Enter to confirm.
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════ */
const CSS_PROPS = [
  'align-content','align-items','align-self','animation','animation-delay',
  'animation-direction','animation-duration','animation-fill-mode',
  'animation-iteration-count','animation-name','animation-timing-function',
  'appearance','backdrop-filter','background','background-attachment',
  'background-clip','background-color','background-image','background-origin',
  'background-position','background-repeat','background-size','border',
  'border-bottom','border-bottom-color','border-bottom-left-radius',
  'border-bottom-right-radius','border-bottom-style','border-bottom-width',
  'border-collapse','border-color','border-image','border-left',
  'border-left-color','border-left-style','border-left-width','border-radius',
  'border-right','border-right-color','border-right-style','border-right-width',
  'border-spacing','border-style','border-top','border-top-color',
  'border-top-left-radius','border-top-right-radius','border-top-style',
  'border-top-width','border-width','bottom','box-shadow','box-sizing',
  'caption-side','clear','clip','clip-path','color','column-count','column-gap',
  'column-rule','column-span','column-width','columns','content','counter-increment',
  'counter-reset','cursor','direction','display','empty-cells','filter','flex',
  'flex-basis','flex-direction','flex-flow','flex-grow','flex-shrink','flex-wrap',
  'float','font','font-family','font-feature-settings','font-kerning','font-size',
  'font-size-adjust','font-stretch','font-style','font-variant','font-weight',
  'gap','grid','grid-area','grid-auto-columns','grid-auto-flow','grid-auto-rows',
  'grid-column','grid-column-end','grid-column-gap','grid-column-start',
  'grid-row','grid-row-end','grid-row-gap','grid-row-start','grid-template',
  'grid-template-areas','grid-template-columns','grid-template-rows',
  'height','hyphens','image-rendering','isolation','justify-content',
  'justify-items','justify-self','left','letter-spacing','line-height',
  'list-style','list-style-image','list-style-position','list-style-type',
  'margin','margin-bottom','margin-left','margin-right','margin-top',
  'max-height','max-width','min-height','min-width','mix-blend-mode',
  'object-fit','object-position','opacity','order','outline','outline-color',
  'outline-offset','outline-style','outline-width','overflow','overflow-x',
  'overflow-y','padding','padding-bottom','padding-left','padding-right',
  'padding-top','page-break-after','page-break-before','perspective',
  'place-content','place-items','place-self','pointer-events','position',
  'resize','right','row-gap','scroll-behavior','shape-outside','table-layout',
  'text-align','text-decoration','text-decoration-color','text-decoration-line',
  'text-decoration-style','text-indent','text-overflow','text-shadow',
  'text-transform','top','transform','transform-origin','transform-style',
  'transition','transition-delay','transition-duration','transition-property',
  'transition-timing-function','unicode-bidi','user-select','vertical-align',
  'visibility','white-space','width','will-change','word-break','word-spacing',
  'word-wrap','writing-mode','z-index',
];

const CSS_VALUES = {
  'display':          ['block','inline','inline-block','flex','inline-flex','grid','inline-grid','none','contents','table','table-cell','table-row','list-item','flow-root'],
  'position':         ['static','relative','absolute','fixed','sticky'],
  'flex-direction':   ['row','column','row-reverse','column-reverse'],
  'flex-wrap':        ['nowrap','wrap','wrap-reverse'],
  'justify-content':  ['flex-start','flex-end','center','space-between','space-around','space-evenly','start','end'],
  'align-items':      ['stretch','flex-start','flex-end','center','baseline','start','end'],
  'align-self':       ['auto','stretch','flex-start','flex-end','center','baseline'],
  'align-content':    ['stretch','flex-start','flex-end','center','space-between','space-around'],
  'overflow':         ['visible','hidden','scroll','auto','clip'],
  'overflow-x':       ['visible','hidden','scroll','auto','clip'],
  'overflow-y':       ['visible','hidden','scroll','auto','clip'],
  'visibility':       ['visible','hidden','collapse'],
  'cursor':           ['auto','default','pointer','move','text','wait','help','not-allowed','none','grab','grabbing','zoom-in','zoom-out','crosshair','col-resize','row-resize','ew-resize','ns-resize'],
  'pointer-events':   ['auto','none','all','fill','stroke','painted','visible','visiblePainted'],
  'box-sizing':       ['content-box','border-box'],
  'float':            ['left','right','none','inline-start','inline-end'],
  'clear':            ['none','left','right','both','inline-start','inline-end'],
  'text-align':       ['left','right','center','justify','start','end'],
  'text-decoration':  ['none','underline','overline','line-through'],
  'text-transform':   ['none','uppercase','lowercase','capitalize','full-width'],
  'font-weight':      ['normal','bold','bolder','lighter','100','200','300','400','500','600','700','800','900'],
  'font-style':       ['normal','italic','oblique'],
  'font-variant':     ['normal','small-caps'],
  'white-space':      ['normal','nowrap','pre','pre-wrap','pre-line','break-spaces'],
  'word-break':       ['normal','break-all','keep-all','break-word'],
  'vertical-align':   ['baseline','top','middle','bottom','text-top','text-bottom','sub','super'],
  'list-style-type':  ['disc','circle','square','decimal','none'],
  'list-style-position': ['inside','outside'],
  'border-style':     ['none','hidden','dotted','dashed','solid','double','groove','ridge','inset','outset'],
  'border-collapse':  ['separate','collapse'],
  'table-layout':     ['auto','fixed'],
  'resize':           ['none','both','horizontal','vertical'],
  'appearance':       ['none','auto'],
  'object-fit':       ['fill','contain','cover','none','scale-down'],
  'mix-blend-mode':   ['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','difference','exclusion','hue','saturation','color','luminosity'],
  'isolation':        ['auto','isolate'],
  'background-attachment': ['scroll','fixed','local'],
  'background-clip':  ['border-box','padding-box','content-box','text'],
  'background-origin':['border-box','padding-box','content-box'],
  'background-repeat':['repeat','no-repeat','repeat-x','repeat-y','space','round'],
  'background-size':  ['auto','cover','contain'],
  'transform':        ['none','translateX()','translateY()','translate()','scaleX()','scaleY()','scale()','rotate()','skewX()','skewY()','matrix()','perspective()'],
  'transition-timing-function': ['ease','linear','ease-in','ease-out','ease-in-out','step-start','step-end'],
  'animation-direction': ['normal','reverse','alternate','alternate-reverse'],
  'animation-fill-mode': ['none','forwards','backwards','both'],
  'animation-iteration-count': ['infinite','1','2'],
  'scroll-behavior':  ['auto','smooth'],
  'user-select':      ['auto','none','text','all','contain'],
  'will-change':      ['auto','scroll-position','contents','transform','opacity'],
  'writing-mode':     ['horizontal-tb','vertical-rl','vertical-lr'],
  'direction':        ['ltr','rtl'],
  'grid-auto-flow':   ['row','column','dense','row dense','column dense'],
};

const HTML_TAGS = [
  'a','abbr','address','article','aside','audio','b','blockquote','body',
  'br','button','canvas','caption','cite','code','col','colgroup','data',
  'datalist','dd','del','details','dfn','dialog','div','dl','dt','em',
  'embed','fieldset','figcaption','figure','footer','form','h1','h2','h3',
  'h4','h5','h6','head','header','hr','html','i','iframe','img','input',
  'ins','kbd','label','legend','li','link','main','map','mark','menu','meta',
  'meter','nav','noscript','object','ol','optgroup','option','output','p',
  'picture','pre','progress','q','rp','rt','ruby','s','samp','script',
  'section','select','small','source','span','strong','style','sub','summary',
  'sup','table','tbody','td','template','textarea','tfoot','th','thead','time',
  'title','tr','track','u','ul','var','video','wbr',
];

const HTML_GLOBAL_ATTRS = [
  'id','class','style','title','lang','dir','hidden','tabindex',
  'accesskey','contenteditable','draggable','spellcheck','translate',
  'aria-label','aria-hidden','aria-describedby','aria-expanded',
  'aria-controls','aria-selected','role','data-',
];

const HTML_ATTRS = {
  a:        ['href','target','rel','download','hreflang','type'],
  img:      ['src','alt','width','height','loading','srcset','sizes','decoding'],
  input:    ['type','name','value','placeholder','required','disabled','checked','readonly','min','max','step','pattern','autocomplete','autofocus','multiple','accept'],
  button:   ['type','name','value','disabled','form','autofocus'],
  form:     ['action','method','enctype','target','novalidate','autocomplete'],
  select:   ['name','multiple','required','disabled','size','form'],
  textarea: ['name','rows','cols','required','disabled','readonly','placeholder','maxlength','minlength','wrap'],
  label:    ['for','form'],
  link:     ['rel','href','type','media','hreflang','crossorigin'],
  script:   ['src','type','async','defer','crossorigin','integrity'],
  meta:     ['name','content','charset','http-equiv','property'],
  iframe:   ['src','width','height','frameborder','allowfullscreen','loading','sandbox','title'],
  video:    ['src','width','height','controls','autoplay','loop','muted','preload','poster'],
  audio:    ['src','controls','autoplay','loop','muted','preload'],
  source:   ['src','srcset','type','media','sizes'],
  area:     ['href','alt','shape','coords','target','rel'],
  table:    ['border','cellpadding','cellspacing','summary'],
  td:       ['colspan','rowspan','headers'],
  th:       ['colspan','rowspan','scope'],
  col:      ['span'],
  colgroup: ['span'],
  details:  ['open'],
  dialog:   ['open'],
  ol:       ['type','start','reversed'],
  li:       ['value'],
  option:   ['value','selected','disabled','label'],
  optgroup: ['label','disabled'],
  meter:    ['value','min','max','low','high','optimum'],
  progress: ['value','max'],
  time:     ['datetime'],
  track:    ['src','kind','srclang','label','default'],
};

const HTML_ATTR_VALUES = {
  type:     ['text','email','password','number','checkbox','radio','submit','reset','button','file','hidden','date','time','datetime-local','month','week','color','range','search','tel','url','image'],
  target:   ['_blank','_self','_parent','_top'],
  rel:      ['stylesheet','noopener','noreferrer','nofollow','canonical','alternate','author','icon','preload','prefetch','dns-prefetch'],
  method:   ['get','post','put','delete','patch'],
  enctype:  ['application/x-www-form-urlencoded','multipart/form-data','text/plain'],
  loading:  ['lazy','eager','auto'],
  decoding: ['sync','async','auto'],
  autocomplete: ['on','off','name','email','username','current-password','new-password','tel','address-line1','country','postal-code'],
  preload:  ['none','metadata','auto'],
  crossorigin: ['anonymous','use-credentials'],
  sandbox:  ['allow-scripts','allow-same-origin','allow-forms','allow-popups'],
  scope:    ['row','col','rowgroup','colgroup'],
  shape:    ['rect','circle','poly','default'],
  kind:     ['subtitles','captions','descriptions','chapters','metadata'],
  wrap:     ['hard','soft','off'],
  dir:      ['ltr','rtl','auto'],
  role:     ['button','link','heading','img','list','listitem','navigation','main','banner','contentinfo','complementary','search','form','dialog','alert','status','tablist','tab','tabpanel','menu','menuitem','checkbox','radio','slider','spinbutton','textbox','combobox','grid','gridcell','row','rowgroup','columnheader','rowheader'],
};

/* ══════════════════════════════════════════════════════════════
   DROPDOWN STATE
══════════════════════════════════════════════════════════════ */
let _drop       = null;   // the dropdown DOM element
let _items      = [];     // current suggestion strings
let _activeIdx  = -1;     // highlighted index
let _onConfirm  = null;   // callback(item)
let _activeTa   = null;   // textarea currently driving the dropdown

function _buildDropdown() {
  if (_drop) return;
  _drop = document.createElement('div');
  _drop.id = 'acDropdown';
  _drop.setAttribute('role', 'listbox');
  document.body.appendChild(_drop);
}

function _isVisible() { return _drop && _drop.classList.contains('visible'); }

function _hide() {
  if (_drop) _drop.classList.remove('visible');
  _items    = [];
  _activeIdx = -1;
  _onConfirm = null;
}

function _setActive(idx) {
  _activeIdx = Math.max(-1, Math.min(idx, _items.length - 1));
  Array.from(_drop.children).forEach((el, i) => {
    el.classList.toggle('ac-active', i === _activeIdx);
    if (i === _activeIdx) el.scrollIntoView({ block: 'nearest' });
  });
}

function _confirm() {
  if (_activeIdx >= 0 && _onConfirm) {
    _onConfirm(_items[_activeIdx]);
  }
  _hide();
}

/**
 * Show the dropdown with given items near the caret.
 * @param {string[]} items  — suggestion strings
 * @param {string}   partial — the text being completed (to bold-highlight)
 * @param {string}   typeLabel — 'prop' | 'value' | 'tag' | 'attr'
 * @param {HTMLTextAreaElement} ta
 * @param {Function} onConfirm — called with the chosen item
 */
function _show(items, partial, typeLabel, ta, onConfirm) {
  if (!items.length) { _hide(); return; }
  _buildDropdown();
  _items     = items.slice(0, 10);
  _onConfirm = onConfirm;
  _activeTa  = ta;
  _activeIdx = 0;

  // Build item rows
  _drop.innerHTML = '';
  _items.forEach((item, i) => {
    const row  = document.createElement('div');
    row.className = 'ac-item' + (i === 0 ? ' ac-active' : '');
    row.setAttribute('role', 'option');

    // Bold-highlight the matching prefix
    const lc = partial.toLowerCase();
    const matchEnd = item.toLowerCase().startsWith(lc) ? lc.length : 0;
    const label = document.createElement('span');
    if (matchEnd > 0) {
      const bold = document.createElement('span');
      bold.className = 'ac-item-match';
      bold.textContent = item.slice(0, matchEnd);
      label.appendChild(bold);
      label.appendChild(document.createTextNode(item.slice(matchEnd)));
    } else {
      label.textContent = item;
    }
    row.appendChild(label);

    const type = document.createElement('span');
    type.className = 'ac-item-type';
    type.textContent = typeLabel;
    row.appendChild(type);

    row.addEventListener('mousedown', e => {
      e.preventDefault(); // don't blur the textarea
      _onConfirm(item);
      _hide();
      ta.focus();
    });
    _drop.appendChild(row);
  });

  // Position below caret
  const coords = getCaretCoords(ta);
  const vw = window.innerWidth;
  let left = coords.left;
  if (left + 200 > vw) left = vw - 204;
  _drop.style.top  = (coords.bottom + 2) + 'px';
  _drop.style.left = left + 'px';
  _drop.classList.add('visible');
}

/* ══════════════════════════════════════════════════════════════
   CSS AUTOCOMPLETE
══════════════════════════════════════════════════════════════ */
function _cssContext(ta) {
  const val = ta.value;
  const pos = ta.selectionStart;

  // Find last unmatched { to know if we're inside a rule
  let depth = 0;
  for (let i = pos - 1; i >= 0; i--) {
    if (val[i] === '}') depth++;
    else if (val[i] === '{') { if (depth === 0) break; depth--; }
  }

  // Find colon on current line — value mode
  const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
  const lineText  = val.slice(lineStart, pos);
  const colonIdx  = lineText.lastIndexOf(':');

  if (colonIdx !== -1) {
    // value mode — find property name
    const prop    = lineText.slice(0, colonIdx).trim();
    const partial = lineText.slice(colonIdx + 1).trimStart();
    // Only if we're right after the colon (no semicolon yet)
    if (!lineText.slice(colonIdx).includes(';')) {
      const values = CSS_VALUES[prop];
      if (values) return { mode: 'value', prop, partial, values };
    }
  }

  // property mode — word before cursor on line
  const partial = lineText.replace(/^\s*/, '');
  if (partial && !partial.includes(':') && !partial.includes('{')) {
    return { mode: 'prop', partial };
  }
  return null;
}

function _handleCssInput(ta) {
  const ctx = _cssContext(ta);
  if (!ctx) { _hide(); return; }

  if (ctx.mode === 'prop') {
    const lc      = ctx.partial.toLowerCase();
    const matches = CSS_PROPS.filter(p => p.startsWith(lc));
    if (!matches.length || matches[0] === ctx.partial) { _hide(); return; }
    _show(matches, ctx.partial, 'prop', ta, item => {
      // Replace the partial property name
      _replaceBefore(ta, ctx.partial, item + ': ');
    });
  } else if (ctx.mode === 'value') {
    const lc      = ctx.partial.toLowerCase();
    const matches = ctx.values.filter(v => v.toLowerCase().startsWith(lc));
    if (!matches.length || matches[0] === ctx.partial) { _hide(); return; }
    _show(matches, ctx.partial, 'value', ta, item => {
      _replaceBefore(ta, ctx.partial, item);
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   HTML AUTOCOMPLETE
══════════════════════════════════════════════════════════════ */
function _htmlContext(ta) {
  const val = ta.value;
  const pos = ta.selectionStart;
  const before = val.slice(0, pos);

  // Find the last unclosed <
  const lastOpen  = before.lastIndexOf('<');
  const lastClose = before.lastIndexOf('>');
  if (lastOpen === -1 || lastOpen < lastClose) return null;

  const tagContent = before.slice(lastOpen + 1); // e.g. "div cl" or "a hre"

  // Detect if we're still in the tag name portion (no space yet)
  const spaceIdx = tagContent.search(/\s/);
  if (spaceIdx === -1) {
    // Tag name mode — partial is tagContent
    const partial = tagContent.replace(/^\//, ''); // ignore closing tags
    if (!partial || tagContent.startsWith('/')) return null;
    return { mode: 'tag', partial };
  }

  // Attribute mode — extract tag name and partial attr
  const tagName = tagContent.slice(0, spaceIdx).toLowerCase();
  const afterTag = tagContent.slice(spaceIdx + 1);
  // partial attr = last word (no = sign)
  const eqIdx = afterTag.lastIndexOf('=');
  const afterEq = eqIdx !== -1 ? afterTag.slice(eqIdx + 1) : null;

  if (afterEq !== null) {
    // Attribute value mode
    const attrMatch = afterTag.slice(0, eqIdx).match(/(\S+)$/);
    const attrName  = attrMatch ? attrMatch[1].toLowerCase() : '';
    const partial   = afterEq.replace(/^["']/, '');
    const values    = HTML_ATTR_VALUES[attrName];
    if (values) return { mode: 'attrval', attrName, partial, values };
    return null;
  }

  // Attribute name mode
  const partial = afterTag.split(/\s/).pop() || '';
  const tagAttrs  = (HTML_ATTRS[tagName] || []).concat(HTML_GLOBAL_ATTRS);
  return { mode: 'attr', tagName, partial, tagAttrs };
}

function _handleHtmlInput(ta) {
  const ctx = _htmlContext(ta);
  if (!ctx) { _hide(); return; }

  if (ctx.mode === 'tag') {
    const lc      = ctx.partial.toLowerCase();
    const matches = HTML_TAGS.filter(t => t.startsWith(lc));
    if (!matches.length || matches[0] === ctx.partial) { _hide(); return; }
    _show(matches, ctx.partial, 'tag', ta, item => {
      _replaceBefore(ta, ctx.partial, item);
    });
  } else if (ctx.mode === 'attr') {
    const lc      = ctx.partial.toLowerCase();
    const uniq    = [...new Set(ctx.tagAttrs)];
    const matches = uniq.filter(a => a.startsWith(lc));
    if (!matches.length || matches[0] === ctx.partial) { _hide(); return; }
    _show(matches, ctx.partial, 'attr', ta, item => {
      const suffix = item.endsWith('-') ? '' : '=""';
      _replaceBefore(ta, ctx.partial, item + suffix);
      // Move cursor inside the quotes
      if (suffix === '=""') {
        ta.selectionStart = ta.selectionEnd = ta.selectionStart - 1;
      }
    });
  } else if (ctx.mode === 'attrval') {
    const lc      = ctx.partial.toLowerCase();
    const matches = ctx.values.filter(v => v.startsWith(lc));
    if (!matches.length || matches[0] === ctx.partial) { _hide(); return; }
    _show(matches, ctx.partial, 'val', ta, item => {
      _replaceBefore(ta, ctx.partial, item);
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   SHARED HELPER
══════════════════════════════════════════════════════════════ */
function _replaceBefore(ta, partial, replacement) {
  const s   = ta.selectionStart;
  const val = ta.value;
  ta.value  = val.slice(0, s - partial.length) + replacement + val.slice(s);
  ta.selectionStart = ta.selectionEnd = s - partial.length + replacement.length;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ══════════════════════════════════════════════════════════════
   WIRING
══════════════════════════════════════════════════════════════ */
function _wireOneTa(ta, lang) {
  // input → trigger suggestions
  ta.addEventListener('input', () => {
    if (lang === 'css')       _handleCssInput(ta);
    else if (lang === 'html') _handleHtmlInput(ta);
    else _hide();
  });

  // keydown (capture phase) — intercept when dropdown is open
  ta.addEventListener('keydown', e => {
    if (!_isVisible() || _activeTa !== ta) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault(); e.stopPropagation();
      _setActive(_activeIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation();
      _setActive(_activeIdx - 1);
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      _confirm();
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      _hide();
    }
  }, true); // capture so it runs before autoclose.js

  ta.addEventListener('blur', () => setTimeout(_hide, 120));
}

function wireAutoComplete() {
  _buildDropdown();
  ['left', 'right'].forEach(side => {
    const tabs = tabsFor(side);
    _wireOneTa(tabs.css.ta,  'css');
    _wireOneTa(tabs.html.ta, 'html');
  });
}
