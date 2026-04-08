/**
 * 04_Conditions.apply() - Standalone Collection-Aware Implementation
 * Works independently without requiring DOM Helpers
 * Supports index-specific updates + shared properties + DEFAULT BRANCH
 * 
 * @version 2.0.0 - Added default branch support
 * @license MIT
 */

(function(global) {
  'use strict';

  // ============================================================================
  // SAFE ARRAY CONVERSION
  // ============================================================================

  /**
   * Safely convert any collection to array, avoiding Symbol issues
   */
  function safeArrayFrom(collection) {
    if (!collection) return [];
    
    // Already an array
    if (Array.isArray(collection)) {
      return collection;
    }
    
    // Standard NodeList or HTMLCollection
    if (collection instanceof NodeList || collection instanceof HTMLCollection) {
      return Array.from(collection);
    }
    
    // Custom collection with length property
    if (typeof collection === 'object' && 'length' in collection) {
      const elements = [];
      const len = Number(collection.length);
      if (!isNaN(len) && len >= 0) {
        for (let i = 0; i < len; i++) {
          // Only access numeric indices, skip Symbols
          if (Object.prototype.hasOwnProperty.call(collection, i)) {
            const item = collection[i];
            if (item instanceof Element) {
              elements.push(item);
            }
          }
        }
      }
      return elements;
    }
    
    return [];
  }

  // ============================================================================
  // ELEMENT SELECTOR
  // ============================================================================

  /**
   * Get elements from various selector types
   */
  function getElements(selector) {
    // Single element
    if (selector instanceof Element) {
      return [selector];
    }
    
    // NodeList or HTMLCollection
    if (selector instanceof NodeList || selector instanceof HTMLCollection) {
      return safeArrayFrom(selector);
    }
    
    // Array
    if (Array.isArray(selector)) {
      return selector.filter(el => el instanceof Element);
    }

    // String selector
    if (typeof selector === 'string') {
      // ID selector
      if (selector.startsWith('#')) {
        const el = document.getElementById(selector.slice(1));
        return el ? [el] : [];
      }
      
      // Class selector
      if (selector.startsWith('.')) {
        return safeArrayFrom(document.getElementsByClassName(selector.slice(1)));
      }
      
      // Generic selector
      return safeArrayFrom(document.querySelectorAll(selector));
    }

    return [];
  }

  // ============================================================================
  // CONDITION MATCHING
  // ============================================================================

  /**
   * Match value against condition string
   */
  function matchesCondition(value, condition) {
    condition = String(condition).trim();
    
    // Boolean literals
    if (condition === 'true') return value === true;
    if (condition === 'false') return value === false;
    if (condition === 'truthy') return !!value;
    if (condition === 'falsy') return !value;
    
    // Null/Undefined
    if (condition === 'null') return value === null;
    if (condition === 'undefined') return value === undefined;
    
    // Empty check
    if (condition === 'empty') {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string') return value.length === 0;
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return !value;
    }
    
    // Quoted strings
    if ((condition.startsWith('"') && condition.endsWith('"')) ||
        (condition.startsWith("'") && condition.endsWith("'"))) {
      return String(value) === condition.slice(1, -1);
    }
    
    // String pattern matching
    if (condition.startsWith('includes:')) {
      return String(value).includes(condition.slice(9).trim());
    }
    if (condition.startsWith('startsWith:')) {
      return String(value).startsWith(condition.slice(11).trim());
    }
    if (condition.startsWith('endsWith:')) {
      return String(value).endsWith(condition.slice(9).trim());
    }
    
    // Regex pattern
    if (condition.startsWith('/') && condition.lastIndexOf('/') > 0) {
      try {
        const lastSlash = condition.lastIndexOf('/');
        const pattern = condition.slice(1, lastSlash);
        const flags = condition.slice(lastSlash + 1);
        const regex = new RegExp(pattern, flags);
        return regex.test(String(value));
      } catch (e) {
        console.warn('[Conditions] Invalid regex:', condition);
        return false;
      }
    }
    
    // Numeric comparisons (only if value is a number)
    if (typeof value === 'number') {
      // Range: 10-20
      if (condition.includes('-') && !condition.startsWith('<') && 
          !condition.startsWith('>') && !condition.startsWith('=')) {
        const parts = condition.split('-').map(p => p.trim());
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const [min, max] = parts.map(Number);
          return value >= min && value <= max;
        }
      }
      
      // Exact number
      if (!isNaN(condition)) {
        return value === Number(condition);
      }
      
      // >= <= > 
      if (condition.startsWith('>=')) {
        const target = Number(condition.slice(2).trim());
        return !isNaN(target) && value >= target;
      }
      if (condition.startsWith('<=')) {
        const target = Number(condition.slice(2).trim());
        return !isNaN(target) && value <= target;
      }
      if (condition.startsWith('>') && !condition.startsWith('>=')) {
        const target = Number(condition.slice(1).trim());
        return !isNaN(target) && value > target;
      }
      if (condition.startsWith('<') && !condition.startsWith('<=')) {
        const target = Number(condition.slice(1).trim());
        return !isNaN(target) && value < target;
      }
    }
    
    // Default: string equality
    return String(value) === condition;
  }

  // ============================================================================
  // PROPERTY APPLICATION
  // ============================================================================

  /**
   * Apply a single property to an element
   */
  function applyProperty(element, key, val) {
    try {
      // Style object
      if (key === 'style' && typeof val === 'object' && val !== null) {
        Object.entries(val).forEach(([prop, value]) => {
          if (value !== null && value !== undefined) {
            element.style[prop] = value;
          }
        });
        return;
      }
      
      // classList operations
      if (key === 'classList' && typeof val === 'object' && val !== null) {
        if (Array.isArray(val)) {
          element.className = '';
          val.forEach(cls => cls && element.classList.add(cls));
        } else {
          if (val.add) {
            const classes = Array.isArray(val.add) ? val.add : [val.add];
            classes.forEach(cls => cls && element.classList.add(cls));
          }
          if (val.remove) {
            const classes = Array.isArray(val.remove) ? val.remove : [val.remove];
            classes.forEach(cls => cls && element.classList.remove(cls));
          }
          if (val.toggle) {
            const classes = Array.isArray(val.toggle) ? val.toggle : [val.toggle];
            classes.forEach(cls => cls && element.classList.toggle(cls));
          }
        }
        return;
      }
      
      // setAttribute / attrs
      if ((key === 'attrs' || key === 'setAttribute') && 
          typeof val === 'object' && val !== null) {
        Object.entries(val).forEach(([attr, attrVal]) => {
          if (attrVal === null || attrVal === undefined || attrVal === false) {
            element.removeAttribute(attr);
          } else {
            element.setAttribute(attr, String(attrVal));
          }
        });
        return;
      }
      
      // removeAttribute
      if (key === 'removeAttribute') {
        if (Array.isArray(val)) {
          val.forEach(attr => element.removeAttribute(attr));
        } else if (typeof val === 'string') {
          element.removeAttribute(val);
        }
        return;
      }
      
      // dataset
      if (key === 'dataset' && typeof val === 'object' && val !== null) {
        Object.entries(val).forEach(([dataKey, dataVal]) => {
          element.dataset[dataKey] = String(dataVal);
        });
        return;
      }
      
      // addEventListener
      if (key === 'addEventListener' && typeof val === 'object' && val !== null) {
        Object.entries(val).forEach(([event, handlerConfig]) => {
          let handler, options;
          
          if (typeof handlerConfig === 'function') {
            handler = handlerConfig;
          } else if (typeof handlerConfig === 'object' && handlerConfig !== null) {
            handler = handlerConfig.handler;
            options = handlerConfig.options;
          }
          
          if (handler && typeof handler === 'function') {
            element.addEventListener(event, handler, options);
          }
        });
        return;
      }
      
      // on* event properties
      if (key.startsWith('on') && typeof val === 'function') {
        element[key] = val;
        return;
      }
      
      // Native DOM property
      if (key in element) {
        element[key] = val;
        return;
      }
      
      // Fallback: setAttribute for primitives
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        element.setAttribute(key, String(val));
      }
      
    } catch (e) {
      console.warn(`[Conditions] Failed to apply ${key}:`, e);
    }
  }

  /**
   * Apply configuration object to element
   */
  function applyConfig(element, config) {
    Object.entries(config).forEach(([key, val]) => {
      applyProperty(element, key, val);
    });
  }

  // ============================================================================
  // COLLECTION-AWARE APPLICATION
  // ============================================================================

  /**
   * Apply conditions to collection with index support
   */
  function applyToCollection(elements, config) {
    // Separate index-specific and shared properties
    const sharedProps = {};
    const indexProps = {};
    
    Object.entries(config).forEach(([key, value]) => {
      // Check if key is a numeric index (including negative)
      if (/^-?\d+$/.test(key)) {
        indexProps[key] = value;
      } else {
        sharedProps[key] = value;
      }
    });
    
    // Apply shared properties to ALL elements
    if (Object.keys(sharedProps).length > 0) {
      elements.forEach(element => {
        applyConfig(element, sharedProps);
      });
    }
    
    // Apply index-specific properties
    Object.entries(indexProps).forEach(([indexStr, updates]) => {
      let index = parseInt(indexStr);
      
      // Handle negative indices
      if (index < 0) {
        index = elements.length + index;
      }
      
      // Apply if index is valid
      if (index >= 0 && index < elements.length) {
        const element = elements[index];
        applyConfig(element, updates);
      }
    });
  }

  // ============================================================================
  // PUBLIC API WITH DEFAULT BRANCH SUPPORT
  // ============================================================================

  const ConditionsApply = {
    /**
     * Apply conditions to elements (collection-aware + default branch)
     * @param {*} value - Current value to match against
     * @param {Object} conditions - Condition mappings (can include 'default')
     * @param {string|Element|NodeList|Array} selector - Target elements
     */
    apply(value, conditions, selector) {
      // Get elements
      const elements = getElements(selector);
      
      if (!elements || elements.length === 0) {
        console.warn('[Conditions] No elements found for selector:', selector);
        return this;
      }
      
      // Get conditions object (support dynamic conditions)
      const conditionsObj = typeof conditions === 'function' ? conditions() : conditions;
      
      if (!conditionsObj || typeof conditionsObj !== 'object') {
        console.error('[Conditions] Conditions must be an object');
        return this;
      }
      
      // ✅ NEW: Extract default branch if present
      const { default: defaultConfig, ...regularConditions } = conditionsObj;
      
      // Find matching condition from regular conditions
      let matchingConfig = null;
      for (const [condition, config] of Object.entries(regularConditions)) {
        if (matchesCondition(value, condition)) {
          matchingConfig = config;
          break;
        }
      }
      
      // ✅ NEW: Fall back to default if no match found
      if (!matchingConfig && defaultConfig) {
        matchingConfig = defaultConfig;
        console.log('[Conditions] Using default branch for value:', value);
      }
      
      if (!matchingConfig) {
        console.info('[Conditions] No matching condition or default for value:', value);
        return this;
      }
      
      // Apply configuration to collection
      applyToCollection(elements, matchingConfig);
      
      return this;
    },
    
    /**
     * Batch multiple apply calls
     */
    batch(fn) {
      if (typeof fn === 'function') {
        fn();
      }
      return this;
    },
    
    /**
     * Helper: Get elements (exposed for debugging)
     */
    getElements(selector) {
      return getElements(selector);
    },
    
    /**
     * Helper: Test condition matching (exposed for debugging)
     */
    testCondition(value, condition) {
      return matchesCondition(value, condition);
    }
  };

  // ============================================================================
  // EXPORT
  // ============================================================================

  // Export to global scope
  if (!global.Conditions) {
    global.Conditions = {};
  }
  
  // Merge with existing Conditions or create new
  global.Conditions.apply = ConditionsApply.apply.bind(ConditionsApply);
  global.Conditions.batch = ConditionsApply.batch.bind(ConditionsApply);
  
  // Also export standalone
  global.ConditionsApply = ConditionsApply;

  console.log('[Conditions.apply] Standalone v2.0.0 loaded');
  console.log('[Conditions.apply] ✓ Collection-aware with index support');
  console.log('[Conditions.apply] ✓ Default branch support enabled');
  console.log('[Conditions.apply] ✓ Works independently');

})(typeof window !== 'undefined' ? window : global);