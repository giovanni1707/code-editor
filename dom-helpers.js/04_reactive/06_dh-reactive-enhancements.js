/**
 * 06_dh-reactive-enhancements
 * 
 * Production Enhancements for DOM Helpers Reactive State
 * Fixes: batching, deep reactivity, computed caching, error handling, async support
 * Load this AFTER 01_dh-reactive.js and 05_dh-reactive-cleanup.js
 * @license MIT
 * @version 1.0.0
 */

(function(global) {
  'use strict';

  // ============================================================================
  // VERIFY DEPENDENCIES
  // ============================================================================
  
  if (!global.ReactiveUtils) {
    console.error('[Enhancements] ReactiveUtils not found. Load 01_dh-reactive.js first.');
    return;
  }

  // ============================================================================
  // PART 1: ENHANCED BATCHING SYSTEM
  // ============================================================================
  // Why: Prevents race conditions and ensures consistent state updates
  // What: Priority-based queue with cycle detection
  
  const PRIORITY = {
    COMPUTED: 1,    // Run computed properties first
    WATCH: 2,       // Then run watchers
    EFFECT: 3       // Finally run effects
  };

  const updateQueue = new Map(); // priority -> Set of effects
  let isFlushPending = false;
  let flushCount = 0;
  const MAX_FLUSH_COUNT = 100; // Prevent infinite loops

  /**
   * Queue an update with priority
   * Computed properties run before regular effects to ensure consistency
   */
  function queueUpdate(fn, priority = PRIORITY.EFFECT) {
    if (!updateQueue.has(priority)) {
      updateQueue.set(priority, new Set());
    }
    updateQueue.get(priority).add(fn);
    
    if (!isFlushPending) {
      isFlushPending = true;
      queueMicrotask(flushQueue);
    }
  }

  /**
   * Flush all queued updates in priority order
   * This is the heart of consistent batching
   */
  function flushQueue() {
    if (flushCount > MAX_FLUSH_COUNT) {
      console.error(
        '[Enhancements] Infinite update loop detected. ' +
        'An effect may be modifying state that triggers itself.'
      );
      updateQueue.clear();
      flushCount = 0;
      isFlushPending = false;
      return;
    }
    
    flushCount++;
    isFlushPending = false;
    
    // Sort priorities: 1, 2, 3 (computed → watch → effect)
    const priorities = Array.from(updateQueue.keys()).sort((a, b) => a - b);
    
    for (const priority of priorities) {
      const effects = updateQueue.get(priority);
      if (!effects) continue;
      
      updateQueue.delete(priority);
      
      effects.forEach(effect => {
        try {
          effect();
        } catch (e) {
          console.error('[Enhancements] Effect error:', e);
        }
      });
    }
    
    // If new updates were queued during flush, schedule another flush
    if (updateQueue.size > 0) {
      queueMicrotask(flushQueue);
    } else {
      flushCount = 0;
    }
  }

  /**
   * Enhanced batch function with better control
   */
  function enhancedBatch(fn) {
    const originalBatch = global.ReactiveUtils.batch;
    return originalBatch(fn);
  }

  // ============================================================================
  // PART 2: DEEP REACTIVITY FOR COLLECTIONS
  // ============================================================================
  // Why: Arrays, Maps, and Sets need special handling
  // What: Intercept collection methods to trigger reactivity
  
  const RAW = Symbol('raw');
  const IS_REACTIVE = Symbol('reactive');

  /**
   * Create reactive Map with proper change tracking
   */
  function createReactiveMap(target, parent, key) {
    const instrumentations = {
      get size() {
        const raw = target;
        // Track the size property
        if (parent && key) {
          triggerUpdate(parent, key);
        }
        return raw.size;
      },
      
      get(key) {
        const result = target.get(key);
        return result;
      },
      
      set(key, value) {
        const hadKey = target.has(key);
        const result = target.set(key, value);
        
        // Trigger update on parent
        if (parent && key) {
          triggerUpdate(parent, key);
        }
        
        return result;
      },
      
      has(key) {
        return target.has(key);
      },
      
      delete(key) {
        const hadKey = target.has(key);
        const result = target.delete(key);
        
        if (hadKey && parent && key) {
          triggerUpdate(parent, key);
        }
        
        return result;
      },
      
      clear() {
        const hadItems = target.size > 0;
        const result = target.clear();
        
        if (hadItems && parent && key) {
          triggerUpdate(parent, key);
        }
        
        return result;
      },
      
      forEach(callback, thisArg) {
        target.forEach((value, key) => {
          callback.call(thisArg, value, key, this);
        }, thisArg);
      },
      
      keys() {
        return target.keys();
      },
      
      values() {
        return target.values();
      },
      
      entries() {
        return target.entries();
      },
      
      [Symbol.iterator]() {
        return target.entries();
      }
    };
    
    return new Proxy(target, {
      get(t, prop) {
        if (prop === RAW) return target;
        if (prop === IS_REACTIVE) return true;
        if (instrumentations.hasOwnProperty(prop)) {
          return instrumentations[prop];
        }
        return Reflect.get(t, prop);
      }
    });
  }

  /**
   * Create reactive Set with proper change tracking
   */
  function createReactiveSet(target, parent, key) {
    const instrumentations = {
      get size() {
        const raw = target;
        if (parent && key) {
          triggerUpdate(parent, key);
        }
        return raw.size;
      },
      
      has(value) {
        return target.has(value);
      },
      
      add(value) {
        const hadValue = target.has(value);
        const result = target.add(value);
        
        if (!hadValue && parent && key) {
          triggerUpdate(parent, key);
        }
        
        return result;
      },
      
      delete(value) {
        const hadValue = target.has(value);
        const result = target.delete(value);
        
        if (hadValue && parent && key) {
          triggerUpdate(parent, key);
        }
        
        return result;
      },
      
      clear() {
        const hadItems = target.size > 0;
        const result = target.clear();
        
        if (hadItems && parent && key) {
          triggerUpdate(parent, key);
        }
        
        return result;
      },
      
      forEach(callback, thisArg) {
        target.forEach((value) => {
          callback.call(thisArg, value, value, this);
        }, thisArg);
      },
      
      keys() {
        return target.values();
      },
      
      values() {
        return target.values();
      },
      
      entries() {
        return target.entries();
      },
      
      [Symbol.iterator]() {
        return target.values();
      }
    };
    
    return new Proxy(target, {
      get(t, prop) {
        if (prop === RAW) return target;
        if (prop === IS_REACTIVE) return true;
        if (instrumentations.hasOwnProperty(prop)) {
          return instrumentations[prop];
        }
        return Reflect.get(t, prop);
      }
    });
  }

  /**
   * Helper to trigger updates on parent state
   */
  function triggerUpdate(state, key) {
    if (state && state.$notify) {
      state.$notify(key);
    }
  }

  /**
   * Enhance state creation to handle collections
   */
  function enhanceCollectionSupport() {
    const originalState = global.ReactiveUtils.state;
    
    global.ReactiveUtils.state = function(target) {
      // First create the reactive state
      const state = originalState(target);
      
      // Then enhance any Map or Set properties
      Object.keys(target).forEach(key => {
        const value = target[key];
        
        if (value instanceof Map) {
          state[key] = createReactiveMap(value, state, key);
        } else if (value instanceof Set) {
          state[key] = createReactiveSet(value, state, key);
        }
      });
      
      return state;
    };
  }

  // ============================================================================
  // PART 3: ENHANCED COMPUTED PROPERTIES
  // ============================================================================
  // Why: Computed properties should cache and only recalculate when needed
  // What: Smart caching with dependency tracking and cycle detection
  
  const computedStack = [];
  const computedCache = new WeakMap(); // state -> Map of computed values

  /**
   * Get or create computed cache for a state
   */
  function getComputedCache(state) {
    if (!computedCache.has(state)) {
      computedCache.set(state, new Map());
    }
    return computedCache.get(state);
  }

  /**
   * Enhanced computed that caches across effects in the same tick
   */
  function enhanceComputed() {
    const originalState = global.ReactiveUtils.state;
    
    global.ReactiveUtils.state = function(target) {
      const state = originalState(target);
      
      // Store original $computed method
      const original$Computed = state.$computed;
      
      // Replace with enhanced version
      state.$computed = function(key, fn) {
        const cache = getComputedCache(this);
        
        // Track cycle detection
        const computedMeta = {
          key,
          fn,
          computing: false,
          value: undefined,
          dirty: true,
          tick: 0
        };
        
        cache.set(key, computedMeta);
        
        // Create the computed property
        Object.defineProperty(this, key, {
          get() {
            // Cycle detection
            if (computedMeta.computing) {
              const chain = computedStack.map(c => c.key).join(' → ');
              throw new Error(
                `[Enhancements] Circular dependency: ${chain} → ${key}`
              );
            }
            
            // Check if we need to recompute
            const currentTick = flushCount;
            if (computedMeta.dirty || computedMeta.tick !== currentTick) {
              computedMeta.computing = true;
              computedStack.push(computedMeta);
              
              try {
                computedMeta.value = fn.call(this);
                computedMeta.dirty = false;
                computedMeta.tick = currentTick;
              } catch (error) {
                console.error(`[Enhancements] Error in computed "${key}":`, error);
                throw error;
              } finally {
                computedMeta.computing = false;
                computedStack.pop();
              }
            }
            
            return computedMeta.value;
          },
          
          set() {
            console.warn(
              `[Enhancements] Cannot set computed property "${key}". ` +
              `Computed properties are read-only.`
            );
          },
          
          enumerable: true,
          configurable: true
        });
        
        return this;
      };
      
      return state;
    };
  }

  // ============================================================================
  // PART 4: ERROR BOUNDARIES
  // ============================================================================
  // Why: One bad effect shouldn't crash everything
  // What: Isolated error handling with recovery options
  
  /**
   * Error boundary class for wrapping effects
   */
  class ErrorBoundary {
    constructor(options = {}) {
      this.onError = options.onError || ((error, context) => {
        console.error('[Enhancements] Error in', context.type, ':', error);
      });
      this.fallback = options.fallback;
      this.retry = options.retry !== false; // Default true
      this.maxRetries = options.maxRetries || 3;
      this.retryDelay = options.retryDelay || 0;
    }
    
    wrap(fn, context = {}) {
      let retries = 0;
      
      return (...args) => {
        const attempt = () => {
          try {
            return fn(...args);
          } catch (error) {
            retries++;
            
            const shouldRetry = this.retry && retries < this.maxRetries;
            
            this.onError(error, {
              ...context,
              attempt: retries,
              maxRetries: this.maxRetries,
              willRetry: shouldRetry
            });
            
            if (shouldRetry) {
              if (this.retryDelay > 0) {
                setTimeout(attempt, this.retryDelay);
              } else {
                return attempt();
              }
            } else if (this.fallback) {
              return this.fallback(error, context);
            } else {
              // Don't throw - just log and continue
              return undefined;
            }
          }
        };
        
        return attempt();
      };
    }
  }

  /**
   * Create effect with error boundary
   */
  function safeEffect(fn, options = {}) {
    const boundary = new ErrorBoundary(options.errorBoundary || {});
    
    const wrappedFn = boundary.wrap(fn, {
      type: 'effect',
      created: Date.now()
    });
    
    return global.effect(wrappedFn);
  }

  /**
   * Create watch with error boundary
   */
  function safeWatch(state, keyOrFn, callback, options = {}) {
    const boundary = new ErrorBoundary(options.errorBoundary || {});
    
    const wrappedCallback = boundary.wrap(callback, {
      type: 'watch',
      key: typeof keyOrFn === 'string' ? keyOrFn : 'function',
      created: Date.now()
    });
    
    return state.$watch(keyOrFn, wrappedCallback);
  }

  // ============================================================================
  // PART 5: ENHANCED ASYNC SUPPORT
  // ============================================================================
  // Why: Modern apps need proper async handling with cancellation
  // What: Async effects and improved async state management
  
  /**
   * Async effect with AbortSignal support
   * Automatically cancels when effect re-runs
   */
  function asyncEffect(fn, options = {}) {
    let cleanup;
    let abortController;
    
    const runEffect = () => {
      // Clean up previous run
      if (cleanup) {
        try {
          cleanup();
        } catch (e) {
          console.error('[Enhancements] Cleanup error:', e);
        }
      }
      
      // Cancel previous async operation
      if (abortController) {
        abortController.abort();
      }
      
      abortController = new AbortController();
      
      const result = fn(abortController.signal);
      
      // Handle Promise return
      if (result && typeof result.then === 'function') {
        result
          .then(cleanupFn => {
            if (typeof cleanupFn === 'function') {
              cleanup = cleanupFn;
            }
          })
          .catch(error => {
            if (error.name !== 'AbortError') {
              console.error('[Enhancements] Async effect error:', error);
              if (options.onError) {
                options.onError(error);
              }
            }
          });
      }
    };
    
    const dispose = global.effect(runEffect);
    
    return () => {
      dispose();
      if (cleanup) cleanup();
      if (abortController) abortController.abort();
    };
  }

  /**
   * Enhanced async state with race condition prevention
   */
  function enhancedAsyncState(initialValue = null, options = {}) {
    const state = global.ReactiveUtils.state({
      data: initialValue,
      loading: false,
      error: null,
      requestId: 0,
      
    });

 

    // Add computed properties
    state.$computed('isSuccess', function() {
      return !this.loading && !this.error && this.data !== null;
    });

    state.$computed('isError', function() {
      return !this.loading && this.error !== null;
    });

    state.$computed('isIdle', function() {
      return !this.loading && this.data === null && this.error === null;
    });

    /**
     * Execute async function with automatic cancellation
     */
    state.$execute = async function(fn) {
      this.lastFn = fn;

      // Cancel previous request
      if (this.abortController) {
        this.abortController.abort();
      }
      
      const requestId = ++this.requestId;
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      
      this.loading = true;
      this.error = null;
      
      try {
        const result = await fn(signal);
        
        // Only update if this is still the latest request
        if (requestId === this.requestId && !signal.aborted) {
          this.data = result;
          
          if (options.onSuccess) {
            options.onSuccess(result);
          }
          
          return { success: true, data: result };
        }
        
        return { success: false, stale: true };
      } catch (error) {
        // Handle abort gracefully
        if (error.name === 'AbortError') {
          return { success: false, aborted: true };
        }
        
        // Only update error if this is still the latest request
        if (requestId === this.requestId) {
          this.error = error;
          
          if (options.onError) {
            options.onError(error);
          }
        }
        
        return { success: false, error };
      } finally {
        // Only clear loading if this is still the latest request
        if (requestId === this.requestId) {
          this.loading = false;
          this.abortController = null;
        }
      }
    };

    /**
     * Manually abort current request
     */
    state.$abort = function() {
      if (this.abortController) {
        this.abortController.abort();
        this.loading = false;
        this.abortController = null;
      }
    };

    /**
     * Reset to initial state
     */
    state.$reset = function() {
      this.$abort();
      this.data = initialValue;
      this.loading = false;
      this.error = null;
      this.requestId = 0;
    };
    
    /**
     * Refetch with last function
     */
    state.$refetch = function() {
      if (this.lastFn) {
        return this.$execute(this.lastFn);
      }

    return Promise.resolve({ success: false, error: new Error('No function to refetch') });
 

    };

    return state;
  }

  // ============================================================================
  // PART 6: DEVELOPMENT TOOLS
  // ============================================================================
  // Why: Debugging reactive systems is hard without visibility
  // What: DevTools for inspecting state, effects, and changes
  
  const DevTools = {
    enabled: false,
    states: new Map(),
    effects: new Map(),
    history: [],
    maxHistory: 50,
    
    enable() {
      this.enabled = true;
      window.__REACTIVE_DEVTOOLS__ = this;
      console.log('[DevTools] Enabled - inspect with window.__REACTIVE_DEVTOOLS__');
    },
    
    disable() {
      this.enabled = false;
      delete window.__REACTIVE_DEVTOOLS__;
    },
    
    trackState(state, name) {
      if (!this.enabled) return;
      
      const id = this.states.size + 1;
      this.states.set(state, {
        id,
        name: name || `State ${id}`,
        created: Date.now(),
        updates: []
      });
    },
    
    trackEffect(effect, name) {
      if (!this.enabled) return;
      
      const id = this.effects.size + 1;
      this.effects.set(effect, {
        id,
        name: name || `Effect ${id}`,
        created: Date.now(),
        runs: 0
      });
    },
    
    logChange(state, key, oldValue, newValue) {
      if (!this.enabled) return;
      
      const stateInfo = this.states.get(state);
      if (!stateInfo) return;
      
      const change = {
        stateId: stateInfo.id,
        stateName: stateInfo.name,
        key,
        oldValue,
        newValue,
        timestamp: Date.now()
      };
      
      stateInfo.updates.push(change);
      this.history.push(change);
      
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
    },
    
    getStates() {
      return Array.from(this.states.entries()).map(([state, info]) => ({
        ...info,
        state
      }));
    },
    
    getHistory() {
      return [...this.history];
    },
    
    clearHistory() {
      this.history.length = 0;
      this.states.forEach(info => {
        info.updates.length = 0;
      });
    }
  };

  // Auto-enable in development
  if (typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1')) {
    DevTools.enable();
  }

  // ============================================================================
  // APPLY ALL ENHANCEMENTS
  // ============================================================================
  
  // Apply collection support
  enhanceCollectionSupport();
  
  // Apply computed enhancements
  enhanceComputed();

  // ============================================================================
  // EXPORT ENHANCED API
  // ============================================================================
  
  const Enhancements = {
    // Batching
    batch: enhancedBatch,
    queueUpdate,
    
    // Error handling
    safeEffect,
    safeWatch,
    ErrorBoundary,
    
    // Async
    asyncEffect,
    asyncState: enhancedAsyncState,
    
    // DevTools
    DevTools,
    
    // Priorities (for advanced usage)
    PRIORITY
  };

  // Add to global
  global.ReactiveEnhancements = Enhancements;
  
  // Add to ReactiveUtils
  if (global.ReactiveUtils) {
    global.ReactiveUtils.safeEffect = safeEffect;
    global.ReactiveUtils.safeWatch = safeWatch;
    global.ReactiveUtils.asyncEffect = asyncEffect;
    global.ReactiveUtils.asyncState = enhancedAsyncState;
    global.ReactiveUtils.ErrorBoundary = ErrorBoundary;
    global.ReactiveUtils.DevTools = DevTools;
  }

})(typeof window !== 'undefined' ? window : global);
