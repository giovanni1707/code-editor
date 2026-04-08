/**
 * 08_dh-conditions-batch-states.js
 * 
 * Batch States Extension for Conditions
 * Provides convenient batch methods for multiple conditional updates
 * 
 * @version 1.0.0
 * @requires 01_dh-conditional-rendering.js (Conditions.js v4.0.0+)
 * @license MIT
 * 
 * Usage:
 *   // Mixed mode (auto-detect reactivity):
 *   const cleanup = Conditions.whenStates([
 *     [state.a, condA, '.foo', { reactive: true }],
 *     [state.b, condB, '.bar', { reactive: false }]
 *   ]);
 * 
 *   // Force reactive mode for all:
 *   const cleanup = Conditions.whenWatches([
 *     [state.a, condA, '.foo'],
 *     [state.b, condB, '.bar']
 *   ]);
 * 
 *   // Force non-reactive (one-time apply) for all:
 *   const cleanup = Conditions.whenApplies([
 *     ['active', condA, '.foo'],
 *     [42, condB, '.bar']
 *   ]);
 *   
 *   // Later: cleanup.destroy();
 */

(function(global) {
  'use strict';

  console.log('[Conditions.BatchStates] v1.0.0 Loading...');

  // ============================================================================
  // DEPENDENCY VALIDATION
  // ============================================================================

  if (!global.Conditions) {
    console.error('[Conditions.BatchStates] Requires Conditions.js to be loaded first');
    console.error('[Conditions.BatchStates] Please load 01_dh-conditional-rendering.js before this file');
    return;
  }

  const Conditions = global.Conditions;

  // Validate required methods exist
  if (typeof Conditions.whenState !== 'function') {
    console.error('[Conditions.BatchStates] Conditions.whenState() not found');
    console.error('[Conditions.BatchStates] Required: Conditions.js v4.0.0+');
    return;
  }

  if (typeof Conditions.batch !== 'function') {
    console.error('[Conditions.BatchStates] Conditions.batch() not found');
    console.error('[Conditions.BatchStates] Required: Conditions.js v4.0.0+');
    return;
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  /**
   * Validate a single state configuration
   * @param {*} config - Configuration to validate
   * @param {number} index - Index in array (for error messages)
   * @returns {boolean} - True if valid
   */
  function isValidConfig(config, index) {
    if (!Array.isArray(config)) {
      console.warn(`[Conditions.BatchStates] Config at index ${index} must be an array, got ${typeof config}`);
      return false;
    }

    if (config.length < 3) {
      console.warn(`[Conditions.BatchStates] Config at index ${index} must have at least 3 elements [valueFn, conditions, selector], got ${config.length}`);
      return false;
    }

    const [valueFn, conditions, selector] = config;

    // Validate valueFn
    if (valueFn === undefined || valueFn === null) {
      console.warn(`[Conditions.BatchStates] Config at index ${index}: valueFn is required`);
      return false;
    }

    // Validate conditions
    if (!conditions || (typeof conditions !== 'object' && typeof conditions !== 'function')) {
      console.warn(`[Conditions.BatchStates] Config at index ${index}: conditions must be an object or function`);
      return false;
    }

    // Validate selector
    if (!selector) {
      console.warn(`[Conditions.BatchStates] Config at index ${index}: selector is required`);
      return false;
    }

    return true;
  }

  // ============================================================================
  // CORE FUNCTIONALITY
  // ============================================================================

  /**
   * Batch multiple whenState calls
   * Automatically wraps in Conditions.batch() for optimal performance
   * 
   * @param {Array} stateConfigs - Array of [valueFn, conditions, selector, options?] configurations
   * @returns {Object} - Combined cleanup object with update() and destroy() methods
   * 
   * @example
   * // Basic usage
   * Conditions.whenStates([
   *   [state.count, { 0: { textContent: 'Zero' }, default: { textContent: 'Not zero' } }, '.counter'],
   *   [state.isActive, { true: { classList: { add: 'active' } } }, '.btn']
   * ]);
   * 
   * @example
   * // With options
   * Conditions.whenStates([
   *   [() => state.user.name, nameConditions, '.username', { reactive: true }],
   *   [state.theme, themeConditions, 'body', { reactive: false }]
   * ]);
   * 
   * @example
   * // With cleanup
   * const cleanup = Conditions.whenStates([...]);
   * 
   * // Later:
   * cleanup.update();   // Manually update all
   * cleanup.destroy();  // Cleanup all watchers
   */
  function whenStates(stateConfigs) {
    // Validate input
    if (!Array.isArray(stateConfigs)) {
      console.error('[Conditions.BatchStates] whenStates() requires an array of configurations');
      console.error('[Conditions.BatchStates] Expected: [[valueFn, conditions, selector, options?], ...]');
      return createEmptyCleanup();
    }

    if (stateConfigs.length === 0) {
      console.warn('[Conditions.BatchStates] Empty array provided to whenStates()');
      return createEmptyCleanup();
    }

    // Store cleanup objects
    const cleanups = [];
    let validConfigs = 0;

    // Execute all whenState calls inside a batch
    const batchResult = Conditions.batch(() => {
      stateConfigs.forEach((config, index) => {
        // Validate configuration
        if (!isValidConfig(config, index)) {
          return; // Skip invalid configs
        }

        // Destructure with optional 4th parameter
        const [valueFn, conditions, selector, options] = config;

        try {
          // Execute whenState
          const cleanup = Conditions.whenState(valueFn, conditions, selector, options);
          
          // Store cleanup if available
          if (cleanup && typeof cleanup === 'object') {
            cleanups.push(cleanup);
          }

          validConfigs++;
        } catch (error) {
          console.error(`[Conditions.BatchStates] Error executing config at index ${index}:`, error);
        }
      });
    });

    // Log summary
    if (validConfigs > 0) {
      console.log(`[Conditions.BatchStates] ✓ Initialized ${validConfigs} state watchers`);
    }

    // Return combined cleanup object
    return createCombinedCleanup(cleanups);
  }

  /**
   * Create a combined cleanup object from multiple cleanups
   * @param {Array} cleanups - Array of cleanup objects
   * @returns {Object} - Combined cleanup with update() and destroy()
   */
  function createCombinedCleanup(cleanups) {
    return {
      /**
       * Manually update all watchers
       */
      update() {
        let updated = 0;
        cleanups.forEach((cleanup, index) => {
          try {
            if (cleanup && typeof cleanup.update === 'function') {
              cleanup.update();
              updated++;
            }
          } catch (error) {
            console.error(`[Conditions.BatchStates] Error updating cleanup at index ${index}:`, error);
          }
        });
        console.log(`[Conditions.BatchStates] Updated ${updated}/${cleanups.length} watchers`);
      },

      /**
       * Destroy all watchers and cleanup resources
       */
      destroy() {
        let destroyed = 0;
        cleanups.forEach((cleanup, index) => {
          try {
            if (cleanup && typeof cleanup.destroy === 'function') {
              cleanup.destroy();
              destroyed++;
            }
          } catch (error) {
            console.error(`[Conditions.BatchStates] Error destroying cleanup at index ${index}:`, error);
          }
        });
        console.log(`[Conditions.BatchStates] Destroyed ${destroyed}/${cleanups.length} watchers`);
        
        // Clear the cleanups array
        cleanups.length = 0;
      },

      /**
       * Get count of active cleanups
       */
      get count() {
        return cleanups.length;
      },

      /**
       * Get all cleanup objects (for advanced usage)
       */
      getCleanups() {
        return [...cleanups];
      }
    };
  }

  /**
   * Create an empty cleanup object (for error cases)
   */
  function createEmptyCleanup() {
    return {
      update: () => {},
      destroy: () => {},
      count: 0,
      getCleanups: () => []
    };
  }

  // ============================================================================
  // REACTIVE MODE VARIANTS
  // ============================================================================

  /**
   * Batch multiple watch calls (forces reactive mode)
   * All configurations will use reactive: true automatically
   * 
   * @param {Array} stateConfigs - Array of [valueFn, conditions, selector] configurations
   * @returns {Object} - Combined cleanup object
   * 
   * @example
   * Conditions.whenWatches([
   *   [state.count, countConditions, '.counter'],
   *   [state.isActive, activeConditions, '.btn'],
   *   [() => state.user.name, nameConditions, '.username']
   * ]);
   */
  function whenWatches(stateConfigs) {
    if (!Array.isArray(stateConfigs)) {
      console.error('[Conditions.BatchStates] whenWatches() requires an array of configurations');
      return createEmptyCleanup();
    }

    // Force reactive: true for all configs
    const reactiveConfigs = stateConfigs.map(config => {
      if (!Array.isArray(config) || config.length < 3) {
        return config; // Let validation handle it
      }
      
      const [valueFn, conditions, selector, options = {}] = config;
      
      // Merge options with reactive: true (override any existing setting)
      return [valueFn, conditions, selector, { ...options, reactive: true }];
    });

    console.log('[Conditions.BatchStates] Executing batch with reactive mode enabled');
    return whenStates(reactiveConfigs);
  }

  /**
   * Batch multiple apply calls (forces non-reactive mode)
   * All configurations will be executed once without reactivity
   * 
   * @param {Array} stateConfigs - Array of [value, conditions, selector] configurations
   * @returns {Object} - Combined cleanup object
   * 
   * @example
   * Conditions.whenApplies([
   *   ['active', activeConditions, '.btn'],
   *   [42, numberConditions, '.count'],
   *   ['theme-dark', themeConditions, 'body']
   * ]);
   */
  function whenApplies(stateConfigs) {
    if (!Array.isArray(stateConfigs)) {
      console.error('[Conditions.BatchStates] whenApplies() requires an array of configurations');
      return createEmptyCleanup();
    }

    if (stateConfigs.length === 0) {
      console.warn('[Conditions.BatchStates] Empty array provided to whenApplies()');
      return createEmptyCleanup();
    }

    // Validate and execute using Conditions.apply() for each config
    const cleanups = [];
    let validConfigs = 0;

    Conditions.batch(() => {
      stateConfigs.forEach((config, index) => {
        // Validate configuration (needs at least 3 elements)
        if (!isValidConfig(config, index)) {
          return;
        }

        const [value, conditions, selector] = config;

        try {
          // Use Conditions.apply() for non-reactive execution
          Conditions.apply(value, conditions, selector);
          validConfigs++;
          
          // Create a manual cleanup object for consistency
          cleanups.push({
            update: () => {
              Conditions.apply(value, conditions, selector);
            },
            destroy: () => {} // No cleanup needed for one-time applies
          });
        } catch (error) {
          console.error(`[Conditions.BatchStates] Error executing apply at index ${index}:`, error);
        }
      });
    });

    if (validConfigs > 0) {
      console.log(`[Conditions.BatchStates] ✓ Applied ${validConfigs} static conditions`);
    }

    return createCombinedCleanup(cleanups);
  }

  // ============================================================================
  // ADDITIONAL UTILITIES
  // ============================================================================

  /**
   * Create a reusable batch configuration
   * Useful for complex applications with repeated patterns
   * 
   * @param {Array} configs - Configuration array
   * @param {string} mode - 'state' | 'watch' | 'apply' (default: 'state')
   * @returns {Function} - Function that executes batch with configs
   * 
   * @example
   * const setupDashboard = createBatchConfig([
   *   [state.userCount, userConditions, '.user-count'],
   *   [state.revenue, revenueConditions, '.revenue']
   * ], 'watch');
   * 
   * // Later, execute multiple times:
   * const cleanup1 = setupDashboard();
   * const cleanup2 = setupDashboard();
   */
  function createBatchConfig(configs, mode = 'state') {
    if (!Array.isArray(configs)) {
      console.error('[Conditions.BatchStates] createBatchConfig() requires an array');
      return () => createEmptyCleanup();
    }

    const modeMap = {
      'state': whenStates,
      'watch': whenWatches,
      'apply': whenApplies
    };

    const executeFn = modeMap[mode] || whenStates;

    return function executeBatch() {
      return executeFn(configs);
    };
  }

  /**
   * Combine multiple batch configurations
   * 
   * @param {...Array} configArrays - Multiple configuration arrays
   * @returns {Object} - Combined cleanup
   * 
   * @example
   * const cleanup = Conditions.combineBatches(
   *   [[state.a, condA, '.a']],
   *   [[state.b, condB, '.b']],
   *   [[state.c, condC, '.c']]
   * );
   */
  function combineBatches(...configArrays) {
    const allConfigs = configArrays.flat();
    return whenStates(allConfigs);
  }

  // ============================================================================
  // EXPORT TO CONDITIONS NAMESPACE
  // ============================================================================

  // Add main methods
  Conditions.whenStates = whenStates;
  Conditions.whenWatches = whenWatches;
  Conditions.whenApplies = whenApplies;

  // Add utilities
  Conditions.createBatchConfig = createBatchConfig;
  Conditions.combineBatches = combineBatches;

  // ============================================================================
  // INTEGRATION WITH DOM HELPERS
  // ============================================================================

  // Add to Elements if available
  if (global.Elements) {
    global.Elements.whenStates = whenStates;
    global.Elements.whenWatches = whenWatches;
    global.Elements.whenApplies = whenApplies;
    global.Elements.createBatchConfig = createBatchConfig;
  }

  // Add to Collections if available
  if (global.Collections) {
    global.Collections.whenStates = whenStates;
    global.Collections.whenWatches = whenWatches;
    global.Collections.whenApplies = whenApplies;
    global.Collections.createBatchConfig = createBatchConfig;
  }

  // Add to Selector if available
  if (global.Selector) {
    global.Selector.whenStates = whenStates;
    global.Selector.whenWatches = whenWatches;
    global.Selector.whenApplies = whenApplies;
    global.Selector.createBatchConfig = createBatchConfig;
  }

  // ============================================================================
  // SHORTCUT INTEGRATION
  // ============================================================================

  // If shortcuts are loaded, add global functions
  if (global.whenState) {
    if (!global.whenStates) {
      global.whenStates = whenStates;
      console.log('[Conditions.BatchStates] ✓ Global shortcut: whenStates()');
    }
    if (!global.whenWatches) {
      global.whenWatches = whenWatches;
      console.log('[Conditions.BatchStates] ✓ Global shortcut: whenWatches()');
    }
    if (!global.whenApplies) {
      global.whenApplies = whenApplies;
      console.log('[Conditions.BatchStates] ✓ Global shortcut: whenApplies()');
    }
  } else if (global.CondShortcuts) {
    global.CondShortcuts.whenStates = whenStates;
    global.CondShortcuts.whenWatches = whenWatches;
    global.CondShortcuts.whenApplies = whenApplies;
    console.log('[Conditions.BatchStates] ✓ Added to CondShortcuts namespace');
  }

  // ============================================================================
  // VERSION TRACKING
  // ============================================================================

  Conditions.extensions = Conditions.extensions || {};
  Conditions.extensions.batchStates = {
    version: '1.0.0',
    methods: ['whenStates', 'whenWatches', 'whenApplies', 'createBatchConfig', 'combineBatches']
  };

  // ============================================================================
  // SUCCESS MESSAGE
  // ============================================================================

  console.log('[Conditions.BatchStates] ✓✓✓ v1.0.0 loaded successfully');
  console.log('[Conditions.BatchStates] ✓ Available methods:');
  console.log('  - Conditions.whenStates([[valueFn, cond, sel, opts?], ...])');
  console.log('  - Conditions.whenWatches([[valueFn, cond, sel], ...]) - Forces reactive mode');
  console.log('  - Conditions.whenApplies([[value, cond, sel], ...]) - Forces non-reactive mode');
  console.log('  - Conditions.createBatchConfig(configs, mode?)');
  console.log('  - Conditions.combineBatches(...configArrays)');
  console.log('[Conditions.BatchStates] 📚 Examples:');
  console.log('  // Mixed mode (default):');
  console.log('  Conditions.whenStates([');
  console.log('    [state.count, countCond, ".counter", { reactive: true }],');
  console.log('    ["active", activeCond, ".btn", { reactive: false }]');
  console.log('  ]);');
  console.log('');
  console.log('  // All reactive:');
  console.log('  Conditions.whenWatches([');
  console.log('    [state.count, countCond, ".counter"],');
  console.log('    [state.active, activeCond, ".btn"]');
  console.log('  ]);');
  console.log('');
  console.log('  // All static:');
  console.log('  Conditions.whenApplies([');
  console.log('    ["active", activeCond, ".btn"],');
  console.log('    [42, numberCond, ".count"]');
  console.log('  ]);');

})(typeof window !== 'undefined' ? window : global);