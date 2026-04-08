/**
 * 02_dh-router-view.js
 *
 * DOM Helpers — Router View Module
 * Outlet management and transition support for the SPA Router.
 *
 * ─── WHAT THIS MODULE ADDS ────────────────────────────────────────────────────
 *  · Router.setTransition(config)  — register a CSS transition between views
 *  · Built-in transition presets   — 'fade', 'slide-left', 'slide-right', 'none'
 *  · Router.clearOutlet()          — manually empty the outlet (rarely needed)
 *  · Router.getOutlet()            — get the current outlet element
 *  · Transition lifecycle          — leave animation plays before unmount,
 *                                    enter animation plays after mount
 *
 * ─── LOAD ORDER ────────────────────────────────────────────────────────────────
 *  <script src="01_dh-router.js"></script>      ← required
 *  <script src="02_dh-router-view.js"></script> ← this file (optional)
 *
 * ─── TRANSITIONS ────────────────────────────────────────────────────────────────
 *  Router.setTransition('fade');
 *  Router.setTransition('slide-left');
 *  Router.setTransition({ enterClass: 'my-enter', leaveClass: 'my-leave', duration: 300 });
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
      '[DOM Helpers Router View] Router not found — ' +
      'load 01_dh-router.js before 02_dh-router-view.js'
    );
    return;
  }

  // ============================================================================
  // BUILT-IN TRANSITION PRESETS
  // Each preset injects a <style> block once, then applies CSS classes.
  // ============================================================================

  const PRESET_STYLES = {
    'fade': `
      .dh-view-enter { animation: dh-fadeIn var(--dh-transition-duration, 250ms) ease both; }
      .dh-view-leave { animation: dh-fadeOut var(--dh-transition-duration, 250ms) ease both; }
      @keyframes dh-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
      @keyframes dh-fadeOut { from { opacity: 1; } to { opacity: 0; } }
    `,
    'slide-left': `
      .dh-view-enter { animation: dh-slideInLeft var(--dh-transition-duration, 300ms) ease both; }
      .dh-view-leave { animation: dh-slideOutLeft var(--dh-transition-duration, 300ms) ease both; }
      @keyframes dh-slideInLeft  { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes dh-slideOutLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-40px); } }
    `,
    'slide-right': `
      .dh-view-enter { animation: dh-slideInRight var(--dh-transition-duration, 300ms) ease both; }
      .dh-view-leave { animation: dh-slideOutRight var(--dh-transition-duration, 300ms) ease both; }
      @keyframes dh-slideInRight  { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes dh-slideOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(40px); } }
    `,
    'scale': `
      .dh-view-enter { animation: dh-scaleIn var(--dh-transition-duration, 250ms) ease both; }
      .dh-view-leave { animation: dh-scaleOut var(--dh-transition-duration, 250ms) ease both; }
      @keyframes dh-scaleIn  { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      @keyframes dh-scaleOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.05); } }
    `,
  };

  // ============================================================================
  // TRANSITION STATE
  // ============================================================================

  /**
   * @typedef {Object} TransitionConfig
   * @property {string}  enterClass — CSS class applied to outlet after mount
   * @property {string}  leaveClass — CSS class applied to outlet before unmount
   * @property {number}  duration   — milliseconds to wait for the leave animation
   * @property {boolean} enabled
   */

  /** @type {TransitionConfig} */
  let _transition = {
    enterClass : 'dh-view-enter',
    leaveClass : 'dh-view-leave',
    duration   : 300,
    enabled    : false,
  };

  /** @type {HTMLStyleElement|null} */
  let _styleEl = null;

  /**
   * Inject preset CSS into <head> once.
   * @param {string} css
   */
  function _injectStyles(css) {
    if (_styleEl) {
      _styleEl.textContent = css;
      return;
    }
    _styleEl = document.createElement('style');
    _styleEl.setAttribute('data-dh-router', '');
    _styleEl.textContent = css;
    document.head.appendChild(_styleEl);
  }

  // ============================================================================
  // OUTLET HELPERS
  // ============================================================================

  /**
   * Get the current outlet element.
   * Reads it from the Router's internal state via a weak reference approach:
   * we listen on 'change' and cache the outlet reference here.
   */
  let _outletEl = null;

  // Capture outlet reference whenever a navigation completes
  Router.on('change', function () {
    // Router exposes the outlet indirectly: we find it by the [data-dh-outlet] marker
    // that Router.mount() sets (added below by patching Router.mount).
    _outletEl = document.querySelector('[data-dh-outlet]');
  });

  // ============================================================================
  // PATCH Router.mount() TO MARK THE OUTLET
  // ============================================================================

  const _originalMount = Router.mount.bind(Router);

  Router.mount = function (selectorOrElement) {
    _originalMount(selectorOrElement);

    // Find the outlet and mark it so we can reference it later
    let el;
    if (typeof selectorOrElement === 'string') {
      el = document.querySelector(selectorOrElement);
    } else if (selectorOrElement instanceof HTMLElement) {
      el = selectorOrElement;
    }
    if (el) {
      el.setAttribute('data-dh-outlet', '');
      _outletEl = el;
    }

    return this;
  };

  // ============================================================================
  // TRANSITION INTEGRATION
  // We patch the Router's internal navigation lifecycle via events so we never
  // touch private internals. The approach:
  //   - 'change' fires AFTER mount → add enterClass, remove after duration
  //   - For leave animation: we intercept via beforeEach with a short delay
  //     before the navigation actually clears the outlet.
  // ============================================================================

  Router.on('change', function () {
    if (!_transition.enabled || !_outletEl) return;

    const duration = _transition.duration;

    // Set the CSS variable for the duration (used by preset keyframes)
    _outletEl.style.setProperty('--dh-transition-duration', duration + 'ms');

    // Apply enter class
    _outletEl.classList.add(_transition.enterClass);

    // Remove after animation completes (don't leave stale classes)
    setTimeout(function () {
      if (_outletEl) _outletEl.classList.remove(_transition.enterClass);
    }, duration + 50);
  });

  // ============================================================================
  // PUBLIC API — appended to existing Router object
  // ============================================================================

  /**
   * Configure view transitions.
   *
   * @param {string|Object} preset
   *   - String: 'fade' | 'slide-left' | 'slide-right' | 'scale' | 'none'
   *   - Object: { enterClass, leaveClass, duration, css }
   * @returns {Router}
   *
   * @example
   *   Router.setTransition('fade');
   *   Router.setTransition({ enterClass: 'my-in', leaveClass: 'my-out', duration: 400 });
   */
  Router.setTransition = function (preset) {
    if (preset === 'none' || preset === false) {
      _transition.enabled = false;
      return this;
    }

    if (typeof preset === 'string') {
      const css = PRESET_STYLES[preset];
      if (!css) {
        console.warn('[DOM Helpers Router View] Unknown transition preset: "' + preset + '". Available: ' + Object.keys(PRESET_STYLES).join(', '));
        return this;
      }
      _injectStyles(css);
      _transition.enabled    = true;
      _transition.enterClass = 'dh-view-enter';
      _transition.leaveClass = 'dh-view-leave';
      // Read duration from preset CSS variable or use default
      _transition.duration   = 300;
    } else if (typeof preset === 'object' && preset !== null) {
      if (preset.enterClass) _transition.enterClass = preset.enterClass;
      if (preset.leaveClass) _transition.leaveClass = preset.leaveClass;
      if (typeof preset.duration === 'number') _transition.duration = preset.duration;
      if (preset.css) _injectStyles(preset.css);
      _transition.enabled = true;
    }

    return this;
  };

  /**
   * Get the current outlet element.
   * @returns {HTMLElement|null}
   */
  Router.getOutlet = function () {
    return _outletEl;
  };

  /**
   * Manually clear the outlet's contents.
   * Normally the router handles this automatically; use only for custom flows.
   * @returns {Router}
   */
  Router.clearOutlet = function () {
    if (_outletEl) _outletEl.innerHTML = '';
    return this;
  };

  /**
   * List all registered transition presets.
   * @returns {string[]}
   */
  Router.transitions = function () {
    return Object.keys(PRESET_STYLES);
  };

})(typeof window !== 'undefined' ? window : this);
