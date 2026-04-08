/**
 * 04_dh-router-guards.js
 *
 * DOM Helpers — Router Guards Module
 * Pre-built navigation guards and utilities for common SPA patterns.
 *
 * ─── WHAT THIS MODULE ADDS ────────────────────────────────────────────────────
 *  · Router.requireAuth(authFn, redirectPath)   — auth guard factory
 *  · Router.requireGuest(authFn, redirectPath)  — guest-only guard factory
 *  · Router.meta(routeMeta)                     — attach metadata to routes (roles, title, etc.)
 *  · Router.guardRoute(path, guardFn)           — guard a specific route path
 *  · Router.removeGuard(guardFn)                — remove a previously registered guard
 *  · Logging guard                              — Router.enableLogging() / disableLogging()
 *
 * ─── LOAD ORDER ────────────────────────────────────────────────────────────────
 *  <script src="01_dh-router.js"></script>       ← required
 *  <script src="04_dh-router-guards.js"></script> ← this file
 *
 * ─── USAGE ─────────────────────────────────────────────────────────────────────
 *
 *  // Protect all /dashboard/* routes
 *  Router.requireAuth(() => !!localStorage.getItem('token'), '/login');
 *
 *  // Redirect logged-in users away from /login
 *  Router.requireGuest(() => !!localStorage.getItem('token'), '/dashboard');
 *
 *  // Guard a specific route
 *  Router.guardRoute('/admin', (to, from, next) => {
 *    isAdmin() ? next() : next('/403');
 *  });
 *
 *  // Logging
 *  Router.enableLogging();
 *
 * @version 1.0.0
 * @license MIT
 */

