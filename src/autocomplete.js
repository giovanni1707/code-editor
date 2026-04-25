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
   JS AUTOCOMPLETE
══════════════════════════════════════════════════════════════ */
const JS_KEYWORDS = [
  'break','case','catch','class','const','continue','debugger','default',
  'delete','do','else','export','extends','finally','for','function','if',
  'import','in','instanceof','let','new','of','return','static','super',
  'switch','this','throw','try','typeof','var','void','while','with','yield',
  'async','await','from','as','null','undefined','true','false','NaN',
  'Infinity',
];

const JS_BUILTINS = [
  // Globals
  'console','window','document','globalThis','navigator','location','history',
  'localStorage','sessionStorage','indexedDB','performance','crypto',
  'fetch','XMLHttpRequest','WebSocket','Worker','SharedWorker',
  // console methods
  'console.log','console.error','console.warn','console.info','console.dir',
  'console.table','console.time','console.timeEnd','console.group',
  'console.groupEnd','console.clear','console.count','console.assert',
  // Built-in constructors / objects
  'Array','Object','String','Number','Boolean','Symbol','BigInt',
  'Map','Set','WeakMap','WeakSet','WeakRef','Promise','Proxy','Reflect',
  'Date','RegExp','Error','TypeError','RangeError','SyntaxError',
  'ReferenceError','URIError','EvalError','AggregateError',
  'ArrayBuffer','DataView','Int8Array','Uint8Array','Uint8ClampedArray',
  'Int16Array','Uint16Array','Int32Array','Uint32Array',
  'Float32Array','Float64Array','BigInt64Array','BigUint64Array',
  'JSON','Math','Atomics','Intl','URL','URLSearchParams','FormData',
  'Blob','File','FileReader','MutationObserver','IntersectionObserver',
  'ResizeObserver','PerformanceObserver','EventTarget','AbortController',
  'AbortSignal','BroadcastChannel','MessageChannel','TextEncoder',
  'TextDecoder','CompressionStream','DecompressionStream',
  // Array methods
  'Array.from','Array.isArray','Array.of',
  // Object methods
  'Object.keys','Object.values','Object.entries','Object.assign',
  'Object.create','Object.freeze','Object.seal','Object.defineProperty',
  'Object.getPrototypeOf','Object.fromEntries','Object.hasOwn',
  // Promise methods
  'Promise.resolve','Promise.reject','Promise.all','Promise.allSettled',
  'Promise.any','Promise.race',
  // Math methods
  'Math.abs','Math.ceil','Math.floor','Math.round','Math.max','Math.min',
  'Math.random','Math.sqrt','Math.pow','Math.log','Math.log2','Math.log10',
  'Math.trunc','Math.sign','Math.PI','Math.E',
  // JSON
  'JSON.stringify','JSON.parse',
  // String methods (prototype, shown as standalone)
  'toString','valueOf','hasOwnProperty','isPrototypeOf',
  // DOM
  'document.getElementById','document.querySelector','document.querySelectorAll',
  'document.createElement','document.createTextNode','document.createDocumentFragment',
  'document.getElementsByClassName','document.getElementsByTagName',
  'document.body','document.head','document.title','document.cookie',
  'document.readyState','document.addEventListener','document.removeEventListener',
  'window.addEventListener','window.removeEventListener',
  'window.setTimeout','window.setInterval','window.clearTimeout','window.clearInterval',
  'window.requestAnimationFrame','window.cancelAnimationFrame',
  'window.alert','window.confirm','window.prompt','window.open','window.close',
  'window.scrollTo','window.scrollBy','window.getComputedStyle',
  'window.innerWidth','window.innerHeight','window.outerWidth','window.outerHeight',
  'window.location','window.history','window.navigator',
  'setTimeout','setInterval','clearTimeout','clearInterval',
  'requestAnimationFrame','cancelAnimationFrame',
  'alert','confirm','prompt','parseInt','parseFloat','isNaN','isFinite',
  'encodeURIComponent','decodeURIComponent','encodeURI','decodeURI','eval',
  // Common instance methods typed standalone
  'addEventListener','removeEventListener','dispatchEvent',
  'appendChild','removeChild','insertBefore','replaceChild','cloneNode',
  'getAttribute','setAttribute','removeAttribute','hasAttribute',
  'classList','className','innerHTML','innerText','textContent','outerHTML',
  'style','dataset','id','parentNode','parentElement','children',
  'firstChild','lastChild','nextSibling','previousSibling',
  'firstElementChild','lastElementChild','nextElementSibling','previousElementSibling',
  'getBoundingClientRect','scrollIntoView','scrollTo','scrollBy',
  'focus','blur','click','submit','reset','select','closest','matches',
  'insertAdjacentHTML','insertAdjacentElement','insertAdjacentText',
  'prepend','append','replaceWith','remove','contains','hasChildNodes',
  'getContext','toDataURL','requestFullscreen','exitFullscreen',
  'play','pause','load',
  // Array instance methods
  'forEach','map','filter','reduce','reduceRight','find','findIndex',
  'findLast','findLastIndex','some','every','includes','indexOf','lastIndexOf',
  'push','pop','shift','unshift','splice','slice','concat','join','reverse',
  'sort','flat','flatMap','fill','copyWithin','entries','keys','values','at',
  // String instance methods
  'split','replace','replaceAll','match','matchAll','search','test',
  'trim','trimStart','trimEnd','padStart','padEnd','startsWith','endsWith',
  'repeat','slice','substring','substr','charAt','charCodeAt','codePointAt',
  'toLowerCase','toUpperCase','toLocaleLowerCase','toLocaleUpperCase',
  'normalize','indexOf','lastIndexOf','includes',
  // Promise/async
  'then','catch','finally',
  // Storage
  'localStorage.getItem','localStorage.setItem','localStorage.removeItem',
  'localStorage.clear','localStorage.key','localStorage.length',
  'sessionStorage.getItem','sessionStorage.setItem','sessionStorage.removeItem',
  // fetch / Response
  'fetch','Response','Request','Headers',
  // Event types (common)
  'click','dblclick','mousedown','mouseup','mousemove','mouseover','mouseout',
  'mouseenter','mouseleave','contextmenu','keydown','keyup','keypress',
  'input','change','submit','reset','focus','blur','focusin','focusout',
  'scroll','resize','load','DOMContentLoaded','beforeunload','unload',
  'touchstart','touchend','touchmove','touchcancel',
  'pointerdown','pointerup','pointermove','pointerover','pointerout',
  'pointerenter','pointerleave','pointercancel',
  'dragstart','dragend','dragover','dragleave','dragenter','drop','drag',
  'wheel','copy','cut','paste','select','selectstart',
  'animationstart','animationend','animationiteration','transitionend',
  'error','abort','progress','canplay','canplaythrough','ended','pause','play',
  'ratechange','seeked','seeking','stalled','suspend','timeupdate','volumechange',
  'waiting','fullscreenchange','fullscreenerror','visibilitychange',
  'hashchange','popstate','storage','online','offline','message','messageerror',
];

