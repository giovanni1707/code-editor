/**
 * 02_dh-reactive-array-patch
 * 
 * Reactive Array Patch v1.0.1
 * Makes array methods (push, pop, sort, etc.) work with reactive state
 * Load this AFTER reactive-state.js
 * @license MIT
 */

(function(global) {
  'use strict';

  // Check if ReactiveUtils exists
  if (!global.ReactiveUtils) {
    console.error('[Reactive Array Patch] ReactiveUtils not found. Load reactive-state.js first.');
    return;
  }

  const ReactiveUtils = global.ReactiveUtils;
  const originalCreate = ReactiveUtils.state;

  // Array methods that mutate the array
  const ARRAY_MUTATIONS = [
    'push', 'pop', 'shift', 'unshift', 'splice',
    'sort', 'reverse', 'fill', 'copyWithin'
  ];

  /**
   * Enhanced reactive state creation with array support
   */
  function createReactiveWithArraySupport(target) {
    const state = originalCreate(target);
    
    // Patch array properties
    patchArrayProperties(state, target);
    
    return state;
  }

  /**
   * Recursively patch all array properties in an object
   */
  function patchArrayProperties(state, obj, path = '') {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const fullPath = path ? `${path}.${key}` : key;
      
      if (Array.isArray(value)) {
        patchArrayMethods(state, key, fullPath);
      } else if (value && typeof value === 'object' && value.constructor === Object) {
        // Recursively patch nested objects
        patchArrayProperties(state, value, fullPath);
      }
    });
  }

  /**
   * Patch array methods on a specific property
   */
  function patchArrayMethods(state, key, fullPath) {
    const getArray = () => {
      if (fullPath.includes('.')) {
        return getNestedProperty(state, fullPath);
      }
      return state[key];
    };

    const setArray = (newValue) => {
      if (fullPath.includes('.')) {
        setNestedProperty(state, fullPath, newValue);
      } else {
        state[key] = newValue;
      }
    };

    // Watch for when the array is accessed
    const checkAndPatch = () => {
      const arr = getArray();
      if (!arr || !Array.isArray(arr) || arr.__patched) return;

      // Mark as patched to avoid double-patching
      Object.defineProperty(arr, '__patched', {
        value: true,
        enumerable: false,
        configurable: false
      });

      ARRAY_MUTATIONS.forEach(method => {
        const original = Array.prototype[method];
        
        Object.defineProperty(arr, method, {
          value: function(...args) {
            // Call original method
            const result = original.apply(this, args);
            
            // Trigger reactivity by reassigning
            const updatedArray = [...this];
            setArray(updatedArray);
            
            return result;
          },
          enumerable: false,
          configurable: true,
          writable: true
        });
      });
    };

    // Initial patch
    checkAndPatch();

    // Watch for array replacement and re-patch
    if (state.$watch) {
      state.$watch(key, () => {
        checkAndPatch();
      });
    }
  }

  /**
   * Get nested property value
   */
  function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested property value
   */
  function setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  // Override the state creation function
  ReactiveUtils.state = createReactiveWithArraySupport;

  // Also patch Elements, Collections, Selector if they exist
  if (global.Elements) {
    global.Elements.state = createReactiveWithArraySupport;
  }
  if (global.Collections) {
    global.Collections.state = createReactiveWithArraySupport;
  }
  if (global.Selector) {
    global.Selector.state = createReactiveWithArraySupport;
  }

  // ============================================================
  // MAIN FIX: Create the manual patching function
  // ============================================================
  function patchReactiveArray(state, key) {
    if (!state || !state[key]) {
      console.error('[Reactive Array Patch] Invalid state or key');
      return;
    }
    patchArrayMethods(state, key, key);
  }

  // Provide manual patching function as global
  global.patchReactiveArray = patchReactiveArray;

  // ============================================================
  // NEW: Add alias to ReactiveUtils for better API consistency
  // ============================================================
  if (ReactiveUtils) {
    ReactiveUtils.patchArray = patchReactiveArray;
  }

  // Also add to Elements, Collections, Selector for consistency
  if (global.Elements) {
    global.Elements.patchArray = patchReactiveArray;
  }
  if (global.Collections) {
    global.Collections.patchArray = patchReactiveArray;
  }
  if (global.Selector) {
    global.Selector.patchArray = patchReactiveArray;
  }

})(typeof window !== 'undefined' ? window : global);