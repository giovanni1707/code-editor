/**
 * dh-async
 *
 * DOM Helpers - Async Utilities Module
 * High-performance vanilla JavaScript async utilities with seamless DOM integration.
 *
 * ─── WHAT THIS MODULE PROVIDES ────────────────────────────────────────────────
 *  · debounce      — delay execution until calls stop, with maxWait, cancel, flush
 *  · throttle      — rate-limit execution, with leading/trailing control
 *  · sanitize      — XSS-safe HTML/string sanitization
 *  · sleep         — Promise-based delay
 *  · enhancedFetch — fetch with timeout, retry, responseType, and lifecycle hooks
 *  · fetchJSON     — shorthand for JSON responses
 *  · fetchText     — shorthand for text responses
 *  · fetchBlob     — shorthand for binary/blob responses
 *  · asyncHandler  — wrap any async event listener with automatic loading states
 *  · parallelAll   — concurrent requests with optional per-result progress tracking
 *  · raceWithTimeout — Promise.race with a built-in deadline
 *
 * ─── WHAT THIS MODULE DOES NOT DO ─────────────────────────────────────────────
 *  Form validation and form message display are intentionally excluded.
 *  Those responsibilities belong to:
 *    Form/01_dh-form.js         → form.validate(), form.values, form.submitData()
 *    Form/02_dh-form-enhance.js → feedback messages, button management
 *
 * ─── RECOMMENDED LOAD ORDER ────────────────────────────────────────────────────
 *  <script src="01_dh-core.js"></script>          ← required
 *  <script src="Async/dh-async.js"></script>      ← this file
 *
 *  If also using the Form module:
 *  <script src="Form/01_dh-form.js"></script>
 *  <script src="Form/02_dh-form-enhance.js"></script>
 *
 * ─── GLOBALS CREATED ───────────────────────────────────────────────────────────
 *  AsyncHelpers          — the full API namespace
 *  Elements.fetch        — if Elements is present
 *  Elements.debounce     — if Elements is present
 *  Collections.fetch     — if Collections is present
 *  (etc. — see integration section below)
 *
 *  No bare globals (debounce, throttle, sanitize) are written to window.
 *  Access everything via  AsyncHelpers.debounce()  etc.
 *
 * @version 1.1.0
 * @license MIT
 */

