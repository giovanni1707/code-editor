/**
 * 06_dh-matchers-handlers-shortcut.js
 * 
 * Conditions Extensions API - Global Shortcuts
 * Provides convenient global functions for registering custom matchers and handlers
 * 
 * @version 1.0.0
 * @requires Conditions.js v4.0.0+
 * @license MIT
 */

(function(global) {
  'use strict';

  // ============================================================================
  // VALIDATION & DEPENDENCIES
  // ============================================================================

  if (!global.Conditions) {
    console.error('[Conditions.Extensions] Requires Conditions.js to be loaded first');
    console.error('[Conditions.Extensions] Please load 01_dh-conditional-rendering.js before this file');
    return;
  }

  const Conditions = global.Conditions;

  // Verify required methods exist
  if (!Conditions.registerMatcher || !Conditions.registerHandler) {
    console.error('[Conditions.Extensions] Conditions.js version is too old');
    console.error('[Conditions.Extensions] Required: v4.0.0+ with registerMatcher() and registerHandler()');
    return;
  }

  // ============================================================================
  // GLOBAL SHORTCUT FUNCTIONS
  // ============================================================================

  /**
   * Register a custom condition matcher
   * 
   * @param {string} name - Unique name for the matcher
   * @param {Object} matcher - Matcher definition
   * @param {Function} matcher.test - (condition, value?) => boolean - Check if this matcher applies
   * @param {Function} matcher.match - (value, condition) => boolean - Check if value matches condition
   * @returns {Object} - Chainable API
   * 
   * @example
   * registerMatcher('weekday', {
   *   test: (condition) => condition === 'weekday',
   *   match: (value) => {
   *     const day = new Date(value).getDay();
   *     return day >= 1 && day <= 5;
   *   }
   * });
   */
  function registerMatcher(name, matcher) {
    // Validate matcher structure
    if (!matcher || typeof matcher !== 'object') {
      console.error(`[registerMatcher] Matcher must be an object, got ${typeof matcher}`);
      return API;
    }

    if (typeof matcher.test !== 'function') {
      console.error(`[registerMatcher] Matcher.test must be a function for "${name}"`);
      return API;
    }

    if (typeof matcher.match !== 'function') {
      console.error(`[registerMatcher] Matcher.match must be a function for "${name}"`);
      return API;
    }

    // Register with Conditions
    try {
      Conditions.registerMatcher(name, matcher);
      console.log(`[registerMatcher] ✓ Registered: ${name}`);
    } catch (e) {
      console.error(`[registerMatcher] Failed to register "${name}":`, e);
    }

    return API;
  }

  /**
   * Register a custom property handler
   * 
   * @param {string} name - Unique name for the handler
   * @param {Object} handler - Handler definition
   * @param {Function} handler.test - (key, val, element?) => boolean - Check if this handler applies
   * @param {Function} handler.apply - (element, val, key) => void - Apply the property to element
   * @returns {Object} - Chainable API
   * 
   * @example
   * registerHandler('animate', {
   *   test: (key, val) => key === 'animate' && typeof val === 'object',
   *   apply: (element, val) => {
   *     MyAnimationLib.animate(element, val.type, val.duration);
   *   }
   * });
   */
  function registerHandler(name, handler) {
    // Validate handler structure
    if (!handler || typeof handler !== 'object') {
      console.error(`[registerHandler] Handler must be an object, got ${typeof handler}`);
      return API;
    }

    if (typeof handler.test !== 'function') {
      console.error(`[registerHandler] Handler.test must be a function for "${name}"`);
      return API;
    }

    if (typeof handler.apply !== 'function') {
      console.error(`[registerHandler] Handler.apply must be a function for "${name}"`);
      return API;
    }

    // Register with Conditions
    try {
      Conditions.registerHandler(name, handler);
      console.log(`[registerHandler] ✓ Registered: ${name}`);
    } catch (e) {
      console.error(`[registerHandler] Failed to register "${name}":`, e);
    }

    return API;
  }

  /**
   * Get list of all registered matchers
   * 
   * @returns {string[]} - Array of matcher names
   * 
   * @example
   * getMatchers() // ['booleanTrue', 'truthy', 'regex', 'weekday', ...]
   */
  function getMatchers() {
    if (typeof Conditions.getMatchers === 'function') {
      return Conditions.getMatchers();
    }
    console.warn('[getMatchers] Not available in this version of Conditions.js');
    return [];
  }

  /**
   * Get list of all registered handlers
   * 
   * @returns {string[]} - Array of handler names
   * 
   * @example
   * getHandlers() // ['style', 'classList', 'setAttribute', 'animate', ...]
   */
  function getHandlers() {
    if (typeof Conditions.getHandlers === 'function') {
      return Conditions.getHandlers();
    }
    console.warn('[getHandlers] Not available in this version of Conditions.js');
    return [];
  }

  /**
   * Check if a matcher is already registered
   * 
   * @param {string} name - Matcher name to check
   * @returns {boolean}
   * 
   * @example
   * hasMatcher('weekday') // true/false
   */
  function hasMatcher(name) {
    return getMatchers().includes(name);
  }

  /**
   * Check if a handler is already registered
   * 
   * @param {string} name - Handler name to check
   * @returns {boolean}
   * 
   * @example
   * hasHandler('animate') // true/false
   */
  function hasHandler(name) {
    return getHandlers().includes(name);
  }

  /**
   * Batch register multiple matchers at once
   * 
   * @param {Object} matchers - Map of name => matcher definitions
   * @returns {Object} - Chainable API
   * 
   * @example
   * registerMatchers({
   *   weekday: { test: ..., match: ... },
   *   weekend: { test: ..., match: ... }
   * });
   */
  function registerMatchers(matchers) {
    if (!matchers || typeof matchers !== 'object') {
      console.error('[registerMatchers] Argument must be an object');
      return API;
    }

    let registered = 0;
    let failed = 0;

    Object.entries(matchers).forEach(([name, matcher]) => {
      try {
        registerMatcher(name, matcher);
        registered++;
      } catch (e) {
        console.error(`[registerMatchers] Failed to register "${name}":`, e);
        failed++;
      }
    });

    console.log(`[registerMatchers] ✓ Registered ${registered} matchers${failed ? `, ${failed} failed` : ''}`);
    return API;
  }

  /**
   * Batch register multiple handlers at once
   * 
   * @param {Object} handlers - Map of name => handler definitions
   * @returns {Object} - Chainable API
   * 
   * @example
   * registerHandlers({
   *   animate: { test: ..., apply: ... },
   *   transition: { test: ..., apply: ... }
   * });
   */
  function registerHandlers(handlers) {
    if (!handlers || typeof handlers !== 'object') {
      console.error('[registerHandlers] Argument must be an object');
      return API;
    }

    let registered = 0;
    let failed = 0;

    Object.entries(handlers).forEach(([name, handler]) => {
      try {
        registerHandler(name, handler);
        registered++;
      } catch (e) {
        console.error(`[registerHandlers] Failed to register "${name}":`, e);
        failed++;
      }
    });

    console.log(`[registerHandlers] ✓ Registered ${registered} handlers${failed ? `, ${failed} failed` : ''}`);
    return API;
  }

  /**
   * Helper: Create a simple equality matcher quickly
   * 
   * @param {string} name - Matcher name
   * @param {string} keyword - Condition keyword to match
   * @param {Function} checkFn - (value) => boolean - Check function
   * @returns {Object} - Chainable API
   * 
   * @example
   * createSimpleMatcher('positive', 'positive', val => val > 0);
   */
  function createSimpleMatcher(name, keyword, checkFn) {
    return registerMatcher(name, {
      test: (condition) => condition === keyword,
      match: (value) => checkFn(value)
    });
  }

  /**
   * Helper: Create a simple property handler quickly
   * 
   * @param {string} name - Handler name
   * @param {string} propertyKey - Property name to handle
   * @param {Function} applyFn - (element, value) => void - Application function
   * @returns {Object} - Chainable API
   * 
   * @example
   * createSimpleHandler('fadeIn', 'fadeIn', (el, duration) => {
   *   el.style.transition = `opacity ${duration}ms`;
   *   el.style.opacity = 1;
   * });
   */
  function createSimpleHandler(name, propertyKey, applyFn) {
    return registerHandler(name, {
      test: (key) => key === propertyKey,
      apply: (element, val) => applyFn(element, val)
    });
  }

  /**
   * Print all registered extensions to console
   * Useful for debugging and documentation
   */
  function listExtensions() {
    const matchers = getMatchers();
    const handlers = getHandlers();

    console.group('[Conditions.Extensions] Registered Extensions');
    console.log(`📋 Matchers (${matchers.length}):`, matchers);
    console.log(`🔧 Handlers (${handlers.length}):`, handlers);
    console.groupEnd();

    return API;
  }

  // ============================================================================
  // CHAINABLE API OBJECT
  // ============================================================================

  const API = {
    registerMatcher,
    registerHandler,
    registerMatchers,
    registerHandlers,
    getMatchers,
    getHandlers,
    hasMatcher,
    hasHandler,
    createSimpleMatcher,
    createSimpleHandler,
    listExtensions,
    
    // Aliases for convenience
    addMatcher: registerMatcher,
    addHandler: registerHandler,
    listMatchers: getMatchers,
    listHandlers: getHandlers
  };

  // ============================================================================
  // EXPORT TO GLOBAL SCOPE
  // ============================================================================

  // Export individual functions globally
  global.registerMatcher = registerMatcher;
  global.registerHandler = registerHandler;
  global.registerMatchers = registerMatchers;
  global.registerHandlers = registerHandlers;
  global.getMatchers = getMatchers;
  global.getHandlers = getHandlers;
  global.hasMatcher = hasMatcher;
  global.hasHandler = hasHandler;
  global.createSimpleMatcher = createSimpleMatcher;
  global.createSimpleHandler = createSimpleHandler;
  global.listExtensions = listExtensions;

  // Also export as namespaced object
  global.ConditionsExtensions = API;

  // Add to Conditions namespace as well
  Conditions.extensions = Conditions.extensions || {};
  Object.assign(Conditions.extensions, API);

  // ============================================================================
  // INTEGRATION WITH DOM HELPERS
  // ============================================================================

  // Add shortcuts to Elements if available
  if (global.Elements) {
    global.Elements.registerMatcher = registerMatcher;
    global.Elements.registerHandler = registerHandler;
    global.Elements.getMatchers = getMatchers;
    global.Elements.getHandlers = getHandlers;
  }

  // Add shortcuts to Collections if available
  if (global.Collections) {
    global.Collections.registerMatcher = registerMatcher;
    global.Collections.registerHandler = registerHandler;
  }

  // ============================================================================
  // VERSION INFO & SUCCESS MESSAGE
  // ============================================================================

  console.log('[Conditions.Extensions] v1.0.0 loaded successfully');
  console.log('[Conditions.Extensions] ✓ Global shortcuts active');
  console.log('[Conditions.Extensions] ✓ Available functions:');
  console.log('  - registerMatcher(name, { test, match })');
  console.log('  - registerHandler(name, { test, apply })');
  console.log('  - registerMatchers({ name: {...}, ... })');
  console.log('  - registerHandlers({ name: {...}, ... })');
  console.log('  - getMatchers() / getHandlers()');
  console.log('  - hasMatcher(name) / hasHandler(name)');
  console.log('  - createSimpleMatcher(name, keyword, checkFn)');
  console.log('  - createSimpleHandler(name, key, applyFn)');
  console.log('  - listExtensions()');
  console.log('[Conditions.Extensions] 📚 Use listExtensions() to see all registered extensions');

})(typeof window !== 'undefined' ? window : global);