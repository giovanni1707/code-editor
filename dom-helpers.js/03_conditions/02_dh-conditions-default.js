/**
 * 02_dh-conditions-default
 * 
 * Conditions Default Branch Extension
 * @version 1.0.0
 * @description Adds explicit default branch support to Conditions.whenState()
 * @requires Conditions.js v4.0.0+
 * @license MIT
 */

(function(global) {
  'use strict';

  // ============================================================================
  // VALIDATION & DEPENDENCIES
  // ============================================================================

  if (!global.Conditions) {
    console.error('[Conditions.Default] Requires Conditions.js to be loaded first');
    return;
  }

  const Conditions = global.Conditions;

  // ============================================================================
  // STORE ORIGINAL METHODS (DO NOT MODIFY)
  // ============================================================================

  const _originalWhenState = Conditions.whenState;
  const _originalApply = Conditions.apply;
  const _originalWatch = Conditions.watch;

  // ============================================================================
  // HELPER: PROCESS CONDITIONS WITH DEFAULT
  // ============================================================================

  /**
   * Wraps conditions object to handle default branch
   * Returns a function that processes conditions and applies default if no match
   */
  function wrapConditionsWithDefault(conditions) {
    const conditionsObj = typeof conditions === 'function' ? conditions() : conditions;
    
    // Check if default exists
    if (!('default' in conditionsObj)) {
      // No default - return original conditions unchanged
      return conditions;
    }

    // Extract default and create new conditions object
    const { default: defaultConfig, ...regularConditions } = conditionsObj;
    
    // Create a wrapped conditions function that adds a catch-all matcher
    return function() {
      const currentConditions = typeof conditions === 'function' ? conditions() : conditions;
      const { default: currentDefault, ...currentRegular } = currentConditions;
      
      // Add a universal catch-all pattern at the end
      // This will match anything if no other condition matches first
      return {
        ...currentRegular,
        '/^[\\s\\S]*$/': currentDefault  // Regex that matches any string
      };
    };
  }

  // ============================================================================
  // NON-INVASIVE WRAPPER METHODS
  // ============================================================================

  /**
   * Enhanced whenState - wraps original without modifying it
   */
  Conditions.whenState = function(valueFn, conditions, selector, options = {}) {
    const wrappedConditions = wrapConditionsWithDefault(conditions);
    return _originalWhenState.call(this, valueFn, wrappedConditions, selector, options);
  };

  /**
   * Enhanced apply - wraps original without modifying it
   */
  Conditions.apply = function(value, conditions, selector) {
    const wrappedConditions = wrapConditionsWithDefault(conditions);
    return _originalApply.call(this, value, wrappedConditions, selector);
  };

  /**
   * Enhanced watch - wraps original without modifying it
   */
  Conditions.watch = function(valueFn, conditions, selector) {
    const wrappedConditions = wrapConditionsWithDefault(conditions);
    return _originalWatch.call(this, valueFn, wrappedConditions, selector);
  };

  // ============================================================================
  // PRESERVE ALL ORIGINAL METHODS
  // ============================================================================

  // Ensure all other methods remain untouched
  Conditions.batch = Conditions.batch;
  Conditions.registerMatcher = Conditions.registerMatcher;
  Conditions.registerHandler = Conditions.registerHandler;
  Conditions.getMatchers = Conditions.getMatchers;
  Conditions.getHandlers = Conditions.getHandlers;

  // ============================================================================
  // UPDATE DOM HELPERS INTEGRATION
  // ============================================================================

  if (global.Elements) {
    global.Elements.whenState = Conditions.whenState;
    global.Elements.whenApply = Conditions.apply;
    global.Elements.whenWatch = Conditions.watch;
  }
  
  if (global.Collections) {
    global.Collections.whenState = Conditions.whenState;
    global.Collections.whenApply = Conditions.apply;
    global.Collections.whenWatch = Conditions.watch;
  }
  
  if (global.Selector) {
    global.Selector.whenState = Conditions.whenState;
    global.Selector.whenApply = Conditions.apply;
    global.Selector.whenWatch = Conditions.watch;
  }

  // ============================================================================
  // RESTORATION METHOD (OPTIONAL - FOR DEBUGGING)
  // ============================================================================

  /**
   * Restore original methods if needed (for debugging)
   */
  Conditions.restoreOriginal = function() {
    Conditions.whenState = _originalWhenState;
    Conditions.apply = _originalApply;
    Conditions.watch = _originalWatch;
    console.log('[Conditions.Default] Original methods restored');
  };

  // ============================================================================
  // VERSION INFO
  // ============================================================================

  Conditions.extensions = Conditions.extensions || {};
  Conditions.extensions.defaultBranch = '1.0.0';

  console.log('[Conditions.Default] v1.0.0 loaded');
  console.log('[Conditions.Default] ✓ Non-invasive wrapper active');
  console.log('[Conditions.Default] ✓ Original functionality preserved');
  console.log('[Conditions.Default] ✓ Use Conditions.restoreOriginal() to revert if needed');

})(typeof window !== 'undefined' ? window : global);