(function (global) {
  'use strict';

  // ============================================================================
  // DEPENDENCY CHECK
  // ============================================================================

  if (typeof global.EnhancedUpdateUtility === 'undefined') {
    console.warn(
      '[DOM Helpers Async] EnhancedUpdateUtility not found — ' +
      'load 01_dh-core.js before Async/dh-async.js'
    );
    return;
  }

  // ============================================================================
  // DEBOUNCE
  //
  // Delays execution of `func` until `delay` ms have passed since the last call.
  //
  // FIX: The original `maxWait` implementation reset `lastCallTime` to `now`
  // on every call and then immediately checked `now - lastCallTime >= maxWait`,
  // which is always 0 — so maxWait never fired. Fixed by tracking the start of
  // the current debounce window separately from the last-call time.
  // ============================================================================

  /**
   * Debounce a function.
   *
   * @param {Function} func          - Function to debounce
   * @param {number}   [delay=300]   - Quiet period in ms
   * @param {Object}   [options={}]
   * @param {boolean}  [options.immediate=false]  - Fire on the leading edge instead of trailing
   * @param {number}   [options.maxWait=null]     - Maximum ms to wait before forcing execution
   * @returns {Function} Debounced function with .cancel() and .flush()
   */
  function debounce(func, delay = 300, options = {}) {
    if (typeof func !== 'function') {
      throw new TypeError('[DOM Helpers Async] debounce: func must be a function');
    }

    const { immediate = false, maxWait = null } = options;

    let timeoutId    = null;
    let maxTimeoutId = null;
    let windowStart  = null; // start of the current debounce window — for maxWait tracking

    function _clear() {
      if (timeoutId)    { clearTimeout(timeoutId);    timeoutId    = null; }
      if (maxTimeoutId) { clearTimeout(maxTimeoutId); maxTimeoutId = null; }
    }

    function _execute(context, args) {
      windowStart = null;
      _clear();
      return func.apply(context, args);
    }

    const debounced = function (...args) {
      const now      = Date.now();
      const callNow  = immediate && !timeoutId;

      // Track the start of this debounce window for maxWait calculations
      if (windowStart === null) windowStart = now;

      _clear();

      if (callNow) {
        return _execute(this, args);
      }

      // Normal trailing debounce timer
      timeoutId = setTimeout(() => _execute(this, args), delay);

      // maxWait: if the window has been open longer than maxWait, force execution
      if (maxWait !== null) {
        const elapsed   = now - windowStart;
        const remaining = maxWait - elapsed;

        if (remaining <= 0) {
          // Already exceeded maxWait on this call — execute immediately
          return _execute(this, args);
        }

        // Schedule a forced execution at the maxWait boundary
        maxTimeoutId = setTimeout(() => _execute(this, args), remaining);
      }
    };

    /** Cancel any pending invocation without executing. */
    debounced.cancel = function () {
      _clear();
      windowStart = null;
    };

    /**
     * Flush: execute immediately if there is a pending invocation, then cancel.
     * Returns the function's return value, or undefined if nothing was pending.
     */
    debounced.flush = function (...args) {
      if (timeoutId || maxTimeoutId) {
        const result = func.apply(this, args.length ? args : []);
        debounced.cancel();
        return result;
      }
    };

    return debounced;
  }

  // ============================================================================
  // THROTTLE
  //
  // Ensures `func` is called at most once per `delay` ms.
  // ============================================================================

  /**
   * Throttle a function.
   *
   * @param {Function} func           - Function to throttle
   * @param {number}   [delay=200]    - Minimum ms between executions
   * @param {Object}   [options={}]
   * @param {boolean}  [options.leading=true]   - Execute on the leading edge
   * @param {boolean}  [options.trailing=true]  - Execute on the trailing edge
   * @returns {Function} Throttled function with .cancel()
   */
  function throttle(func, delay = 200, options = {}) {
    if (typeof func !== 'function') {
      throw new TypeError('[DOM Helpers Async] throttle: func must be a function');
    }

    const { leading = true, trailing = true } = options;
    let lastCallTime = null;
    let timeoutId    = null;
    let result       = null;

    const throttled = function (...args) {
      const now = Date.now();

      if (!lastCallTime && !leading) lastCallTime = now;

      const remaining = delay - (now - (lastCallTime || 0));

      if (remaining <= 0 || remaining > delay) {
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        lastCallTime = now;
        result = func.apply(this, args);
      } else if (!timeoutId && trailing) {
        timeoutId = setTimeout(() => {
          lastCallTime = !leading ? null : Date.now();
          timeoutId    = null;
          result       = func.apply(this, args);
        }, remaining);
      }

      return result;
    };

    /** Cancel any pending trailing invocation. */
    throttled.cancel = function () {
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      lastCallTime = null;
      result       = null;
    };

    return throttled;
  }

  // ============================================================================
  // SANITIZE
  //
  // XSS-safe HTML string cleaning.
  // ============================================================================

  /**
   * Sanitize a string value to prevent XSS.
   *
   * @param {*}       input                       - Value to sanitize (non-strings returned as-is)
   * @param {Object}  [options={}]
   * @param {string[]}[options.allowedTags=[]]     - HTML tags to keep; all others are stripped
   * @param {boolean} [options.removeScripts=true] - Strip <script> tags and javascript: URLs
   * @param {boolean} [options.removeEvents=true]  - Strip inline event handlers (onclick etc.)
   * @param {boolean} [options.removeStyles=false] - Strip style attributes
   * @returns {string}
   */
  function sanitize(input, options = {}) {
    if (typeof input !== 'string') return input;

    const {
      allowedTags    = [],
      removeScripts  = true,
      removeEvents   = true,
      removeStyles   = false,
    } = options;

    let out = input;

    if (removeScripts) {
      out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      out = out.replace(/javascript:/gi, '');
    }

    if (removeEvents) {
      out = out.replace(/\s*on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    }

    if (removeStyles) {
      out = out.replace(/\s*style\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
    }

    if (allowedTags.length > 0) {
      // Strip all tags that are not in the allowed list
      const allowed = new RegExp(
        `<(?!/?(?:${allowedTags.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b)[^>]+>`,
        'gi'
      );
      out = out.replace(allowed, '');
    } else {
      // No allowed tags — encode all HTML special characters
      out = out
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    return out;
  }

  // ============================================================================
  // SLEEP
  // ============================================================================

  /**
   * Pause execution for `ms` milliseconds.
   * Must be used with `await` inside an `async` function.
   *
   * @param {number} ms
   * @returns {Promise<void>}
   *
   * @example
   * await sleep(1000); // pause for 1 second
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // ENHANCED FETCH
  //
  // FIX 1: Added `responseType` option ('json'|'text'|'blob'|'arrayBuffer'|'raw')
  //   to control how the response body is parsed. The original always called
  //   .json() and then fetchText/fetchBlob tried to call .text()/.blob() on the
  //   already-parsed object — which threw a TypeError every time.
  //
  // FIX 2: Retry delay now uses fixed `retryDelay` per attempt, matching the
  //   documented API. The original did `retryDelay * attempt` (exponential) but
  //   the parameter name implied a fixed delay. Exposed both as options.
  // ============================================================================

  /**
   * Enhanced fetch with timeout, retry, response type control, and lifecycle hooks.
   *
   * @param {string}   url
   * @param {Object}   [options={}]
   * @param {string}   [options.method='GET']
   * @param {Object}   [options.headers={}]
   * @param {*}        [options.body=null]            - Request body; objects are JSON-stringified
   * @param {number}   [options.timeout=10000]        - Request timeout in ms (0 = no timeout)
   * @param {number}   [options.retries=0]            - Number of retries after the first failure
   * @param {number}   [options.retryDelay=1000]      - Fixed ms to wait between retries
   * @param {boolean}  [options.exponentialBackoff=false] - Multiply retryDelay by attempt number
   * @param {'json'|'text'|'blob'|'arrayBuffer'|'raw'} [options.responseType='json']
   *   How to parse the response body:
   *     'json'        → response.json()   (default)
   *     'text'        → response.text()
   *     'blob'        → response.blob()
   *     'arrayBuffer' → response.arrayBuffer()
   *     'raw'         → the raw Response object (no body parsing)
   * @param {HTMLElement|Object} [options.loadingIndicator=null]
   *   Element (or any object with .style or .update()) to show/hide during the request
   * @param {Function} [options.onStart]    () => void
   * @param {Function} [options.onSuccess]  (data, response) => void
   * @param {Function} [options.onError]    (error) => void
   * @param {Function} [options.onFinally]  () => void
   * @param {AbortSignal} [options.signal=null]   External AbortSignal to link to this request
   *
   * @returns {Promise<*>} Parsed response data
   * @throws  The last error after all retries are exhausted
   */
  async function enhancedFetch(url, options = {}) {
    const {
      method             = 'GET',
      headers            = {},
      body               = null,
      timeout            = 10000,
      retries            = 0,
      retryDelay         = 1000,
      exponentialBackoff = false,
      responseType       = 'json',
      loadingIndicator   = null,
      onStart            = null,
      onSuccess          = null,
      onError            = null,
      onFinally          = null,
      signal             = null,
    } = options;

    // ── Helper: show/hide loading indicator ────────────────────────────────────
    function _indicator(display) {
      if (!loadingIndicator) return;
      try {
        if (typeof loadingIndicator.update === 'function') {
          loadingIndicator.update({ style: { display } });
        } else if (loadingIndicator.style) {
          loadingIndicator.style.display = display;
        }
      } catch (e) {
        console.warn('[DOM Helpers Async] loadingIndicator update failed:', e.message);
      }
    }

    // ── Helper: parse response body ─────────────────────────────────────────────
    async function _parse(response) {
      switch (responseType) {
        case 'text':        return response.text();
        case 'blob':        return response.blob();
        case 'arrayBuffer': return response.arrayBuffer();
        case 'raw':         return response;
        case 'json':
        default:            return response.json();
      }
    }

    // ── Setup ───────────────────────────────────────────────────────────────────
    _indicator('block');
    if (typeof onStart === 'function') {
      try { onStart(); } catch (e) { console.warn('[DOM Helpers Async] onStart error:', e.message); }
    }

    const fetchOpts = {
      method : method.toUpperCase(),
      headers: { 'Content-Type': 'application/json', ...headers },
    };

    if (body !== null) {
      fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // ── Retry loop ──────────────────────────────────────────────────────────────
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Build a combined AbortController for timeout + caller signal
        const controller = new AbortController();

        if (signal) {
          // If the caller's signal is already aborted, abort immediately
          if (signal.aborted) controller.abort();
          else signal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        let timeoutId = null;
        if (timeout > 0) {
          timeoutId = setTimeout(() => controller.abort(), timeout);
        }

        fetchOpts.signal = controller.signal;

        let response;
        try {
          response = await fetch(url, fetchOpts);
        } finally {
          if (timeoutId !== null) clearTimeout(timeoutId);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await _parse(response);

        // ── Success ───────────────────────────────────────────────────────────
        _indicator('none');

        if (typeof onSuccess === 'function') {
          try { onSuccess(data, response); } catch (e) { console.warn('[DOM Helpers Async] onSuccess error:', e.message); }
        }
        if (typeof onFinally === 'function') {
          try { onFinally(); } catch (e) { console.warn('[DOM Helpers Async] onFinally error:', e.message); }
        }

        return data;

      } catch (error) {
        lastError = error;

        // Don't retry AbortErrors (timeout / external cancellation)
        if (error.name === 'AbortError') break;

        if (attempt < retries) {
          const wait = exponentialBackoff
            ? retryDelay * (attempt + 1)
            : retryDelay;
          await sleep(wait);
        }
      }
    }

    // ── All attempts failed ────────────────────────────────────────────────────
    _indicator('none');

    if (typeof onError === 'function') {
      try { onError(lastError); } catch (e) { console.warn('[DOM Helpers Async] onError error:', e.message); }
    }
    if (typeof onFinally === 'function') {
      try { onFinally(); } catch (e) { console.warn('[DOM Helpers Async] onFinally error:', e.message); }
    }

    throw lastError;
  }

  // ============================================================================
  // RESPONSE-TYPE SHORTHANDS
  //
  // FIX: The original fetchText/fetchBlob called .text()/.blob() on the already-
  // parsed data object returned by enhancedFetch, which threw a TypeError.
  // Fixed by passing responseType through so enhancedFetch does the parsing.
  // ============================================================================

  /**
   * Fetch and return the response body as a parsed JSON object (default behaviour).
   * @param {string} url
   * @param {Object} [options={}] — same as enhancedFetch, responseType forced to 'json'
   */
  async function fetchJSON(url, options = {}) {
    return enhancedFetch(url, { ...options, responseType: 'json' });
  }

  /**
   * Fetch and return the response body as a plain text string.
   * @param {string} url
   * @param {Object} [options={}] — same as enhancedFetch, responseType forced to 'text'
   */
  async function fetchText(url, options = {}) {
    return enhancedFetch(url, { ...options, responseType: 'text' });
  }

  /**
   * Fetch and return the response body as a Blob (images, files, binary data).
   * @param {string} url
   * @param {Object} [options={}] — same as enhancedFetch, responseType forced to 'blob'
   */
  async function fetchBlob(url, options = {}) {
    return enhancedFetch(url, { ...options, responseType: 'blob' });
  }

  // ============================================================================
  // ASYNC HANDLER
  //
  // Wraps an async event listener so it automatically manages a loading CSS class
  // and a data attribute on the event target while the async work runs.
  // ============================================================================

  /**
   * Wrap an async event listener with automatic loading state management.
   *
   * @param {Function} handler                         - async (event, ...args) => any
   * @param {Object}   [options={}]
   * @param {string}   [options.loadingClass='loading']     - CSS class added while running
   * @param {string}   [options.loadingAttribute='data-loading'] - Attribute set while running
   * @param {Function} [options.errorHandler=null]          - (error, event) => void
   * @returns {Function} Wrapped event listener
   *
   * @example
   * button.addEventListener('click', asyncHandler(async (e) => {
   *   await saveData();
   * }));
   */
  function asyncHandler(handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new TypeError('[DOM Helpers Async] asyncHandler: handler must be a function');
    }

    const {
      loadingClass     = 'loading',
      loadingAttribute = 'data-loading',
      errorHandler     = null,
    } = options;

    return async function (event, ...args) {
      const el = event.currentTarget || event.target;

      // Add loading state
      try {
        if (el) {
          if (loadingClass)     el.classList.add(loadingClass);
          if (loadingAttribute) el.setAttribute(loadingAttribute, 'true');
        }
      } catch (e) {
        console.warn('[DOM Helpers Async] asyncHandler: could not set loading state:', e.message);
      }

      try {
        return await handler.call(this, event, ...args);
      } catch (error) {
        console.error('[DOM Helpers Async] asyncHandler error:', error);
        if (typeof errorHandler === 'function') {
          try { errorHandler(error, event, ...args); } catch (e) { /* swallow */ }
        }
        throw error;
      } finally {
        // Always remove loading state, even on error
        try {
          if (el) {
            if (loadingClass)     el.classList.remove(loadingClass);
            if (loadingAttribute) el.removeAttribute(loadingAttribute);
          }
        } catch (e) {
          console.warn('[DOM Helpers Async] asyncHandler: could not remove loading state:', e.message);
        }
      }
    };
  }

  // ============================================================================
  // PARALLEL ALL
  //
  // FIX: The original used a sequential `for...await` loop which ran promises
  // one at a time, defeating the "parallel" purpose. Fixed:
  //   failFast: true  → Promise.all()        (throws on first rejection)
  //   failFast: false → Promise.allSettled()  (collects all results, never throws)
  //
  // The `onProgress` callback still fires after each promise settles, so callers
  // get incremental updates even with the concurrent implementation.
  // ============================================================================

  /**
   * Run multiple promises concurrently with optional progress tracking.
   *
   * @param {Promise[]} promises
   * @param {Object}    [options={}]
   * @param {boolean}   [options.failFast=true]
   *   true  → reject immediately when any promise rejects (same as Promise.all)
   *   false → wait for all promises and collect every result (same as Promise.allSettled)
   * @param {Function}  [options.onProgress]
   *   Called each time a promise settles: (completedCount, total, result) => void
   *   `result` is `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`
   * @returns {Promise<Array>}
   *
   * @example
   * const results = await parallelAll([fetchA(), fetchB(), fetchC()], {
   *   failFast: false,
   *   onProgress(done, total, result) {
   *     console.log(`${done}/${total} done`);
   *   }
   * });
   */
  async function parallelAll(promises, options = {}) {
    if (!Array.isArray(promises)) {
      throw new TypeError('[DOM Helpers Async] parallelAll: promises must be an array');
    }

    const { failFast = true, onProgress = null } = options;

    if (!onProgress) {
      // No progress tracking needed — use native implementations directly
      return failFast ? Promise.all(promises) : Promise.allSettled(promises);
    }

    // Progress-tracking path: wrap each promise so we can report as each one settles
    let completed = 0;
    const total   = promises.length;

    const tracked = promises.map(p =>
      Promise.resolve(p)
        .then(value => {
          const result = { status: 'fulfilled', value };
          completed++;
          try { onProgress(completed, total, result); } catch (e) { /* swallow */ }
          return result;
        })
        .catch(reason => {
          const result = { status: 'rejected', reason };
          completed++;
          try { onProgress(completed, total, result); } catch (e) { /* swallow */ }

          if (failFast) throw reason; // re-throw so Promise.all propagates the rejection
          return result;             // swallow so Promise.all collects it
        })
    );

    // failFast: if any tracked promise re-throws, Promise.all rejects immediately
    // !failFast: all tracked promises swallow rejections, so Promise.all always resolves
    return Promise.all(tracked).then(results => {
      // When failFast is false, results are already { status, value/reason } objects
      // When failFast is true, results are the raw fulfilled values (rejections already threw)
      return failFast ? results.map(r => r.value) : results;
    });
  }

  // ============================================================================
  // RACE WITH TIMEOUT
  // ============================================================================

  /**
   * Race a set of promises against a timeout deadline.
   *
   * @param {Promise[]} promises
   * @param {number}    [timeout=5000] - ms before the race is rejected with a timeout error
   * @returns {Promise<*>} The value of the first promise to resolve
   * @throws  If the timeout fires before any promise resolves
   */
  function raceWithTimeout(promises, timeout = 5000) {
    if (!Array.isArray(promises)) {
      throw new TypeError('[DOM Helpers Async] raceWithTimeout: promises must be an array');
    }

    const deadline = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[DOM Helpers Async] raceWithTimeout: timed out after ${timeout}ms`)), timeout)
    );

    return Promise.race([...promises, deadline]);
  }

  // ============================================================================
  // DOM HELPERS INTEGRATION
  //
  // FIX: Removed the monkey-patching of Elements.helper._enhanceElementWithUpdate.
  // That is a private internal method with no stable API contract. Instead, we:
  //   1. Attach async utilities directly onto Elements, Collections, and Selector
  //      as namespace methods (the same pattern used by 08_dh-reactive-namespace-methods.js)
  //   2. Use Forms.helper.addEnhancer() (the public plugin hook) if the Form module
  //      is loaded, to add per-form async helpers on each form element.
  //
  // FIX: Removed the setTimeout(100) integration timing hack. All integration
  // runs synchronously at load time using explicit dependency checks, just like
  // every other module in the library.
  // ============================================================================

  function _integrate() {
    const asyncAPI = {
      debounce,
      throttle,
      sanitize,
      sleep,
      fetch          : enhancedFetch,
      fetchJSON,
      fetchText,
      fetchBlob,
      asyncHandler,
      parallelAll,
      raceWithTimeout,
    };

    // ── Elements ────────────────────────────────────────────────────────────────
    if (global.Elements) {
      Object.assign(global.Elements, asyncAPI);
    }

    // ── Collections ─────────────────────────────────────────────────────────────
    if (global.Collections) {
      Object.assign(global.Collections, asyncAPI);
    }

    // ── Selector ────────────────────────────────────────────────────────────────
    if (global.Selector) {
      Object.assign(global.Selector, asyncAPI);
    }

    // ── DOMHelpers namespace ─────────────────────────────────────────────────────
    if (global.DOMHelpers) {
      global.DOMHelpers.AsyncHelpers = AsyncHelpers;
    }

    // ── Form module integration (public hook, no monkey-patching) ────────────────
    // If 01_dh-form.js is loaded, register an enhancer that adds convenience
    // async methods to every form element accessed through Forms.
    if (global.Forms && typeof global.Forms.helper?.addEnhancer === 'function') {
      global.Forms.helper.addEnhancer(function _asyncFormEnhancer(form) {
        if (form._hasAsyncHelpers) return form;

        Object.defineProperty(form, '_hasAsyncHelpers', {
          value: true, writable: false, enumerable: false, configurable: false,
        });

        /**
         * Attach a debounced input handler to all matching fields inside this form.
         *
         * @param {string}   selector - CSS selector for the fields (e.g. '[name="search"]')
         * @param {Function} handler  - (event) => void
         * @param {number}   [delay=300]
         * @param {Object}   [options] - debounce options
         *
         * @example
         * Forms.searchForm.debounceInput('[name="q"]', (e) => search(e.target.value));
         */
        form.debounceInput = function (selector, handler, delay = 300, debounceOpts = {}) {
          const debounced = debounce(handler, delay, debounceOpts);
          const fields    = form.querySelectorAll(selector);
          fields.forEach(field => field.addEventListener('input', debounced));
          return { cancel: debounced.cancel, flush: debounced.flush };
        };

        /**
         * Attach a throttled input handler to all matching fields inside this form.
         *
         * @param {string}   selector
         * @param {Function} handler
         * @param {number}   [delay=200]
         * @param {Object}   [options] - throttle options
         */
        form.throttleInput = function (selector, handler, delay = 200, throttleOpts = {}) {
          const throttled = throttle(handler, delay, throttleOpts);
          const fields    = form.querySelectorAll(selector);
          fields.forEach(field => field.addEventListener('input', throttled));
          return { cancel: throttled.cancel };
        };

        /**
         * Sanitize the value of a single named field in-place.
         *
         * @param {string} fieldName  - The field's name attribute
         * @param {Object} [opts]     - sanitize() options
         */
        form.sanitizeField = function (fieldName, opts = {}) {
          const field = form.querySelector(`[name="${fieldName}"]`);
          if (field && typeof field.value === 'string') {
            field.value = sanitize(field.value, opts);
          }
          return form;
        };

        /**
         * Sanitize every text field in the form in-place.
         *
         * @param {Object} [opts] - sanitize() options
         */
        form.sanitizeAll = function (opts = {}) {
          form.querySelectorAll('input:not([type="file"]):not([type="password"]), textarea')
            .forEach(field => {
              if (typeof field.value === 'string') {
                field.value = sanitize(field.value, opts);
              }
            });
          return form;
        };

        return form;
      });
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const AsyncHelpers = {
    version: '1.1.0',

    // Core utilities
    debounce,
    throttle,
    sanitize,
    sleep,

    // Fetch utilities
    fetch          : enhancedFetch,
    fetchJSON,
    fetchText,
    fetchBlob,

    // Event utilities
    asyncHandler,

    // Concurrent utilities
    parallelAll,
    raceWithTimeout,

    /**
     * Configure default values used by utilities.
     * Returns AsyncHelpers for chaining.
     *
     * @param {Object} options
     * @param {number} [options.debounceDelay=300]
     * @param {number} [options.throttleDelay=200]
     * @param {number} [options.fetchTimeout=10000]
     * @param {number} [options.fetchRetries=0]
     */
    configure(options = {}) {
      AsyncHelpers.defaults = {
        debounceDelay: options.debounceDelay ?? 300,
        throttleDelay: options.throttleDelay ?? 200,
        fetchTimeout : options.fetchTimeout  ?? 10000,
        fetchRetries : options.fetchRetries  ?? 0,
      };
      return AsyncHelpers;
    },

    /** Returns true if at least one of Elements/Collections/Selector is available. */
    isDOMHelpersAvailable() {
      return !!(global.Elements || global.Collections || global.Selector);
    },
  };

  // Initialise defaults
  AsyncHelpers.configure({});

  // ============================================================================
  // EXPORT
  //
  // FIX: Bare globals (global.debounce, global.throttle, global.sanitize) have
  // been removed. They are very common function names and silently overwriting
  // anything already in scope is fragile and unexpected.
  // Everything is available via AsyncHelpers.debounce() etc.
  // ============================================================================

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AsyncHelpers;
  } else if (typeof define === 'function' && define.amd) {
    define([], () => AsyncHelpers);
  } else {
    global.AsyncHelpers = AsyncHelpers;
  }

  // Run integration synchronously — no setTimeout hacks
  _integrate();

  console.log('[DOM Helpers Async] v1.1.0 loaded');
  if (AsyncHelpers.isDOMHelpersAvailable()) {
    console.log('[DOM Helpers Async] ✓ Integrated with DOM Helpers ecosystem');
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);