/**
 * 01_dh-router.js
 *
 * DOM Helpers — SPA Router Module
 * Hash-mode and history-mode client-side router with zero dependencies.
 *
 * ─── FEATURES ─────────────────────────────────────────────────────────────────
 *  · Hash mode (#/path) — works on any static host, zero server config
 *  · History mode (/path) — clean URLs, requires server fallback to index.html
 *  · Named route params    — /user/:id → params.id
 *  · Query string access   — params passed as URLSearchParams
 *  · Wildcard catch-all    — path: '*' for 404 pages
 *  · Scroll-to-top         — automatic on navigation (configurable)
 *  · Navigation lock       — prevents overlapping navigations
 *  · document.title update — per-route title support
 *  · onEnter / onLeave     — per-route lifecycle hooks
 *  · onCleanup             — colocated teardown inside onEnter
 *  · Router.on / Router.off — event system ('change', 'error', 'notfound')
 *  · Router.go / back / forward — programmatic navigation
 *  · Router.current()      — snapshot of the active route
 *  · Router.configure()    — runtime option changes, returns Router
 *
 * ─── LOAD ORDER ────────────────────────────────────────────────────────────────
 *  Standalone (no other DOM Helpers modules required):
 *  <script src="dom-helpers.spa.min.js"></script>
 *
 *  With DOM Helpers full bundle:
 *  <script src="dom-helpers.min.js"></script>
 *  <script src="dom-helpers.spa.min.js"></script>
 *
 * ─── GLOBALS CREATED ───────────────────────────────────────────────────────────
 *  Router   — the full API namespace
 *
 * ─── DOES NOT TOUCH ────────────────────────────────────────────────────────────
 *  Elements, Collections, Selector, ReactiveUtils — untouched.
 *  Integration with those modules is opt-in inside onEnter / onLeave hooks.
 *
 * @version 1.0.0
 * @license MIT
 */

