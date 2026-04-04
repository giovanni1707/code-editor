/**
 * 08_dh-selector-update-patch
 * 
 * 
 * DOM Helpers - Selector Update Patch
 * Adds index-based access and update capabilities
 * 
 * @version 2.0.0
 * @license MIT
 */

(function(global) {
  'use strict';

  if (typeof global.Collections === 'undefined' && typeof global.Selector === 'undefined') {
    console.warn('[Index Selection] DOM Helpers not found.');
    return;
  }

  /**
   * Enhance element with update method if not already enhanced
   */
  function ensureElementHasUpdate(element) {
    if (!element || element._hasUpdateMethod || element._hasEnhancedUpdateMethod) {
      return element;
    }

    // Check if global enhancement function exists
    if (typeof global.enhanceElementWithUpdate === 'function') {
      return global.enhanceElementWithUpdate(element);
    }

    if (global.EnhancedUpdateUtility && global.EnhancedUpdateUtility.enhanceElementWithUpdate) {
      return global.EnhancedUpdateUtility.enhanceElementWithUpdate(element);
    }

    // Fallback: add basic update method
    addBasicUpdateMethod(element);
    return element;
  }

  /**
   * Add basic update method to element
   */
  function addBasicUpdateMethod(element) {
    if (!element || element._hasUpdateMethod) return element;

    try {
      Object.defineProperty(element, 'update', {
        value: function(updates = {}) {
          if (!updates || typeof updates !== 'object') {
            console.warn('[Index Selection] .update() requires an object');
            return element;
          }

          Object.entries(updates).forEach(([key, value]) => {
            try {
              // Handle style object
              if (key === 'style' && typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([prop, val]) => {
                  if (val !== null && val !== undefined) {
                    element.style[prop] = val;
                  }
                });
                return;
              }

              // Handle classList
              if (key === 'classList' && typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([method, classes]) => {
                  const classList = Array.isArray(classes) ? classes : [classes];
                  switch (method) {
                    case 'add': element.classList.add(...classList); break;
                    case 'remove': element.classList.remove(...classList); break;
                    case 'toggle': classList.forEach(c => element.classList.toggle(c)); break;
                    case 'replace': 
                      if (classes.length === 2) element.classList.replace(classes[0], classes[1]); 
                      break;
                  }
                });
                return;
              }

              // Handle setAttribute
              if (key === 'setAttribute') {
                if (Array.isArray(value) && value.length >= 2) {
                  element.setAttribute(value[0], value[1]);
                } else if (typeof value === 'object' && value !== null) {
                  Object.entries(value).forEach(([attr, val]) => element.setAttribute(attr, val));
                }
                return;
              }

              // Handle removeAttribute
              if (key === 'removeAttribute') {
                const attrs = Array.isArray(value) ? value : [value];
                attrs.forEach(attr => element.removeAttribute(attr));
                return;
              }

              // Handle dataset
              if (key === 'dataset' && typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([k, v]) => element.dataset[k] = v);
                return;
              }

              // Handle addEventListener
              if (key === 'addEventListener') {
                if (Array.isArray(value) && value.length >= 2) {
                  element.addEventListener(value[0], value[1], value[2]);
                } else if (typeof value === 'object' && value !== null) {
                  Object.entries(value).forEach(([event, handler]) => {
                    if (typeof handler === 'function') {
                      element.addEventListener(event, handler);
                    } else if (Array.isArray(handler)) {
                      element.addEventListener(event, handler[0], handler[1]);
                    }
                  });
                }
                return;
              }

              // Handle event properties (onclick, onchange, etc.)
              if (key.startsWith('on') && typeof value === 'function') {
                element[key] = value;
                return;
              }

              // Handle methods
              if (typeof element[key] === 'function') {
                if (Array.isArray(value)) {
                  element[key](...value);
                } else {
                  element[key](value);
                }
                return;
              }

              // Handle properties
              if (key in element) {
                element[key] = value;
                return;
              }

              // Fallback to setAttribute
              if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                element.setAttribute(key, String(value));
              }
            } catch (err) {
              console.warn(`[Index Selection] Failed to apply ${key}:`, err.message);
            }
          });

          return element;
        },
        writable: false,
        enumerable: false,
        configurable: true
      });

      Object.defineProperty(element, '_hasUpdateMethod', {
        value: true,
        writable: false,
        enumerable: false,
        configurable: false
      });
    } catch (error) {
      // Fallback
      element.update = function(updates) { /* same implementation */ };
      element._hasUpdateMethod = true;
    }

    return element;
  }

  /**
   * Create enhanced collection with index access that returns enhanced elements
   */
  function createEnhancedCollectionProxy(collection) {
    if (!collection) return collection;

    // Create proxy that intercepts numeric index access
    return new Proxy(collection, {
      get(target, prop) {
        // Check if accessing by numeric index
        if (!isNaN(prop) && parseInt(prop) >= 0) {
          const index = parseInt(prop);
          let element;

          // Get element from appropriate source
          if (target._originalCollection) {
            element = target._originalCollection[index];
          } else if (target._originalNodeList) {
            element = target._originalNodeList[index];
          } else if (target[index]) {
            element = target[index];
          }

          // Enhance element before returning
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            return ensureElementHasUpdate(element);
          }

          return element;
        }

        // For negative indices via at() method
        if (prop === 'at' && typeof target.at === 'function') {
          return function(index) {
            const element = target.at.call(target, index);
            if (element && element.nodeType === Node.ELEMENT_NODE) {
              return ensureElementHasUpdate(element);
            }
            return element;
          };
        }

        // Return original property
        return target[prop];
      }
    });
  }

  /**
   * Enhanced update method with index selection support
   */
  function createIndexAwareUpdate(collection) {
    return function indexAwareUpdate(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[Index Selection] .update() requires an object');
        return collection;
      }

      // Get elements array
      let elements = [];
      if (collection._originalCollection) {
        elements = Array.from(collection._originalCollection);
      } else if (collection._originalNodeList) {
        elements = Array.from(collection._originalNodeList);
      } else if (collection.length !== undefined) {
        elements = Array.from(collection);
      }

      if (elements.length === 0) {
        console.info('[Index Selection] Collection is empty');
        return collection;
      }

      const length = elements.length;
      const indexUpdates = {};
      const bulkUpdates = {};
      let hasIndexUpdates = false;
      let hasBulkUpdates = false;

      // Separate index-based and bulk updates
      Object.entries(updates).forEach(([key, value]) => {
        if (/^-?\d+$/.test(key)) {
          indexUpdates[key] = value;
          hasIndexUpdates = true;
        } else {
          bulkUpdates[key] = value;
          hasBulkUpdates = true;
        }
      });

      // Apply bulk updates
      if (hasBulkUpdates) {
        elements.forEach(element => {
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            const enhanced = ensureElementHasUpdate(element);
            if (enhanced.update) {
              enhanced.update(bulkUpdates);
            }
          }
        });
      }

      // Apply index-specific updates
      if (hasIndexUpdates) {
        Object.entries(indexUpdates).forEach(([indexStr, updateData]) => {
          let index = parseInt(indexStr, 10);
          if (index < 0) index = length + index;

          if (index >= 0 && index < length) {
            const element = elements[index];
            if (element && element.nodeType === Node.ELEMENT_NODE) {
              const enhanced = ensureElementHasUpdate(element);
              if (enhanced.update) {
                enhanced.update(updateData);
              }
            }
          } else {
            console.warn(`[Index Selection] Index ${indexStr} out of bounds (length: ${length})`);
          }
        });
      }

      return collection;
    };
  }

  /**
   * Wrap collection with both proxy (for index access) and enhanced update
   */
  function wrapCollection(collection) {
    if (!collection || collection._indexSelectionEnhanced) {
      return collection;
    }

    // First, wrap update method
    const newUpdate = createIndexAwareUpdate(collection);
    
    try {
      Object.defineProperty(collection, 'update', {
        value: newUpdate,
        writable: true,
        enumerable: false,
        configurable: true
      });
    } catch (error) {
      collection.update = newUpdate;
    }

    // Mark as enhanced
    try {
      Object.defineProperty(collection, '_indexSelectionEnhanced', {
        value: true,
        writable: false,
        enumerable: false,
        configurable: false
      });
    } catch (error) {
      collection._indexSelectionEnhanced = true;
    }

    // Then wrap with proxy for enhanced index access
    return createEnhancedCollectionProxy(collection);
  }

  /**
   * Hook Collections helper
   */
  function hookCollections() {
    if (!global.Collections || !global.Collections.helper) return;

    const helper = global.Collections.helper;

    // Hook _enhanceCollection
    if (helper._enhanceCollection) {
      const original = helper._enhanceCollection.bind(helper);
      helper._enhanceCollection = function(htmlCollection, type, value) {
        const collection = original(htmlCollection, type, value);
        return wrapCollection(collection);
      };
    }

    // Hook _enhanceCollectionWithUpdate
    if (helper._enhanceCollectionWithUpdate) {
      const original = helper._enhanceCollectionWithUpdate.bind(helper);
      helper._enhanceCollectionWithUpdate = function(collection) {
        const enhanced = original(collection);
        return wrapCollection(enhanced);
      };
    }
  }

  /**
   * Hook Selector helper
   */
  function hookSelector() {
    if (!global.Selector || !global.Selector.helper) return;

    const helper = global.Selector.helper;

    // Hook _enhanceNodeList
    if (helper._enhanceNodeList) {
      const original = helper._enhanceNodeList.bind(helper);
      helper._enhanceNodeList = function(nodeList, selector) {
        const collection = original(nodeList, selector);
        return wrapCollection(collection);
      };
    }

    // Hook _enhanceCollectionWithUpdate
    if (helper._enhanceCollectionWithUpdate) {
      const original = helper._enhanceCollectionWithUpdate.bind(helper);
      helper._enhanceCollectionWithUpdate = function(collection) {
        const enhanced = original(collection);
        return wrapCollection(enhanced);
      };
    }
  }

  /**
   * Initialize
   */
  function initialize() {
    try {
      hookCollections();
      hookSelector();
      console.log('[Index Selection] v2.0.0 initialized - Individual element access enhanced');
      return true;
    } catch (error) {
      console.error('[Index Selection] Failed to initialize:', error);
      return false;
    }
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Export API
  const IndexSelection = {
    version: '2.0.0',
    
    enhance: wrapCollection,
    
    enhanceElement: ensureElementHasUpdate,
    
    reinitialize: initialize,
    
    isEnhanced: (collection) => {
      return collection && collection._indexSelectionEnhanced === true;
    },
    
    at: (collection, index) => {
      let elements = [];
      if (collection._originalCollection) {
        elements = Array.from(collection._originalCollection);
      } else if (collection._originalNodeList) {
        elements = Array.from(collection._originalNodeList);
      } else if (collection.length !== undefined) {
        elements = Array.from(collection);
      }
      
      if (index < 0) index = elements.length + index;
      const element = elements[index] || null;
      
      return element ? ensureElementHasUpdate(element) : null;
    },

    update: (collection, updates) => {
      const enhanced = wrapCollection(collection);
      return enhanced.update(updates);
    }
  };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexSelection;
  } else if (typeof define === 'function' && define.amd) {
    define([], () => IndexSelection);
  } else {
    global.IndexSelection = IndexSelection;
    if (global.DOMHelpers) {
      global.DOMHelpers.IndexSelection = IndexSelection;
    }
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);