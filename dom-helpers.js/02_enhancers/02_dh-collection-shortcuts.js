/**
 * 02_dh-collection-shortcuts
 * 
 * Collection Shortcuts for DOM Helpers (Enhanced with Index Support)
 * Provides ClassName, TagName, Name globally with index selection
 * 
 * Usage:
 *   ClassName.button              // All buttons
 *   ClassName.button[0]           // First button
 *   ClassName.button[1]           // Second button
 *   ClassName.button[-1]          // Last button
 *   ClassName['container.item'][2] // Third item in container
 * 
 * @version 2.0.1
 * @requires DOM Helpers Library (Collections helper)
 * @license MIT
 */

(function(global) {
  'use strict';

  // ===== DEPENDENCY CHECK =====
  if (typeof global.Collections === 'undefined') {
    console.error('[Global Shortcuts] Collections helper not found. Please load DOM Helpers library first.');
    return;
  }

  // ===== ENHANCED COLLECTION WRAPPER =====
  /**
   * Creates an enhanced collection wrapper with index access
   * @param {Object} collection - The original collection from Collections helper
   * @returns {Proxy} - Enhanced collection with index support
   */
  function createEnhancedCollectionWrapper(collection) {
    if (!collection) return collection;

    // If it's already a proxy or doesn't need enhancement, return as is
    if (collection._isEnhancedWrapper) {
      return collection;
    }

    // Create a proxy that intercepts numeric index access
    return new Proxy(collection, {
      get(target, prop) {
        // CRITICAL: Handle symbols BEFORE isNaN check (for Array.from, spread operator, etc.)
        if (typeof prop === 'symbol') {
          return target[prop];
        }

        // Handle special properties that should pass through directly
        if (prop === 'constructor' || 
            prop === 'prototype' ||
            prop === 'length' ||
            prop === 'toString' ||
            prop === 'valueOf' ||
            prop === 'toLocaleString' ||
            prop === '_isEnhancedWrapper' ||
            prop === '_originalCollection' ||
            prop === '_originalNodeList' ||
            prop === '_hasIndexedUpdateSupport' ||
            prop === 'update' ||
            prop === 'item' ||
            prop === 'entries' ||
            prop === 'keys' ||
            prop === 'values' ||
            prop === 'forEach' ||
            prop === 'namedItem') {
          return target[prop];
        }

        // Handle numeric indices (including negative indices)
        if (!isNaN(prop)) {
          const index = parseInt(prop);
          let element;

          // Handle negative indices (e.g., -1 for last element)
          if (index < 0) {
            const positiveIndex = target.length + index;
            element = target[positiveIndex];
          } else {
            element = target[index];
          }

          // Enhance the element with update method if available
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            if (global.EnhancedUpdateUtility && global.EnhancedUpdateUtility.enhanceElementWithUpdate) {
              return global.EnhancedUpdateUtility.enhanceElementWithUpdate(element);
            }
          }

          return element;
        }

        // Return the original property
        return target[prop];
      },

      set(target, prop, value) {
        // Handle symbols
        if (typeof prop === 'symbol') {
          return false;
        }

        // Allow setting numeric indices
        if (!isNaN(prop)) {
          const index = parseInt(prop);
          if (index >= 0 && index < target.length) {
            // Can't directly set elements in a live collection
            console.warn('[Global Shortcuts] Cannot set element at index in live collection');
            return false;
          }
        }
        
        // Try to set other properties
        try {
          target[prop] = value;
          return true;
        } catch (e) {
          return false;
        }
      }
    });
  }

  // ===== PROXY CREATION HELPER =====
  /**
   * Creates a global proxy that forwards to Collections[type]
   * @param {string} type - The collection type (ClassName, TagName, or Name)
   * @returns {Proxy} - Global proxy function with property access
   */
  function createGlobalCollectionProxy(type) {
    const collectionHelper = global.Collections[type];
    
    if (!collectionHelper) {
      console.warn(`[Global Shortcuts] Collections.${type} not found`);
      return null;
    }

    // Base function for function-style calls
    const baseFunction = function(value) {
      const collection = collectionHelper(value);
      return createEnhancedCollectionWrapper(collection);
    };

    // Create proxy for both function calls and property access
    return new Proxy(baseFunction, {
      /**
       * Handle property access (e.g., ClassName.button)
       */
      get: (target, prop) => {
        // Handle function intrinsics
        if (typeof prop === 'symbol' || 
            prop === 'constructor' || 
            prop === 'prototype' ||
            prop === 'apply' ||
            prop === 'call' ||
            prop === 'bind' ||
            prop === 'length' ||
            prop === 'name') {
          return target[prop];
        }

        // Handle toString/valueOf
        if (prop === 'toString' || prop === 'valueOf') {
          return target[prop];
        }

        // Get collection from Collections helper
        const collection = collectionHelper[prop];

        // Return enhanced wrapper
        return createEnhancedCollectionWrapper(collection);
      },

      /**
       * Handle function calls (e.g., ClassName('button'))
       */
      apply: (target, thisArg, args) => {
        const collection = collectionHelper(...args);
        return createEnhancedCollectionWrapper(collection);
      },

      /**
       * Handle 'in' operator
       */
      has: (target, prop) => {
        return prop in collectionHelper;
      },

      /**
       * Handle Object.keys(), for...in, etc.
       */
      ownKeys: (target) => {
        return Reflect.ownKeys(collectionHelper);
      },

      /**
       * Handle Object.getOwnPropertyDescriptor()
       */
      getOwnPropertyDescriptor: (target, prop) => {
        return Reflect.getOwnPropertyDescriptor(collectionHelper, prop);
      }
    });
  }

  // ===== CREATE GLOBAL SHORTCUTS =====

  /**
   * Global ClassName - Access elements by class name with index support
   * @example
   *   ClassName.button              // All buttons
   *   ClassName.button[0]           // First button
   *   ClassName.button[2]           // Third button
   *   ClassName.button[-1]          // Last button
   *   ClassName['container.item'][1] // Second item in container
   */
  const ClassName = createGlobalCollectionProxy('ClassName');

  /**
   * Global TagName - Access elements by tag name with index support
   * @example
   *   TagName.div              // All divs
   *   TagName.div[0]           // First div
   *   TagName.p[-1]            // Last paragraph
   */
  const TagName = createGlobalCollectionProxy('TagName');

  /**
   * Global Name - Access elements by name attribute with index support
   * @example
   *   Name.username              // All elements with name="username"
   *   Name.username[0]           // First username input
   */
  const Name = createGlobalCollectionProxy('Name');

  // ===== EXPORT TO GLOBAL SCOPE =====

  if (ClassName) global.ClassName = ClassName;
  if (TagName) global.TagName = TagName;
  if (Name) global.Name = Name;

  // ===== INTEGRATE WITH DOM HELPERS =====

  if (typeof global.DOMHelpers !== 'undefined') {
    if (ClassName) global.DOMHelpers.ClassName = ClassName;
    if (TagName) global.DOMHelpers.TagName = TagName;
    if (Name) global.DOMHelpers.Name = Name;
  }

  // ===== EXPORT FOR MODULE SYSTEMS =====

  const GlobalCollectionShortcuts = {
    ClassName,
    TagName,
    Name,
    version: '2.0.1'
  };

  // CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalCollectionShortcuts;
  }

  // AMD
  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return GlobalCollectionShortcuts;
    });
  }

  // Browser global
  global.GlobalCollectionShortcuts = GlobalCollectionShortcuts;

  // ===== LOGGING =====

  if (typeof console !== 'undefined' && console.log) {
    console.log('[DOM Helpers] Global shortcuts v2.0.1 loaded with index support');
    console.log('[DOM Helpers] Usage: ClassName.button[0], TagName.div[1], Name.username[-1]');
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);