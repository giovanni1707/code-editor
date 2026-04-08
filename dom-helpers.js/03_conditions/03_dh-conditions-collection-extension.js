/**
 * 03_dh-conditions-collection-extension
 * 
 * Conditions Collection Extension
 * Adds collection-level conditional updates with index support
 * 
 * @version 1.0.0
 * @requires Conditions.js v4.0.0+
 * @license MIT
 */

(function(global) {
  'use strict';

  if (!global.Conditions) {
    console.error('[Conditions.Collection] Requires Conditions.js');
    return;
  }

  const Conditions = global.Conditions;

  /**
   * Apply conditions to a collection (supports bulk + index updates)
   * @param {Function|*} valueFn - State value or function
   * @param {Object} conditions - Condition mappings with update objects
   * @param {string|Element|NodeList|Array} selector - Target collection
   * @param {Object} options - { reactive: boolean }
   */
  function whenStateCollection(valueFn, conditions, selector, options = {}) {
    const hasReactivity = Conditions.hasReactivity;
    const useReactive = options.reactive !== false && hasReactivity;
    
    // Get value function
    const getValue = typeof valueFn === 'function' ? valueFn : () => valueFn;

    // Core logic: apply conditions to collection
    function applyToCollection() {
      // Get collection
      let collection;
      
      if (typeof selector === 'string') {
        // Try global shortcuts first
        if (selector.startsWith('.') && global.ClassName) {
          const className = selector.slice(1);
          collection = global.ClassName[className];
        } else if (selector.startsWith('#')) {
          // Single element, use regular whenState
          return Conditions.whenState(valueFn, conditions, selector, options);
        } else if (global.querySelectorAll) {
          collection = global.querySelectorAll(selector);
        } else {
          collection = document.querySelectorAll(selector);
        }
      } else if (selector instanceof Element) {
        // Single element
        collection = [selector];
      } else if (selector instanceof NodeList || selector instanceof HTMLCollection) {
        collection = selector;
      } else if (Array.isArray(selector)) {
        collection = selector;
      } else {
        console.warn('[Conditions.Collection] Invalid selector');
        return;
      }

      if (!collection || collection.length === 0) {
        console.warn('[Conditions.Collection] No elements found');
        return;
      }

      // Get current value
      let value;
      try {
        value = getValue();
      } catch (e) {
        console.error('[Conditions.Collection] Error getting value:', e);
        return;
      }

      // Get conditions object
      let conditionsObj;
      try {
        conditionsObj = typeof conditions === 'function' ? conditions() : conditions;
      } catch (e) {
        console.error('[Conditions.Collection] Error evaluating conditions:', e);
        return;
      }

      // Find matching condition
      let matchingConfig = null;
      for (const [condition, config] of Object.entries(conditionsObj)) {
        if (matchCondition(value, condition)) {
          matchingConfig = config;
          break;
        }
      }

      if (!matchingConfig) {
        console.info('[Conditions.Collection] No matching condition for value:', value);
        return;
      }

      // Apply to collection using .update() if available
      if (collection.update && typeof collection.update === 'function') {
        try {
          collection.update(matchingConfig);
        } catch (e) {
          console.warn('[Conditions.Collection] Error using collection.update():', e);
          applyManually(collection, matchingConfig);
        }
      } else {
        applyManually(collection, matchingConfig);
      }
    }

    // Manual application fallback
    function applyManually(collection, config) {
      const elements = Array.from(collection);
      
      // Separate index and bulk updates
      const indexUpdates = {};
      const bulkUpdates = {};
      
      Object.entries(config).forEach(([key, value]) => {
        if (/^-?\d+$/.test(key)) {
          indexUpdates[key] = value;
        } else {
          bulkUpdates[key] = value;
        }
      });

      // Apply bulk to all
      if (Object.keys(bulkUpdates).length > 0) {
        elements.forEach(element => {
          if (element && element.update) {
            element.update(bulkUpdates);
          }
        });
      }

      // Apply index-specific
      Object.entries(indexUpdates).forEach(([indexStr, updates]) => {
        let index = parseInt(indexStr);
        if (index < 0) index = elements.length + index;
        
        const element = elements[index];
        if (element && element.update) {
          element.update(updates);
        }
      });
    }

    // Helper: match condition
    function matchCondition(value, condition) {
      condition = String(condition).trim();
      
      // Use Conditions' built-in matcher if available
      if (Conditions._matchCondition) {
        return Conditions._matchCondition(value, condition);
      }

      // Fallback: basic matching
      if (condition === 'true') return value === true;
      if (condition === 'false') return value === false;
      if (condition === 'truthy') return !!value;
      if (condition === 'falsy') return !value;
      
      return String(value) === condition;
    }

    // Execute
    if (useReactive) {
      if (global.ReactiveUtils && global.ReactiveUtils.effect) {
        return global.ReactiveUtils.effect(applyToCollection);
      } else if (global.Elements && global.Elements.effect) {
        return global.Elements.effect(applyToCollection);
      }
    }
    
    // Non-reactive
    applyToCollection();
    return {
      update: applyToCollection,
      destroy: () => {}
    };
  }

  // Add to Conditions
  Conditions.whenStateCollection = whenStateCollection;

  // Convenience alias
  Conditions.whenCollection = whenStateCollection;

  console.log('[Conditions.Collection] v1.0.0 loaded');
  console.log('[Conditions.Collection] ✓ Supports bulk + index updates in conditions');

})(typeof window !== 'undefined' ? window : global);