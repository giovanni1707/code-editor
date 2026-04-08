/**
 * 05_dh-conditions-shortcuts.js
 * 
 * Global Shortcuts for Conditions
 * Provides direct global access to Conditions methods without namespace prefix
 * 
 * @version 1.0.0
 * @requires 01_dh-conditional-rendering.js (Conditions.js v4.0.0+)
 * @license MIT
 * 
 * Usage:
 *   whenState(state.count, conditions, '.counter')
 *   whenWatch(state.user, conditions, '#profile')
 *   whenApply('active', conditions, '.btn')
 * 
 * Fallback:
 *   If conflicts detected, access via: CondShortcuts.whenState()
 */

(function(global) {
  'use strict';

  // ============================================================================
  // DEPENDENCY VALIDATION
  // ============================================================================

  if (!global.Conditions) {
    console.error('[Conditions.Shortcuts] Requires Conditions.js to be loaded first');
    console.error('[Conditions.Shortcuts] Please load 01_dh-conditional-rendering.js before this file');
    return;
  }

  const Conditions = global.Conditions;

  // Validate required methods exist
  const requiredMethods = ['whenState', 'apply', 'watch'];
  const missingMethods = requiredMethods.filter(method => typeof Conditions[method] !== 'function');
  
  if (missingMethods.length > 0) {
    console.error('[Conditions.Shortcuts] Missing required Conditions methods:', missingMethods);
    return;
  }

  // ============================================================================
  // CONFLICT DETECTION
  // ============================================================================

  const shortcuts = ['whenState', 'whenWatch', 'whenApply'];
  const conflicts = shortcuts.filter(name => name in global);
  
  let useNamespace = false;
  
  if (conflicts.length > 0) {
    console.warn('[Conditions.Shortcuts] ⚠️  Naming conflicts detected:', conflicts);
    console.warn('[Conditions.Shortcuts] → Using fallback namespace: CondShortcuts');
    useNamespace = true;
  }

  // ============================================================================
  // PURE ALIAS DEFINITIONS
  // ============================================================================

  /**
   * Direct alias to Conditions.whenState()
   * Main method for conditional rendering with auto-reactive support
   * 
   * @param {Function|*} valueFn - State value or function returning value
   * @param {Object|Function} conditions - Condition mappings
   * @param {string|Element|NodeList} selector - Target elements
   * @param {Object} options - { reactive: boolean }
   * @returns {Object|void} Cleanup object or void
   */
  function whenState(valueFn, conditions, selector, options) {
    return Conditions.whenState(valueFn, conditions, selector, options);
  }

  /**
   * Direct alias to Conditions.watch()
   * Explicit reactive watching (requires reactive library)
   * 
   * @param {Function|*} valueFn - State value or function returning value
   * @param {Object|Function} conditions - Condition mappings
   * @param {string|Element|NodeList} selector - Target elements
   * @returns {Object|void} Cleanup object or void
   */
  function whenWatch(valueFn, conditions, selector) {
    return Conditions.watch(valueFn, conditions, selector);
  }

  /**
   * Direct alias to Conditions.apply()
   * One-time static application without reactivity
   * 
   * @param {*} value - Current value to match
   * @param {Object|Function} conditions - Condition mappings
   * @param {string|Element|NodeList} selector - Target elements
   * @returns {Object} Chainable Conditions object
   */
  function whenApply(value, conditions, selector) {
    return Conditions.apply(value, conditions, selector);
  }

  /**
   * Direct alias to Conditions.batch()
   * Batch multiple condition updates
   * 
   * @param {Function} fn - Function containing batch updates
   * @returns {*} Result of batch function
   */
  function whenBatch(fn) {
    return Conditions.batch(fn);
  }

  // ============================================================================
  // EXPORT STRATEGY
  // ============================================================================

  const shortcutsAPI = {
    whenState,
    whenWatch,
    whenApply,
    whenBatch
  };

  if (useNamespace) {
    // FALLBACK: Export to CondShortcuts namespace
    global.CondShortcuts = shortcutsAPI;
    
    // Also attach to Conditions for discoverability
    Conditions.shortcuts = shortcutsAPI;
    
    console.log('[Conditions.Shortcuts] v1.0.0 loaded (namespace mode)');
    console.log('[Conditions.Shortcuts] ✓ Available via: CondShortcuts.whenState()');
    console.log('[Conditions.Shortcuts] ✓ Available via: Conditions.shortcuts.whenState()');
    console.log('[Conditions.Shortcuts] ℹ️  Direct globals unavailable due to conflicts');
    
  } else {
    // PRIMARY: Export to global scope directly
    global.whenState = whenState;
    global.whenWatch = whenWatch;
    global.whenApply = whenApply;
    global.whenBatch = whenBatch;
    
    // Also keep reference in Conditions for programmatic access
    Conditions.shortcuts = shortcutsAPI;
    
    console.log('[Conditions.Shortcuts] v1.0.0 loaded');
    console.log('[Conditions.Shortcuts] ✓ whenState() - Auto-reactive conditional rendering');
    console.log('[Conditions.Shortcuts] ✓ whenWatch() - Explicit reactive watching');
    console.log('[Conditions.Shortcuts] ✓ whenApply() - One-time static application');
    console.log('[Conditions.Shortcuts] ✓ whenBatch() - Batch multiple updates');
    console.log('[Conditions.Shortcuts] ℹ️  Fallback: Conditions.shortcuts.whenState()');
  }

  // ============================================================================
  // METADATA & VERSION
  // ============================================================================

  Conditions.extensions = Conditions.extensions || {};
  Conditions.extensions.shortcuts = {
    version: '1.0.0',
    mode: useNamespace ? 'namespace' : 'global',
    conflicts: conflicts.length > 0 ? conflicts : null
  };

  // ============================================================================
  // HELPER: RESTORE FUNCTION (For debugging/cleanup)
  // ============================================================================

  /**
   * Remove shortcuts from global scope (cleanup utility)
   * Useful for testing or conflict resolution
   */
  Conditions.removeShortcuts = function() {
    if (!useNamespace) {
      delete global.whenState;
      delete global.whenWatch;
      delete global.whenApply;
      delete global.whenBatch;
      console.log('[Conditions.Shortcuts] Global shortcuts removed');
    } else {
      delete global.CondShortcuts;
      console.log('[Conditions.Shortcuts] CondShortcuts namespace removed');
    }
    delete Conditions.shortcuts;
    delete Conditions.extensions.shortcuts;
  };

  // ============================================================================
  // DEVELOPMENT HELPERS (Only in non-production)
  // ============================================================================

  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production') {
    /**
     * Print current shortcuts configuration
     */
    Conditions.printShortcuts = function() {
      console.group('[Conditions.Shortcuts] Configuration');
      console.log('Version:', Conditions.extensions.shortcuts.version);
      console.log('Mode:', Conditions.extensions.shortcuts.mode);
      console.log('Conflicts:', Conditions.extensions.shortcuts.conflicts || 'None');
      console.log('Available methods:', Object.keys(shortcutsAPI));
      console.log('Reactivity:', Conditions.hasReactivity ? 'Available' : 'Not available');
      console.groupEnd();
    };
  }

})(typeof window !== 'undefined' ? window : global);