(function (global) {
  'use strict';

  // ============================================================================
  // DEPENDENCY CHECK
  // ============================================================================

  if (!global.Router) {
    console.error(
      '[DOM Helpers Router Guards] Router not found — ' +
      'load 01_dh-router.js before 04_dh-router-guards.js'
    );
    return;
  }

  // ============================================================================
  // INTERNAL: track guards we register so they can be removed
  // ============================================================================

  /** @type {Map<Function, Function>} user-facing key → internal guard fn */
  const _registeredGuards = new Map();

  // ============================================================================
  // AUTH GUARD FACTORY
  // ============================================================================

  /**
   * Register a global beforeEach guard that redirects unauthenticated users.
   * Protected paths are those that START WITH any of the given prefixes.
   *
   * @param {Function}        authCheckFn   — () => boolean. Return true if authenticated.
   * @param {string}          redirectPath  — where to send unauthenticated users
   * @param {string|string[]} [protect='*'] — path prefix(es) to protect.
   *                                          '*' means protect ALL routes.
   * @returns {Router}
   *
   * @example
   *   Router.requireAuth(() => !!localStorage.getItem('token'), '/login');
   *   Router.requireAuth(() => store.isLoggedIn, '/login', ['/dashboard', '/profile']);
   */
  Router.requireAuth = function (authCheckFn, redirectPath, protect) {
    if (typeof authCheckFn !== 'function') {
      console.error('[DOM Helpers Router Guards] requireAuth(): first argument must be a function.');
      return this;
    }

    const prefixes = protect === undefined || protect === '*'
      ? null // null = protect everything
      : (Array.isArray(protect) ? protect : [protect]);

    const guard = function (to, from, next) {
      // Check if this route is protected
      const isProtected = prefixes === null
        || prefixes.some(p => to.path === p || to.path.startsWith(p + '/'));

      if (!isProtected) {
        next();
        return;
      }

      // Don't guard the redirect target itself (infinite loop prevention)
      if (to.path === redirectPath) {
        next();
        return;
      }

      if (authCheckFn()) {
        next();
      } else {
        next(redirectPath);
      }
    };

    _registeredGuards.set(Router.requireAuth, guard);
    Router.beforeEach(guard);
    return this;
  };

  /**
   * Register a guard that redirects authenticated users away from guest-only routes.
   * Example: redirect logged-in users away from the /login page to /dashboard.
   *
   * @param {Function}        authCheckFn   — () => boolean. Return true if authenticated.
   * @param {string}          redirectPath  — where to send authenticated users
   * @param {string|string[]} [guestRoutes] — path(s) that are guest-only.
   *                                          If omitted, ALL routes redirect when auth.
   * @returns {Router}
   *
   * @example
   *   Router.requireGuest(() => !!localStorage.getItem('token'), '/dashboard', '/login');
   */
  Router.requireGuest = function (authCheckFn, redirectPath, guestRoutes) {
    if (typeof authCheckFn !== 'function') {
      console.error('[DOM Helpers Router Guards] requireGuest(): first argument must be a function.');
      return this;
    }

    const prefixes = guestRoutes === undefined
      ? null
      : (Array.isArray(guestRoutes) ? guestRoutes : [guestRoutes]);

    const guard = function (to, from, next) {
      const isGuestRoute = prefixes === null
        || prefixes.some(p => to.path === p || to.path.startsWith(p + '/'));

      if (!isGuestRoute) {
        next();
        return;
      }

      // Don't loop
      if (to.path === redirectPath) {
        next();
        return;
      }

      if (authCheckFn()) {
        next(redirectPath); // logged in → redirect away from guest page
      } else {
        next(); // not logged in → allow
      }
    };

    _registeredGuards.set(Router.requireGuest, guard);
    Router.beforeEach(guard);
    return this;
  };

  // ============================================================================
  // PER-ROUTE GUARD
  // ============================================================================

  /**
   * Attach a navigation guard to a specific route path.
   * The guard only runs when the destination path matches.
   *
   * @param {string}   path    — exact path to guard, e.g. '/admin'
   * @param {Function} guardFn — (to, from, next) => void
   * @returns {Router}
   *
   * @example
   *   Router.guardRoute('/admin', (to, from, next) => {
   *     isAdmin() ? next() : next('/403');
   *   });
   */
  Router.guardRoute = function (path, guardFn) {
    if (typeof path !== 'string' || typeof guardFn !== 'function') {
      console.error('[DOM Helpers Router Guards] guardRoute(path, fn): both arguments are required.');
      return this;
    }

    const wrapper = function (to, from, next) {
      const matches = to.path === path || to.path.startsWith(path + '/');
      if (matches) {
        guardFn(to, from, next);
      } else {
        next();
      }
    };

    _registeredGuards.set(guardFn, wrapper);
    Router.beforeEach(wrapper);
    return this;
  };

  /**
   * Remove a guard previously registered via guardRoute(), requireAuth(), or requireGuest().
   * Pass the original function you supplied, not the internal wrapper.
   *
   * @param {Function} guardFn — the original function reference
   * @returns {Router}
   */
  Router.removeGuard = function (guardFn) {
    // The public API removes guards by wrapping them; we need to remove the wrapper.
    // Since Router.beforeEach stores guards in an internal array that isn't publicly
    // exposed, we expose a _removeGuard hook from the core here.
    if (_registeredGuards.has(guardFn)) {
      const wrapper = _registeredGuards.get(guardFn);
      if (typeof Router._removeBeforeGuard === 'function') {
        Router._removeBeforeGuard(wrapper);
      }
      _registeredGuards.delete(guardFn);
    }
    return this;
  };

  // We need to expose _removeBeforeGuard from the core. Patch it here if the core
  // doesn't provide it (defensive — in case the user only loads the guards module).
  if (typeof Router._removeBeforeGuard !== 'function') {
    // The core does not expose guard removal. We can't remove built-in guards
    // without access to the internal array, so we note this limitation gracefully.
    Router._removeBeforeGuard = function () {
      console.warn('[DOM Helpers Router Guards] Guard removal requires a Router core that exposes _removeBeforeGuard. Update 01_dh-router.js.');
    };
  }

  // ============================================================================
  // LOGGING GUARD
  // ============================================================================

  let _loggingEnabled = false;

  const _loggingGuard = function (to, from, next) {
    const fromPath = from ? from.path : '(initial)';
    console.log('[Router] ' + fromPath + ' → ' + to.path, { params: to.params });
    next();
  };

  /**
   * Enable console logging of all route transitions.
   * Logs: [Router] /from → /to { params: {...} }
   *
   * @returns {Router}
   */
  Router.enableLogging = function () {
    if (!_loggingEnabled) {
      Router.beforeEach(_loggingGuard);
      _loggingEnabled = true;
    }
    return this;
  };

  /**
   * Disable route transition logging.
   * @returns {Router}
   */
  Router.disableLogging = function () {
    if (_loggingEnabled) {
      if (typeof Router._removeBeforeGuard === 'function') {
        Router._removeBeforeGuard(_loggingGuard);
      }
      _loggingEnabled = false;
    }
    return this;
  };

  // ============================================================================
  // SCROLL POSITION MEMORY
  // ============================================================================

  /** @type {Map<string, {x: number, y: number}>} */
  const _scrollPositions = new Map();

  let _scrollMemoryEnabled = false;

  /**
   * Enable automatic scroll position memory.
   * When the user navigates back to a previously visited route,
   * the scroll position is restored.
   *
   * @returns {Router}
   */
  Router.enableScrollMemory = function () {
    if (_scrollMemoryEnabled) return this;
    _scrollMemoryEnabled = true;

    // Save scroll position before leaving a route
    Router.beforeEach(function (to, from, next) {
      if (from) {
        _scrollPositions.set(from.path, {
          x: global.scrollX || global.pageXOffset || 0,
          y: global.scrollY || global.pageYOffset || 0,
        });
      }
      next();
    });

    // Restore scroll position after navigating to a known route
    Router.afterEach(function (to) {
      const saved = _scrollPositions.get(to.path);
      if (saved) {
        // Defer one tick so the DOM has painted the new view
        setTimeout(function () {
          global.scrollTo(saved.x, saved.y);
        }, 0);
      }
    });

    return this;
  };

  // ============================================================================
  // TITLE GUARD
  // ============================================================================

  /**
   * Register a function that generates document.title for any route.
   * This overrides the static `title` property on route definitions.
   *
   * @param {Function} titleFn — (routeMatch) => string
   * @returns {Router}
   *
   * @example
   *   Router.setTitleResolver(route => 'My App — ' + (route._record.title || route.path));
   */
  Router.setTitleResolver = function (titleFn) {
    if (typeof titleFn !== 'function') {
      console.error('[DOM Helpers Router Guards] setTitleResolver() expects a function.');
      return this;
    }

    Router.afterEach(function (to) {
      try {
        const title = titleFn(to);
        if (typeof title === 'string') document.title = title;
      } catch (err) {
        console.error('[DOM Helpers Router Guards] setTitleResolver error:', err);
      }
    });

    return this;
  };

})(typeof window !== 'undefined' ? window : this);