(function (global) {
  'use strict';

  // ============================================================================
  // GUARD: already loaded
  // ============================================================================

  if (global.Router) {
    console.warn('[DOM Helpers Router] Router is already defined. Skipping re-initialisation.');
    return;
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const DEFAULT_CONFIG = {
    mode       : 'hash',   // 'hash' | 'history'
    scrollToTop: true,     // scroll to (0,0) after each navigation
    base       : '',       // base path for history mode, e.g. '/app'
  };

  let _config = Object.assign({}, DEFAULT_CONFIG);

  // ============================================================================
  // INTERNAL STATE
  // ============================================================================

  /** @type {Array<RouteRecord>} */
  let _routes = [];

  /** @type {HTMLElement|null} */
  let _outlet = null;

  /** @type {RouteMatch|null} */
  let _current = null;

  /** @type {boolean} */
  let _started = false;

  /** @type {boolean} navigation lock — prevents concurrent transitions */
  let _navigating = false;

  /** @type {Array<Function>} cleanup fns registered by onEnter via onCleanup() */
  let _cleanupFns = [];

  /** @type {Map<string, Set<Function>>} event listeners */
  const _events = new Map();

  /** @type {Array<Function>} beforeEach guards */
  const _beforeGuards = [];

  /** @type {Array<Function>} afterEach guards */
  const _afterGuards = [];

  // ============================================================================
  // ROUTE RECORD
  // Route records are normalised from the user-supplied definitions.
  // ============================================================================

  /**
   * @typedef {Object} RouteDefinition
   * @property {string}          path      — e.g. '/user/:id', '/', '*'
   * @property {string|Function} view      — CSS selector of a <template>, or a factory
   * @property {string}          [title]   — document.title to set on enter
   * @property {Function}        [onEnter] — (params, query, onCleanup) => void
   * @property {Function}        [onLeave] — () => void | Promise<void>
   */

  /**
   * @typedef {Object} RouteRecord — normalised internal form
   * @property {string}   path
   * @property {RegExp}   regex
   * @property {string[]} paramNames
   * @property {string|Function} view
   * @property {string}   [title]
   * @property {Function} [onEnter]
   * @property {Function} [onLeave]
   * @property {boolean}  isCatchAll
   */

  /**
   * @typedef {Object} RouteMatch
   * @property {string}          path
   * @property {Object}          params
   * @property {URLSearchParams} query
   * @property {RouteRecord}     _record
   */

  // ============================================================================
  // PATH → REGEX COMPILER
  // ============================================================================

  /**
   * Convert a route path string to a RegExp and extract param names.
   *
   * Rules:
   *  - ':name' segments become named capture groups
   *  - '*' is a catch-all (matches anything)
   *  - Everything else is treated as a literal path segment
   *
   * @param {string} path
   * @returns {{ regex: RegExp, paramNames: string[], isCatchAll: boolean }}
   */
  function compilePath(path) {
    if (path === '*') {
      return { regex: /.*/, paramNames: [], isCatchAll: true };
    }

    const paramNames = [];

    // Escape special regex characters except '/' and ':'
    const pattern = path
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape special chars
      .replace(/\\:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });

    return {
      regex      : new RegExp('^' + pattern + '\\/?$'),
      paramNames,
      isCatchAll : false
    };
  }

  /**
   * Normalise a user-supplied route definition into a RouteRecord.
   *
   * @param {RouteDefinition} def
   * @returns {RouteRecord}
   */
  function normaliseRoute(def) {
    if (!def.path || typeof def.path !== 'string') {
      throw new Error('[DOM Helpers Router] Each route must have a string "path" property.');
    }
    if (!def.view) {
      throw new Error('[DOM Helpers Router] Route "' + def.path + '" must have a "view" property.');
    }

    const { regex, paramNames, isCatchAll } = compilePath(def.path);

    return {
      path       : def.path,
      regex,
      paramNames,
      isCatchAll,
      view       : def.view,
      title      : def.title   || null,
      onEnter    : def.onEnter || null,
      onLeave    : def.onLeave || null,
    };
  }

  // ============================================================================
  // URL UTILITIES
  // ============================================================================

  /**
   * Get the current pathname as the router sees it (mode-aware).
   * @returns {string}
   */
  function getCurrentPath() {
    if (_config.mode === 'hash') {
      const hash = global.location.hash;
      // Strip the leading '#', default to '/'
      const path = hash.replace(/^#/, '') || '/';
      return path.startsWith('/') ? path : '/' + path;
    }

    // history mode
    const full = global.location.pathname;
    const base = _config.base;
    if (base && full.startsWith(base)) {
      return full.slice(base.length) || '/';
    }
    return full || '/';
  }

  /**
   * Push a new URL into the browser history (mode-aware).
   * @param {string} path
   */
  function pushPath(path) {
    if (_config.mode === 'hash') {
      global.location.hash = path;
    } else {
      global.history.pushState(null, '', _config.base + path);
    }
  }

  /**
   * Get the query string as URLSearchParams.
   * @returns {URLSearchParams}
   */
  function getCurrentQuery() {
    return new URLSearchParams(global.location.search);
  }

  // ============================================================================
  // ROUTE MATCHING
  // ============================================================================

  /**
   * Find the first route that matches the given pathname.
   * Catch-all routes are tested last.
   *
   * @param {string} pathname
   * @returns {{ record: RouteRecord, params: Object } | null}
   */
  function matchRoute(pathname) {
    // Strip query string if present
    const path = pathname.split('?')[0];

    // Test regular routes first (order preserved)
    for (const record of _routes) {
      if (record.isCatchAll) continue;
      const m = path.match(record.regex);
      if (m) {
        const params = {};
        record.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(m[i + 1]);
        });
        return { record, params };
      }
    }

    // Fall back to catch-all
    for (const record of _routes) {
      if (record.isCatchAll) return { record, params: {} };
    }

    return null;
  }

  // ============================================================================
  // GUARD PIPELINE
  // ============================================================================

  /**
   * Run all beforeEach guards sequentially.
   * Each guard receives (to, from, next).
   * Calling next() proceeds; next('/path') redirects; calling nothing blocks.
   *
   * @param {RouteMatch} to
   * @param {RouteMatch|null} from
   * @returns {Promise<string|true>} — true = proceed, string = redirect path
   */
  function runBeforeGuards(to, from) {
    return new Promise((resolve) => {
      let index = 0;

      function step() {
        if (index >= _beforeGuards.length) {
          resolve(true); // all guards passed
          return;
        }

        const guard = _beforeGuards[index++];

        try {
          guard(to, from, function next(redirectPath) {
            if (redirectPath === undefined) {
              step(); // proceed
            } else {
              resolve(redirectPath); // redirect
            }
          });
        } catch (err) {
          _emit('error', err);
          resolve(false); // abort on guard error
        }
      }

      step();
    });
  }

  /**
   * Run all afterEach guards (fire-and-forget, errors are caught).
   * @param {RouteMatch} to
   * @param {RouteMatch|null} from
   */
  function runAfterGuards(to, from) {
    for (const guard of _afterGuards) {
      try {
        guard(to, from);
      } catch (err) {
        _emit('error', err);
      }
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Run and discard all cleanup functions registered by the current view's onEnter.
   */
  function runCleanup() {
    for (const fn of _cleanupFns) {
      try { fn(); } catch (err) { _emit('error', err); }
    }
    _cleanupFns = [];
  }

  // ============================================================================
  // VIEW LIFECYCLE
  // ============================================================================

  /**
   * Unmount the currently active view.
   * Runs onLeave hook, then cleanup fns, then clears the outlet.
   *
   * @returns {Promise<void>}
   */
  async function unmountCurrent() {
    if (!_outlet) return;

    // Run onLeave on the current record
    if (_current && _current._record.onLeave) {
      try {
        await _current._record.onLeave();
      } catch (err) {
        _emit('error', err);
      }
    }

    // Run any cleanup fns registered via onCleanup()
    runCleanup();

    // Clear the outlet
    _outlet.innerHTML = '';
  }

  /**
   * Mount a view into the outlet.
   *
   * Supports two forms of `view`:
   *  1. CSS selector string  — '#my-template', pointing to a <template> element
   *  2. Function factory     — () => HTMLElement | string
   *
   * @param {RouteRecord} record
   * @param {Object}      params
   * @param {URLSearchParams} query
   */
  async function mountView(record, params, query) {
    if (!_outlet) {
      console.warn('[DOM Helpers Router] No outlet mounted. Call Router.mount(selector) first.');
      return;
    }

    let content;

    if (typeof record.view === 'function') {
      // Factory — may return an HTMLElement or an HTML string
      try {
        const result = await record.view(params, query);
        if (typeof result === 'string') {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = result;
          content = wrapper;
        } else if (result instanceof HTMLElement) {
          content = result;
        } else {
          throw new Error('view factory must return an HTMLElement or HTML string');
        }
      } catch (err) {
        _emit('error', err);
        return;
      }
    } else {
      // CSS selector pointing at a <template>
      const templateEl = document.querySelector(record.view);
      if (!templateEl) {
        const msg = '[DOM Helpers Router] View "' + record.view + '" not found in the document.';
        console.error(msg);
        _emit('error', new Error(msg));
        return;
      }

      if (templateEl.tagName === 'TEMPLATE') {
        content = templateEl.content.cloneNode(true);
      } else {
        // Fallback: treat any element as the view source and clone its children
        const frag = document.createDocumentFragment();
        Array.from(templateEl.children).forEach(child => {
          frag.appendChild(child.cloneNode(true));
        });
        content = frag;
      }
    }

    _outlet.appendChild(content);

    // Scroll to top
    if (_config.scrollToTop) {
      global.scrollTo(0, 0);
    }

    // Update document title
    if (record.title) {
      document.title = record.title;
    }

    // Call onEnter with (params, query, onCleanup)
    if (record.onEnter) {
      try {
        await record.onEnter(params, query, function onCleanup(fn) {
          if (typeof fn === 'function') _cleanupFns.push(fn);
        });
      } catch (err) {
        _emit('error', err);
      }
    }
  }

  // ============================================================================
  // CORE NAVIGATION PIPELINE
  // ============================================================================

  /**
   * Resolve a pathname: match → guard → unmount → mount → emit.
   * This is the single entry point for ALL navigations.
   *
   * @param {string} pathname
   * @param {boolean} [replace=false] — internal flag for redirects
   */
  async function resolve(pathname, replace) {
    // Navigation lock — ignore if already in progress
    if (_navigating) return;
    _navigating = true;

    try {
      const match = matchRoute(pathname);

      if (!match) {
        _emit('notfound', { path: pathname });
        return;
      }

      const query = getCurrentQuery();

      /** @type {RouteMatch} */
      const to = {
        path   : pathname,
        params : match.params,
        query,
        _record: match.record,
      };

      const from = _current;

      // ── Guards ──────────────────────────────────────────────────────────────
      const guardResult = await runBeforeGuards(to, from);

      if (guardResult === false) {
        return; // guard aborted navigation
      }

      if (typeof guardResult === 'string') {
        // Guard redirected — navigate to the new path without locking again
        _navigating = false;
        pushPath(guardResult);
        if (_config.mode === 'history') {
          await resolve(guardResult, true);
        }
        // hash mode: the hashchange event will fire and call resolve() again
        return;
      }

      // ── Unmount current view ─────────────────────────────────────────────
      await unmountCurrent();

      // ── Mount new view ───────────────────────────────────────────────────
      await mountView(match.record, match.params, query);

      // ── Update active state ──────────────────────────────────────────────
      _current = to;
      _updateLinks(pathname);

      // ── After guards & events ────────────────────────────────────────────
      runAfterGuards(to, from);
      _emit('change', { to, from });

    } catch (err) {
      _emit('error', err);
    } finally {
      _navigating = false;
    }
  }

  // ============================================================================
  // LINK MANAGEMENT
  // Managed by 03_dh-router-link.js, but the core needs to call _updateLinks
  // so we expose a hookable slot here.
  // ============================================================================

  /**
   * Update [data-route] elements to reflect the current path.
   * This function is replaced by 03_dh-router-link.js when that module loads.
   * @param {string} activePath
   */
  let _updateLinks = function (activePath) { /* overridden by router-link module */ };

  // ============================================================================
  // BROWSER EVENT LISTENERS
  // ============================================================================

  function _onHashChange() {
    resolve(getCurrentPath());
  }

  function _onPopState() {
    resolve(getCurrentPath());
  }

  // ============================================================================
  // EVENT EMITTER
  // ============================================================================

  function _emit(event, data) {
    const handlers = _events.get(event);
    if (!handlers) return;
    handlers.forEach(fn => {
      try { fn(data); } catch (err) { console.error('[DOM Helpers Router] Event handler error:', err); }
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const Router = {

    // ── Route definition ────────────────────────────────────────────────────

    /**
     * Define all application routes.
     * Must be called before Router.start().
     *
     * @param {RouteDefinition[]} defs
     * @returns {Router}
     */
    define(defs) {
      if (!Array.isArray(defs) || defs.length === 0) {
        console.error('[DOM Helpers Router] Router.define() expects a non-empty array of route objects.');
        return this;
      }

      _routes = defs.map(def => {
        try {
          return normaliseRoute(def);
        } catch (err) {
          console.error('[DOM Helpers Router]', err.message);
          return null;
        }
      }).filter(Boolean);

      return this;
    },

    // ── Outlet ──────────────────────────────────────────────────────────────

    /**
     * Set the element that will receive mounted view content.
     *
     * @param {string|HTMLElement} selectorOrElement
     * @returns {Router}
     */
    mount(selectorOrElement) {
      if (typeof selectorOrElement === 'string') {
        _outlet = document.querySelector(selectorOrElement);
        if (!_outlet) {
          console.error('[DOM Helpers Router] mount(): element "' + selectorOrElement + '" not found.');
        }
      } else if (selectorOrElement instanceof HTMLElement) {
        _outlet = selectorOrElement;
      } else {
        console.error('[DOM Helpers Router] mount() expects a CSS selector string or HTMLElement.');
      }
      return this;
    },

    // ── Start ────────────────────────────────────────────────────────────────

    /**
     * Attach browser listeners and resolve the initial URL.
     *
     * @param {Object} [options]
     * @param {'hash'|'history'} [options.mode='hash']
     * @param {boolean} [options.scrollToTop=true]
     * @param {string}  [options.base='']
     * @returns {Router}
     */
    start(options) {
      if (_started) {
        console.warn('[DOM Helpers Router] Router.start() called more than once — ignored.');
        return this;
      }

      if (options) {
        Object.assign(_config, options);
      }

      _started = true;

      if (_config.mode === 'hash') {
        global.addEventListener('hashchange', _onHashChange);
      } else {
        global.addEventListener('popstate', _onPopState);
      }

      // Resolve the current URL immediately
      resolve(getCurrentPath());

      return this;
    },

    // ── Navigation ───────────────────────────────────────────────────────────

    /**
     * Navigate to a path.
     *
     * @param {string} path — e.g. '/about', '/user/42'
     * @returns {Router}
     */
    go(path) {
      if (typeof path !== 'string') {
        console.error('[DOM Helpers Router] Router.go() expects a string path.');
        return this;
      }
      pushPath(path);
      if (_config.mode === 'history') {
        resolve(path);
      }
      // hash mode: hashchange fires automatically → resolve() called
      return this;
    },

    /**
     * Go one step back in browser history.
     * @returns {Router}
     */
    back() {
      global.history.back();
      return this;
    },

    /**
     * Go one step forward in browser history.
     * @returns {Router}
     */
    forward() {
      global.history.forward();
      return this;
    },

    // ── Current route ─────────────────────────────────────────────────────────

    /**
     * Return a snapshot of the currently active route.
     *
     * @returns {RouteMatch|null}
     */
    current() {
      return _current
        ? { path: _current.path, params: _current.params, query: _current.query, title: _current._record.title }
        : null;
    },

    // ── Configuration ─────────────────────────────────────────────────────────

    /**
     * Change runtime options. Returns Router for chaining.
     *
     * @param {Object} options
     * @returns {Router}
     */
    configure(options) {
      if (options && typeof options === 'object') {
        Object.assign(_config, options);
      }
      return this;
    },

    // ── Events ────────────────────────────────────────────────────────────────

    /**
     * Subscribe to a router event.
     * Events: 'change', 'error', 'notfound'
     *
     * @param {string}   event
     * @param {Function} handler
     * @returns {Router}
     */
    on(event, handler) {
      if (typeof handler !== 'function') return this;
      if (!_events.has(event)) _events.set(event, new Set());
      _events.get(event).add(handler);
      return this;
    },

    /**
     * Unsubscribe from a router event.
     *
     * @param {string}   event
     * @param {Function} handler
     * @returns {Router}
     */
    off(event, handler) {
      const handlers = _events.get(event);
      if (handlers) handlers.delete(handler);
      return this;
    },

    // ── Guards ────────────────────────────────────────────────────────────────

    /**
     * Register a navigation guard that runs before every route change.
     * Must call next() to proceed, or next('/path') to redirect.
     *
     * @param {Function} fn — (to, from, next) => void
     * @returns {Router}
     */
    beforeEach(fn) {
      if (typeof fn === 'function') _beforeGuards.push(fn);
      return this;
    },

    /**
     * Register a hook that runs after every successful navigation.
     *
     * @param {Function} fn — (to, from) => void
     * @returns {Router}
     */
    afterEach(fn) {
      if (typeof fn === 'function') _afterGuards.push(fn);
      return this;
    },

    // ── Internal hooks (used by sibling modules) ──────────────────────────────

    /**
     * Override the default (no-op) _updateLinks function.
     * Called by 03_dh-router-link.js after it loads.
     *
     * @param {Function} fn — (activePath: string) => void
     */
    _setLinkUpdater(fn) {
      if (typeof fn === 'function') _updateLinks = fn;
    },

    /**
     * Expose resolve() for use by sibling modules (e.g. router-link click handler).
     * @param {string} path
     */
    _resolve(path) {
      resolve(path);
    },

    /**
     * Remove a guard from the beforeEach queue.
     * Used by 04_dh-router-guards.js for guard removal.
     *
     * @param {Function} fn — the exact function reference to remove
     */
    _removeBeforeGuard(fn) {
      const idx = _beforeGuards.indexOf(fn);
      if (idx !== -1) _beforeGuards.splice(idx, 1);
    },
  };

  // ============================================================================
  // REGISTER GLOBAL
  // ============================================================================

  global.Router = Router;

  // Attach to DOMHelpers namespace if present
  if (global.DOMHelpers && typeof global.DOMHelpers === 'object') {
    global.DOMHelpers.Router = Router;
  }

})(typeof window !== 'undefined' ? window : this);
