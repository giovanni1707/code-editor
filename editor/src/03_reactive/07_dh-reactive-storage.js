/**
 * 07_dh-reactive-storage.js
 * 
 * STANDALONE AutoSave - No dh-storage.js dependency!
 * Only requires: 01_dh-reactive.js
 * 
 * @license MIT
 * @version 3.0.0
 */

(function(global) {
  'use strict';

  // ============================================================================
  // VERIFY DEPENDENCIES (only reactive needed!)
  // ============================================================================
  
  if (!global.ReactiveUtils) {
    console.error('[autoSave] ReactiveUtils not found. Load 01_dh-reactive.js first.');
    return;
  }

  const { effect, batch } = global.ReactiveUtils;

  // ============================================================================
  // BUILT-IN STORAGE WRAPPER (replaces dh-storage.js)
  // ============================================================================
  
  /**
   * Simple storage wrapper with JSON handling and namespaces
   */
  class StorageWrapper {
    constructor(storageType = 'localStorage', namespace = '') {
      this.storageType = storageType;
      this.namespace = namespace;
      this.storage = global[storageType];
      
      if (!this.storage) {
        console.warn(`[autoSave] ${storageType} not available`);
        this.storage = {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
          clear: () => {},
          key: () => null,
          length: 0
        };
      }
    }

    _getKey(key) {
      return this.namespace ? `${this.namespace}:${key}` : key;
    }

    set(key, value, options = {}) {
      try {
        const fullKey = this._getKey(key);
        
        const data = {
          value: value,
          timestamp: Date.now()
        };

        // Add expiration
        if (options.expires) {
          data.expires = Date.now() + (options.expires * 1000);
        }

        this.storage.setItem(fullKey, JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('[autoSave] Storage set error:', error);
        return false;
      }
    }

    get(key) {
      try {
        const fullKey = this._getKey(key);
        const item = this.storage.getItem(fullKey);
        
        if (!item) return null;

        const data = JSON.parse(item);
        
        // Check expiration
        if (data.expires && Date.now() > data.expires) {
          this.storage.removeItem(fullKey);
          return null;
        }

        return data.value;
      } catch (error) {
        console.error('[autoSave] Storage get error:', error);
        return null;
      }
    }

    remove(key) {
      try {
        const fullKey = this._getKey(key);
        this.storage.removeItem(fullKey);
        return true;
      } catch (error) {
        console.error('[autoSave] Storage remove error:', error);
        return false;
      }
    }

    has(key) {
      try {
        const fullKey = this._getKey(key);
        return this.storage.getItem(fullKey) !== null;
      } catch (error) {
        return false;
      }
    }

    keys() {
      try {
        const keys = [];
        const prefix = this.namespace ? `${this.namespace}:` : '';
        
        for (let i = 0; i < this.storage.length; i++) {
          const key = this.storage.key(i);
          if (key && (!this.namespace || key.startsWith(prefix))) {
            const strippedKey = this.namespace 
              ? key.slice(prefix.length)
              : key;
            keys.push(strippedKey);
          }
        }
        
        return keys;
      } catch (error) {
        return [];
      }
    }

    clear() {
      try {
        if (this.namespace) {
          const keys = this.keys();
          keys.forEach(key => this.remove(key));
        } else {
          this.storage.clear();
        }
        return true;
      } catch (error) {
        return false;
      }
    }
  }

  // ============================================================================
  // STORAGE AVAILABILITY CHECK
  // ============================================================================
  
  function isStorageAvailable(type) {
    try {
      const storage = global[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  const hasLocalStorage = isStorageAvailable('localStorage');
  const hasSessionStorage = isStorageAvailable('sessionStorage');

  // ============================================================================
  // UTILITIES
  // ============================================================================

  function safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    });
  }

  // ============================================================================
  // autoSave() - STANDALONE VERSION
  // ============================================================================
  
  function autoSave(reactiveObj, key, options = {}) {
    // Validation
    if (!reactiveObj || typeof reactiveObj !== 'object') {
      throw new Error('[autoSave] First argument must be a reactive object');
    }
    if (!key || typeof key !== 'string') {
      throw new Error('[autoSave] Second argument must be a string key');
    }

    // Options
    const {
      storage = 'localStorage',
      namespace = '',
      debounce = 0,
      autoLoad = true,
      autoSave: autoSaveEnabled = true,
      sync = false,
      expires = null,
      onSave = null,
      onLoad = null,
      onSync = null,
      onError = null
    } = options;

    // Check availability
    if (storage === 'localStorage' && !hasLocalStorage) {
      console.warn('[autoSave] localStorage not available');
      return reactiveObj;
    }
    if (storage === 'sessionStorage' && !hasSessionStorage) {
      console.warn('[autoSave] sessionStorage not available');
      return reactiveObj;
    }

    // Create storage wrapper (no external dependency!)
    const store = new StorageWrapper(storage, namespace);

    // ========================================================================
    // HELPERS
    // ========================================================================

    function getValue(obj) {
      try {
        if (obj.value !== undefined && typeof obj.valueOf === 'function') {
          return obj.value; // Ref
        }
        if (obj.items !== undefined) {
          return obj.items; // Collection
        }
        if (obj.values !== undefined) {
          return { values: obj.values, errors: obj.errors || {}, touched: obj.touched || {} }; // Form
        }
        if (obj.$raw) {
          return obj.$raw; // State
        }
        return obj; // Plain object
      } catch (error) {
        console.error('[autoSave] getValue error:', error);
        if (onError) onError(error, 'getValue');
        return null;
      }
    }

    function setValue(obj, value) {
      if (!value) return;
      try {
        if (obj.value !== undefined && typeof obj.valueOf === 'function') {
          obj.value = value;
        } else if (obj.items !== undefined) {
          obj.reset ? obj.reset(value) : (obj.items = value);
        } else if (obj.values !== undefined && value.values) {
          Object.assign(obj.values, value.values);
          if (value.errors) obj.errors = value.errors;
          if (value.touched) obj.touched = value.touched;
        } else {
          Object.assign(obj, value);
        }
      } catch (error) {
        console.error('[autoSave] setValue error:', error);
        if (onError) onError(error, 'setValue');
      }
    }

    // ========================================================================
    // LOAD
    // ========================================================================

    if (autoLoad) {
      try {
        const loaded = store.get(key);
        if (loaded !== null) {
          const processed = onLoad ? onLoad(loaded) : loaded;
          setValue(reactiveObj, processed);
        }
      } catch (error) {
        console.error('[autoSave] Load error:', error);
        if (onError) onError(error, 'load');
      }
    }

    // ========================================================================
    // SAVE (PRODUCTION HARDENED)
    // ========================================================================

    let saveTimeout;
    let effectCleanup;
    let isUpdatingFromStorage = false;
    let lastSaveTime = 0;
    const MIN_SAVE_INTERVAL = 100; // Minimum 100ms between saves
    const LARGE_ITEM_WARNING = 100 * 1024; // 100KB
    const MAX_STORAGE_WARNING = 5 * 1024 * 1024; // 5MB

    function save() {
      if (isUpdatingFromStorage) return;
      
      // Prevent excessive saves
      const now = Date.now();
      if (now - lastSaveTime < MIN_SAVE_INTERVAL) {
        return;
      }
      lastSaveTime = now;
      
      if (saveTimeout) clearTimeout(saveTimeout);

      const doSave = () => {
        try {
          let valueToSave = getValue(reactiveObj);
          if (valueToSave === null) return;

          if (onSave) {
            valueToSave = onSave(valueToSave);
          }

          // Validate serializability and check size
          const serialized = safeStringify(valueToSave);
          const size = serialized.length;
          
          // Warn about large data
          if (size > LARGE_ITEM_WARNING) {
            console.warn(`[autoSave] Large data detected (${Math.round(size / 1024)}KB) for key "${key}"`);
          }

          // Check total storage size
          if (typeof global[storage] !== 'undefined') {
            let totalSize = 0;
            try {
              for (let i = 0; i < global[storage].length; i++) {
                const k = global[storage].key(i);
                if (k) {
                  totalSize += (global[storage].getItem(k) || '').length + k.length;
                }
              }
              if (totalSize > MAX_STORAGE_WARNING) {
                console.warn(`[autoSave] Storage size: ${Math.round(totalSize / 1024 / 1024)}MB`);
              }
            } catch (e) {
              // Ignore size check errors
            }
          }

          store.set(key, valueToSave, { expires });
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.error('[autoSave] Storage quota exceeded');
            if (onError) onError(new Error('Storage quota exceeded. Consider clearing old data.'), 'quota');
          } else {
            console.error('[autoSave] Save error:', error);
            if (onError) onError(error, 'save');
          }
        }
      };

      if (debounce > 0) {
        saveTimeout = setTimeout(doSave, debounce);
      } else {
        doSave();
      }
    }

    if (autoSaveEnabled) {
      effectCleanup = effect(() => {
        const _ = getValue(reactiveObj);
        save();
      });
    }

    // ========================================================================
    // CROSS-TAB SYNC (PRODUCTION HARDENED)
    // ========================================================================

    let storageEventCleanup = null;
    let syncLock = false; // Prevent sync loops

    if (sync && typeof window !== 'undefined') {
      const handleStorageEvent = (event) => {
        if (syncLock) return; // Already syncing, prevent loops
        
        const fullKey = namespace ? `${namespace}:${key}` : key;
        if (event.key !== fullKey) return;

        try {
          if (event.newValue === null) return;

          const data = JSON.parse(event.newValue);
          const newValue = data.value !== undefined ? data.value : data;

          syncLock = true; // Lock to prevent loops
          isUpdatingFromStorage = true;
          
          batch(() => setValue(reactiveObj, newValue));
          
          isUpdatingFromStorage = false;

          if (onSync) onSync(newValue);
        } catch (error) {
          console.error('[autoSave] Sync error:', error);
          if (onError) onError(error, 'sync');
        } finally {
          syncLock = false; // Always release lock
        }
      };

      window.addEventListener('storage', handleStorageEvent);
      storageEventCleanup = () => window.removeEventListener('storage', handleStorageEvent);
    }

    // ========================================================================
    // FLUSH ON UNLOAD
    // ========================================================================

    let unloadCleanup = null;

    if (typeof window !== 'undefined' && autoSaveEnabled) {
      const handleUnload = () => {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
          try {
            let valueToSave = getValue(reactiveObj);
            if (valueToSave && onSave) {
              valueToSave = onSave(valueToSave);
            }
            if (valueToSave) {
              store.set(key, valueToSave, { expires });
            }
          } catch (error) {
            // Silent on unload
          }
        }
      };

      window.addEventListener('beforeunload', handleUnload);
      unloadCleanup = () => window.removeEventListener('beforeunload', handleUnload);
    }

    // ========================================================================
    // METHODS
    // ========================================================================

    reactiveObj.$save = function() {
      if (saveTimeout) clearTimeout(saveTimeout);
      try {
        let valueToSave = getValue(this);
        if (valueToSave && onSave) {
          valueToSave = onSave(valueToSave);
        }
        if (valueToSave) {
          return store.set(key, valueToSave, { expires });
        }
        return false;
      } catch (error) {
        console.error('[autoSave] $save error:', error);
        if (onError) onError(error, 'save');
        return false;
      }
    };

    reactiveObj.$load = function() {
      try {
        const loaded = store.get(key);
        if (loaded !== null) {
          const processed = onLoad ? onLoad(loaded) : loaded;
          isUpdatingFromStorage = true;
          setValue(this, processed);
          isUpdatingFromStorage = false;
          return true;
        }
        return false;
      } catch (error) {
        console.error('[autoSave] $load error:', error);
        if (onError) onError(error, 'load');
        return false;
      }
    };

    reactiveObj.$clear = function() {
      return store.remove(key);
    };

    reactiveObj.$exists = function() {
      return store.has(key);
    };

    reactiveObj.$stopAutoSave = function() {
      if (effectCleanup) {
        effectCleanup();
        effectCleanup = null;
      }
      return this;
    };

    reactiveObj.$startAutoSave = function() {
      if (!effectCleanup && autoSaveEnabled) {
        effectCleanup = effect(() => {
          const _ = getValue(this);
          save();
        });
      }
      return this;
    };

    reactiveObj.$destroy = function() {
      if (effectCleanup) effectCleanup();
      if (storageEventCleanup) storageEventCleanup();
      if (unloadCleanup) unloadCleanup();
      if (saveTimeout) clearTimeout(saveTimeout);
    };

    reactiveObj.$storageInfo = function() {
      try {
        const exists = this.$exists();
        let size = 0;
        if (exists) {
          const data = store.get(key);
          if (data) {
            size = safeStringify(data).length;
          }
        }
        return {
          key,
          namespace,
          storage,
          exists,
          size,
          sizeKB: Math.round(size / 1024 * 10) / 10
        };
      } catch (error) {
        return {
          key,
          namespace,
          storage,
          exists: false,
          size: 0,
          error: error.message
        };
      }
    };

    return reactiveObj;
  }

  // ============================================================================
  // reactiveStorage() - STANDALONE VERSION
  // ============================================================================

  function reactiveStorage(storageType = 'localStorage', namespace = '') {
    if (storageType === 'localStorage' && !hasLocalStorage) {
      console.warn('[reactiveStorage] localStorage not available');
    }
    if (storageType === 'sessionStorage' && !hasSessionStorage) {
      console.warn('[reactiveStorage] sessionStorage not available');
    }

    const store = new StorageWrapper(storageType, namespace);
    
    const reactiveState = global.ReactiveUtils.state({
      _version: 0,
      _keys: new Set(store.keys())
    });

    function notify() {
      batch(() => {
        reactiveState._version++;
        reactiveState._keys = new Set(store.keys());
      });
    }

    const proxy = new Proxy(store, {
      get(target, prop) {
        if (prop === 'get' || prop === 'has' || prop === 'keys') {
          const _ = reactiveState._version;
          const __ = reactiveState._keys;
        }
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });

    const originalSet = store.set.bind(store);
    proxy.set = function(key, value, options) {
      const result = originalSet(key, value, options);
      if (result) notify();
      return result;
    };

    const originalRemove = store.remove.bind(store);
    proxy.remove = function(key) {
      const result = originalRemove(key);
      if (result) notify();
      return result;
    };

    if (typeof window !== 'undefined' && storageType === 'localStorage') {
      window.addEventListener('storage', (event) => {
        const fullKeyPrefix = namespace ? `${namespace}:` : '';
        if (!event.key || (!namespace || event.key.startsWith(fullKeyPrefix))) {
          notify();
        }
      });
    }

    return proxy;
  }

  // ============================================================================
  // watch() - STANDALONE VERSION
  // ============================================================================

  function watch(key, callback, options = {}) {
    const {
      storage = 'localStorage',
      namespace = '',
      immediate = false
    } = options;

    const store = new StorageWrapper(storage, namespace);
    let oldValue = store.get(key);

    if (immediate && oldValue !== null) {
      callback(oldValue, null);
    }

    const reactiveStore = reactiveStorage(storage, namespace);
    
    const cleanup = effect(() => {
      const newValue = reactiveStore.get(key);
      
      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        callback(newValue, oldValue);
        oldValue = newValue;
      }
    });

    return cleanup;
  }

  // ============================================================================
  // EXPORT
  // ============================================================================

  const StorageIntegration = {
    autoSave,
    reactiveStorage,
    watch,
    withStorage: autoSave,
    isStorageAvailable,
    hasLocalStorage,
    hasSessionStorage
  };

  global.ReactiveStorage = StorageIntegration;

  if (global.ReactiveUtils) {
    global.ReactiveUtils.autoSave = autoSave;
    global.ReactiveUtils.reactiveStorage = reactiveStorage;
    global.ReactiveUtils.watchStorage = watch;
    global.ReactiveUtils.withStorage = autoSave;
  }

  if (typeof global.state !== 'undefined') {
    global.autoSave = autoSave;
    global.reactiveStorage = reactiveStorage;
    global.watchStorage = watch;
  }

})(typeof window !== 'undefined' ? window : global);