/**
 * 07_dh-bulk-properties-updater-global-query
 * 
 * bulk-properties-updater-global-query
 * 
 * DOM Helpers - Enhanced Query Selectors Extension
 * Adds querySelector/querySelectorAll with .update() support and bulk property methods
 * 
 * @version 1.0.0
 * @license MIT
 */

(function(global) {
  'use strict';

  // ===== ENHANCED ELEMENT WITH UPDATE METHOD =====
  
  /**
   * Enhance a single element with .update() method
   * @param {HTMLElement} element - DOM element to enhance
   * @returns {HTMLElement} - Enhanced element
   */
  function enhanceElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return element;
    }

    // Don't re-enhance if already enhanced
    if (element._domHelpersEnhanced) {
      return element;
    }

    // Mark as enhanced
    Object.defineProperty(element, '_domHelpersEnhanced', {
      value: true,
      writable: false,
      enumerable: false,
      configurable: false
    });

    /**
     * Update method for batch property updates
     * @param {Object} updates - Object containing properties to update
     */
    const updateMethod = function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] update() requires an object with properties to update');
        return this;
      }

      Object.entries(updates).forEach(([key, value]) => {
        try {
          switch (key) {
            case 'style':
              if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([prop, val]) => {
                  if (val !== null && val !== undefined) {
                    this.style[prop] = val;
                  }
                });
              }
              break;

            case 'dataset':
              if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([dataKey, dataVal]) => {
                  this.dataset[dataKey] = dataVal;
                });
              }
              break;

            case 'classList':
              if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([method, classes]) => {
                  const classList = Array.isArray(classes) ? classes : [classes];
                  switch (method) {
                    case 'add':
                      this.classList.add(...classList);
                      break;
                    case 'remove':
                      this.classList.remove(...classList);
                      break;
                    case 'toggle':
                      classList.forEach(cls => this.classList.toggle(cls));
                      break;
                    case 'replace':
                      if (classList.length === 2) {
                        this.classList.replace(classList[0], classList[1]);
                      }
                      break;
                  }
                });
              }
              break;

            case 'attrs':
            case 'attributes':
              if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([attrName, attrValue]) => {
                  if (attrValue === null || attrValue === false) {
                    this.removeAttribute(attrName);
                  } else {
                    this.setAttribute(attrName, String(attrValue));
                  }
                });
              }
              break;

            default:
              // Direct property assignment
              if (key in this) {
                this[key] = value;
              } else {
                console.warn(`[DOM Helpers] Property '${key}' not found on element`);
              }
          }
        } catch (error) {
          console.warn(`[DOM Helpers] Error updating property '${key}': ${error.message}`);
        }
      });

      return this; // Return for chaining
    };

    // Add update method
    Object.defineProperty(element, 'update', {
      value: updateMethod,
      writable: false,
      enumerable: false,
      configurable: true
    });

    return element;
  }

  // ===== BULK PROPERTY UPDATERS FOR COLLECTIONS =====

  /**
   * Create index-based bulk property updater
   */
  function createIndexBasedPropertyUpdater(propertyName, transformer = null) {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn(`[DOM Helpers] ${propertyName}() requires an object with numeric indices as keys`);
        return this;
      }

      Object.entries(updates).forEach(([index, value]) => {
        try {
          const numIndex = parseInt(index);
          if (isNaN(numIndex)) return;

          const element = this[numIndex];
          
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
  }

  /**
   * Create index-based style updater
   */
  function createIndexBasedStyleUpdater() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] style() requires an object with numeric indices as keys');
        return this;
      }

      Object.entries(updates).forEach(([index, styleObj]) => {
        try {
          const numIndex = parseInt(index);
          if (isNaN(numIndex)) return;

          const element = this[numIndex];
          
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            if (typeof styleObj !== 'object' || styleObj === null) {
              console.warn(`[DOM Helpers] style() requires style object for index ${index}`);
              return;
            }

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
  }

  /**
   * Create index-based dataset updater
   */
  function createIndexBasedDatasetUpdater() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] dataset() requires an object with numeric indices as keys');
        return this;
      }

      Object.entries(updates).forEach(([index, dataObj]) => {
        try {
          const numIndex = parseInt(index);
          if (isNaN(numIndex)) return;

          const element = this[numIndex];
          
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            if (typeof dataObj !== 'object' || dataObj === null) {
              console.warn(`[DOM Helpers] dataset() requires data object for index ${index}`);
              return;
            }

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
  }

  /**
   * Create index-based attributes updater
   */
  function createIndexBasedAttributesUpdater() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] attrs() requires an object with numeric indices as keys');
        return this;
      }

      Object.entries(updates).forEach(([index, attrsObj]) => {
        try {
          const numIndex = parseInt(index);
          if (isNaN(numIndex)) return;

          const element = this[numIndex];
          
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            if (typeof attrsObj !== 'object' || attrsObj === null) {
              console.warn(`[DOM Helpers] attrs() requires attributes object for index ${index}`);
              return;
            }

            Object.entries(attrsObj).forEach(([attrName, attrValue]) => {
              if (attrValue === null || attrValue === false) {
                element.removeAttribute(attrName);
              } else {
                element.setAttribute(attrName, String(attrValue));
              }
            });
          }
        } catch (error) {
          console.warn(`[DOM Helpers] Error updating attrs at index ${index}: ${error.message}`);
        }
      });

      return this;
    };
  }

  /**
   * Create index-based classList updater
   */
  function createIndexBasedClassListUpdater() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] classes() requires an object with numeric indices as keys');
        return this;
      }

      Object.entries(updates).forEach(([index, classConfig]) => {
        try {
          const numIndex = parseInt(index);
          if (isNaN(numIndex)) return;

          const element = this[numIndex];
          
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
          }
        } catch (error) {
          console.warn(`[DOM Helpers] Error updating classes at index ${index}: ${error.message}`);
        }
      });

      return this;
    };
  }

  /**
   * Create index-based generic property updater
   */
  function createIndexBasedGenericPropertyUpdater() {
    return function(propertyPath, updates = {}) {
      if (typeof propertyPath !== 'string') {
        console.warn('[DOM Helpers] prop() requires a property name as first argument');
        return this;
      }

      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] prop() requires an object with numeric indices as keys');
        return this;
      }

      // Check if property path is nested (e.g., 'style.color')
      const isNested = propertyPath.includes('.');
      const pathParts = isNested ? propertyPath.split('.') : null;

      Object.entries(updates).forEach(([index, value]) => {
        try {
          const numIndex = parseInt(index);
          if (isNaN(numIndex)) return;

          const element = this[numIndex];
          
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            if (isNested) {
              // Handle nested property (e.g., style.color)
              let obj = element;
              for (let i = 0; i < pathParts.length - 1; i++) {
                obj = obj[pathParts[i]];
                if (!obj) {
                  console.warn(`[DOM Helpers] Invalid property path '${propertyPath}' at index ${index}`);
                  return;
                }
              }
              obj[pathParts[pathParts.length - 1]] = value;
            } else {
              // Direct property assignment
              if (propertyPath in element) {
                element[propertyPath] = value;
              } else {
                console.warn(`[DOM Helpers] Property '${propertyPath}' not found on element at index ${index}`);
              }
            }
          }
        } catch (error) {
          console.warn(`[DOM Helpers] Error updating prop '${propertyPath}' at index ${index}: ${error.message}`);
        }
      });

      return this;
    };
  }

  // ===== ENHANCED NODELIST WITH UPDATE AND BULK METHODS =====
  
  /**
   * Create an enhanced NodeList-like object with .update() method and bulk property methods
   * @param {NodeList|Array} nodeList - Original NodeList or array of elements
   * @returns {Object} - Enhanced collection
   */
  function enhanceNodeList(nodeList) {
    if (!nodeList || nodeList.length === 0) {
      // Return empty enhanced array with methods
      const emptyArray = [];
      emptyArray.update = function() { return this; };
      
      // Add bulk property methods that do nothing but return for chaining
      const noopMethod = function() { return this; };
      emptyArray.textContent = noopMethod;
      emptyArray.innerHTML = noopMethod;
      emptyArray.innerText = noopMethod;
      emptyArray.value = noopMethod;
      emptyArray.placeholder = noopMethod;
      emptyArray.title = noopMethod;
      emptyArray.disabled = noopMethod;
      emptyArray.checked = noopMethod;
      emptyArray.readonly = noopMethod;
      emptyArray.hidden = noopMethod;
      emptyArray.selected = noopMethod;
      emptyArray.src = noopMethod;
      emptyArray.href = noopMethod;
      emptyArray.alt = noopMethod;
      emptyArray.style = noopMethod;
      emptyArray.dataset = noopMethod;
      emptyArray.attrs = noopMethod;
      emptyArray.classes = noopMethod;
      emptyArray.prop = noopMethod;
      
      return emptyArray;
    }

    // Convert NodeList to array and enhance each element
    const elements = Array.from(nodeList).map(el => enhanceElement(el));

    // Create proxy object that acts like an array
    const enhancedCollection = Object.create(Array.prototype);
    
    // Copy array elements
    elements.forEach((el, index) => {
      enhancedCollection[index] = el;
    });

    // Set length
    Object.defineProperty(enhancedCollection, 'length', {
      value: elements.length,
      writable: false,
      enumerable: false,
      configurable: false
    });

    // Store original NodeList reference
    Object.defineProperty(enhancedCollection, '_originalNodeList', {
      value: nodeList,
      writable: false,
      enumerable: false,
      configurable: false
    });

    /**
     * Bulk update method for collections
     * Supports both index-based and array-wide updates
     * @param {Object} updates - Updates object
     */
    const updateMethod = function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[DOM Helpers] update() requires an object with updates');
        return this;
      }

      Object.entries(updates).forEach(([key, value]) => {
        // Check if key is numeric (index-based update)
        const numericIndex = parseInt(key);
        
        if (!isNaN(numericIndex) && numericIndex >= 0 && numericIndex < this.length) {
          // Index-based update: apply nested updates to specific element
          const element = this[numericIndex];
          if (element && element.update) {
            element.update(value);
          }
        } else {
          // Property-wide update: apply same property to all elements
          this.forEach((element, index) => {
            if (element && element.update) {
              element.update({ [key]: value });
            }
          });
        }
      });

      return this; // Return for chaining
    };

    // Define methods using Object.defineProperty for non-enumerable properties
    const defineMethod = (name, method) => {
      try {
        Object.defineProperty(enhancedCollection, name, {
          value: method,
          writable: false,
          enumerable: false,
          configurable: true
        });
      } catch (error) {
        // Fallback: direct assignment if defineProperty fails
        enhancedCollection[name] = method;
      }
    };

    // Add update method
    defineMethod('update', updateMethod);

    // Add Array methods if not inherited properly
    defineMethod('forEach', Array.prototype.forEach);
    defineMethod('map', Array.prototype.map);
    defineMethod('filter', Array.prototype.filter);
    defineMethod('find', Array.prototype.find);
    defineMethod('findIndex', Array.prototype.findIndex);
    defineMethod('some', Array.prototype.some);
    defineMethod('every', Array.prototype.every);
    defineMethod('reduce', Array.prototype.reduce);
    defineMethod('slice', Array.prototype.slice);

    // ===== ADD BULK PROPERTY UPDATER METHODS =====

    // Common simple properties
    defineMethod('textContent', createIndexBasedPropertyUpdater('textContent'));
    defineMethod('innerHTML', createIndexBasedPropertyUpdater('innerHTML'));
    defineMethod('innerText', createIndexBasedPropertyUpdater('innerText'));
    defineMethod('value', createIndexBasedPropertyUpdater('value'));
    defineMethod('placeholder', createIndexBasedPropertyUpdater('placeholder'));
    defineMethod('title', createIndexBasedPropertyUpdater('title'));
    defineMethod('disabled', createIndexBasedPropertyUpdater('disabled'));
    defineMethod('checked', createIndexBasedPropertyUpdater('checked'));
    defineMethod('readonly', createIndexBasedPropertyUpdater('readOnly')); // Note: readOnly not readonly
    defineMethod('hidden', createIndexBasedPropertyUpdater('hidden'));
    defineMethod('selected', createIndexBasedPropertyUpdater('selected'));
    
    // Media properties
    defineMethod('src', createIndexBasedPropertyUpdater('src'));
    defineMethod('href', createIndexBasedPropertyUpdater('href'));
    defineMethod('alt', createIndexBasedPropertyUpdater('alt'));
    
    // Complex properties
    defineMethod('style', createIndexBasedStyleUpdater());
    defineMethod('dataset', createIndexBasedDatasetUpdater());
    defineMethod('attrs', createIndexBasedAttributesUpdater());
    defineMethod('classes', createIndexBasedClassListUpdater());
    
    // Generic property updater
    defineMethod('prop', createIndexBasedGenericPropertyUpdater());

    return enhancedCollection;
  }

  // ===== ENHANCED QUERY SELECTOR FUNCTIONS =====

  /**
   * Enhanced querySelector - returns element with .update() method
   * @param {string} selector - CSS selector
   * @param {HTMLElement} [context=document] - Context element for query
   * @returns {HTMLElement|null} - Enhanced element or null
   */
  function querySelector(selector, context = document) {
    if (typeof selector !== 'string') {
      console.warn('[DOM Helpers] querySelector requires a string selector');
      return null;
    }

    try {
      const element = (context || document).querySelector(selector);
      return element ? enhanceElement(element) : null;
    } catch (error) {
      console.error(`[DOM Helpers] querySelector error: ${error.message}`);
      return null;
    }
  }

  /**
   * Enhanced querySelectorAll - returns collection with .update() method and bulk property methods
   * @param {string} selector - CSS selector
   * @param {HTMLElement} [context=document] - Context element for query
   * @returns {Object} - Enhanced NodeList-like collection
   */
  function querySelectorAll(selector, context = document) {
    if (typeof selector !== 'string') {
      console.warn('[DOM Helpers] querySelectorAll requires a string selector');
      return enhanceNodeList([]);
    }

    try {
      const nodeList = (context || document).querySelectorAll(selector);
      return enhanceNodeList(nodeList);
    } catch (error) {
      console.error(`[DOM Helpers] querySelectorAll error: ${error.message}`);
      return enhanceNodeList([]);
    }
  }

  /**
   * Shorthand alias: query
   */
  const query = querySelector;

  /**
   * Shorthand alias: queryAll
   */
  const queryAll = querySelectorAll;

  // ===== EXPORT AND GLOBAL REGISTRATION =====

  const EnhancedQuerySelectors = {
    querySelector,
    querySelectorAll,
    query,
    queryAll,
    enhanceElement,
    enhanceNodeList,
    version: '1.0.0'
  };

  // Register globally
  if (typeof global !== 'undefined') {
    global.querySelector = querySelector;
    global.querySelectorAll = querySelectorAll;
    global.query = query;
    global.queryAll = queryAll;
  }

  // Register with DOMHelpers if available
  if (typeof global.DOMHelpers !== 'undefined') {
    global.DOMHelpers.EnhancedQuerySelectors = EnhancedQuerySelectors;
  }

  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedQuerySelectors;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return EnhancedQuerySelectors;
    });
  } else {
    global.EnhancedQuerySelectors = EnhancedQuerySelectors;
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);