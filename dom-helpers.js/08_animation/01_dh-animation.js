/**
 * dh-animation
 *
 * DOM Helpers — Animation Module
 * CSS transition-based animations that integrate seamlessly with the DOM Helpers library.
 *
 * ─── FEATURES ─────────────────────────────────────────────────────────────────
 *  · fadeIn / fadeOut          — opacity transitions
 *  · slideDown / slideUp       — height/padding/margin collapse & expand
 *  · slideToggle               — auto-detects and reverses current state
 *  · transform                 — translate, rotate, scale, skew via CSS transforms
 *  · AnimationQueue            — per-element sequential queue (WeakMap-backed, no leaks)
 *  · AnimationChain            — fluent builder: element.animate().fadeIn().slideDown().play()
 *  · Stagger support           — offset each collection element's delay by index
 *  · 30 named easing curves    — from 'ease-in-out-back' to 'ease-out-expo'
 *  · Browser compatibility     — vendor-prefixed fallbacks + setTimeout safety net
 *  · .update() integration     — animation keys work inside the standard .update() call
 *  · Forms.addEnhancer() hook  — no monkey-patching of private internals
 *
 * ─── LOAD ORDER ────────────────────────────────────────────────────────────────
 *  <script src="01_dh-core.js"></script>
 *  <script src="Animation/dh-animation.js"></script>
 *
 * ─── GLOBALS CREATED ───────────────────────────────────────────────────────────
 *  Animation               — the full API namespace
 *  DOMHelpers.Animation    — if DOMHelpers is present
 *
 * @version 1.1.0
 * @license MIT
 */

