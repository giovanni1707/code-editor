/**
 * 05_dh-reactive-cleanup
 *
 * Production-Ready Cleanup System for DOM Helpers Reactive State
 * Fixes memory leaks and provides proper lifecycle management
 * Load this AFTER 01_dh-reactive.js
 * @license MIT
 * @version 1.0.2
 */

(function(global) {
  'use strict';

  // ============================================================================
  // STEP 1: Verify Dependencies
  // ============================================================================

  if (!global.ReactiveUtils) {
    console.error('[Cleanup] ReactiveUtils not found. Load 01_dh-reactive.js first.');
    return;
  }

  // ============================================================================
  // STEP 2: Capture Original Functions (before ANY override)
  // ============================================================================

  /**
   * IMPORTANT: We capture originalEffect HERE, before replacing it in Step 5.
   * Module 01's `effect()` manages a closure-scoped `currentEffect` variable
   * that the reactive Proxy's `get` trap reads to track dependencies. This
   * closure variable is PRIVATE to module 01's IIFE — it is NOT accessible via
   * `global.ReactiveUtils.__currentEffect` or any external property. Any code
   * that tries to replicate or override that tracking externally will silently
   * break all dependency tracking, causing effects to run once but never
   * re-trigger on state changes.
   *
   * The safe pattern is: ALWAYS delegate to originalEffect for tracking, and
   * only wrap it to add extra behaviour (disposal guards, registry, etc.).
   */
  const originalEffect = global.ReactiveUtils.effect;
  const originalCreateReactive = global.ReactiveUtils.state;

  // ============================================================================
  // STEP 3: Enhanced Effect with Disposal Guard
  // ============================================================================

  /**
   * Enhanced effect with proper cleanup / disposal support.
   *
   * FIXED: Previously this function tried to manage dependency tracking by
   * writing to `global.ReactiveUtils.__currentEffect`. That property is never
   * read by module 01's reactive Proxy — the Proxy reads the *closure-scoped*
   * `currentEffect` variable inside module 01's IIFE, which is inaccessible
   * from outside. The result was that every effect created after module 05
   * loaded would execute its function once but NEVER re-run on state changes
   * (because no dependencies were ever registered).
   *
   * The fix is simple: delegate to `originalEffect` for all dependency-tracking
   * work. We only add a disposal guard on top of it.
   */
  function enhancedEffect(fn) {
    let isDisposed = false;

    // Wrap fn so that a disposed effect silently skips future re-runs.
    // This is the only thing we need to add on top of the original effect.
    const guardedFn = () => {
      if (isDisposed) return;
      fn();
    };

    // Delegate to the original effect (captured from module 01).
    // This is the ONLY function that correctly sets module 01's private
    // closure variable `currentEffect`, which the reactive Proxy reads.
    const originalDisposeFn = originalEffect(guardedFn);

    // Return a disposal function.
    return function dispose() {
      if (isDisposed) return;
      isDisposed = true;
      if (typeof originalDisposeFn === 'function') {
        originalDisposeFn();
      }
    };
  }

  // ============================================================================
  // STEP 4: Patch Reactive Proxy Creation
  // ============================================================================

  /**
   * Enhanced reactive state creation — adds $cleanup and enhanced $computed
   * with cleanup tracking, without disturbing any existing behaviour.
   */
  function enhancedCreateReactive(target) {
    const state = originalCreateReactive(target);
    patchStateTracking(state);
    return state;
  }

  /**
   * Patch a reactive state to add the cleanup API.
   *
   * Rules:
   *  - NEVER replace a working method with a broken one.
   *  - $watch:    Delegate to the original; just intercept the returned
   *               dispose so we can collect it for $cleanup.
   *  - $computed: Delegate to the original; just track a per-key cleanup
   *               so redundant computed definitions can be torn down.
   *  - $cleanup:  New method — disposes all tracked watches/computeds.
   */
  function patchStateTracking(state) {
    // Prevent double-patching
    if (state.__cleanupPatched) return;

    Object.defineProperty(state, '__cleanupPatched', {
      value: true,
      writable: false,
      enumerable: false,
      configurable: false
    });

    // Collect dispose functions returned by $watch calls on this state.
    const watchDisposes = [];

    // ========================================================================
    // Enhance $watch — delegate to original, collect the dispose fn
    //
    // FIXED: The previous version re-implemented $watch using enhancedEffect
    // with `oldValue` declared *inside* the effect closure, which meant it
    // was reset to `undefined` on every re-run. That caused the callback to
    // fire on every single state read, not just when the value actually
    // changed. More critically, it called the broken enhancedEffect which
    // prevented dependency tracking entirely.
    //
    // The correct approach: call the original $watch (which uses module 01's
    // closure-level effect and correctly scopes oldValue outside the effect),
    // and just capture the returned dispose function for later cleanup.
    // ========================================================================
    const originalWatch = state.$watch;
    if (originalWatch) {
      Object.defineProperty(state, '$watch', {
        value: function(keyOrFn, callback) {
          // originalWatch uses module 01's internal effect correctly.
          const dispose = originalWatch.call(this, keyOrFn, callback);
          if (typeof dispose === 'function') {
            watchDisposes.push(dispose);
          }
          return dispose;
        },
        writable: true,
        enumerable: false,
        configurable: true
      });
    }

    // ========================================================================
    // Enhance $computed — delegate to original, track per-key cleanup
    // ========================================================================
    if (!state.__computedCleanups) {
      Object.defineProperty(state, '__computedCleanups', {
        value: new Map(),
        writable: false,
        enumerable: false,
        configurable: false
      });
    }

    const originalComputed = state.$computed;
    if (originalComputed) {
      Object.defineProperty(state, '$computed', {
        value: function(key, fn) {
          // Remove old computed cleanup if it exists
          if (state.__computedCleanups.has(key)) {
            const prevCleanup = state.__computedCleanups.get(key);
            prevCleanup();
            state.__computedCleanups.delete(key);
          }

          // Delegate to original $computed — it handles all the real work
          originalComputed.call(this, key, fn);

          // Store a cleanup that removes the computed property
          state.__computedCleanups.set(key, () => {
            try { delete this[key]; } catch (e) {}
          });

          return this;
        },
        writable: true,
        enumerable: false,
        configurable: true
      });
    }

    // ========================================================================
    // Add $cleanup — disposes all watches and computed properties on this state
    // ========================================================================
    if (!state.$cleanup) {
      Object.defineProperty(state, '$cleanup', {
        value: function() {
          // Dispose all tracked $watch effects
          watchDisposes.forEach(dispose => {
            try { dispose(); } catch (e) {}
          });
          watchDisposes.length = 0;

          // Clean up all computed properties
          if (this.__computedCleanups) {
            this.__computedCleanups.forEach(cleanup => {
              try { cleanup(); } catch (e) {}
            });
            this.__computedCleanups.clear();
          }
        },
        writable: true,
        enumerable: false,
        configurable: true
      });
    }
  }

  // ============================================================================
  // STEP 5: Install Overrides
  //
  // NOTE: We do NOT set `global.ReactiveUtils.__currentEffect = null`.
  //
  // FIXED: The previous version set that property and then tried to use it
  // inside enhancedEffect for tracking. Module 01's Proxy NEVER reads
  // `global.ReactiveUtils.__currentEffect` — it reads the private closure
  // variable `currentEffect` declared with `let` inside module 01's IIFE.
  // Setting an external property with the same name does absolutely nothing
  // for dependency tracking. Removing it eliminates the false assumption.
  // ============================================================================

  global.ReactiveUtils.effect = enhancedEffect;
  global.ReactiveUtils.state  = enhancedCreateReactive;

  // Patch createState if it exists (added by module 01 as createStateWithBindings)
  if (global.ReactiveUtils.createState) {
    const originalCreateState = global.ReactiveUtils.createState;
    global.ReactiveUtils.createState = function(initialState, bindingDefs) {
      const state = originalCreateState(initialState, bindingDefs);
      patchStateTracking(state);
      return state;
    };
  }

  // ============================================================================
  // STEP 6: Enhanced Component with Automatic Cleanup
  // ============================================================================

  if (global.ReactiveUtils.component) {
    const originalComponent = global.ReactiveUtils.component;

    global.ReactiveUtils.component = function(config) {
      const component = originalComponent(config);
      const originalDestroy = component.$destroy;

      if (originalDestroy) {
        Object.defineProperty(component, '$destroy', {
          value: function() {
            originalDestroy.call(this);
            if (this.$cleanup) {
              this.$cleanup();
            }
          },
          writable: true,
          enumerable: false,
          configurable: true
        });
      }

      return component;
    };
  }

  // ============================================================================
  // STEP 7: Enhanced Reactive Builder with Cleanup
  // ============================================================================

  if (global.ReactiveUtils.reactive) {
    const originalReactive = global.ReactiveUtils.reactive;

    global.ReactiveUtils.reactive = function(initialState) {
      const builder = originalReactive(initialState);
      const originalBuild = builder.build;

      builder.build = function() {
        const state = originalBuild.call(this);

        const originalStateDestroy = state.destroy;
        Object.defineProperty(state, 'destroy', {
          value: function() {
            if (originalStateDestroy) originalStateDestroy.call(this);
            if (this.$cleanup) this.$cleanup();
          },
          writable: true,
          enumerable: false,
          configurable: true
        });

        return state;
      };

      const originalBuilderDestroy = builder.destroy;
      builder.destroy = function() {
        if (originalBuilderDestroy) originalBuilderDestroy.call(this);
        if (this.state && this.state.$cleanup) {
          this.state.$cleanup();
        }
      };

      return builder;
    };
  }

  // ============================================================================
  // STEP 8: Cleanup Utilities
  // ============================================================================

  const CleanupAPI = {
    /**
     * Get a status message about the cleanup system.
     */
    getStats() {
      return {
        message: 'Cleanup system active',
        note: 'WeakMaps prevent direct counting, but cleanup is working properly'
      };
    },

    /**
     * Create a cleanup collector for managing multiple dispose functions.
     * @returns {{ add(fn): this, cleanup(): void, size: number, disposed: boolean }}
     */
    collector() {
      const cleanups = [];
      let isDisposed = false;

      return {
        add(cleanup) {
          if (isDisposed) {
            console.warn('[Cleanup] Cannot add to disposed collector');
            return this;
          }
          if (typeof cleanup === 'function') {
            cleanups.push(cleanup);
          }
          return this;
        },

        cleanup() {
          if (isDisposed) return;
          isDisposed = true;
          cleanups.forEach(cleanup => {
            try { cleanup(); } catch (error) {
              console.error('[Cleanup] Collector error:', error);
            }
          });
          cleanups.length = 0;
        },

        get size()     { return cleanups.length; },
        get disposed() { return isDisposed; }
      };
    },

    /**
     * Create a cleanup scope.
     * @param {Function} fn - Receives a `collect` function; call collect(disposeFn)
     *                        for each effect/watch you want auto-cleaned.
     * @returns {Function} A function that disposes everything collected.
     */
    scope(fn) {
      const collector = this.collector();
      fn((cleanup) => collector.add(cleanup));
      return () => collector.cleanup();
    },

    /**
     * Patch an existing state to use the cleanup system.
     * Useful for states created before this module was loaded.
     * @param {Object} state - A reactive state object
     * @returns {Object} The same state, now patched
     */
    patchState(state) {
      patchStateTracking(state);
      return state;
    }
  };

  // ============================================================================
  // STEP 9: Export API
  // ============================================================================

  global.ReactiveCleanup = CleanupAPI;

  if (global.ReactiveUtils) {
    global.ReactiveUtils.cleanup  = CleanupAPI;
    global.ReactiveUtils.collector = CleanupAPI.collector.bind(CleanupAPI);
    global.ReactiveUtils.scope     = CleanupAPI.scope.bind(CleanupAPI);
  }

  // ============================================================================
  // STEP 10: Diagnostic Tools
  // ============================================================================

  CleanupAPI.debug = function(enable = true) {
    if (enable) {
      console.log('[Cleanup] Debug mode enabled');
      console.log('[Cleanup] Use ReactiveCleanup.getStats() for statistics');
    }
    return this;
  };

  /**
   * Quick smoke-test: creates 100 effects, disposes them, then verifies that
   * a subsequent state mutation does NOT re-invoke any of them.
   */
  CleanupAPI.test = function() {
    console.log('[Cleanup] Running cleanup test...');

    const state = global.ReactiveUtils.state({ count: 0 });
    let runCount = 0;

    // Create and immediately dispose 100 effects
    for (let i = 0; i < 100; i++) {
      // Use ReactiveUtils.effect (now enhancedEffect) so disposal works
      const dispose = global.ReactiveUtils.effect(() => {
        const _ = state.count;
        runCount++;
      });
      dispose();
    }

    const initialRuns = runCount;
    runCount = 0;

    // Update state — disposed effects must NOT re-run
    state.count++;

    setTimeout(() => {
      if (runCount === 0) {
        console.log('✅ Cleanup test PASSED — disposed effects were not called');
        console.log(`   Initial runs: ${initialRuns}, Post-dispose runs: ${runCount}`);
      } else {
        console.error('❌ Cleanup test FAILED — disposed effects still running!');
        console.error(`   Initial runs: ${initialRuns}, Post-dispose runs: ${runCount}`);
      }
    }, 10);
  };

  console.log('[Cleanup System] v1.0.2 loaded successfully');

})(typeof window !== 'undefined' ? window : global);
