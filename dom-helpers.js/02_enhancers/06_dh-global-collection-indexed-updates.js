/**
 * 06_dh-global-collection-indexed-updates
 * 
 * Global Collection Indexed Updates 
 * Adds bulk indexed update support to Global Collection Shortcuts
 * 
 * Enables syntax like:
 *   ClassName.button.update({
 *     [0]: { textContent: 'First', style: { color: 'red' } },
 *     [1]: { textContent: 'Second', style: { color: 'blue' } },
 *     [-1]: { textContent: 'Last', style: { color: 'green' } },
 *     classList: { add: ['shared-class'] }  // Applied to ALL elements
 *   })
 * 
 * IMPORTANT: Load this AFTER:
 *   1. DOM Helpers Library (Collections)
 *   2. Global Collection Shortcuts
 *   3. EnhancedUpdateUtility (main DOM helpers)
 * 
 * @version 1.1.0 - FIXED: Now applies both bulk and index updates
 * @license MIT
 */

(function(global) {
  'use strict';

  // ===== DEPENDENCY CHECKS =====
  const hasCollections = typeof global.Collections !== 'undefined';
  const hasGlobalShortcuts = typeof global.ClassName !== 'undefined' || 
                              typeof global.TagName !== 'undefined' || 
                              typeof global.Name !== 'undefined';
  const hasUpdateUtility = typeof global.EnhancedUpdateUtility !== 'undefined';

  if (!hasCollections) {
    console.error('[Global Shortcuts Indexed Updates] Collections helper not found. Please load DOM Helpers library first.');
    return;
  }

  if (!hasGlobalShortcuts) {
    console.error('[Global Shortcuts Indexed Updates] Global Collection Shortcuts not found. Please load global-collection-shortcuts.js first.');
    return;
  }

  if (!hasUpdateUtility) {
    console.warn('[Global Shortcuts Indexed Updates] EnhancedUpdateUtility not found. Basic update functionality will be limited.');
  }

  // ===== CORE UPDATE LOGIC (FIXED) =====

  /**
   * Apply updates to a collection with index support
   * FIXED: Now applies BOTH bulk and index-specific updates
   * @param {Object} collection - The collection to update
   * @param {Object} updates - Update object with numeric indices or properties
   * @returns {Object} - The collection (for chaining)
   */
  function updateCollectionWithIndices(collection, updates) {
    if (!collection) {
      console.warn('[Global Shortcuts Indexed Updates] .update() called on null collection');
      return collection;
    }

    // Convert collection to array of elements
    let elements = [];
    
    if (collection.length !== undefined) {
      // It's array-like
      for (let i = 0; i < collection.length; i++) {
        elements.push(collection[i]);
      }
    } else {
      console.warn('[Global Shortcuts Indexed Updates] .update() called on unrecognized collection type');
      return collection;
    }

    if (elements.length === 0) {
      console.info('[Global Shortcuts Indexed Updates] .update() called on empty collection');
      return collection;
    }

    try {
      const updateKeys = Object.keys(updates);
      
      // FIXED: Separate numeric indices from bulk properties
      const indexUpdates = {};
      const bulkUpdates = {};
      let hasNumericIndices = false;
      let hasBulkUpdates = false;

      updateKeys.forEach(key => {
        const num = parseInt(key, 10);
        
        // Check if it's a valid numeric index
        if (!isNaN(num) && key === String(num)) {
          indexUpdates[key] = updates[key];
          hasNumericIndices = true;
        } else {
          bulkUpdates[key] = updates[key];
          hasBulkUpdates = true;
        }
      });

      // FIXED: Apply BOTH types of updates

      // 1. First, apply bulk updates to ALL elements
      if (hasBulkUpdates) {
        console.log('[Global Shortcuts Indexed Updates] Applying bulk updates to all elements');
        
        elements.forEach(element => {
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            applyUpdatesToElement(element, bulkUpdates);
          }
        });
      }

      // 2. Then, apply index-specific updates (these can override bulk)
      if (hasNumericIndices) {
        console.log('[Global Shortcuts Indexed Updates] Applying index-specific updates');
        
        Object.entries(indexUpdates).forEach(([key, elementUpdates]) => {
          let index = parseInt(key, 10);
          
          // Handle negative indices
          if (index < 0) {
            index = elements.length + index;
          }

          // Get the element at this index
          const element = elements[index];

          if (element && element.nodeType === Node.ELEMENT_NODE) {
            if (elementUpdates && typeof elementUpdates === 'object') {
              // Apply updates to this specific element
              applyUpdatesToElement(element, elementUpdates);
            }
          } else if (index >= 0 && index < elements.length) {
            console.warn(`[Global Shortcuts Indexed Updates] Element at index ${key} is not a valid DOM element`);
          } else {
            console.warn(`[Global Shortcuts Indexed Updates] No element at index ${key} (resolved to ${index}, collection has ${elements.length} elements)`);
          }
        });
      }

      // Log summary
      if (!hasNumericIndices && !hasBulkUpdates) {
        console.log('[Global Shortcuts Indexed Updates] No updates applied');
      }

    } catch (error) {
      console.error(`[Global Shortcuts Indexed Updates] Error in collection .update(): ${error.message}`);
    }

    return collection;
  }

  /**
   * Apply update object to a single element
   * @param {Element} element - DOM element to update
   * @param {Object} updates - Updates to apply
   */
  function applyUpdatesToElement(element, updates) {
    // If element has .update() method from EnhancedUpdateUtility, use it
    if (typeof element.update === 'function') {
      element.update(updates);
      return;
    }

    // Otherwise, use EnhancedUpdateUtility directly if available
    if (hasUpdateUtility && global.EnhancedUpdateUtility.applyEnhancedUpdate) {
      Object.entries(updates).forEach(([key, value]) => {
        global.EnhancedUpdateUtility.applyEnhancedUpdate(element, key, value);
      });
      return;
    }

    // Fallback to basic update
    applyBasicUpdate(element, updates);
  }

  /**
   * Basic update implementation (fallback)
   * @param {Element} element - DOM element
   * @param {Object} updates - Updates to apply
   */
  function applyBasicUpdate(element, updates) {
    Object.entries(updates).forEach(([key, value]) => {
      try {
        // Handle style object
        if (key === 'style' && typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([styleProperty, styleValue]) => {
            if (styleValue !== null && styleValue !== undefined) {
              element.style[styleProperty] = styleValue;
            }
          });
          return;
        }

        // Handle classList operations
        if (key === 'classList' && typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([method, classes]) => {
            const classList = Array.isArray(classes) ? classes : [classes];
            switch (method) {
              case 'add':
                element.classList.add(...classList);
                break;
              case 'remove':
                element.classList.remove(...classList);
                break;
              case 'toggle':
                classList.forEach(c => element.classList.toggle(c));
                break;
            }
          });
          return;
        }

        // Handle setAttribute
        if (key === 'setAttribute') {
          if (Array.isArray(value) && value.length >= 2) {
            element.setAttribute(value[0], value[1]);
          } else if (typeof value === 'object') {
            Object.entries(value).forEach(([attr, val]) => {
              element.setAttribute(attr, val);
            });
          }
          return;
        }

        // Handle direct properties
        if (key in element) {
          element[key] = value;
        } else if (typeof value === 'string' || typeof value === 'number') {
          element.setAttribute(key, value);
        }
      } catch (error) {
        console.warn(`[Global Shortcuts Indexed Updates] Failed to apply ${key}:`, error.message);
      }
    });
  }




  // ===== ENHANCED COLLECTION WRAPPER WITH UPDATE =====

  /**
   * Creates an enhanced collection wrapper with indexed update support
   * @param {Object} collection - The original collection
   * @returns {Proxy} - Enhanced collection with .update() method
   */
  function createEnhancedCollectionWithUpdate(collection) {
    if (!collection) return collection;

    // Check if already enhanced
    if (collection._hasIndexedUpdateSupport) {
      return collection;
    }

    // Create a wrapper object with .update() method
    const enhancedCollection = Object.create(null);
    
    // Copy length property
    Object.defineProperty(enhancedCollection, 'length', {
      get() {
        return collection.length;
      },
      enumerable: false
    });

    // Add numeric indices
    for (let i = 0; i < collection.length; i++) {
      Object.defineProperty(enhancedCollection, i, {
        get() {
          const element = collection[i];
          // Enhance individual elements if possible
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            if (hasUpdateUtility && global.EnhancedUpdateUtility.enhanceElementWithUpdate) {
              return global.EnhancedUpdateUtility.enhanceElementWithUpdate(element);
            }
          }
          return element;
        },
        enumerable: true
      });
    }

    // Add .update() method with FIXED logic
    Object.defineProperty(enhancedCollection, 'update', {
      value: function(updates = {}) {
        return updateCollectionWithIndices(this, updates);
      },
      writable: false,
      enumerable: false,
      configurable: false
    });

    // Mark as enhanced
    Object.defineProperty(enhancedCollection, '_hasIndexedUpdateSupport', {
      value: true,
      writable: false,
      enumerable: false,
      configurable: false
    });

    // Make it iterable
    enhancedCollection[Symbol.iterator] = function*() {
      for (let i = 0; i < collection.length; i++) {
        yield enhancedCollection[i];
      }
    };

    // Add common array methods
    enhancedCollection.forEach = function(callback, thisArg) {
      for (let i = 0; i < this.length; i++) {
        callback.call(thisArg, this[i], i, this);
      }
    };

    enhancedCollection.map = function(callback, thisArg) {
      const result = [];
      for (let i = 0; i < this.length; i++) {
        result.push(callback.call(thisArg, this[i], i, this));
      }
      return result;
    };

    enhancedCollection.filter = function(callback, thisArg) {
      const result = [];
      for (let i = 0; i < this.length; i++) {
        if (callback.call(thisArg, this[i], i, this)) {
          result.push(this[i]);
        }
      }
      return result;
    };

    return enhancedCollection;
  }


  
  // ===== PATCH GLOBAL COLLECTION SHORTCUTS =====

  /**
   * Patch a global shortcut proxy to return enhanced collections
   * @param {Proxy} originalProxy - The original global proxy
   * @returns {Proxy} - Patched proxy
   */
  function patchGlobalShortcut(originalProxy) {
    if (!originalProxy) return originalProxy;

    return new Proxy(originalProxy, {
      get(target, prop) {
        // Get the original result
        const result = target[prop];

        // If it's a collection (has length), enhance it
        if (result && typeof result === 'object' && 'length' in result && !result._hasIndexedUpdateSupport) {
          return createEnhancedCollectionWithUpdate(result);
        }

        return result;
      },

      apply(target, thisArg, args) {
        // Handle function calls
        const result = Reflect.apply(target, thisArg, args);

        // If it's a collection, enhance it
        if (result && typeof result === 'object' && 'length' in result && !result._hasIndexedUpdateSupport) {
          return createEnhancedCollectionWithUpdate(result);
        }

        return result;
      }
    });
  }

  // ===== APPLY PATCHES =====

  let patchCount = 0;

  if (global.ClassName) {
    global.ClassName = patchGlobalShortcut(global.ClassName);
    patchCount++;
    console.log('[Global Shortcuts Indexed Updates] ✓ Patched ClassName');
  }

  if (global.TagName) {
    global.TagName = patchGlobalShortcut(global.TagName);
    patchCount++;
    console.log('[Global Shortcuts Indexed Updates] ✓ Patched TagName');
  }

  if (global.Name) {
    global.Name = patchGlobalShortcut(global.Name);
    patchCount++;
    console.log('[Global Shortcuts Indexed Updates] ✓ Patched Name');
  }

  // Also patch DOMHelpers if it exists
  if (typeof global.DOMHelpers !== 'undefined') {
    if (global.DOMHelpers.ClassName) {
      global.DOMHelpers.ClassName = global.ClassName;
    }
    if (global.DOMHelpers.TagName) {
      global.DOMHelpers.TagName = global.TagName;
    }
    if (global.DOMHelpers.Name) {
      global.DOMHelpers.Name = global.Name;
    }
  }

  // ===== EXPORT MODULE =====

  const GlobalShortcutsIndexedUpdates = {
    version: '1.1.0',
    updateCollectionWithIndices: updateCollectionWithIndices,
    createEnhancedCollectionWithUpdate: createEnhancedCollectionWithUpdate,
    patchGlobalShortcut: patchGlobalShortcut,
    
    // Utility methods
    hasSupport(collection) {
      return !!(collection && collection._hasIndexedUpdateSupport);
    }
  };

  // CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalShortcutsIndexedUpdates;
  }

  // AMD
  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return GlobalShortcutsIndexedUpdates;
    });
  }

  // Browser global
  global.GlobalShortcutsIndexedUpdates = GlobalShortcutsIndexedUpdates;

  // Integrate with DOMHelpers
  if (typeof global.DOMHelpers !== 'undefined') {
    global.DOMHelpers.GlobalShortcutsIndexedUpdates = GlobalShortcutsIndexedUpdates;
  }

  // ===== LOGGING =====

  console.log(`[Global Shortcuts Indexed Updates] v1.1.0 loaded - ${patchCount} shortcuts patched (FIXED)`);
  console.log('[Global Shortcuts Indexed Updates] ✓ Now supports BOTH bulk and index-specific updates');
  console.log('[Global Shortcuts Indexed Updates] Usage: ClassName.button.update({ [0]: {...}, classList: {...} })');

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);