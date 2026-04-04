/**
 * 10_dh-array-based-updates.js (UPDATED FOR BUNDLED ENHANCERS)
 * 
 * DOM Helpers - Array-Based Update Core
 * More aggressive patching for compatibility with bundled enhancers
 * 
 * @version 1.1.0 (FIXED)
 * @license MIT
 */

(function(global) {
  'use strict';

  console.log('[Array Updates] v1.1.0 Loading...');

  // ===== CORE ARRAY DISTRIBUTION LOGIC =====

  function isDistributableArray(value) {
    return Array.isArray(value) && value.length > 0;
  }

  function getValueForIndex(value, elementIndex, totalElements) {
    if (!Array.isArray(value)) return value;
    if (elementIndex < value.length) return value[elementIndex];
    return value[value.length - 1];
  }

  function processUpdatesForElement(updates, elementIndex, totalElements) {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return updates;
    }

    const processed = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'style' || key === 'dataset') {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          processed[key] = processUpdatesForElement(value, elementIndex, totalElements);
        } else if (Array.isArray(value)) {
          processed[key] = getValueForIndex(value, elementIndex, totalElements);
        } else {
          processed[key] = value;
        }
      } else if (key === 'classList') {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const processedClassList = {};
          Object.entries(value).forEach(([method, classes]) => {
            processedClassList[method] = getValueForIndex(classes, elementIndex, totalElements);
          });
          processed[key] = processedClassList;
        } else {
          processed[key] = value;
        }
      } else {
        processed[key] = getValueForIndex(value, elementIndex, totalElements);
      }
    });

    return processed;
  }

  function containsArrayValues(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) return true;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (containsArrayValues(value)) return true;
      }
    }
    return false;
  }

  function applyUpdatesToElement(element, updates) {
    Object.entries(updates).forEach(([key, value]) => {
      try {
        if (key === 'style' && typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([prop, val]) => {
            if (val !== null && val !== undefined) {
              element.style[prop] = val;
            }
          });
        } else if (key === 'classList' && typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([method, classes]) => {
            const classList = Array.isArray(classes) ? classes : [classes];
            switch (method) {
              case 'add': element.classList.add(...classList); break;
              case 'remove': element.classList.remove(...classList); break;
              case 'toggle': classList.forEach(c => element.classList.toggle(c)); break;
            }
          });
        } else if (key === 'dataset' && typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([k, v]) => element.dataset[k] = v);
        } else if (key in element) {
          element[key] = value;
        } else {
          element.setAttribute(key, value);
        }
      } catch (error) {
        console.warn(`[Array Updates] Failed to apply ${key}:`, error.message);
      }
    });
  }

  function applyArrayBasedUpdates(collection, updates) {
    let elements = [];
    
    try {
      elements = Array.from(collection);
    } catch (e) {
      for (let i = 0; i < collection.length; i++) {
        elements.push(collection[i]);
      }
    }

    if (elements.length === 0) return collection;

    const totalElements = elements.length;
    const hasArrays = containsArrayValues(updates);

    if (!hasArrays) {
      // No arrays - bulk update
      elements.forEach(element => {
        if (element && element.nodeType === Node.ELEMENT_NODE) {
          applyUpdatesToElement(element, updates);
        }
      });
      return collection;
    }

    console.log(`[Array Updates] Distributing across ${totalElements} elements`);

    elements.forEach((element, index) => {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
      
      const elementUpdates = processUpdatesForElement(updates, index, totalElements);
      applyUpdatesToElement(element, elementUpdates);
    });

    return collection;
  }

  // ===== ENHANCED UPDATE METHOD =====

  function createEnhancedUpdateMethod(originalUpdate) {
    return function enhancedUpdate(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[Array Updates] update() requires an object');
        return this;
      }

      // Check for numeric indices (index-based updates)
      const keys = Object.keys(updates);
      const hasNumericIndices = keys.some(key => {
        const num = parseInt(key, 10);
        return !isNaN(num) && String(num) === key;
      });

      if (hasNumericIndices) {
        console.log('[Array Updates] Numeric indices detected, using index-based');
        if (originalUpdate && typeof originalUpdate === 'function') {
          return originalUpdate.call(this, updates);
        }
      }

      // Check for array values
      const hasArrayValues = containsArrayValues(updates);

      if (hasArrayValues) {
        return applyArrayBasedUpdates(this, updates);
      }

      // Bulk update
      if (originalUpdate && typeof originalUpdate === 'function') {
        return originalUpdate.call(this, updates);
      }

      if (this.forEach && typeof this.forEach === 'function') {
        this.forEach(element => {
          if (element && element.update && typeof element.update === 'function') {
            element.update(updates);
          }
        });
      }

      return this;
    };
  }

  function enhanceCollectionWithArrayUpdates(collection) {
    if (!collection) return collection;
    
    // ALWAYS re-enhance to override bundled enhancers
    const originalUpdate = collection.update;
    const enhancedUpdate = createEnhancedUpdateMethod(originalUpdate);

    try {
      Object.defineProperty(collection, 'update', {
        value: enhancedUpdate,
        writable: true,
        enumerable: false,
        configurable: true
      });

      Object.defineProperty(collection, '_hasArrayUpdateSupport', {
        value: true,
        writable: false,
        enumerable: false,
        configurable: false
      });
    } catch (error) {
      collection.update = enhancedUpdate;
      collection._hasArrayUpdateSupport = true;
    }

    return collection;
  }

  // ===== AGGRESSIVE PATCHING =====

  function patchWithRetry(patchFn, name) {
    // Try immediately
    const immediate = patchFn();
    
    // Also try after DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log(`[Array Updates] Re-patching ${name} after DOMContentLoaded`);
        patchFn();
      });
    }
    
    // And after a short delay (for dynamic loading)
    setTimeout(() => {
      console.log(`[Array Updates] Re-patching ${name} after delay`);
      patchFn();
    }, 100);
    
    return immediate;
  }

  function patchSelectorHelper() {
    if (!global.Selector || !global.Selector.queryAll) return 0;

    const originalQA = global.Selector.queryAll;
    global.Selector.queryAll = function(...args) {
      const result = originalQA.apply(this, args);
      return enhanceCollectionWithArrayUpdates(result);
    };
    
    console.log('[Array Updates] ✓ Patched Selector.queryAll');
    return 1;
  }

  function patchGlobalQueryFunctions() {
    let count = 0;

    if (global.querySelectorAll) {
      const originalQSA = global.querySelectorAll;
      global.querySelectorAll = function(selector, context) {
        const result = originalQSA.call(this, selector, context);
        return enhanceCollectionWithArrayUpdates(result);
      };
      count++;
      console.log('[Array Updates] ✓ Patched querySelectorAll');
    }

    if (global.queryAll) {
      const originalQA = global.queryAll;
      global.queryAll = function(selector, context) {
        const result = originalQA.call(this, selector, context);
        return enhanceCollectionWithArrayUpdates(result);
      };
      count++;
      console.log('[Array Updates] ✓ Patched queryAll');
    }

    return count;
  }

  function patchCollectionsShortcuts() {
    if (!global.Collections) return 0;
    let count = 0;

    ['ClassName', 'TagName', 'Name'].forEach(type => {
      if (global.Collections[type]) {
        const original = global.Collections[type];
        global.Collections[type] = new Proxy(original, {
          get(target, prop) {
            const result = Reflect.get(target, prop);
            if (result && typeof result === 'object' && 'length' in result) {
              return enhanceCollectionWithArrayUpdates(result);
            }
            return result;
          },
          apply(target, thisArg, args) {
            const result = Reflect.apply(target, thisArg, args);
            if (result && typeof result === 'object' && 'length' in result) {
              return enhanceCollectionWithArrayUpdates(result);
            }
            return result;
          }
        });
        count++;
        console.log(`[Array Updates] ✓ Patched Collections.${type}`);
      }
    });

    return count;
  }

  function patchGlobalShortcuts() {
    let count = 0;

    ['ClassName', 'TagName', 'Name'].forEach(type => {
      if (global[type]) {
        const original = global[type];
        global[type] = new Proxy(original, {
          get(target, prop) {
            const result = Reflect.get(target, prop);
            if (result && typeof result === 'object' && 'length' in result) {
              return enhanceCollectionWithArrayUpdates(result);
            }
            return result;
          },
          apply(target, thisArg, args) {
            const result = Reflect.apply(target, thisArg, args);
            if (result && typeof result === 'object' && 'length' in result) {
              return enhanceCollectionWithArrayUpdates(result);
            }
            return result;
          }
        });
        count++;
        console.log(`[Array Updates] ✓ Patched ${type}`);
      }
    });

    return count;
  }

  // ===== INITIALIZE WITH RETRY =====

  function initialize() {
    console.log('[Array Updates] Initializing with retry logic...');
    
    let totalPatches = 0;
    
    // Patch with retry for each system
    totalPatches += patchWithRetry(patchSelectorHelper, 'Selector');
    totalPatches += patchWithRetry(patchGlobalQueryFunctions, 'Global Query');
    totalPatches += patchWithRetry(patchCollectionsShortcuts, 'Collections');
    totalPatches += patchWithRetry(patchGlobalShortcuts, 'Global Shortcuts');

    console.log(`[Array Updates] ✓✓✓ Initialization complete - ${totalPatches} systems patched`);
    console.log('[Array Updates] Usage: collection.update({ textContent: ["A", "B", "C"] })');
    
    return totalPatches > 0;
  }

  // ===== EXPORT MODULE =====

  const ArrayBasedUpdates = {
    version: '1.1.0-fixed',
    applyArrayBasedUpdates,
    processUpdatesForElement,
    getValueForIndex,
    isDistributableArray,
    containsArrayValues,
    enhanceCollectionWithArrayUpdates,
    createEnhancedUpdateMethod,
    initialize,
    reinitialize: initialize,
    
    hasSupport(collection) {
      return !!(collection && collection._hasArrayUpdateSupport);
    },
    
    // Manual enhance function
    enhance(collection) {
      return enhanceCollectionWithArrayUpdates(collection);
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArrayBasedUpdates;
  } else if (typeof define === 'function' && define.amd) {
    define([], () => ArrayBasedUpdates);
  } else {
    global.ArrayBasedUpdates = ArrayBasedUpdates;
  }

  if (typeof global.DOMHelpers !== 'undefined') {
    global.DOMHelpers.ArrayBasedUpdates = ArrayBasedUpdates;
  }

  // Initialize immediately AND with retry
  initialize();

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);