(function (global) {
  'use strict';

  // ============================================================================
  // DEPENDENCY CHECK
  // FIX 1: Check for EnhancedUpdateUtility (the actual library foundation),
  //   not for Elements. Elements can be absent in non-standard load orders, but
  //   EnhancedUpdateUtility is the module everything else is built on.
  // ============================================================================

  if (typeof global.EnhancedUpdateUtility === 'undefined') {
    console.warn(
      '[DOM Helpers Animation] EnhancedUpdateUtility not found — ' +
      'load 01_dh-core.js before Animation/dh-animation.js'
    );
    return;
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const DEFAULT_CONFIG = {
    duration : 300,   // ms
    delay    : 0,     // ms
    easing   : 'ease',
    cleanup  : true,  // remove inline styles after animation completes
    queue    : true,  // queue animations on the same element instead of running in parallel
  };

  // ============================================================================
  // EASING FUNCTIONS
  // Named shortcuts for common cubic-bezier curves.
  // The standard CSS keywords pass through unchanged.
  // ============================================================================

  const EASING = {
    // CSS keywords (passed through)
    'linear'             : 'linear',
    'ease'               : 'ease',
    'ease-in'            : 'ease-in',
    'ease-out'           : 'ease-out',
    'ease-in-out'        : 'ease-in-out',
    // Quadratic
    'ease-in-quad'       : 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
    'ease-out-quad'      : 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    'ease-in-out-quad'   : 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
    // Cubic
    'ease-in-cubic'      : 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    'ease-out-cubic'     : 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    'ease-in-out-cubic'  : 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    // Quartic
    'ease-in-quart'      : 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
    'ease-out-quart'     : 'cubic-bezier(0.165, 0.84, 0.44, 1)',
    'ease-in-out-quart'  : 'cubic-bezier(0.77, 0, 0.175, 1)',
    // Quintic
    'ease-in-quint'      : 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
    'ease-out-quint'     : 'cubic-bezier(0.23, 1, 0.32, 1)',
    'ease-in-out-quint'  : 'cubic-bezier(0.86, 0, 0.07, 1)',
    // Sine
    'ease-in-sine'       : 'cubic-bezier(0.47, 0, 0.745, 0.715)',
    'ease-out-sine'      : 'cubic-bezier(0.39, 0.575, 0.565, 1)',
    'ease-in-out-sine'   : 'cubic-bezier(0.445, 0.05, 0.55, 0.95)',
    // Exponential
    'ease-in-expo'       : 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
    'ease-out-expo'      : 'cubic-bezier(0.19, 1, 0.22, 1)',
    'ease-in-out-expo'   : 'cubic-bezier(1, 0, 0, 1)',
    // Circular
    'ease-in-circ'       : 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
    'ease-out-circ'      : 'cubic-bezier(0.075, 0.82, 0.165, 1)',
    'ease-in-out-circ'   : 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',
    // Back (slight overshoot)
    'ease-in-back'       : 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
    'ease-out-back'      : 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    'ease-in-out-back'   : 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  };

  // ============================================================================
  // BROWSER SUPPORT DETECTION
  // ============================================================================

  const SUPPORT = {
    transitions: (function () {
      const el = document.createElement('div');
      const candidates = {
        transition       : 'transitionend',
        OTransition      : 'oTransitionEnd',
        MozTransition    : 'transitionend',
        WebkitTransition : 'webkitTransitionEnd',
      };
      for (const prop in candidates) {
        if (el.style[prop] !== undefined) {
          return { property: prop, event: candidates[prop] };
        }
      }
      return null;
    })(),

    transforms: (function () {
      const el = document.createElement('div');
      const candidates = ['transform', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform'];
      for (const prop of candidates) {
        if (el.style[prop] !== undefined) return prop;
      }
      return null;
    })(),
  };

  // ============================================================================
  // UTILITY HELPERS
  // ============================================================================

  function _parseConfig(options = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...options };
    if (typeof cfg.easing === 'string' && EASING[cfg.easing]) {
      cfg.easing = EASING[cfg.easing];
    }
    return cfg;
  }

  function _computedStyle(el, prop) {
    return window.getComputedStyle(el).getPropertyValue(prop);
  }

  function _setStyles(el, styles) {
    for (const [prop, val] of Object.entries(styles)) {
      el.style[prop] = val;
    }
  }

  function _removeStyles(el, props) {
    for (const prop of props) el.style.removeProperty(prop);
  }

  function _setTransition(el, properties, cfg) {
    if (!SUPPORT.transitions) return;
    el.style[SUPPORT.transitions.property] = properties
      .map(p => `${p} ${cfg.duration}ms ${cfg.easing} ${cfg.delay}ms`)
      .join(', ');
  }

  function _waitForTransition(el, cfg) {
    return new Promise(resolve => {
      if (!SUPPORT.transitions) {
        setTimeout(resolve, cfg.duration + cfg.delay);
        return;
      }

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.removeEventListener(SUPPORT.transitions.event, onEnd);
        clearTimeout(guardId);
        resolve();
      };

      // Safety net — fire 50ms after the transition should have completed
      const guardId = setTimeout(finish, cfg.duration + cfg.delay + 50);
      const onEnd   = e => { if (e.target === el) finish(); };
      el.addEventListener(SUPPORT.transitions.event, onEnd);
    });
  }

  function _cleanupTransition(el, extraProps = []) {
    if (SUPPORT.transitions) {
      el.style.removeProperty(SUPPORT.transitions.property);
    }
    _removeStyles(el, extraProps);
  }

  // ============================================================================
  // NATURAL DISPLAY VALUE
  //
  // FIX 5: slideDown must restore the element's natural display value
  //   (flex, grid, inline-block, etc.) — not always 'block'. We store
  //   it in a data attribute on slideUp so slideDown can restore it.
  //   If no stored value exists, we reveal the element temporarily in a
  //   hidden container to measure its natural display before animating.
  // ============================================================================

  const NATURAL_DISPLAY_ATTR = 'data-animation-display';

  /** Return the element's natural (non-none) display value. */
  function _getNaturalDisplay(el) {
    // Previously stored by a prior slideUp
    const stored = el.getAttribute(NATURAL_DISPLAY_ATTR);
    if (stored) return stored;

    // Ask the browser for the computed value while briefly un-hiding the element
    const prev = el.style.display;
    el.style.display = '';
    const natural = _computedStyle(el, 'display');
    el.style.display = prev;

    // If the stylesheet still says 'none' fall back to 'block'
    return natural === 'none' ? 'block' : natural;
  }

  // ============================================================================
  // ANIMATION QUEUE
  //
  // Per-element sequential queue backed by a WeakMap so entries are
  // garbage-collected when elements are removed from the DOM.
  //
  // FIX 7: The original only queued animations when the queue was non-empty,
  //   meaning the first animation always ran outside the queue and the second
  //   also found an empty queue (since nothing was added). Every animation is
  //   now always added to the queue when config.queue is true, whether or not
  //   the queue is currently empty. This guarantees sequential execution.
  // ============================================================================

  class AnimationQueue {
    constructor() {
      this._queues = new WeakMap();
    }

    /** Add an animation factory to the queue and start processing if idle. */
    add(el, factory) {
      if (!this._queues.has(el)) this._queues.set(el, []);
      const q = this._queues.get(el);
      q.push(factory);
      if (q.length === 1) this._next(el); // queue was idle — start immediately
    }

    _next(el) {
      const q = this._queues.get(el);
      if (!q || q.length === 0) return;

      q[0]()
        .then(() => { q.shift(); this._next(el); })
        .catch(() => { q.shift(); this._next(el); });
    }

    clear(el) {
      if (this._queues.has(el)) this._queues.set(el, []);
    }

    isEmpty(el) {
      const q = this._queues.get(el);
      return !q || q.length === 0;
    }
  }

  const _queue = new AnimationQueue();

  // ============================================================================
  // CORE ANIMATION FUNCTIONS
  // These are pure functions — they receive an element and options, run the
  // animation, and return a Promise that resolves with the element.
  // ============================================================================

  async function _fadeIn(el, options = {}) {
    const cfg = _parseConfig(options);

    if (_computedStyle(el, 'display') === 'none') {
      el.style.display = el.getAttribute(NATURAL_DISPLAY_ATTR) || 'block';
    }
    el.style.opacity = '0';
    el.offsetHeight; // force reflow

    _setTransition(el, ['opacity'], cfg);
    el.style.opacity = '1';

    await _waitForTransition(el, cfg);
    _cleanupTransition(el, ['opacity']);

    cfg.onComplete?.(el);
    return el;
  }

  async function _fadeOut(el, options = {}) {
    const cfg = _parseConfig(options);

    // FIX 6: Removed the unused `const originalOpacity` variable.
    _setTransition(el, ['opacity'], cfg);
    el.style.opacity = '0';

    await _waitForTransition(el, cfg);

    if (cfg.hide !== false) {
      el.style.display = 'none';
      _cleanupTransition(el, ['opacity']);
    } else {
      _cleanupTransition(el);
    }

    cfg.onComplete?.(el);
    return el;
  }

  async function _slideUp(el, options = {}) {
    const cfg = _parseConfig(options);

    // Store the natural display value so slideDown can restore it
    const naturalDisplay = _computedStyle(el, 'display');
    if (naturalDisplay !== 'none') {
      el.setAttribute(NATURAL_DISPLAY_ATTR, naturalDisplay);
    }

    const h  = el.offsetHeight;
    const pt = _computedStyle(el, 'padding-top');
    const pb = _computedStyle(el, 'padding-bottom');
    const mt = _computedStyle(el, 'margin-top');
    const mb = _computedStyle(el, 'margin-bottom');

    _setStyles(el, {
      height        : h  + 'px',
      paddingTop    : pt,
      paddingBottom : pb,
      marginTop     : mt,
      marginBottom  : mb,
      overflow      : 'hidden',
    });
    el.offsetHeight; // force reflow

    _setTransition(el, ['height', 'padding-top', 'padding-bottom', 'margin-top', 'margin-bottom'], cfg);
    _setStyles(el, { height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px' });

    await _waitForTransition(el, cfg);

    el.style.display = 'none';
    _cleanupTransition(el, ['height', 'padding-top', 'padding-bottom', 'margin-top', 'margin-bottom', 'overflow']);

    cfg.onComplete?.(el);
    return el;
  }

  async function _slideDown(el, options = {}) {
    const cfg = _parseConfig(options);

    // FIX 5: Restore the natural display value (flex, grid, inline-block, etc.)
    //   instead of always setting 'block'.
    const naturalDisplay = _getNaturalDisplay(el);
    el.style.display = naturalDisplay;

    // Measure target dimensions
    const targetH  = el.offsetHeight;
    const targetPt = _computedStyle(el, 'padding-top');
    const targetPb = _computedStyle(el, 'padding-bottom');
    const targetMt = _computedStyle(el, 'margin-top');
    const targetMb = _computedStyle(el, 'margin-bottom');

    // Collapse to zero to start the animation from
    _setStyles(el, {
      height        : '0px',
      paddingTop    : '0px',
      paddingBottom : '0px',
      marginTop     : '0px',
      marginBottom  : '0px',
      overflow      : 'hidden',
    });
    el.offsetHeight; // force reflow

    _setTransition(el, ['height', 'padding-top', 'padding-bottom', 'margin-top', 'margin-bottom'], cfg);
    _setStyles(el, {
      height        : targetH  + 'px',
      paddingTop    : targetPt,
      paddingBottom : targetPb,
      marginTop     : targetMt,
      marginBottom  : targetMb,
    });

    await _waitForTransition(el, cfg);

    // Clean up and remove the stored display attribute — element is visible again
    _cleanupTransition(el, ['height', 'padding-top', 'padding-bottom', 'margin-top', 'margin-bottom', 'overflow']);
    el.removeAttribute(NATURAL_DISPLAY_ATTR);

    cfg.onComplete?.(el);
    return el;
  }

  async function _slideToggle(el, options = {}) {
    const isVisible = _computedStyle(el, 'display') !== 'none' && el.offsetHeight > 0;
    return isVisible ? _slideUp(el, options) : _slideDown(el, options);
  }

  async function _transform(el, transformations, options = {}) {
    const cfg = _parseConfig(options);

    if (!SUPPORT.transforms) {
      console.warn('[DOM Helpers Animation] CSS transforms not supported in this browser');
      await new Promise(r => setTimeout(r, cfg.duration + cfg.delay));
      return el;
    }

    const parts = [];

    for (const [prop, val] of Object.entries(transformations)) {
      switch (prop) {
        case 'translateX':
        case 'translateY':
        case 'translateZ':
        case 'scale':
        case 'scaleX':
        case 'scaleY':
        case 'scaleZ':
        case 'rotate':
        case 'rotateX':
        case 'rotateY':
        case 'rotateZ':
        case 'skew':
        case 'skewX':
        case 'skewY':
          parts.push(`${prop}(${val})`);
          break;
        case 'translate':
          parts.push(Array.isArray(val) ? `translate(${val[0]}, ${val[1]})` : `translate(${val})`);
          break;
        case 'translate3d':
          if (Array.isArray(val) && val.length >= 3) {
            parts.push(`translate3d(${val[0]}, ${val[1]}, ${val[2]})`);
          }
          break;
        default:
          console.warn(`[DOM Helpers Animation] Unknown transform property: ${prop}`);
      }
    }

    _setTransition(el, [SUPPORT.transforms], cfg);
    el.style[SUPPORT.transforms] = parts.join(' ');

    await _waitForTransition(el, cfg);

    if (cfg.cleanup) _cleanupTransition(el, [SUPPORT.transforms]);

    cfg.onComplete?.(el);
    return el;
  }

  // ============================================================================
  // ANIMATION CHAIN
  //
  // FIX 3: Renamed .then() to .next() to avoid the JavaScript "thenable"
  //   protocol collision. Any object with a .then() method is treated as a
  //   Promise-like by the runtime, causing AnimationChain to be consumed
  //   incorrectly when accidentally used with await before .play() is called.
  // ============================================================================

  class AnimationChain {
    constructor(el) {
      this._el    = el;
      this._steps = [];
    }

    fadeIn(options = {}) {
      this._steps.push(() => _fadeIn(this._el, options));
      return this;
    }

    fadeOut(options = {}) {
      this._steps.push(() => _fadeOut(this._el, options));
      return this;
    }

    slideUp(options = {}) {
      this._steps.push(() => _slideUp(this._el, options));
      return this;
    }

    slideDown(options = {}) {
      this._steps.push(() => _slideDown(this._el, options));
      return this;
    }

    slideToggle(options = {}) {
      this._steps.push(() => _slideToggle(this._el, options));
      return this;
    }

    transform(transformations, options = {}) {
      this._steps.push(() => _transform(this._el, transformations, options));
      return this;
    }

    /** Pause for `ms` milliseconds before the next step. */
    delay(ms) {
      this._steps.push(() => new Promise(r => setTimeout(r, ms)));
      return this;
    }

    /**
     * Run an arbitrary callback between animation steps.
     * Renamed from .then() to .next() to avoid the JavaScript thenable
     * protocol — having a .then() method makes any object behave like a
     * Promise, which breaks `await chain.fadeIn()` (without .play()).
     *
     * @param {Function} callback  (element) => void | Promise
     */
    next(callback) {
      this._steps.push(() => {
        if (typeof callback === 'function') {
          return Promise.resolve(callback(this._el));
        }
        return Promise.resolve();
      });
      return this;
    }

    /** Execute all queued steps in order. Returns a Promise. */
    async play() {
      for (const step of this._steps) {
        await step();
      }
      return this._el;
    }
  }

  // ============================================================================
  // QUEUE-AWARE WRAPPER
  //
  // FIX 7: Always route through the queue when config.queue is true.
  //   The original skipped the queue for the first animation (because the queue
  //   was empty), meaning the second call also saw an empty queue and ran in
  //   parallel. Now every queued animation goes through add(), which starts
  //   processing immediately if the queue is empty, preserving sequential order.
  // ============================================================================

  function _queued(el, factory, cfg) {
    if (!cfg.queue) return factory();
    return new Promise((resolve, reject) => {
      _queue.add(el, () => factory().then(resolve, reject));
    });
  }

  // ============================================================================
  // PER-ELEMENT ENHANCEMENT
  // Adds animation methods directly to a DOM element.
  // Protected against double-enhancement via _hasAnimationMethods.
  // ============================================================================

  function _enhanceElement(el) {
    if (!el || el._hasAnimationMethods) return el;

    Object.defineProperty(el, '_hasAnimationMethods', {
      value: true, writable: false, enumerable: false, configurable: false,
    });

    el.fadeIn = function (opts = {}) {
      return _queued(el, () => _fadeIn(el, opts), _parseConfig(opts));
    };

    el.fadeOut = function (opts = {}) {
      return _queued(el, () => _fadeOut(el, opts), _parseConfig(opts));
    };

    el.slideUp = function (opts = {}) {
      return _queued(el, () => _slideUp(el, opts), _parseConfig(opts));
    };

    el.slideDown = function (opts = {}) {
      return _queued(el, () => _slideDown(el, opts), _parseConfig(opts));
    };

    el.slideToggle = function (opts = {}) {
      return _queued(el, () => _slideToggle(el, opts), _parseConfig(opts));
    };

    el.transform = function (transformations, opts = {}) {
      return _queued(el, () => _transform(el, transformations, opts), _parseConfig(opts));
    };

    /** Returns a new AnimationChain for this element. */
    el.animate = function () { return new AnimationChain(el); };

    /** Clears the animation queue and removes any active transition. */
    el.stopAnimations = function () {
      _queue.clear(el);
      if (SUPPORT.transitions) el.style.removeProperty(SUPPORT.transitions.property);
      return el;
    };

    return el;
  }

  // ============================================================================
  // PER-COLLECTION ENHANCEMENT
  // Applies the same animation methods to a collection — each method runs
  // the animation on every element concurrently (with optional stagger).
  // ============================================================================

  function _enhanceCollection(col) {
    if (!col || col._hasAnimationMethods) return col;

    Object.defineProperty(col, '_hasAnimationMethods', {
      value: true, writable: false, enumerable: false, configurable: false,
    });

    function _applyToAll(animFn, opts = {}) {
      const els = Array.from(col._originalCollection || col._originalNodeList || col)
        .filter(el => el && el.nodeType === Node.ELEMENT_NODE);

      const promises = els.map((el, i) => {
        if (!el._hasAnimationMethods) _enhanceElement(el);

        const elOpts = { ...opts };
        if (opts.stagger && i > 0) {
          elOpts.delay = (elOpts.delay || 0) + opts.stagger * i;
        }
        return animFn(el, elOpts);
      });

      return Promise.all(promises).then(() => col);
    }

    col.fadeIn     = (opts = {})                   => _applyToAll(_fadeIn, opts);
    col.fadeOut    = (opts = {})                   => _applyToAll(_fadeOut, opts);
    col.slideUp    = (opts = {})                   => _applyToAll(_slideUp, opts);
    col.slideDown  = (opts = {})                   => _applyToAll(_slideDown, opts);
    col.slideToggle= (opts = {})                   => _applyToAll(_slideToggle, opts);
    col.transform  = (transformations, opts = {})  => _applyToAll((el, o) => _transform(el, transformations, o), opts);

    col.stopAnimations = function () {
      Array.from(col._originalCollection || col._originalNodeList || col)
        .filter(el => el?.nodeType === Node.ELEMENT_NODE)
        .forEach(el => {
          _queue.clear(el);
          if (SUPPORT.transitions) el.style.removeProperty(SUPPORT.transitions.property);
        });
      return col;
    };

    return col;
  }

  // ============================================================================
  // ANIMATION-AWARE .update() WRAPPER
  //
  // FIX 4: Removed the dead `isCollection` branching — both elements and
  //   collections have the same animation methods added by _enhanceElement /
  //   _enhanceCollection, so the same update logic applies to both.
  //   The `isCollection` parameter and all its identical if/else branches
  //   have been removed.
  //
  // Animation keys recognised inside .update():
  //   fadeIn, fadeOut, slideUp, slideDown, slideToggle, transform, stopAnimations
  //
  // All other keys are forwarded to the original core .update() method.
  // Animation keys that produce Promises cause .update() to return a Promise
  // that resolves when all animations complete.
  // ============================================================================

  function _wrapUpdate(target, coreUpdate) {
    // Skip if .update is non-writable (already enhanced) or already animation-wrapped
    if (target.update && target.update._isAnimationUpdate) return;
    const desc = Object.getOwnPropertyDescriptor(target, 'update');
    if (desc && desc.writable === false) return;

    target.update = function animationUpdate(updates = {}) {
      if (!updates || typeof updates !== 'object') {
        console.warn('[DOM Helpers Animation] .update() requires a plain object');
        return target;
      }

      const rest     = { ...updates };
      const promises = [];

      function _consume(key, fn) {
        if (!Object.prototype.hasOwnProperty.call(rest, key)) return;
        const opts = rest[key] === true ? {} : rest[key];
        promises.push(fn(opts));
        delete rest[key];
      }

      _consume('fadeIn',      opts => target.fadeIn(opts));
      _consume('fadeOut',     opts => target.fadeOut(opts));
      _consume('slideUp',     opts => target.slideUp(opts));
      _consume('slideDown',   opts => target.slideDown(opts));
      _consume('slideToggle', opts => target.slideToggle(opts));

      // transform has a different shape: { transform: { transformations: {...}, options: {} } }
      if (Object.prototype.hasOwnProperty.call(rest, 'transform')) {
        const val = rest.transform;
        if (val && val.transformations) {
          promises.push(target.transform(val.transformations, val.options || {}));
        }
        delete rest.transform;
      }

      if (Object.prototype.hasOwnProperty.call(rest, 'stopAnimations')) {
        target.stopAnimations();
        delete rest.stopAnimations;
      }

      // Delegate remaining keys to the core .update()
      if (Object.keys(rest).length > 0 && typeof coreUpdate === 'function') {
        coreUpdate.call(target, rest);
      }

      return promises.length > 0 ? Promise.all(promises).then(() => target) : target;
    };
    target.update._isAnimationUpdate = true;

    return target;
  }

  // ============================================================================
  // INTEGRATION WITH DOM HELPERS
  //
  // FIX 2: Removed all monkey-patching of private internal methods
  //   (_enhanceElementWithUpdate, _enhanceCollectionWithUpdate, _enhanceForm,
  //   _getElement). These have no stable API contract.
  //
  // New strategy — two public integration points:
  //
  //   A) EnhancedUpdateUtility.enhanceElementWithUpdate and
  //      EnhancedUpdateUtility.enhanceCollectionWithUpdate are WRAPPED (not
  //      replaced) using the standard function-wrapping pattern. These are the
  //      public, documented methods exported on the EnhancedUpdateUtility object.
  //
  //   B) Forms.helper.addEnhancer() is used for the Forms integration — the
  //      same public plugin hook used by 02_dh-form-enhance.js.
  // ============================================================================

  function _integrate() {
    const EU = global.EnhancedUpdateUtility;

    // ── A. Wrap EnhancedUpdateUtility public methods ──────────────────────────

    // enhanceElementWithUpdate — called every time any element is enhanced
    const _origEnhanceEl = EU.enhanceElementWithUpdate;
    EU.enhanceElementWithUpdate = function (el) {
      el = _origEnhanceEl(el);
      if (el) {
        const coreUpdate = el.update; // capture before _wrapUpdate replaces it
        _enhanceElement(el);
        _wrapUpdate(el, coreUpdate);
      }
      return el;
    };

    // enhanceCollectionWithUpdate — called every time any collection is enhanced
    const _origEnhanceCol = EU.enhanceCollectionWithUpdate;
    EU.enhanceCollectionWithUpdate = function (col) {
      col = _origEnhanceCol(col);
      if (col) {
        const coreUpdate = col.update;
        _enhanceCollection(col);
        _wrapUpdate(col, coreUpdate);
      }
      return col;
    };

    // ── B. Forms integration via the public addEnhancer() hook ────────────────
    if (global.Forms && typeof global.Forms.helper?.addEnhancer === 'function') {
      global.Forms.helper.addEnhancer(function _animationFormEnhancer(form) {
        if (form._hasAnimationMethods) return form;
        const coreUpdate = form.update;
        _enhanceElement(form);
        _wrapUpdate(form, coreUpdate);
        return form;
      });
    }

    console.log('[DOM Helpers Animation] ✓ Integrated with DOM Helpers ecosystem');
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const Animation = {
    version: '1.1.0',

    // ── Core animation functions (work on any raw element) ────────────────────
    fadeIn      : _fadeIn,
    fadeOut     : _fadeOut,
    slideUp     : _slideUp,
    slideDown   : _slideDown,
    slideToggle : _slideToggle,
    transform   : _transform,

    /**
     * Create an AnimationChain for a specific element.
     * @param {HTMLElement} el
     * @returns {AnimationChain}
     *
     * @example
     * await Animation.chain(myElement)
     *   .fadeIn({ duration: 200 })
     *   .delay(500)
     *   .slideUp()
     *   .play();
     */
    chain(el) { return new AnimationChain(el); },

    /**
     * Manually add animation methods to any element or collection.
     * Normally called automatically — use this for elements obtained
     * outside the DOM Helpers helpers (e.g. document.querySelector).
     *
     * @param {HTMLElement|Object} target
     * @returns {HTMLElement|Object} The enhanced target
     */
    enhance(target) {
      if (!target) return target;
      if (target.nodeType === Node.ELEMENT_NODE) {
        const core = target.update;
        _enhanceElement(target);
        _wrapUpdate(target, core);
        return target;
      }
      // Collection-like
      if (target.length !== undefined || target._originalCollection || target._originalNodeList) {
        const core = target.update;
        _enhanceCollection(target);
        _wrapUpdate(target, core);
        return target;
      }
      return target;
    },

    /** Clear the animation queue for an element without stopping the current animation. */
    clearQueue(el) {
      _queue.clear(el);
      return this;
    },

    /**
     * Override global defaults for all subsequent animations.
     *
     * @param {Object} config
     * @param {number} [config.duration=300]   default duration in ms
     * @param {number} [config.delay=0]        default delay in ms
     * @param {string} [config.easing='ease']  default easing name or cubic-bezier(…)
     * @param {boolean}[config.cleanup=true]   remove inline styles after animation
     * @param {boolean}[config.queue=true]     queue animations on the same element
     * @returns {Animation} for chaining
     */
    setDefaults(config) {
      Object.assign(DEFAULT_CONFIG, config);
      return this;
    },

    getDefaults() { return { ...DEFAULT_CONFIG }; },

    /**
     * Check whether a CSS feature is supported in the current browser.
     * @param {'transitions'|'transforms'} feature
     * @returns {boolean}
     */
    isSupported(feature) { return !!SUPPORT[feature]; },

    /** The full easing name → cubic-bezier map. */
    easing: EASING,
  };

  // ============================================================================
  // EXPORT
  // ============================================================================

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Animation;
  } else if (typeof define === 'function' && define.amd) {
    define([], () => Animation);
  } else {
    global.Animation = Animation;
  }

  if (global.DOMHelpers) {
    global.DOMHelpers.Animation = Animation;
  }

  // Run integration synchronously — same pattern as every other module
  _integrate();

  console.log('[DOM Helpers Animation] v1.1.0 loaded');

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);