// Extract word-tokens the user has already typed in this file
function _jsUserWords(ta) {
  const words = ta.value.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || [];
  return [...new Set(words)];
}

// Get the word being typed right before the cursor
function _jsPartial(ta) {
  const val    = ta.value;
  const pos    = ta.selectionStart;
  const before = val.slice(0, pos);
  const m      = before.match(/[a-zA-Z_$][a-zA-Z0-9_$.]*$/);
  return m ? m[0] : '';
}

function _handleJsInput(ta) {
  const partial = _jsPartial(ta);
  if (!partial || partial.length < 2) { _hide(); return; }

  const lc = partial.toLowerCase();

  // Build candidate list: keywords → builtins → user-defined words
  const seen = new Set();
  const candidates = [];

  const add = (word, label) => {
    if (seen.has(word)) return;
    if (!word.toLowerCase().startsWith(lc)) return;
    if (word === partial) return; // already fully typed
    seen.add(word);
    candidates.push({ word, label });
  };

  JS_KEYWORDS.forEach(w => add(w, 'kw'));
  JS_BUILTINS.forEach(w => add(w, 'api'));
  _jsUserWords(ta).forEach(w => { if (w.length > 2) add(w, 'word'); });

  if (!candidates.length) { _hide(); return; }

  const items  = candidates.slice(0, 12).map(c => c.word);
  const labels = candidates.slice(0, 12).map(c => c.label);

  // Temporarily override _show to pass per-item type labels
  _showJs(items, labels, partial, ta);
}

function _showJs(items, labels, partial, ta) {
  if (!items.length) { _hide(); return; }
  _buildDropdown();
  _items     = items;
  _onConfirm = item => _replaceBefore(ta, partial, item);
  _activeTa  = ta;
  _activeIdx = 0;

  _drop.innerHTML = '';
  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'ac-item' + (i === 0 ? ' ac-active' : '');
    row.setAttribute('role', 'option');

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
    type.textContent = labels[i];
    row.appendChild(type);

    row.addEventListener('mousedown', e => {
      e.preventDefault();
      _replaceBefore(ta, partial, item);
      _hide();
      ta.focus();
    });
    _drop.appendChild(row);
  });

  const coords = getCaretCoords(ta);
  const vw = window.innerWidth;
  let left = coords.left;
  if (left + 200 > vw) left = vw - 204;
  _drop.style.top  = (coords.bottom + 2) + 'px';
  _drop.style.left = left + 'px';
  _drop.classList.add('visible');
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
    if (!state.settings.autocomplete) { _hide(); return; }
    if (lang === 'css')       _handleCssInput(ta);
    else if (lang === 'html') _handleHtmlInput(ta);
    else if (lang === 'js')   _handleJsInput(ta);
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
    _wireOneTa(tabs.js.ta,   'js');
  });
}
