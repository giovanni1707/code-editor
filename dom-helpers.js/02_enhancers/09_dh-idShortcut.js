/**
 * 09_dh-idShortcut.js
 *  DOM Helpers - Id Shortcut Module
 * 
 * Provides a shortcut function Id() that wraps Elements helper
 * Usage: Id('myButton') instead of Elements.myButton or document.getElementById('myButton')
 * 
 * Features:
 * - Automatic .update() method enhancement
 * - Full compatibility with core Elements helper
 * - Intelligent caching integration
 * - TypeScript-friendly design
 * 
 * @version 1.0.0
 * @license MIT
 * @requires dh-core.js (Elements helper)
 */

(function(global) {
  'use strict';

  // Verify Elements helper is available
  if (typeof global.Elements === 'undefined') {
    console.error('[Id Shortcut] Elements helper not found. Please load dh-core.js first.');
    return;
  }

  /**
   * Id Shortcut Function
   * Direct wrapper around Elements helper with enhanced element return
   * 
   * @param {string} id - Element ID to retrieve
   * @returns {HTMLElement|null} Enhanced element with .update() method or null if not found
   * 
   * @example
   * // Basic usage
   * const button = Id('submitBtn');
   * 
   * @example
   * // With chaining
   * Id('myButton').update({
   *   textContent: 'Click Me',
   *   style: { color: 'blue' }
   * });
   * 
   * @example
   * // Null-safe operations
   * const header = Id('header');
   * if (header) {
   *   header.textContent = 'Welcome!';
   * }
   */
  function Id(id) {
    // Validate input
    if (typeof id !== 'string') {
      console.warn('[Id] Invalid ID type. Expected string, got:', typeof id);
      return null;
    }

    // Trim whitespace
    id = id.trim();

    // Check for empty string
    if (id === '') {
      console.warn('[Id] Empty ID string provided');
      return null;
    }

    // Use Elements helper to get the element (leverages caching)
    return global.Elements[id];
  }

  // ===== ADVANCED FEATURES =====

  /**
   * Get multiple elements by ID at once
   * Returns an object with IDs as keys and elements as values
   * 
   * @param {...string} ids - Element IDs to retrieve
   * @returns {Object} Object with ID keys and element values
   * 
   * @example
   * const { header, footer, sidebar } = Id.multiple('header', 'footer', 'sidebar');
   * 
   * @example
   * // With destructuring and null checks
   * const elements = Id.multiple('btn1', 'btn2', 'btn3');
   * if (elements.btn1 && elements.btn2) {
   *   elements.btn1.textContent = 'First';
   *   elements.btn2.textContent = 'Second';
   * }
   */
  Id.multiple = function(...ids) {
    // Use Elements.destructure if available
    if (typeof global.Elements.destructure === 'function') {
      return global.Elements.destructure(...ids);
    }

    // Fallback implementation
    const result = {};
    ids.forEach(id => {
      result[id] = Id(id);
    });
    return result;
  };

  /**
   * Get required elements by ID (throws error if not found)
   * Useful for critical elements that must exist
   * 
   * @param {...string} ids - Element IDs that must exist
   * @returns {Object} Object with ID keys and element values
   * @throws {Error} If any required element is not found
   * 
   * @example
   * try {
   *   const { header, mainContent } = Id.required('header', 'mainContent');
   *   // Safe to use - guaranteed to exist
   *   header.textContent = 'Welcome';
   * } catch (error) {
   *   console.error('Required elements missing:', error.message);
   * }
   */
  Id.required = function(...ids) {
    // Use Elements.getRequired if available
    if (typeof global.Elements.getRequired === 'function') {
      return global.Elements.getRequired(...ids);
    }

    // Fallback implementation
    const elements = Id.multiple(...ids);
    const missing = ids.filter(id => !elements[id]);
    
    if (missing.length > 0) {
      throw new Error(`Required elements not found: ${missing.join(', ')}`);
    }
    
    return elements;
  };

  /**
   * Wait for element to appear in DOM
   * Useful for dynamically loaded content
   * 
   * @param {string} id - Element ID to wait for
   * @param {number} timeout - Maximum wait time in milliseconds (default: 5000)
   * @returns {Promise<HTMLElement>} Promise that resolves with element
   * @throws {Error} If timeout is reached
   * 
   * @example
   * // Wait for dynamic content
   * Id.waitFor('dynamicButton', 3000)
   *   .then(button => {
   *     button.textContent = 'Loaded!';
   *   })
   *   .catch(error => {
   *     console.error('Element never appeared:', error);
   *   });
   * 
   * @example
   * // With async/await
   * async function setupDynamicContent() {
   *   try {
   *     const modal = await Id.waitFor('modal');
   *     modal.style.display = 'block';
   *   } catch (error) {
   *     console.error('Modal not found');
   *   }
   * }
   */
  Id.waitFor = async function(id, timeout = 5000) {
    // Use Elements.waitFor if available
    if (typeof global.Elements.waitFor === 'function') {
      const result = await global.Elements.waitFor(id);
      return result[id];
    }

    // Fallback implementation
    const maxWait = timeout;
    const checkInterval = 100;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const element = Id(id);
      if (element) {
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error(`Timeout waiting for element with ID: ${id}`);
  };

  /**
   * Check if element exists by ID
   * 
   * @param {string} id - Element ID to check
   * @returns {boolean} True if element exists
   * 
   * @example
   * if (Id.exists('optionalFeature')) {
   *   Id('optionalFeature').classList.add('active');
   * }
   */
  Id.exists = function(id) {
    // Use Elements.exists if available
    if (typeof global.Elements.exists === 'function') {
      return global.Elements.exists(id);
    }

    // Fallback
    return !!Id(id);
  };

  /**
   * Get element with fallback value
   * 
   * @param {string} id - Element ID to retrieve
   * @param {*} fallback - Fallback value if element not found (default: null)
   * @returns {HTMLElement|*} Element or fallback value
   * 
   * @example
   * const button = Id.get('submitBtn', document.createElement('button'));
   * // Always returns a button element
   */
  Id.get = function(id, fallback = null) {
    // Use Elements.get if available
    if (typeof global.Elements.get === 'function') {
      return global.Elements.get(id, fallback);
    }

    // Fallback
    return Id(id) || fallback;
  };

  /**
   * Bulk update multiple elements by ID
   * 
   * @param {Object} updates - Object where keys are element IDs and values are update objects
   * @returns {Object} Results object with success/failure for each ID
   * 
   * @example
   * Id.update({
   *   header: { textContent: 'New Title', style: { color: 'red' } },
   *   footer: { textContent: 'Copyright 2024' },
   *   sidebar: { classList: { add: 'active' } }
   * });
   */
  Id.update = function(updates = {}) {
    // Use Elements.update if available
    if (typeof global.Elements.update === 'function') {
      return global.Elements.update(updates);
    }

    // Fallback implementation
    const results = {};
    Object.entries(updates).forEach(([id, updateData]) => {
      const element = Id(id);
      if (element && typeof element.update === 'function') {
        element.update(updateData);
        results[id] = { success: true };
      } else {
        results[id] = { success: false, error: 'Element not found or no update method' };
      }
    });
    return results;
  };

  /**
   * Set property on element by ID
   * 
   * @param {string} id - Element ID
   * @param {string} property - Property name
   * @param {*} value - Property value
   * @returns {boolean} True if successful
   * 
   * @example
   * Id.setProperty('myInput', 'value', 'Hello World');
   * Id.setProperty('myDiv', 'textContent', 'Updated text');
   */
  Id.setProperty = function(id, property, value) {
    // Use Elements.setProperty if available
    if (typeof global.Elements.setProperty === 'function') {
      return global.Elements.setProperty(id, property, value);
    }

    // Fallback
    const element = Id(id);
    if (element && property in element) {
      element[property] = value;
      return true;
    }
    return false;
  };

  /**
   * Get property from element by ID
   * 
   * @param {string} id - Element ID
   * @param {string} property - Property name
   * @param {*} fallback - Fallback value if property doesn't exist
   * @returns {*} Property value or fallback
   * 
   * @example
   * const value = Id.getProperty('myInput', 'value', '');
   * const text = Id.getProperty('myDiv', 'textContent', 'default');
   */
  Id.getProperty = function(id, property, fallback = undefined) {
    // Use Elements.getProperty if available
    if (typeof global.Elements.getProperty === 'function') {
      return global.Elements.getProperty(id, property, fallback);
    }

    // Fallback
    const element = Id(id);
    if (element && property in element) {
      return element[property];
    }
    return fallback;
  };

  /**
   * Set attribute on element by ID
   * 
   * @param {string} id - Element ID
   * @param {string} attribute - Attribute name
   * @param {string} value - Attribute value
   * @returns {boolean} True if successful
   * 
   * @example
   * Id.setAttribute('myImage', 'src', 'image.png');
   * Id.setAttribute('myLink', 'href', 'https://example.com');
   */
  Id.setAttribute = function(id, attribute, value) {
    // Use Elements.setAttribute if available
    if (typeof global.Elements.setAttribute === 'function') {
      return global.Elements.setAttribute(id, attribute, value);
    }

    // Fallback
    const element = Id(id);
    if (element) {
      element.setAttribute(attribute, value);
      return true;
    }
    return false;
  };

  /**
   * Get attribute from element by ID
   * 
   * @param {string} id - Element ID
   * @param {string} attribute - Attribute name
   * @param {*} fallback - Fallback value if attribute doesn't exist
   * @returns {string|*} Attribute value or fallback
   * 
   * @example
   * const src = Id.getAttribute('myImage', 'src', 'default.png');
   * const href = Id.getAttribute('myLink', 'href', '#');
   */
  Id.getAttribute = function(id, attribute, fallback = null) {
    // Use Elements.getAttribute if available
    if (typeof global.Elements.getAttribute === 'function') {
      return global.Elements.getAttribute(id, attribute, fallback);
    }

    // Fallback
    const element = Id(id);
    if (element) {
      return element.getAttribute(attribute) || fallback;
    }
    return fallback;
  };

  /**
   * Access to underlying Elements helper
   * Useful for advanced features and statistics
   */
  Id.Elements = global.Elements;

  /**
   * Get statistics from Elements helper
   * 
   * @returns {Object} Statistics object with cache hits, misses, etc.
   * 
   * @example
   * const stats = Id.stats();
   * console.log('Cache hit rate:', stats.hitRate);
   */
  Id.stats = function() {
    if (typeof global.Elements.stats === 'function') {
      return global.Elements.stats();
    }
    return {};
  };

  /**
   * Check if element is cached
   * 
   * @param {string} id - Element ID to check
   * @returns {boolean} True if element is in cache
   * 
   * @example
   * if (Id.isCached('myButton')) {
   *   console.log('Element is in cache - fast access!');
   * }
   */
  Id.isCached = function(id) {
    if (typeof global.Elements.isCached === 'function') {
      return global.Elements.isCached(id);
    }
    return false;
  };

  /**
   * Clear Elements cache
   * Useful for testing or after major DOM changes
   * 
   * @example
   * // After removing many elements
   * Id.clearCache();
   */
  Id.clearCache = function() {
    if (typeof global.Elements.clear === 'function') {
      global.Elements.clear();
    }
  };

  // ===== EXPORT =====

  // Export for different environments
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js/CommonJS
    module.exports = Id;
  } else if (typeof define === 'function' && define.amd) {
    // AMD/RequireJS
    define([], function() {
      return Id;
    });
  } else {
    // Browser globals
    global.Id = Id;
  }

  // Add to DOMHelpers if available
  if (typeof global.DOMHelpers !== 'undefined') {
    global.DOMHelpers.Id = Id;
  }

  // Development mode logging
  if (typeof console !== 'undefined' && console.log) {
    const isDevelopment = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') ||
                          (typeof location !== 'undefined' && location.hostname === 'localhost');
    
    if (isDevelopment) {
      console.log('[Id Shortcut] Module loaded successfully. Usage: Id("elementId")');
    }
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);