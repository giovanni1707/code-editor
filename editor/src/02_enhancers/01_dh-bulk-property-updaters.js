/**
 * 01_dh-bulk-property-updaters
 * 
 * DOM Helpers - Bulk Property Updates Extension
 * Adds convenient shorthand methods for bulk element updates
 * 
 * @version 1.0.0
 * @license MIT
 */

(function(global) {
  'use strict';

  // ===== BULK PROPERTY UPDATERS =====
  
  /**
   * Create a bulk property updater function
   * @param {string} propertyName - The property to update (e.g., 'textContent', 'value')
   * @param {Function} transformer - Optional function to transform the value before applying
   * @returns {Function} - Bulk updater function
   */
  function createBulkPropertyUpdater(propertyName, transformer = null) {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn(`[DOM Helpers] ${propertyName}() requires an object with element IDs as keys`);
        return this;
      }

      Object.entries(updates).forEach(([elementId, value]) => {
        try {
          const element = this[elementId];
          
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            const finalValue = transformer ? transformer(value) : value;
            
            if (element.update && typeof element.update === 'function') {
              // Use the element's update method
              element.update({ [propertyName]: finalValue });
            } else {
              // Direct property assignment fallback
              element[propertyName] = finalValue;
            }
          } else {
            console.warn(`[DOM Helpers] Element '${elementId}' not found for ${propertyName} update`);
          }
        } catch (error) {
          console.warn(`[DOM Helpers] Error updating ${propertyName} for '${elementId}': ${error.message}`);
        }
      });

      return this; // Return for chaining
    };
  }

  /**
   * Create a bulk style updater
   */
  function createBulkStyleUpdater() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] style() requires an object with element IDs as keys');
        return this;
      }

      Object.entries(updates).forEach(([elementId, styleObj]) => {
        try {
          const element = this[elementId];
          
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            if (typeof styleObj !== 'object' || styleObj === null) {
              console.warn(`[DOM Helpers] style() requires style object for '${elementId}'`);
              return;
            }

            if (element.update && typeof element.update === 'function') {
              element.update({ style: styleObj });
            } else {
              // Fallback: direct style assignment
              Object.entries(styleObj).forEach(([prop, val]) => {
                if (val !== null && val !== undefined) {
                  element.style[prop] = val;
                }
              });
            }
          } else {
            console.warn(`[DOM Helpers] Element '${elementId}' not found for style update`);
          }
        } catch (error) {
          console.warn(`[DOM Helpers] Error updating style for '${elementId}': ${error.message}`);
        }
      });

      return this;
    };
  }

  /**
   * Create a bulk dataset updater
   */
  function createBulkDatasetUpdater() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] dataset() requires an object with element IDs as keys');
        return this;
      }

      Object.entries(updates).forEach(([elementId, dataObj]) => {
        try {
          const element = this[elementId];
          
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            if (typeof dataObj !== 'object' || dataObj === null) {
              console.warn(`[DOM Helpers] dataset() requires data object for '${elementId}'`);
              return;
            }

            if (element.update && typeof element.update === 'function') {
              element.update({ dataset: dataObj });
            } else {
              // Fallback: direct dataset assignment
              Object.entries(dataObj).forEach(([key, val]) => {
                element.dataset[key] = val;
              });
            }
          } else {
            console.warn(`[DOM Helpers] Element '${elementId}' not found for dataset update`);
          }
        } catch (error) {
          console.warn(`[DOM Helpers] Error updating dataset for '${elementId}': ${error.message}`);
        }
      });

      return this;
    };
  }

  /**
   * Create a bulk attributes updater
   */
  function createBulkAttributesUpdater() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] attrs() requires an object with element IDs as keys');
        return this;
      }

      Object.entries(updates).forEach(([elementId, attrsObj]) => {
        try {
          const element = this[elementId];
          
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            if (typeof attrsObj !== 'object' || attrsObj === null) {
              console.warn(`[DOM Helpers] attrs() requires attributes object for '${elementId}'`);
              return;
            }

            Object.entries(attrsObj).forEach(([attrName, attrValue]) => {
              // Handle attribute removal
              if (attrValue === null || attrValue === false) {
                element.removeAttribute(attrName);
              } else {
                element.setAttribute(attrName, String(attrValue));
              }
            });
          } else {
            console.warn(`[DOM Helpers] Element '${elementId}' not found for attrs update`);
          }
        } catch (error) {
          console.warn(`[DOM Helpers] Error updating attrs for '${elementId}': ${error.message}`);
        }
      });

      return this;
    };
  }

  /**
   * Create a bulk classList updater
   */
  function createBulkClassListUpdater() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] classes() requires an object with element IDs as keys');
        return this;
      }

      Object.entries(updates).forEach(([elementId, classConfig]) => {
        try {
          const element = this[elementId];
          
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            // Handle simple string replacement
            if (typeof classConfig === 'string') {
              element.className = classConfig;
              return;
            }

            // Handle classList operations object
            if (typeof classConfig === 'object' && classConfig !== null) {
              if (element.update && typeof element.update === 'function') {
                element.update({ classList: classConfig });
              } else {
                // Fallback: direct classList manipulation
                Object.entries(classConfig).forEach(([method, classes]) => {
                  try {
                    const classList = Array.isArray(classes) ? classes : [classes];
                    
                    switch (method) {
                      case 'add':
                        element.classList.add(...classList);
                        break;
                      case 'remove':
                        element.classList.remove(...classList);
                        break;
                      case 'toggle':
                        classList.forEach(cls => element.classList.toggle(cls));
                        break;
                      case 'replace':
                        if (classList.length === 2) {
                          element.classList.replace(classList[0], classList[1]);
                        }
                        break;
                    }
                  } catch (error) {
                    console.warn(`[DOM Helpers] Error in classList.${method}: ${error.message}`);
                  }
                });
              }
            }
          } else {
            console.warn(`[DOM Helpers] Element '${elementId}' not found for classes update`);
          }
        } catch (error) {
          console.warn(`[DOM Helpers] Error updating classes for '${elementId}': ${error.message}`);
        }
      });

      return this;
    };
  }

  /**
   * Create a bulk generic property updater with support for nested properties
   */
  function createBulkGenericPropertyUpdater() {
    return function(propertyPath, updates = {}) {
      if (typeof propertyPath !== 'string') {
        console.warn('[DOM Helpers] prop() requires a property name as first argument');
        return this;
      }

      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] prop() requires an object with element IDs as keys');
        return this;
      }

      // Check if property path is nested (e.g., 'style.color')
      const isNested = propertyPath.includes('.');
      const pathParts = isNested ? propertyPath.split('.') : null;

      Object.entries(updates).forEach(([elementId, value]) => {
        try {
          const element = this[elementId];
          
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            if (isNested) {
              // Handle nested property (e.g., style.color)
              let obj = element;
              for (let i = 0; i < pathParts.length - 1; i++) {
                obj = obj[pathParts[i]];
                if (!obj) {
                  console.warn(`[DOM Helpers] Invalid property path '${propertyPath}' for '${elementId}'`);
                  return;
                }
              }
              obj[pathParts[pathParts.length - 1]] = value;
            } else {
              // Direct property assignment
              if (propertyPath in element) {
                element[propertyPath] = value;
              } else {
                console.warn(`[DOM Helpers] Property '${propertyPath}' not found on element '${elementId}'`);
              }
            }
          } else {
            console.warn(`[DOM Helpers] Element '${elementId}' not found for prop update`);
          }
        } catch (error) {
          console.warn(`[DOM Helpers] Error updating prop '${propertyPath}' for '${elementId}': ${error.message}`);
        }
      });

      return this;
    };
  }

  /**
   * Enhance Elements helper with bulk property updaters
   */
  function enhanceElementsHelper(Elements) {
    if (!Elements) {
      console.warn('[DOM Helpers] Elements helper not found');
      return;
    }

    // Common simple properties
    Elements.textContent = createBulkPropertyUpdater('textContent');
    Elements.innerHTML = createBulkPropertyUpdater('innerHTML');
    Elements.innerText = createBulkPropertyUpdater('innerText');
    Elements.value = createBulkPropertyUpdater('value');
    Elements.placeholder = createBulkPropertyUpdater('placeholder');
    Elements.title = createBulkPropertyUpdater('title');
    Elements.disabled = createBulkPropertyUpdater('disabled');
    Elements.checked = createBulkPropertyUpdater('checked');
    Elements.readonly = createBulkPropertyUpdater('readOnly'); // Note: readOnly not readonly
    Elements.hidden = createBulkPropertyUpdater('hidden');
    Elements.selected = createBulkPropertyUpdater('selected');
    
    // Media properties
    Elements.src = createBulkPropertyUpdater('src');
    Elements.href = createBulkPropertyUpdater('href');
    Elements.alt = createBulkPropertyUpdater('alt');
    
    // Complex properties
    Elements.style = createBulkStyleUpdater();
    Elements.dataset = createBulkDatasetUpdater();
    Elements.attrs = createBulkAttributesUpdater();
    Elements.classes = createBulkClassListUpdater();
    
    // Generic property updater
    Elements.prop = createBulkGenericPropertyUpdater();

    return Elements;
  }

  /**
   * Enhance Collections helper with bulk property updaters (index-based)
   */
  function enhanceCollectionInstance(collectionInstance) {
    if (!collectionInstance || typeof collectionInstance !== 'object') {
      return collectionInstance;
    }

    // Store reference to collection for use in updaters
    const getElementByIndex = (index) => {
      if (collectionInstance._originalCollection) {
        return collectionInstance._originalCollection[index];
      } else if (collectionInstance._originalNodeList) {
        return collectionInstance._originalNodeList[index];
      } else if (typeof collectionInstance[index] !== 'undefined') {
        return collectionInstance[index];
      }
      return null;
    };

    // Create index-based updaters
    const createIndexBasedUpdater = (propertyName, transformer = null) => {
      return function(updates = {}) {
        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
          console.warn(`[DOM Helpers] ${propertyName}() requires an object with numeric indices as keys`);
          return this;
        }

        Object.entries(updates).forEach(([index, value]) => {
          try {
            const numIndex = parseInt(index);
            if (isNaN(numIndex)) return;

            const element = getElementByIndex(numIndex);
            
            if (element && element.nodeType === Node.ELEMENT_NODE) {
              const finalValue = transformer ? transformer(value) : value;
              
              if (element.update && typeof element.update === 'function') {
                element.update({ [propertyName]: finalValue });
              } else {
                element[propertyName] = finalValue;
              }
            }
          } catch (error) {
            console.warn(`[DOM Helpers] Error updating ${propertyName} at index ${index}: ${error.message}`);
          }
        });

        return this;
      };
    };

    const createIndexBasedStyleUpdater = () => {
      return function(updates = {}) {
        Object.entries(updates).forEach(([index, styleObj]) => {
          try {
            const numIndex = parseInt(index);
            if (isNaN(numIndex)) return;

            const element = getElementByIndex(numIndex);
            
            if (element && element.nodeType === Node.ELEMENT_NODE && typeof styleObj === 'object') {
              if (element.update && typeof element.update === 'function') {
                element.update({ style: styleObj });
              } else {
                Object.entries(styleObj).forEach(([prop, val]) => {
                  if (val !== null && val !== undefined) {
                    element.style[prop] = val;
                  }
                });
              }
            }
          } catch (error) {
            console.warn(`[DOM Helpers] Error updating style at index ${index}: ${error.message}`);
          }
        });
        return this;
      };
    };

    const createIndexBasedDatasetUpdater = () => {
      return function(updates = {}) {
        Object.entries(updates).forEach(([index, dataObj]) => {
          try {
            const numIndex = parseInt(index);
            if (isNaN(numIndex)) return;

            const element = getElementByIndex(numIndex);
            
            if (element && element.nodeType === Node.ELEMENT_NODE && typeof dataObj === 'object') {
              if (element.update && typeof element.update === 'function') {
                element.update({ dataset: dataObj });
              } else {
                Object.entries(dataObj).forEach(([key, val]) => {
                  element.dataset[key] = val;
                });
              }
            }
          } catch (error) {
            console.warn(`[DOM Helpers] Error updating dataset at index ${index}: ${error.message}`);
          }
        });
        return this;
      };
    };

    const createIndexBasedClassesUpdater = () => {
      return function(updates = {}) {
        Object.entries(updates).forEach(([index, classConfig]) => {
          try {
            const numIndex = parseInt(index);
            if (isNaN(numIndex)) return;

            const element = getElementByIndex(numIndex);
            
            if (element && element.nodeType === Node.ELEMENT_NODE) {
              if (typeof classConfig === 'string') {
                element.className = classConfig;
                return;
              }

              if (typeof classConfig === 'object' && classConfig !== null) {
                if (element.update && typeof element.update === 'function') {
                  element.update({ classList: classConfig });
                } else {
                  Object.entries(classConfig).forEach(([method, classes]) => {
                    const classList = Array.isArray(classes) ? classes : [classes];
                    switch (method) {
                      case 'add': element.classList.add(...classList); break;
                      case 'remove': element.classList.remove(...classList); break;
                      case 'toggle': classList.forEach(cls => element.classList.toggle(cls)); break;
                      case 'replace': 
                        if (classList.length === 2) element.classList.replace(classList[0], classList[1]); 
                        break;
                    }
                  });
                }
              }
            }
          } catch (error) {
            console.warn(`[DOM Helpers] Error updating classes at index ${index}: ${error.message}`);
          }
        });
        return this;
      };
    };

    // Add methods to collection instance
    try {
      Object.defineProperty(collectionInstance, 'textContent', {
        value: createIndexBasedUpdater('textContent'),
        writable: false,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(collectionInstance, 'innerHTML', {
        value: createIndexBasedUpdater('innerHTML'),
        writable: false,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(collectionInstance, 'value', {
        value: createIndexBasedUpdater('value'),
        writable: false,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(collectionInstance, 'style', {
        value: createIndexBasedStyleUpdater(),
        writable: false,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(collectionInstance, 'dataset', {
        value: createIndexBasedDatasetUpdater(),
        writable: false,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(collectionInstance, 'classes', {
        value: createIndexBasedClassesUpdater(),
        writable: false,
        enumerable: false,
        configurable: true
      });
    } catch (error) {
      // Fallback: direct assignment if defineProperty fails
      collectionInstance.textContent = createIndexBasedUpdater('textContent');
      collectionInstance.innerHTML = createIndexBasedUpdater('innerHTML');
      collectionInstance.value = createIndexBasedUpdater('value');
      collectionInstance.style = createIndexBasedStyleUpdater();
      collectionInstance.dataset = createIndexBasedDatasetUpdater();
      collectionInstance.classes = createIndexBasedClassesUpdater();
    }

    return collectionInstance;
  }

  /**
   * Wrap collection creation methods to auto-enhance instances
   */
  function wrapCollectionsHelper(Collections) {
    if (!Collections) return;

    // Store original proxy handlers
    const originalClassName = Collections.ClassName;
    const originalTagName = Collections.TagName;
    const originalName = Collections.Name;

    // Wrap ClassName
    Collections.ClassName = new Proxy(originalClassName, {
      get: (target, prop) => {
        const result = Reflect.get(target, prop);
        return enhanceCollectionInstance(result);
      },
      apply: (target, thisArg, args) => {
        const result = Reflect.apply(target, thisArg, args);
        return enhanceCollectionInstance(result);
      }
    });

    // Wrap TagName
    Collections.TagName = new Proxy(originalTagName, {
      get: (target, prop) => {
        const result = Reflect.get(target, prop);
        return enhanceCollectionInstance(result);
      },
      apply: (target, thisArg, args) => {
        const result = Reflect.apply(target, thisArg, args);
        return enhanceCollectionInstance(result);
      }
    });

    // Wrap Name
    Collections.Name = new Proxy(originalName, {
      get: (target, prop) => {
        const result = Reflect.get(target, prop);
        return enhanceCollectionInstance(result);
      },
      apply: (target, thisArg, args) => {
        const result = Reflect.apply(target, thisArg, args);
        return enhanceCollectionInstance(result);
      }
    });
  }


  // ===== AUTO-INITIALIZATION =====
  
  // Wait for DOM Helpers to be available
  function initializeBulkUpdaters() {
    if (typeof global.Elements !== 'undefined') {
      enhanceElementsHelper(global.Elements);
    }

    if (typeof global.Collections !== 'undefined') {
      wrapCollectionsHelper(global.Collections);
    }

    if (typeof global.DOMHelpers !== 'undefined') {
      global.DOMHelpers.BulkPropertyUpdaters = {
        version: '1.0.0',
        enhanceElementsHelper,
        enhanceCollectionInstance,
        wrapCollectionsHelper
      };
    }
  }

  // Initialize immediately if DOM Helpers are already loaded
  if (typeof global.Elements !== 'undefined' || typeof global.Collections !== 'undefined') {
    initializeBulkUpdaters();
  } else {
    // Wait for DOM to be ready and try again
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeBulkUpdaters);
      } else {
        // DOM already ready, try initialization after a short delay
        setTimeout(initializeBulkUpdaters, 100);
      }
    }
  }

  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      enhanceElementsHelper,
      enhanceCollectionInstance,
      wrapCollectionsHelper,
      initializeBulkUpdaters
    };
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return {
        enhanceElementsHelper,
        enhanceCollectionInstance,
        wrapCollectionsHelper,
        initializeBulkUpdaters
      };
    });
  } else {
    global.BulkPropertyUpdaters = {
      enhanceElementsHelper,
      enhanceCollectionInstance,
      wrapCollectionsHelper,
      initializeBulkUpdaters
    };
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);