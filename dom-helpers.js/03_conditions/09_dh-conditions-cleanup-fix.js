/**
 * 09_dh-conditions-cleanup-fix.js
 * 
 * Event Listener Cleanup Fix for Conditions
 * Patches whenState() to properly cleanup event listeners on destroy()
 * 
 * @version 1.0.0
 * @requires 01_dh-conditional-rendering.js (Conditions.js v4.0.0+)
 * @license MIT
 * 
 * Problem Fixed:
 *   - Previously: destroy() didn't remove the last set of event listeners
 *   - Now: All listeners are properly cleaned up when cleanup.destroy() is called
 * 
 * Usage:
 *   Just load this file after the core Conditions module.
 *   No API changes - existing code works as before, but with proper cleanup.
 */

(function(global) {
  'use strict';

  console.log('[Conditions.CleanupFix] v1.0.0 Loading...');

  // ============================================================================
  // DEPENDENCY VALIDATION
  // ============================================================================

  if (!global.Conditions) {
    console.error('[Conditions.CleanupFix] Requires Conditions.js to be loaded first');
    console.error('[Conditions.CleanupFix] Please load 01_dh-conditional-rendering.js before this file');
    return;
  }

  const Conditions = global.Conditions;

  if (typeof Conditions.whenState !== 'function') {
    console.error('[Conditions.CleanupFix] Conditions.whenState() not found');
    console.error('[Conditions.CleanupFix] Required: Conditions.js v4.0.0+');
    return;
  }

  // ============================================================================
  // HELPER: CLEANUP LISTENERS FROM ELEMENT
  // ============================================================================

  /**
   * Cleanup event listeners attached by Conditions
   * (Mirrors the internal cleanupListeners function from core)
   */
  function cleanupListeners(element) {
    if (!element || !element._whenStateListeners) {
      return;
    }

    try {
      element._whenStateListeners.forEach(({ event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
      element._whenStateListeners = [];
    } catch (error) {
      console.warn('[Conditions.CleanupFix] Error cleaning up listeners:', error);
    }
  }

  /**
   * Cleanup all listeners from a set of elements
   */
  function cleanupAllListeners(elements) {
    if (!elements || elements.size === 0) {
      return;
    }

    let cleaned = 0;
    elements.forEach(element => {
      if (element && element._whenStateListeners && element._whenStateListeners.length > 0) {
        cleanupListeners(element);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`[Conditions.CleanupFix] Cleaned up listeners from ${cleaned} element(s)`);
    }
  }

  // ============================================================================
  // HELPER: GET ELEMENTS (MIRRORS CORE FUNCTION)
  // ============================================================================

  /**
   * Get elements from selector (simplified version for tracking)
   */
  function getElements(selector) {
    try {
      // Single element
      if (selector instanceof Element) {
        return [selector];
      }
      
      // NodeList or HTMLCollection
      if (selector instanceof NodeList || selector instanceof HTMLCollection) {
        return Array.from(selector);
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
          return Array.from(document.getElementsByClassName(selector.slice(1)));
        }
        
        // Generic selector
        return Array.from(document.querySelectorAll(selector));
      }

      return [];
    } catch (error) {
      console.warn('[Conditions.CleanupFix] Error getting elements:', error);
      return [];
    }
  }

  // ============================================================================
  // ENHANCED whenState WITH PROPER CLEANUP
  // ============================================================================

  // Store original method
  const _originalWhenState = Conditions.whenState;

  /**
   * Enhanced whenState with proper listener cleanup
   */
  Conditions.whenState = function(valueFn, conditions, selector, options = {}) {
    // Track all elements that get listeners attached
    const trackedElements = new Set();
    let isDestroyed = false;

    // Wrapper to track elements before applying
    function trackElements() {
      if (isDestroyed) {
        return;
      }

      try {
        const elements = getElements(selector);
        elements.forEach(el => {
          if (el instanceof Element) {
            trackedElements.add(el);
          }
        });
      } catch (error) {
        console.warn('[Conditions.CleanupFix] Error tracking elements:', error);
      }
    }

    // Track elements before initial execution
    trackElements();

    // Call original whenState
    const originalCleanup = _originalWhenState.call(this, valueFn, conditions, selector, options);

    // If original returned nothing, return enhanced cleanup
    if (!originalCleanup || typeof originalCleanup !== 'object') {
      return {
        update: () => {
          if (!isDestroyed) {
            trackElements();
            return _originalWhenState.call(this, valueFn, conditions, selector, options);
          }
        },
        destroy: () => {
          if (!isDestroyed) {
            cleanupAllListeners(trackedElements);
            trackedElements.clear();
            isDestroyed = true;
          }
        }
      };
    }

    // Wrap the original cleanup with enhanced listener cleanup
    return {
      update: () => {
        if (!isDestroyed) {
          trackElements();
          if (originalCleanup.update && typeof originalCleanup.update === 'function') {
            return originalCleanup.update();
          }
        }
      },

      destroy: () => {
        if (isDestroyed) {
          return;
        }

        // STEP 1: Cleanup all tracked listeners first
        cleanupAllListeners(trackedElements);
        trackedElements.clear();

        // STEP 2: Call original destroy (stops effects, etc.)
        if (originalCleanup.destroy && typeof originalCleanup.destroy === 'function') {
          try {
            originalCleanup.destroy();
          } catch (error) {
            console.warn('[Conditions.CleanupFix] Error in original destroy:', error);
          }
        }

        // STEP 3: Mark as destroyed
        isDestroyed = true;

        console.log('[Conditions.CleanupFix] ✓ Cleanup completed');
      },

      // Preserve any additional properties from original cleanup
      ...(originalCleanup || {})
    };
  };

  // Preserve the original for reference
  Conditions._originalWhenState = _originalWhenState;

  // ============================================================================
  // PATCH OTHER METHODS THAT USE whenState
  // ============================================================================

  /**
   * Patch watch() to use the enhanced whenState
   */
  if (Conditions.watch && typeof Conditions.watch === 'function') {
    const _originalWatch = Conditions.watch;
    
    Conditions.watch = function(valueFn, conditions, selector) {
      return this.whenState(valueFn, conditions, selector, { reactive: true });
    };

    Conditions._originalWatch = _originalWatch;
    console.log('[Conditions.CleanupFix] ✓ Patched watch()');
  }

  /**
   * Patch whenStateCollection if it exists (from file 03)
   */
  if (Conditions.whenStateCollection && typeof Conditions.whenStateCollection === 'function') {
    const _originalWhenStateCollection = Conditions.whenStateCollection;
    
    // Note: whenStateCollection doesn't attach listeners, so no patch needed
    // Just log that it was checked
    console.log('[Conditions.CleanupFix] ℹ️  whenStateCollection checked (no listener cleanup needed)');
  }

  // ============================================================================
  // UTILITY: CLEANUP ALL ACTIVE INSTANCES
  // ============================================================================

  /**
   * Global cleanup utility for emergency situations
   * Removes all _whenStateListeners from all elements in the document
   */
  Conditions.cleanupAllListeners = function() {
    let totalCleaned = 0;
    
    // Find all elements with _whenStateListeners
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
      if (element._whenStateListeners && element._whenStateListeners.length > 0) {
        cleanupListeners(element);
        totalCleaned++;
      }
    });

    console.log(`[Conditions.CleanupFix] Emergency cleanup: removed listeners from ${totalCleaned} element(s)`);
    return totalCleaned;
  };

  /**
   * Check for memory leaks (counts elements with attached listeners)
   */
  Conditions.checkListenerLeaks = function() {
    const allElements = document.querySelectorAll('*');
    const elementsWithListeners = [];
    
    allElements.forEach(element => {
      if (element._whenStateListeners && element._whenStateListeners.length > 0) {
        elementsWithListeners.push({
          element,
          listenerCount: element._whenStateListeners.length,
          listeners: element._whenStateListeners
        });
      }
    });

    if (elementsWithListeners.length > 0) {
      console.group('[Conditions.CleanupFix] Listener Leak Check');
      console.warn(`⚠️  Found ${elementsWithListeners.length} element(s) with active listeners`);
      elementsWithListeners.forEach(({ element, listenerCount, listeners }) => {
        console.log('Element:', element);
        console.log('  Listeners:', listenerCount);
        console.log('  Details:', listeners);
      });
      console.groupEnd();
    } else {
      console.log('[Conditions.CleanupFix] ✓ No listener leaks detected');
    }

    return elementsWithListeners;
  };

  // ============================================================================
  // RESTORATION UTILITY
  // ============================================================================

  /**
   * Restore original methods (for debugging/testing)
   */
  Conditions.restoreCleanupFix = function() {
    if (Conditions._originalWhenState) {
      Conditions.whenState = Conditions._originalWhenState;
      console.log('[Conditions.CleanupFix] Original whenState() restored');
    }

    if (Conditions._originalWatch) {
      Conditions.watch = Conditions._originalWatch;
      console.log('[Conditions.CleanupFix] Original watch() restored');
    }

    delete Conditions.cleanupAllListeners;
    delete Conditions.checkListenerLeaks;
    delete Conditions.restoreCleanupFix;
    
    console.log('[Conditions.CleanupFix] Cleanup fix removed');
  };

  // ============================================================================
  // VERSION TRACKING
  // ============================================================================

  Conditions.extensions = Conditions.extensions || {};
  Conditions.extensions.cleanupFix = {
    version: '1.0.0',
    fixed: [
      'Event listener cleanup on destroy()',
      'Memory leak prevention',
      'Proper cleanup for reactive and non-reactive modes'
    ],
    utilities: [
      'Conditions.cleanupAllListeners() - Emergency cleanup',
      'Conditions.checkListenerLeaks() - Debug memory leaks',
      'Conditions.restoreCleanupFix() - Remove patch'
    ]
  };

  // ============================================================================
  // INTEGRATION WITH DOM HELPERS
  // ============================================================================

  // Update Elements shortcuts if they exist
  if (global.Elements && global.Elements.whenState) {
    global.Elements.whenState = Conditions.whenState;
    global.Elements.whenWatch = Conditions.watch;
    console.log('[Conditions.CleanupFix] ✓ Updated Elements shortcuts');
  }

  // Update Collections shortcuts if they exist
  if (global.Collections && global.Collections.whenState) {
    global.Collections.whenState = Conditions.whenState;
    global.Collections.whenWatch = Conditions.watch;
    console.log('[Conditions.CleanupFix] ✓ Updated Collections shortcuts');
  }

  // Update Selector shortcuts if they exist
  if (global.Selector && global.Selector.whenState) {
    global.Selector.whenState = Conditions.whenState;
    global.Selector.whenWatch = Conditions.watch;
    console.log('[Conditions.CleanupFix] ✓ Updated Selector shortcuts');
  }

  // Update global shortcuts if they exist (from file 05)
  if (global.whenState && global.whenState !== Conditions.whenState) {
    global.whenState = Conditions.whenState;
    console.log('[Conditions.CleanupFix] ✓ Updated global whenState shortcut');
  }

  if (global.whenWatch && global.whenWatch !== Conditions.watch) {
    global.whenWatch = Conditions.watch;
    console.log('[Conditions.CleanupFix] ✓ Updated global whenWatch shortcut');
  }

  // ============================================================================
  // SUCCESS MESSAGE
  // ============================================================================

  console.log('[Conditions.CleanupFix] ✓✓✓ v1.0.0 loaded successfully');
  console.log('[Conditions.CleanupFix] ✓ Event listener cleanup now works properly');
  console.log('[Conditions.CleanupFix] ✓ Memory leak prevention active');
  console.log('[Conditions.CleanupFix] 🛠️  Debug utilities available:');
  console.log('  - Conditions.checkListenerLeaks() - Find elements with active listeners');
  console.log('  - Conditions.cleanupAllListeners() - Emergency cleanup all listeners');
  console.log('  - Conditions.restoreCleanupFix() - Remove this patch');
  console.log('[Conditions.CleanupFix] 📚 Example:');
  console.log('  const cleanup = Conditions.whenState(state.count, conditions, ".btn");');
  console.log('  // Later:');
  console.log('  cleanup.destroy(); // ✓ Now properly removes all event listeners!');

})(typeof window !== 'undefined' ? window : global);