/**
 * 08_dh-reactive-namespace-methods.js
 * 
 * Adds namespace-level methods to ReactiveUtils for the 14 unique $ methods
 * Allows calling them as ReactiveUtils.method(state, ...) instead of state.$method(...)
 * 
 * @license MIT
 * @version 1.0.0
 */

(function(global) {
  'use strict';

  // ============================================================================
  // VERIFY DEPENDENCIES
  // ============================================================================
  
  if (!global.ReactiveUtils) {
    console.error('[Namespace Methods] ReactiveUtils not found. Load reactive modules first.');
    return;
  }

  const ReactiveUtils = global.ReactiveUtils;

  // ============================================================================
  // CORE STATE NAMESPACE METHODS
  // ============================================================================

  /**
   * Set state values with functional updates
   * @param {Object} state - The reactive state
   * @param {Object} updates - Object with values or functions
   * @returns {Object} The state
   * 
   * @example
   * ReactiveUtils.set(state, {
   *   count: prev => prev + 1,
   *   name: 'John'
   * });
   */
  ReactiveUtils.set = function(state, updates) {
    if (!state || !state.$set) {
      console.error('[Namespace Methods] Invalid state or $set not available');
      return state;
    }
    return state.$set(updates);
  };

  /**
   * Clean up all effects and watchers from a state
   * @param {Object} state - The reactive state
   * @returns {void}
   * 
   * @example
   * ReactiveUtils.cleanup(state);
   */
  ReactiveUtils.cleanup = function(state) {
    if (!state || !state.$cleanup) {
      console.error('[Namespace Methods] Invalid state or $cleanup not available');
      return;
    }
    state.$cleanup();
  };

  // ============================================================================
  // ASYNC STATE NAMESPACE METHODS
  // ============================================================================

  /**
   * Execute async operation on async state
   * @param {Object} asyncState - The reactive async state
   * @param {Function} fn - Async function that receives AbortSignal
   * @returns {Promise} Result object
   * 
   * @example
   * await ReactiveUtils.execute(asyncState, async (signal) => {
   *   const response = await fetch('/api/data', { signal });
   *   return response.json();
   * });
   */
  ReactiveUtils.execute = function(asyncState, fn) {
    if (!asyncState || !asyncState.$execute) {
      console.error('[Namespace Methods] Invalid asyncState or $execute not available');
      return Promise.reject(new Error('Invalid async state'));
    }
    return asyncState.$execute(fn);
  };

  /**
   * Abort current async operation
   * @param {Object} asyncState - The reactive async state
   * @returns {void}
   * 
   * @example
   * ReactiveUtils.abort(asyncState);
   */
  ReactiveUtils.abort = function(asyncState) {
    if (!asyncState || !asyncState.$abort) {
      console.error('[Namespace Methods] Invalid asyncState or $abort not available');
      return;
    }
    asyncState.$abort();
  };

  /**
   * Reset async state to initial values
   * @param {Object} asyncState - The reactive async state
   * @returns {void}
   * 
   * @example
   * ReactiveUtils.reset(asyncState);
   */
  ReactiveUtils.reset = function(asyncState) {
    if (!asyncState || !asyncState.$reset) {
      console.error('[Namespace Methods] Invalid asyncState or $reset not available');
      return;
    }
    asyncState.$reset();
  };

  /**
   * Refetch with last async function
   * @param {Object} asyncState - The reactive async state
   * @returns {Promise|undefined} Result object or undefined
   * 
   * @example
   * await ReactiveUtils.refetch(asyncState);
   */
  ReactiveUtils.refetch = function(asyncState) {
    if (!asyncState || !asyncState.$refetch) {
      console.error('[Namespace Methods] Invalid asyncState or $refetch not available');
      return;
    }
    return asyncState.$refetch();
  };

  // ============================================================================
  // COMPONENT NAMESPACE METHODS
  // ============================================================================

  /**
   * Destroy component and clean up all resources
   * @param {Object} component - The reactive component
   * @returns {void}
   * 
   * @example
   * ReactiveUtils.destroy(component);
   */
  ReactiveUtils.destroy = function(component) {
    if (!component || !component.$destroy) {
      console.error('[Namespace Methods] Invalid component or $destroy not available');
      return;
    }
    component.$destroy();
  };

  // ============================================================================
  // STORAGE NAMESPACE METHODS
  // ============================================================================

  /**
   * Force save state to storage immediately
   * @param {Object} state - The storage-enabled reactive state
   * @returns {boolean} Success status
   * 
   * @example
   * ReactiveUtils.save(state);
   */
  ReactiveUtils.save = function(state) {
    if (!state || !state.$save) {
      console.error('[Namespace Methods] Invalid state or $save not available');
      return false;
    }
    return state.$save();
  };

  /**
   * Load state from storage
   * @param {Object} state - The storage-enabled reactive state
   * @returns {boolean} Success status
   * 
   * @example
   * ReactiveUtils.load(state);
   */
  ReactiveUtils.load = function(state) {
    if (!state || !state.$load) {
      console.error('[Namespace Methods] Invalid state or $load not available');
      return false;
    }
    return state.$load();
  };

  /**
   * Clear state from storage
   * @param {Object} state - The storage-enabled reactive state
   * @returns {boolean} Success status
   * 
   * @example
   * ReactiveUtils.clear(state);
   */
  ReactiveUtils.clear = function(state) {
    if (!state || !state.$clear) {
      console.error('[Namespace Methods] Invalid state or $clear not available');
      return false;
    }
    return state.$clear();
  };

  /**
   * Check if state exists in storage
   * @param {Object} state - The storage-enabled reactive state
   * @returns {boolean} Existence status
   * 
   * @example
   * if (ReactiveUtils.exists(state)) { ... }
   */
  ReactiveUtils.exists = function(state) {
    if (!state || !state.$exists) {
      console.error('[Namespace Methods] Invalid state or $exists not available');
      return false;
    }
    return state.$exists();
  };

  /**
   * Stop automatic saving for state
   * @param {Object} state - The storage-enabled reactive state
   * @returns {Object} The state
   * 
   * @example
   * ReactiveUtils.stopAutoSave(state);
   */
  ReactiveUtils.stopAutoSave = function(state) {
    if (!state || !state.$stopAutoSave) {
      console.error('[Namespace Methods] Invalid state or $stopAutoSave not available');
      return state;
    }
    return state.$stopAutoSave();
  };

  /**
   * Start automatic saving for state
   * @param {Object} state - The storage-enabled reactive state
   * @returns {Object} The state
   * 
   * @example
   * ReactiveUtils.startAutoSave(state);
   */
  ReactiveUtils.startAutoSave = function(state) {
    if (!state || !state.$startAutoSave) {
      console.error('[Namespace Methods] Invalid state or $startAutoSave not available');
      return state;
    }
    return state.$startAutoSave();
  };

  /**
   * Get storage information for state
   * @param {Object} state - The storage-enabled reactive state
   * @returns {Object} Storage info object
   * 
   * @example
   * const info = ReactiveUtils.storageInfo(state);
   * console.log(info.sizeKB);
   */
  ReactiveUtils.storageInfo = function(state) {
    if (!state || !state.$storageInfo) {
      console.error('[Namespace Methods] Invalid state or $storageInfo not available');
      return {
        key: '',
        namespace: '',
        storage: 'localStorage',
        exists: false,
        size: 0,
        error: 'Method not available'
      };
    }
    return state.$storageInfo();
  };

  // ============================================================================
  // UTILITY: Get raw object
  // ============================================================================

  /**
   * Get raw (non-reactive) object from state
   * Note: This is an alias for toRaw() to match the pattern
   * @param {Object} state - The reactive state
   * @returns {Object} Raw object
   * 
   * @example
   * const raw = ReactiveUtils.getRaw(state);
   */
  ReactiveUtils.getRaw = function(state) {
    if (!state) return state;
    
    // Try $raw property first
    if (state.$raw) {
      return state.$raw;
    }
    
    // Fall back to toRaw function
    if (ReactiveUtils.toRaw) {
      return ReactiveUtils.toRaw(state);
    }
    
    return state;
  };

  // ============================================================================
  // INTEGRATION WITH ELEMENTS, COLLECTIONS, SELECTOR NAMESPACES
  // ============================================================================

  // Add to Elements if available
  if (global.Elements) {
    global.Elements.set = ReactiveUtils.set;
    global.Elements.cleanup = ReactiveUtils.cleanup;
    global.Elements.execute = ReactiveUtils.execute;
    global.Elements.abort = ReactiveUtils.abort;
    global.Elements.reset = ReactiveUtils.reset;
    global.Elements.refetch = ReactiveUtils.refetch;
    global.Elements.destroy = ReactiveUtils.destroy;
    global.Elements.save = ReactiveUtils.save;
    global.Elements.load = ReactiveUtils.load;
    global.Elements.clear = ReactiveUtils.clear;
    global.Elements.exists = ReactiveUtils.exists;
    global.Elements.stopAutoSave = ReactiveUtils.stopAutoSave;
    global.Elements.startAutoSave = ReactiveUtils.startAutoSave;
    global.Elements.storageInfo = ReactiveUtils.storageInfo;
    global.Elements.getRaw = ReactiveUtils.getRaw;
  }

  // Add to Collections if available
  if (global.Collections) {
    global.Collections.set = ReactiveUtils.set;
    global.Collections.cleanup = ReactiveUtils.cleanup;
    global.Collections.execute = ReactiveUtils.execute;
    global.Collections.abort = ReactiveUtils.abort;
    global.Collections.reset = ReactiveUtils.reset;
    global.Collections.refetch = ReactiveUtils.refetch;
    global.Collections.destroy = ReactiveUtils.destroy;
    global.Collections.save = ReactiveUtils.save;
    global.Collections.load = ReactiveUtils.load;
    global.Collections.clear = ReactiveUtils.clear;
    global.Collections.exists = ReactiveUtils.exists;
    global.Collections.stopAutoSave = ReactiveUtils.stopAutoSave;
    global.Collections.startAutoSave = ReactiveUtils.startAutoSave;
    global.Collections.storageInfo = ReactiveUtils.storageInfo;
    global.Collections.getRaw = ReactiveUtils.getRaw;
  }

  // Add to Selector if available
  if (global.Selector) {
    global.Selector.set = ReactiveUtils.set;
    global.Selector.cleanup = ReactiveUtils.cleanup;
    global.Selector.execute = ReactiveUtils.execute;
    global.Selector.abort = ReactiveUtils.abort;
    global.Selector.reset = ReactiveUtils.reset;
    global.Selector.refetch = ReactiveUtils.refetch;
    global.Selector.destroy = ReactiveUtils.destroy;
    global.Selector.save = ReactiveUtils.save;
    global.Selector.load = ReactiveUtils.load;
    global.Selector.clear = ReactiveUtils.clear;
    global.Selector.exists = ReactiveUtils.exists;
    global.Selector.stopAutoSave = ReactiveUtils.stopAutoSave;
    global.Selector.startAutoSave = ReactiveUtils.startAutoSave;
    global.Selector.storageInfo = ReactiveUtils.storageInfo;
    global.Selector.getRaw = ReactiveUtils.getRaw;
  }

  // ============================================================================
  // GLOBAL SHORTCUTS (if module 07 is loaded)
  // ============================================================================

  if (typeof global.effect === 'function') {
    // Add global shortcuts for the 14 methods
    global.set = ReactiveUtils.set;
    global.cleanup = ReactiveUtils.cleanup;
    global.execute = ReactiveUtils.execute;
    global.abort = ReactiveUtils.abort;
    global.reset = ReactiveUtils.reset;
    global.refetch = ReactiveUtils.refetch;
    global.destroy = ReactiveUtils.destroy;
    global.save = ReactiveUtils.save;
    global.load = ReactiveUtils.load;
    global.clear = ReactiveUtils.clear;
    global.exists = ReactiveUtils.exists;
    global.stopAutoSave = ReactiveUtils.stopAutoSave;
    global.startAutoSave = ReactiveUtils.startAutoSave;
    global.storageInfo = ReactiveUtils.storageInfo;
    global.getRaw = ReactiveUtils.getRaw;
  }

  // ============================================================================
  // LOGGING
  // ============================================================================

  console.log('[Namespace Methods] v1.0.0 loaded successfully ✅');
  console.log('');
  console.log('Added 14 namespace-level methods to ReactiveUtils:');
  console.log('');
  console.log('Core State:');
  console.log('  ReactiveUtils.set(state, updates)');
  console.log('  ReactiveUtils.cleanup(state)');
  console.log('  ReactiveUtils.getRaw(state)');
  console.log('');
  console.log('Async State:');
  console.log('  ReactiveUtils.execute(asyncState, fn)');
  console.log('  ReactiveUtils.abort(asyncState)');
  console.log('  ReactiveUtils.reset(asyncState)');
  console.log('  ReactiveUtils.refetch(asyncState)');
  console.log('');
  console.log('Component:');
  console.log('  ReactiveUtils.destroy(component)');
  console.log('');
  console.log('Storage:');
  console.log('  ReactiveUtils.save(state)');
  console.log('  ReactiveUtils.load(state)');
  console.log('  ReactiveUtils.clear(state)');
  console.log('  ReactiveUtils.exists(state)');
  console.log('  ReactiveUtils.stopAutoSave(state)');
  console.log('  ReactiveUtils.startAutoSave(state)');
  console.log('  ReactiveUtils.storageInfo(state)');
  console.log('');
  console.log('Instance methods (with $) still available:');
  console.log('  state.$set(updates)');
  console.log('  state.$cleanup()');
  console.log('  asyncState.$execute(fn)');
  console.log('  ... etc');

})(typeof window !== 'undefined' ? window : global);