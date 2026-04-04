/**
 * 07_dh-conditions-array-support.js
 * 
 * Array Distribution Support for Conditions
 * Enhances Conditions to support array-based updates even in manual fallback paths
 * 
 * @version 1.0.0
 * @requires 01_dh-conditional-rendering.js (Conditions.js v4.0.0+)
 * @requires 10_dh-array-based-updates.js (ArrayBasedUpdates)
 * @license MIT
 */

(function(global) {
  'use strict';

  console.log('[Conditions.ArraySupport] v1.0.0 Loading...');

  // ============================================================================
  // DEPENDENCY VALIDATION
  // ============================================================================

  if (!global.Conditions) {
    console.error('[Conditions.ArraySupport] Requires Conditions.js to be loaded first');
    return;
  }

  if (!global.ArrayBasedUpdates) {
    console.error('[Conditions.ArraySupport] Requires ArrayBasedUpdates to be loaded first');
    console.error('[Conditions.ArraySupport] Please load 10_dh-array-based-updates.js before this file');
    return;
  }

  const Conditions = global.Conditions;
  const ArrayUtils = global.ArrayBasedUpdates;

  // ============================================================================
  // HELPER FUNCTIONS FROM ARRAY-BASED UPDATES
  // ============================================================================

  /**
   * Check if a config object contains any array values
   */
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

  /**
   * Process updates for a specific element index
   */
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
          processed[key] = ArrayUtils.getValueForIndex(value, elementIndex, totalElements);
        } else {
          processed[key] = value;
        }
      } else if (key === 'classList') {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const processedClassList = {};
          Object.entries(value).forEach(([method, classes]) => {
            processedClassList[method] = ArrayUtils.getValueForIndex(classes, elementIndex, totalElements);
          });
          processed[key] = processedClassList;
        } else {
          processed[key] = value;
        }
      } else {
        processed[key] = ArrayUtils.getValueForIndex(value, elementIndex, totalElements);
      }
    });

    return processed;
  }

  // ============================================================================
  // ENHANCED applyManually() FOR FILE 03
  // ============================================================================

  /**
   * Enhanced version of applyManually that supports array distribution
   * This replaces the manual fallback in file 03
   */
  function enhancedApplyManually(collection, config) {
    const elements = Array.from(collection);
    
    if (elements.length === 0) return;

    // Separate index and bulk updates (original logic)
    const indexUpdates = {};
    const bulkUpdates = {};
    
    Object.entries(config).forEach(([key, value]) => {
      if (/^-?\d+$/.test(key)) {
        indexUpdates[key] = value;
      } else {
        bulkUpdates[key] = value;
      }
    });

    // ✅ NEW: Check if bulk updates contain arrays
    const hasArrays = containsArrayValues(bulkUpdates);

    if (Object.keys(bulkUpdates).length > 0) {
      if (hasArrays) {
        // 🎯 ARRAY DISTRIBUTION MODE
        console.log('[Conditions.ArraySupport] Distributing arrays across', elements.length, 'elements');
        
        elements.forEach((element, index) => {
          if (element && element.update) {
            const elementUpdates = processUpdatesForElement(bulkUpdates, index, elements.length);
            element.update(elementUpdates);
          }
        });
      } else {
        // 📦 BULK MODE (original behavior)
        elements.forEach(element => {
          if (element && element.update) {
            element.update(bulkUpdates);
          }
        });
      }
    }

    // Apply index-specific updates (original logic)
    Object.entries(indexUpdates).forEach(([indexStr, updates]) => {
      let index = parseInt(indexStr);
      if (index < 0) index = elements.length + index;
      
      const element = elements[index];
      if (element && element.update) {
        element.update(updates);
      }
    });
  }

  // ============================================================================
  // ENHANCED applyToCollection() FOR FILE 04
  // ============================================================================

  /**
   * Enhanced version of applyToCollection that supports array distribution
   * This enhances the logic in file 04
   */
  function enhancedApplyToCollection(elements, config) {
    // Separate index-specific and shared properties (original logic)
    const sharedProps = {};
    const indexProps = {};
    
    Object.entries(config).forEach(([key, value]) => {
      if (/^-?\d+$/.test(key)) {
        indexProps[key] = value;
      } else {
        sharedProps[key] = value;
      }
    });
    
    // ✅ NEW: Check if shared props contain arrays
    const hasArrays = containsArrayValues(sharedProps);
    
    // Apply shared properties
    if (Object.keys(sharedProps).length > 0) {
      if (hasArrays) {
        // 🎯 ARRAY DISTRIBUTION MODE
        console.log('[Conditions.ArraySupport] Distributing arrays across', elements.length, 'elements');
        
        elements.forEach((element, index) => {
          const elementUpdates = processUpdatesForElement(sharedProps, index, elements.length);
          applyConfigToElement(element, elementUpdates);
        });
      } else {
        // 📦 BULK MODE (original behavior)
        elements.forEach(element => {
          applyConfigToElement(element, sharedProps);
        });
      }
    }
    
    // Apply index-specific properties (original logic)
    Object.entries(indexProps).forEach(([indexStr, updates]) => {
      let index = parseInt(indexStr);
      if (index < 0) index = elements.length + index;
      
      if (index >= 0 && index < elements.length) {
        const element = elements[index];
        applyConfigToElement(element, updates);
      }
    });
  }

  /**
   * Helper to apply config to a single element
   * (Simplified version - uses element.update if available)
   */
  function applyConfigToElement(element, config) {
    if (element.update && typeof element.update === 'function') {
      element.update(config);
    } else {
      // Fallback to manual property application
      Object.entries(config).forEach(([key, value]) => {
        try {
          if (key === 'style' && typeof value === 'object' && value !== null) {
            Object.assign(element.style, value);
          } else if (key in element) {
            element[key] = value;
          } else {
            element.setAttribute(key, value);
          }
        } catch (e) {
          console.warn('[Conditions.ArraySupport] Failed to apply', key, ':', e.message);
        }
      });
    }
  }

  // ============================================================================
  // PATCH EXISTING FUNCTIONS - ACTUALLY REPLACE THEM!
  // ============================================================================

  /**
   * Patch file 04's ConditionsApply.apply() to use array-aware logic
   */
  if (global.ConditionsApply && global.Conditions.apply) {
    console.log('[Conditions.ArraySupport] ✓ Patching Conditions.apply()');
    
    // Store original
    const _originalApply = global.Conditions.apply.bind(global.Conditions);
    
    // Replace with array-aware version
    global.Conditions.apply = function(value, conditions, selector) {
      // Get elements
      const getElements = global.ConditionsApply.getElements;
      const elements = getElements ? getElements(selector) : [];
      
      if (!elements || elements.length === 0) {
        console.warn('[Conditions.ArraySupport] No elements found for selector:', selector);
        return this;
      }
      
      // Get conditions object
      const conditionsObj = typeof conditions === 'function' ? conditions() : conditions;
      
      if (!conditionsObj || typeof conditionsObj !== 'object') {
        console.error('[Conditions.ArraySupport] Conditions must be an object');
        return this;
      }
      
      // Extract default branch if present
      const { default: defaultConfig, ...regularConditions } = conditionsObj;
      
      // Find matching condition
      let matchingConfig = null;
      for (const [condition, config] of Object.entries(regularConditions)) {
        if (global.ConditionsApply.testCondition(value, condition)) {
          matchingConfig = config;
          break;
        }
      }
      
      // Fall back to default if no match
      if (!matchingConfig && defaultConfig) {
        matchingConfig = defaultConfig;
        console.log('[Conditions.ArraySupport] Using default branch for value:', value);
      }
      
      if (!matchingConfig) {
        console.info('[Conditions.ArraySupport] No matching condition or default for value:', value);
        return this;
      }
      
      // ✅ USE ARRAY-AWARE APPLICATION
      enhancedApplyToCollection(elements, matchingConfig);
      
      return this;
    };
    
    // Store original for reference
    global.Conditions._originalApply = _originalApply;
  } else {
    console.warn('[Conditions.ArraySupport] ⚠️  Conditions.apply not found - partial support only');
  }

  // ============================================================================
  // ADD UTILITY METHODS TO CONDITIONS
  // ============================================================================

  /**
   * Check if a config contains array values (utility)
   */
  Conditions.hasArrayValues = containsArrayValues;

  /**
   * Manually apply config with array distribution (utility)
   */
  Conditions.applyWithArrays = function(elements, config) {
    if (!elements || !config) return;
    
    const elementsArray = Array.isArray(elements) ? elements : Array.from(elements);
    
    if (containsArrayValues(config)) {
      console.log('[Conditions.ArraySupport] Applying with array distribution');
      return enhancedApplyToCollection(elementsArray, config);
    } else {
      console.log('[Conditions.ArraySupport] Applying bulk update');
      elementsArray.forEach(el => {
        if (el && el.update) {
          el.update(config);
        }
      });
    }
  };

  // ============================================================================
  // EXPORT MODULE
  // ============================================================================

  const ConditionsArraySupport = {
    version: '1.0.0',
    containsArrayValues,
    processUpdatesForElement,
    enhancedApplyManually,
    enhancedApplyToCollection,
    applyConfigToElement
  };

  // Export to Conditions namespace
  Conditions.arraySupport = ConditionsArraySupport;

  // Also export globally
  global.ConditionsArraySupport = ConditionsArraySupport;

  // ============================================================================
  // RESTORATION METHOD
  // ============================================================================

  /**
   * Restore original functions (for debugging/testing)
   */
  Conditions.restoreArraySupport = function() {
    if (global.Conditions._originalApply) {
      global.Conditions.apply = global.Conditions._originalApply;
      console.log('[Conditions.ArraySupport] Original apply() restored');
    }
  };

  // ============================================================================
  // SUCCESS MESSAGE
  // ============================================================================

  console.log('[Conditions.ArraySupport] ✓✓✓ v1.0.0 loaded successfully');
  console.log('[Conditions.ArraySupport] ✓ Array distribution now supported in Conditions.apply()');
  console.log('[Conditions.ArraySupport] ✓ Use Conditions.applyWithArrays(elements, config) for manual control');
  console.log('[Conditions.ArraySupport] 📚 Example:');
  console.log('  Conditions.apply("active", {');
  console.log('    active: { textContent: ["A", "B", "C"], style: { color: ["red", "blue", "green"] } }');
  console.log('  }, ".items");');

})(typeof window !== 'undefined' ? window : global);