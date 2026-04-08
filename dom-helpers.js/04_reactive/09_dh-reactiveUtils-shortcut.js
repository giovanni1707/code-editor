/**
 * 09_dh-reactiveUtils-shortcut.js
 * 
 * Standalone API Module v1.1.0
 * Provides simplified function calls without namespace prefixes
 * 
 * Allows:
 *   const myState = state({}) instead of ReactiveUtils.state({})
 *   patchArray(state, 'items') instead of ReactiveUtils.patchArray(state, 'items')
 *   effect(() => {}) instead of effect(() => {})
 * 
 * Load this AFTER all reactive modules for full API access
 * @license MIT
 */

(function(global) {
  'use strict';

  // Check if ReactiveUtils exists
  if (!global.ReactiveUtils) {
    console.warn('[Standalone API] ReactiveUtils not found. Load reactive modules first.');
    return;
  }

  const ReactiveUtils = global.ReactiveUtils;

  // ============================================================
  // CORE STATE METHODS
  // ============================================================

  /**
   * Create reactive state
   * @example const myState = state({ count: 0 });
   */
  global.state = ReactiveUtils.state || ReactiveUtils.create;

  /**
   * Create state with bindings
   * @example const myState = createState({ count: 0 }, { '#counter': 'count' });
   */
  global.createState = ReactiveUtils.createState;

  /**
   * Create reactive effect
   * @example effect(() => console.log(state.count));
   */
  global.effect = ReactiveUtils.effect;

  /**
   * Batch multiple updates
   * @example batch(() => { state.a = 1; state.b = 2; });
   */
  global.batch = ReactiveUtils.batch;

  // ============================================================
  // COMPUTED & WATCH
  // ============================================================

  /**
   * Add computed properties to state
   * @example computed(state, { total: function() { return this.a + this.b; } });
   */
  global.computed = ReactiveUtils.computed;

  /**
   * Watch state changes
   * @example watch(state, { count: (newVal, oldVal) => console.log(newVal) });
   */
  global.watch = ReactiveUtils.watch;

  /**
   * Multiple effects
   * @example effects({ log: () => console.log(state.count) });
   */
  global.effects = ReactiveUtils.effects;

  // ============================================================
  // ENHANCED EFFECTS (Module 06)
  // ============================================================

  if (ReactiveUtils.safeEffect) {
    /**
     * Create effect with error boundary
     * @example safeEffect(() => { ... }, { errorBoundary: { onError: handleError } });
     */
    global.safeEffect = ReactiveUtils.safeEffect;
  }

  if (ReactiveUtils.safeWatch) {
    /**
     * Watch with error boundary
     * @example safeWatch(state, 'count', callback, { errorBoundary: { onError: handleError } });
     */
    global.safeWatch = ReactiveUtils.safeWatch;
  }

  if (ReactiveUtils.asyncEffect) {
    /**
     * Create async effect with AbortSignal support
     * @example asyncEffect(async (signal) => { ... }, { onError: handleError });
     */
    global.asyncEffect = ReactiveUtils.asyncEffect;
  }

  // ============================================================
  // REFS & COLLECTIONS
  // ============================================================

  /**
   * Create reactive reference
   * @example const count = ref(0);
   */
  global.ref = ReactiveUtils.ref;

  /**
   * Create multiple refs
   * @example const { count, name } = refs({ count: 0, name: '' });
   */
  global.refs = ReactiveUtils.refs;

  /**
   * Create reactive collection
   * @example const items = collection([1, 2, 3]);
   */
  global.collection = ReactiveUtils.collection || ReactiveUtils.list;

  /**
   * Alias for collection
   * @example const items = list([1, 2, 3]);
   */
  global.list = ReactiveUtils.list || ReactiveUtils.collection;

  // ============================================================
  // ARRAY PATCHING
  // ============================================================

  /**
   * Manually patch array for reactivity
   * @example patchArray(state, 'items');
   */
  global.patchArray = ReactiveUtils.patchArray || global.patchReactiveArray;

  // ============================================================
  // FORMS
  // ============================================================

  if (ReactiveUtils.form || ReactiveUtils.createForm) {
    /**
     * Create reactive form
     * @example const myForm = form({ name: '', email: '' }, { validators: {...} });
     */
    global.form = ReactiveUtils.form || ReactiveUtils.createForm;

    /**
     * Alias for form
     * @example const myForm = createForm({ name: '' });
     */
    global.createForm = ReactiveUtils.createForm || ReactiveUtils.form;
  }

  if (ReactiveUtils.validators) {
    /**
     * Form validators
     * @example validators.required('This field is required')
     */
    global.validators = ReactiveUtils.validators;
  }

  // ============================================================
  // STORE & COMPONENT
  // ============================================================

  /**
   * Create state store
   * @example const myStore = store({ count: 0 }, { getters: {...}, actions: {...} });
   */
  global.store = ReactiveUtils.store;

  /**
   * Create reactive component
   * @example const myComponent = component({ state: {...}, computed: {...} });
   */
  global.component = ReactiveUtils.component;

  /**
   * Reactive builder pattern
   * @example const builder = reactive({ count: 0 }).computed({...}).build();
   */
  global.reactive = ReactiveUtils.reactive;

  // ============================================================
  // BINDINGS
  // ============================================================

  /**
   * Create DOM bindings
   * @example bindings({ '#counter': () => state.count });
   */
  global.bindings = ReactiveUtils.bindings;

  /**
   * Update all (mixed state + DOM)
   * @example updateAll(state, { count: 5, '#counter': { textContent: '5' } });
   */
  global.updateAll = ReactiveUtils.updateAll || global.updateAll;

  // ============================================================
  // ASYNC STATE
  // ============================================================

  if (ReactiveUtils.async) {
    /**
     * Create basic async state
     * @example const data = async(null);
     */
    global.async = ReactiveUtils.async;
  }

  if (ReactiveUtils.asyncState) {
    /**
     * Create enhanced async state with race condition prevention
     * @example const data = asyncState(null, { onSuccess: handleSuccess });
     */
    global.asyncState = ReactiveUtils.asyncState;
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  /**
   * Check if value is reactive
   * @example if (isReactive(state)) { ... }
   */
  global.isReactive = ReactiveUtils.isReactive;

  /**
   * Get raw (non-reactive) value
   * @example const raw = toRaw(state);
   */
  global.toRaw = ReactiveUtils.toRaw;

  /**
   * Manually notify changes
   * @example notify(state, 'count');
   */
  global.notify = ReactiveUtils.notify;

  /**
   * Pause reactivity
   * @example pause();
   */
  global.pause = ReactiveUtils.pause;

  /**
   * Resume reactivity
   * @example resume(true);
   */
  global.resume = ReactiveUtils.resume;

  /**
   * Run function without tracking
   * @example untrack(() => console.log(state.count));
   */
  global.untrack = ReactiveUtils.untrack;

  // ============================================================
  // CLEANUP SYSTEM (Module 05)
  // ============================================================

  if (ReactiveUtils.collector) {
    /**
     * Create cleanup collector
     * @example const cleanup = collector(); cleanup.add(effect1); cleanup.cleanup();
     */
    global.collector = ReactiveUtils.collector;
  }

  if (ReactiveUtils.scope) {
    /**
     * Create cleanup scope that auto-collects
     * @example const cleanup = scope((collect) => { collect(effect(() => {})); });
     */
    global.scope = ReactiveUtils.scope;
  }

  // ============================================================
  // ERROR HANDLING (Module 06)
  // ============================================================

  if (ReactiveUtils.ErrorBoundary) {
    /**
     * Error boundary class for wrapping effects
     * @example const boundary = new ErrorBoundary({ onError: handleError });
     */
    global.ErrorBoundary = ReactiveUtils.ErrorBoundary;
  }

  // ============================================================
  // DEVELOPMENT TOOLS (Module 06)
  // ============================================================

  if (ReactiveUtils.DevTools) {
    /**
     * Development tools for debugging and monitoring
     * @example DevTools.enable(); DevTools.trackState(state, 'MyState');
     */
    global.DevTools = ReactiveUtils.DevTools;
  }

  // ============================================================
  // STORAGE INTEGRATION (Module 08)
  // ============================================================

  if (ReactiveUtils.autoSave) {
    /**
     * Add auto-save to reactive object
     * @example autoSave(state, 'myState', { storage: 'localStorage', debounce: 300 });
     */
    global.autoSave = ReactiveUtils.autoSave;
  }

  if (ReactiveUtils.withStorage) {
    /**
     * Backward compatibility alias for autoSave
     * @example withStorage(state, 'myState', { debounce: 300 });
     */
    global.withStorage = ReactiveUtils.withStorage;
  }

  if (ReactiveUtils.reactiveStorage) {
    /**
     * Create reactive storage proxy
     * @example const storage = reactiveStorage('localStorage', 'myApp');
     */
    global.reactiveStorage = ReactiveUtils.reactiveStorage;
  }

  if (ReactiveUtils.watchStorage) {
    /**
     * Watch storage key for changes
     * @example watchStorage('theme', (newVal, oldVal) => { ... }, { immediate: true });
     */
    global.watchStorage = ReactiveUtils.watchStorage;
  }

  // ============================================================
  // COLLECTIONS EXTENDED API (if Collections module loaded)
  // ============================================================

  if (global.Collections) {
    /**
     * Create collection with computed
     * @example const items = createCollection([1, 2, 3], { total: function() { ... } });
     */
    global.createCollection = global.Collections.create || global.Collections.collection;

    /**
     * Create collection with computed properties
     * @example const items = computedCollection([1, 2, 3], { total() { return this.items.length; } });
     */
    if (global.Collections.createWithComputed) {
      global.computedCollection = global.Collections.createWithComputed;
    }

    /**
     * Create filtered collection
     * @example const active = filteredCollection(todos, t => !t.done);
     */
    if (global.Collections.createFiltered) {
      global.filteredCollection = global.Collections.createFiltered;
    }
  }

  // ============================================================
  // NAMESPACE-LEVEL METHODS (Module 09)
  // ============================================================
  // These are already added by Module 09, but we document them here for completeness

  if (typeof global.set === 'undefined' && ReactiveUtils.set) {
    /**
     * Set state values with functional updates
     * @example set(state, { count: prev => prev + 1 });
     */
    global.set = ReactiveUtils.set;
  }

  if (typeof global.cleanup === 'undefined' && ReactiveUtils.cleanup) {
    /**
     * Clean up all effects and watchers from state
     * @example cleanup(state);
     */
    global.cleanup = ReactiveUtils.cleanup;
  }

  if (typeof global.execute === 'undefined' && ReactiveUtils.execute) {
    /**
     * Execute async operation on async state
     * @example execute(asyncState, async (signal) => { ... });
     */
    global.execute = ReactiveUtils.execute;
  }

  if (typeof global.abort === 'undefined' && ReactiveUtils.abort) {
    /**
     * Abort current async operation
     * @example abort(asyncState);
     */
    global.abort = ReactiveUtils.abort;
  }

  if (typeof global.reset === 'undefined' && ReactiveUtils.reset) {
    /**
     * Reset async state to initial values
     * @example reset(asyncState);
     */
    global.reset = ReactiveUtils.reset;
  }

  if (typeof global.refetch === 'undefined' && ReactiveUtils.refetch) {
    /**
     * Refetch with last async function
     * @example refetch(asyncState);
     */
    global.refetch = ReactiveUtils.refetch;
  }

  if (typeof global.destroy === 'undefined' && ReactiveUtils.destroy) {
    /**
     * Destroy component and clean up resources
     * @example destroy(component);
     */
    global.destroy = ReactiveUtils.destroy;
  }

  if (typeof global.save === 'undefined' && ReactiveUtils.save) {
    /**
     * Force save state to storage
     * @example save(state);
     */
    global.save = ReactiveUtils.save;
  }

  if (typeof global.load === 'undefined' && ReactiveUtils.load) {
    /**
     * Load state from storage
     * @example load(state);
     */
    global.load = ReactiveUtils.load;
  }

  if (typeof global.clear === 'undefined' && ReactiveUtils.clear) {
    /**
     * Clear state from storage
     * @example clear(state);
     */
    global.clear = ReactiveUtils.clear;
  }

  if (typeof global.exists === 'undefined' && ReactiveUtils.exists) {
    /**
     * Check if state exists in storage
     * @example if (exists(state)) { ... }
     */
    global.exists = ReactiveUtils.exists;
  }

  if (typeof global.stopAutoSave === 'undefined' && ReactiveUtils.stopAutoSave) {
    /**
     * Stop automatic saving for state
     * @example stopAutoSave(state);
     */
    global.stopAutoSave = ReactiveUtils.stopAutoSave;
  }

  if (typeof global.startAutoSave === 'undefined' && ReactiveUtils.startAutoSave) {
    /**
     * Start automatic saving for state
     * @example startAutoSave(state);
     */
    global.startAutoSave = ReactiveUtils.startAutoSave;
  }

  if (typeof global.storageInfo === 'undefined' && ReactiveUtils.storageInfo) {
    /**
     * Get storage information for state
     * @example const info = storageInfo(state); console.log(info.sizeKB);
     */
    global.storageInfo = ReactiveUtils.storageInfo;
  }

  if (typeof global.getRaw === 'undefined' && ReactiveUtils.getRaw) {
    /**
     * Get raw (non-reactive) object from state
     * @example const raw = getRaw(state);
     */
    global.getRaw = ReactiveUtils.getRaw;
  }

  // ============================================================
  // STORAGE UTILITY FUNCTIONS (Module 08)
  // ============================================================

  if (global.ReactiveStorage) {
    /**
     * Check if storage type is available
     * @example if (isStorageAvailable('localStorage')) { ... }
     */
    if (global.ReactiveStorage.isStorageAvailable) {
      global.isStorageAvailable = global.ReactiveStorage.isStorageAvailable;
    }

    /**
     * Boolean flag for localStorage availability
     * @example if (hasLocalStorage) { ... }
     */
    if (typeof global.ReactiveStorage.hasLocalStorage !== 'undefined') {
      global.hasLocalStorage = global.ReactiveStorage.hasLocalStorage;
    }

    /**
     * Boolean flag for sessionStorage availability
     * @example if (hasSessionStorage) { ... }
     */
    if (typeof global.ReactiveStorage.hasSessionStorage !== 'undefined') {
      global.hasSessionStorage = global.ReactiveStorage.hasSessionStorage;
    }
  }

})(typeof window !== 'undefined' ? window : global);