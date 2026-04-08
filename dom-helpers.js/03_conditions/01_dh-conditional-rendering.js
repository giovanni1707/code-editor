/**
 * 01_dh-conditional-rendering
 * 
 * Conditions.whenState() - Works with or without Reactive State
 * @version 4.0.1 - Fixed Proxy/Symbol iterator issue with Collections
 * @license MIT
 */

(function(global) {
  'use strict';

  // ============================================================================
  // ENVIRONMENT DETECTION
  // ============================================================================

  const hasReactiveUtils = !!global.ReactiveUtils;
  const hasElements = !!global.Elements;
  const hasCollections = !!global.Collections;
  const hasSelector = !!global.Selector;

  // Detect reactive capabilities
  let effect, batch, isReactive;
  
  if (hasReactiveUtils) {
    effect = global.ReactiveUtils.effect;
    batch = global.ReactiveUtils.batch;
    isReactive = global.ReactiveUtils.isReactive;
  } else if (hasElements && typeof global.Elements.effect === 'function') {
    effect = global.Elements.effect;
    batch = global.Elements.batch;
    isReactive = global.Elements.isReactive;
  }

  const hasReactivity = !!(effect && batch);

  // ============================================================================
  // CONDITION MATCHERS REGISTRY (Strategy Pattern)
  // ============================================================================

  const conditionMatchers = {
    // Boolean literals
    booleanTrue: {
      test: (condition) => condition === 'true',
      match: (value) => value === true
    },
    booleanFalse: {
      test: (condition) => condition === 'false',
      match: (value) => value === false
    },
    truthy: {
      test: (condition) => condition === 'truthy',
      match: (value) => !!value
    },
    falsy: {
      test: (condition) => condition === 'falsy',
      match: (value) => !value
    },

    // Null/Undefined/Empty checks
    null: {
      test: (condition) => condition === 'null',
      match: (value) => value === null
    },
    undefined: {
      test: (condition) => condition === 'undefined',
      match: (value) => value === undefined
    },
    empty: {
      test: (condition) => condition === 'empty',
      match: (value) => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return !value;
      }
    },

    // Quoted strings
    quotedString: {
      test: (condition) => 
        (condition.startsWith('"') && condition.endsWith('"')) ||
        (condition.startsWith("'") && condition.endsWith("'")),
      match: (value, condition) => String(value) === condition.slice(1, -1)
    },

    // String pattern matching
    includes: {
      test: (condition) => condition.startsWith('includes:'),
      match: (value, condition) => {
        const searchTerm = condition.slice(9).trim();
        return String(value).includes(searchTerm);
      }
    },
    startsWith: {
      test: (condition) => condition.startsWith('startsWith:'),
      match: (value, condition) => {
        const prefix = condition.slice(11).trim();
        return String(value).startsWith(prefix);
      }
    },
    endsWith: {
      test: (condition) => condition.startsWith('endsWith:'),
      match: (value, condition) => {
        const suffix = condition.slice(9).trim();
        return String(value).endsWith(suffix);
      }
    },

    // Regex pattern matching
    regex: {
      test: (condition) => 
        condition.startsWith('/') && condition.lastIndexOf('/') > 0,
      match: (value, condition) => {
        try {
          const lastSlash = condition.lastIndexOf('/');
          const pattern = condition.slice(1, lastSlash);
          const flags = condition.slice(lastSlash + 1);
          const regex = new RegExp(pattern, flags);
          return regex.test(String(value));
        } catch (e) {
          console.warn('[Conditions] Invalid regex pattern:', condition, e);
          return false;
        }
      }
    },

    // Numeric comparisons (only if value is a number)
    numericRange: {
      test: (condition, value) => 
        typeof value === 'number' && 
        condition.includes('-') && 
        !condition.startsWith('<') && 
        !condition.startsWith('>') && 
        !condition.startsWith('='),
      match: (value, condition) => {
        const parts = condition.split('-').map(p => p.trim());
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const [min, max] = parts.map(Number);
          return value >= min && value <= max;
        }
        return false;
      }
    },
    numericExact: {
      test: (condition, value) => 
        typeof value === 'number' && !isNaN(condition),
      match: (value, condition) => value === Number(condition)
    },
    greaterThanOrEqual: {
      test: (condition, value) => 
        typeof value === 'number' && condition.startsWith('>='),
      match: (value, condition) => {
        const target = Number(condition.slice(2).trim());
        return !isNaN(target) && value >= target;
      }
    },
    lessThanOrEqual: {
      test: (condition, value) => 
        typeof value === 'number' && condition.startsWith('<='),
      match: (value, condition) => {
        const target = Number(condition.slice(2).trim());
        return !isNaN(target) && value <= target;
      }
    },
    greaterThan: {
      test: (condition, value) => 
        typeof value === 'number' && condition.startsWith('>') && !condition.startsWith('>='),
      match: (value, condition) => {
        const target = Number(condition.slice(1).trim());
        return !isNaN(target) && value > target;
      }
    },
    lessThan: {
      test: (condition, value) => 
        typeof value === 'number' && condition.startsWith('<') && !condition.startsWith('<='),
      match: (value, condition) => {
        const target = Number(condition.slice(1).trim());
        return !isNaN(target) && value < target;
      }
    },

    // Default: string equality
    stringEquality: {
      test: () => true, // Always applicable as fallback
      match: (value, condition) => String(value) === condition
    }
  };

  /**
   * Match value against condition using registered matchers
   */
  function matchesCondition(value, condition) {
    condition = String(condition).trim();
    
    // Iterate through matchers and return first match
    for (const matcher of Object.values(conditionMatchers)) {
      if (matcher.test(condition, value)) {
        return matcher.match(value, condition);
      }
    }
    
    return false;
  }

  /**
   * Register custom condition matcher
   */
  function registerConditionMatcher(name, matcher) {
    if (!matcher.test || !matcher.match) {
      console.error('[Conditions] Invalid matcher. Must have test() and match() methods.');
      return;
    }
    conditionMatchers[name] = matcher;
  }

  // ============================================================================
  // PROPERTY HANDLERS REGISTRY (Strategy Pattern)
  // ============================================================================

  const propertyHandlers = {
    // Style object
    style: {
      test: (key, val) => key === 'style' && typeof val === 'object' && val !== null,
      apply: (element, val) => {
        Object.entries(val).forEach(([prop, value]) => {
          if (value !== null && value !== undefined) {
            element.style[prop] = value;
          }
        });
      }
    },

    // classList operations
    classList: {
      test: (key, val) => key === 'classList' && typeof val === 'object' && val !== null,
      apply: (element, val) => {
        if (Array.isArray(val)) {
          // Replace all classes
          element.className = '';
          val.forEach(cls => cls && element.classList.add(cls));
        } else {
          // Individual operations
          const operations = {
            add: (classes) => {
              const classList = Array.isArray(classes) ? classes : [classes];
              classList.forEach(cls => cls && element.classList.add(cls));
            },
            remove: (classes) => {
              const classList = Array.isArray(classes) ? classes : [classes];
              classList.forEach(cls => cls && element.classList.remove(cls));
            },
            toggle: (classes) => {
              const classList = Array.isArray(classes) ? classes : [classes];
              classList.forEach(cls => cls && element.classList.toggle(cls));
            },
            replace: (classes) => {
              if (Array.isArray(classes) && classes.length === 2) {
                element.classList.replace(classes[0], classes[1]);
              }
            }
          };

          Object.entries(val).forEach(([method, classes]) => {
            if (operations[method]) {
              operations[method](classes);
            }
          });
        }
      }
    },

    // setAttribute / attrs (object form)
    setAttribute: {
      test: (key, val) => 
        (key === 'attrs' || key === 'setAttribute') && 
        typeof val === 'object' && val !== null,
      apply: (element, val) => {
        Object.entries(val).forEach(([attr, attrVal]) => {
          if (attrVal === null || attrVal === undefined || attrVal === false) {
            element.removeAttribute(attr);
          } else {
            element.setAttribute(attr, String(attrVal));
          }
        });
      }
    },

    // removeAttribute
    removeAttribute: {
      test: (key) => key === 'removeAttribute',
      apply: (element, val) => {
        if (Array.isArray(val)) {
          val.forEach(attr => element.removeAttribute(attr));
        } else if (typeof val === 'string') {
          element.removeAttribute(val);
        }
      }
    },

    // dataset
    dataset: {
      test: (key, val) => key === 'dataset' && typeof val === 'object' && val !== null,
      apply: (element, val) => {
        Object.entries(val).forEach(([dataKey, dataVal]) => {
          element.dataset[dataKey] = String(dataVal);
        });
      }
    },

    // addEventListener
    addEventListener: {
      test: (key, val) => key === 'addEventListener' && typeof val === 'object' && val !== null,
      apply: (element, val) => {
        if (!element._whenStateListeners) {
          element._whenStateListeners = [];
        }
        
        Object.entries(val).forEach(([event, handlerConfig]) => {
          let handler, options;
          
          if (typeof handlerConfig === 'function') {
            handler = handlerConfig;
            options = undefined;
          } else if (typeof handlerConfig === 'object' && handlerConfig !== null) {
            handler = handlerConfig.handler;
            options = handlerConfig.options;
          }
          
          if (handler && typeof handler === 'function') {
            element.addEventListener(event, handler, options);
            element._whenStateListeners.push({ event, handler, options });
          }
        });
      }
    },

    // removeEventListener
    removeEventListener: {
      test: (key, val) => key === 'removeEventListener' && Array.isArray(val) && val.length >= 2,
      apply: (element, val) => {
        const [event, handler, options] = val;
        element.removeEventListener(event, handler, options);
      }
    },

    // on* event properties (onclick, onchange, etc.)
    eventProperty: {
      test: (key, val) => key.startsWith('on') && typeof val === 'function',
      apply: (element, val, key) => {
        element[key] = val;
      }
    },

    // Native DOM properties
    nativeProperty: {
      test: (key, val, element) => key in element,
      apply: (element, val, key) => {
        element[key] = val;
      }
    },

    // Default: try setAttribute for primitives
    fallback: {
      test: (key, val) => 
        typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean',
      apply: (element, val, key) => {
        element.setAttribute(key, String(val));
      }
    }
  };

  /**
   * Apply a single property to an element using registered handlers
   */
  function applyProperty(element, key, val) {
    // Find and execute first matching handler
    for (const handler of Object.values(propertyHandlers)) {
      if (handler.test(key, val, element)) {
        handler.apply(element, val, key);
        return;
      }
    }
  }

  /**
   * Register custom property handler
   */
  function registerPropertyHandler(name, handler) {
    if (!handler.test || !handler.apply) {
      console.error('[Conditions] Invalid handler. Must have test() and apply() methods.');
      return;
    }
    // Insert before fallback
    const entries = Object.entries(propertyHandlers);
    const fallback = entries.pop();
    propertyHandlers[name] = handler;
    if (fallback) {
      propertyHandlers[fallback[0]] = fallback[1];
    }
  }

  // ============================================================================
  // ELEMENT SELECTOR & RETRIEVAL - FIXED FOR PROXY COLLECTIONS
  // ============================================================================

  /**
   * Safely convert array-like or collection to array (handles Proxy objects)
   */
  function toArray(collection) {
    if (!collection) return [];
    
    // Already an array
    if (Array.isArray(collection)) {
      return collection;
    }
    
    // Native collections - use Array.from safely
    if (collection instanceof NodeList || collection instanceof HTMLCollection) {
      return Array.from(collection);
    }
    
    // Proxy or array-like object with length property
    if (typeof collection === 'object' && 'length' in collection) {
      try {
        // First try Array.from in case it works
        return Array.from(collection);
      } catch (e) {
        // If Array.from fails (due to Symbol iterator issues with Proxy),
        // manually iterate using numeric indices
        const arr = [];
        const len = collection.length;
        for (let i = 0; i < len; i++) {
          if (i in collection) {
            arr.push(collection[i]);
          }
        }
        return arr;
      }
    }
    
    return [];
  }

  /**
   * Get elements from various selector types
   */
  function getElements(selector) {
    // Already an element or NodeList
    if (selector instanceof Element) {
      return [selector];
    }
    if (selector instanceof NodeList || selector instanceof HTMLCollection) {
      return Array.from(selector);
    }
    if (Array.isArray(selector)) {
      return selector.filter(el => el instanceof Element);
    }

    // String selector
    if (typeof selector === 'string') {
      // Use DOM Helpers if available for optimized queries
      if (selector.startsWith('#')) {
        const id = selector.slice(1);
        if (hasElements && global.Elements[id]) {
          return [global.Elements[id]];
        }
        const el = document.getElementById(id);
        return el ? [el] : [];
      }
      
      if (selector.startsWith('.')) {
        const className = selector.slice(1);
        if (hasCollections && global.Collections.ClassName) {
          const collection = global.Collections.ClassName[className];
          // Use safe toArray conversion to handle Proxy objects
          if (collection) {
            return toArray(collection);
          }
        }
        return Array.from(document.getElementsByClassName(className));
      }

      // Use Selector helper if available
      if (hasSelector && global.Selector.queryAll) {
        const result = global.Selector.queryAll(selector);
        return result ? toArray(result) : [];
      }

      // Fallback to native querySelectorAll
      return Array.from(document.querySelectorAll(selector));
    }

    return [];
  }

  // ============================================================================
  // EVENT LISTENER CLEANUP
  // ============================================================================

  /**
   * Cleanup event listeners attached by previous conditions
   */
  function cleanupListeners(element) {
    if (element._whenStateListeners) {
      element._whenStateListeners.forEach(({ event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
      element._whenStateListeners = [];
    }
  }

  // ============================================================================
  // CONFIGURATION APPLICATION
  // ============================================================================

  /**
   * Apply configuration to element
   */
  function applyConfig(element, config, currentValue) {
    // Use DOM Helpers' .update() method if available
    if (element.update && typeof element.update === 'function') {
      try {
        element.update(config);
        return;
      } catch (e) {
        console.warn('[Conditions] Error using element.update():', e);
        // Fall through to manual application
      }
    }
    
    // Manual application (fallback)
    Object.entries(config).forEach(([key, val]) => {
      try {
        applyProperty(element, key, val);
      } catch (e) {
        console.warn(`[Conditions] Failed to apply ${key}:`, e);
      }
    });
  }

  // ============================================================================
  // CORE LOGIC
  // ============================================================================

  /**
   * Core logic: Apply conditions to elements
   */
  function applyConditions(getValue, conditions, selector) {
    // Get target elements
    const elements = getElements(selector);
    
    if (!elements || elements.length === 0) {
      console.warn('[Conditions] No elements found for selector:', selector);
      return;
    }
    
    // Get current value
    let value;
    try {
      value = getValue();
    } catch (e) {
      console.error('[Conditions] Error getting value:', e);
      return;
    }
    
    // Get conditions (support dynamic conditions via function)
    let conditionsObj;
    try {
      conditionsObj = typeof conditions === 'function' ? conditions() : conditions;
    } catch (e) {
      console.error('[Conditions] Error evaluating conditions:', e);
      return;
    }
    
    // Apply to all matching elements
    elements.forEach(element => {
      // Cleanup previous event listeners
      cleanupListeners(element);
      
      // Find matching condition and apply config
      for (const [condition, config] of Object.entries(conditionsObj)) {
        if (matchesCondition(value, condition)) {
          applyConfig(element, config, value);
          break; // Only apply first matching condition
        }
      }
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const Conditions = {
    /**
     * @param {Function|*} valueFn - Function returning state value OR direct value
     * @param {Object|Function} conditions - Condition mappings (object or function returning object for dynamic conditions)
     * @param {string|Element|NodeList} selector - Target elements
     * @param {Object} options - { reactive: boolean, watch: boolean }
     */
    whenState(valueFn, conditions, selector, options = {}) {
      // Validate inputs
      if (!conditions || (typeof conditions !== 'object' && typeof conditions !== 'function')) {
        console.error('[Conditions] Second argument must be an object or function returning an object');
        return;
      }

      // Determine if we should use reactive mode
      const useReactive = options.reactive !== false && hasReactivity;
      const isFunction = typeof valueFn === 'function';
      
      // If valueFn is not a function, treat it as a static value
      const getValue = isFunction ? valueFn : () => valueFn;

      // Check if value is reactive state
      const valueIsReactiveState = isFunction && hasReactivity && 
                                    typeof isReactive === 'function' && 
                                    isReactive(valueFn());

      // Decide execution mode
      if (useReactive && (isFunction || valueIsReactiveState)) {
        // REACTIVE MODE: Use effect for automatic updates
        return effect(() => {
          applyConditions(getValue, conditions, selector);
        });
      } else {
        // NON-REACTIVE MODE: Execute once
        applyConditions(getValue, conditions, selector);
        
        // Return update function for manual updates if needed
        return {
          update: () => applyConditions(getValue, conditions, selector),
          destroy: () => {} // No cleanup needed in non-reactive mode
        };
      }
    },

    /**
     * Manual mode: Apply conditions once without reactivity
     */
    apply(value, conditions, selector) {
      const getValue = typeof value === 'function' ? value : () => value;
      applyConditions(getValue, conditions, selector);
      return this;
    },

    /**
     * Watch mode: Re-apply when value changes (requires reactivity)
     */
    watch(valueFn, conditions, selector) {
      if (!hasReactivity) {
        console.warn('[Conditions] watch() requires reactive library');
        return this.apply(valueFn, conditions, selector);
      }
      return this.whenState(valueFn, conditions, selector, { reactive: true });
    },

    /**
     * Batch multiple updates
     */
    batch(fn) {
      if (batch && typeof batch === 'function') {
        return batch(fn);
      }
      return fn(); // Fallback: execute immediately
    },

    /**
     * Register custom condition matcher
     */
    registerMatcher(name, matcher) {
      registerConditionMatcher(name, matcher);
      return this;
    },

    /**
     * Register custom property handler
     */
    registerHandler(name, handler) {
      registerPropertyHandler(name, handler);
      return this;
    },

    /**
     * Get registered matchers (for debugging/inspection)
     */
    getMatchers() {
      return Object.keys(conditionMatchers);
    },

    /**
     * Get registered handlers (for debugging/inspection)
     */
    getHandlers() {
      return Object.keys(propertyHandlers);
    },

    /**
     * Check if reactive mode is available
     */
    get hasReactivity() {
      return hasReactivity;
    },

    /**
     * Get current mode
     */
    get mode() {
      return hasReactivity ? 'reactive' : 'static';
    }
  };

  // ============================================================================
  // EXPORTS & INTEGRATION
  // ============================================================================

  // Export to global scope
  global.Conditions = Conditions;

  // Add convenience methods to DOM Helpers if available
  if (hasElements) {
    global.Elements.whenState = Conditions.whenState;
    global.Elements.whenApply = Conditions.apply;
    global.Elements.whenWatch = Conditions.watch;
  }
  
  if (hasCollections) {
    global.Collections.whenState = Conditions.whenState;
    global.Collections.whenApply = Conditions.apply;
    global.Collections.whenWatch = Conditions.watch;
  }
  
  if (hasSelector) {
    global.Selector.whenState = Conditions.whenState;
    global.Selector.whenApply = Conditions.apply;
    global.Selector.whenWatch = Conditions.watch;
  }

  // Log successful initialization
  console.log('[Conditions] v4.0.1 loaded successfully');
  console.log('[Conditions] Mode:', hasReactivity ? 'Reactive + Static' : 'Static only');
  console.log('[Conditions] Features:');
  console.log('  - Declarative condition matching with strategy pattern');
  console.log('  - Extensible via registerMatcher() and registerHandler()');
  console.log('  - Full backward compatibility maintained');
  console.log('  - Production-ready with enhanced error handling');
  console.log('  - Fixed: Proxy/Symbol iterator compatibility');

})(typeof window !== 'undefined' ? window : global);