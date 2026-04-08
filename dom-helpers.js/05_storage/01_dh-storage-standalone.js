/**
 * 01_dh-storage-standalone.js
 * 
 * Standalone Storage Utilities
 * Works independently without reactive module
 * Coexists peacefully with reactive storage if loaded
 * 
 * @version 1.0.0
 * @license MIT
 */

(function(global) {
  'use strict';

  // ============================================================================
  // DETECTION & COEXISTENCE CHECK
  // ============================================================================

  // Check if already loaded
  if (global.StorageUtils) {
    console.log('[Storage] StorageUtils already loaded, skipping');
    return;
  }

  // Log coexistence status
  if (global.ReactiveUtils && global.ReactiveUtils.autoSave) {
    console.log('[Storage] Reactive storage detected - coexisting in separate namespace');
  }

  // ============================================================================
  // CORE UTILITIES (Shared between standalone and reactive)
  // ============================================================================

  /**
   * Serialize value to JSON string
   */
  function serialize(value) {
    try {
      return JSON.stringify(value);
    } catch (e) {
      console.error('[Storage] Serialization error:', e);
      return null;
    }
  }

  /**
   * Deserialize JSON string to value
   */
  function deserialize(str, defaultValue = null) {
    if (str === null || str === undefined) return defaultValue;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error('[Storage] Deserialization error:', e);
      return defaultValue;
    }
  }

  /**
   * Get storage instance
   */
  function getStorage(type = 'localStorage') {
    if (typeof window === 'undefined') {
      console.warn('[Storage] No window object available');
      return null;
    }
    
    if (type === 'sessionStorage') {
      return window.sessionStorage;
    }
    return window.localStorage;
  }

  /**
   * Build full storage key with namespace
   */
  function buildKey(key, namespace) {
    return namespace ? `${namespace}:${key}` : key;
  }

  // ============================================================================
  // BASIC STORAGE OPERATIONS
  // ============================================================================

  /**
   * Save data to storage
   * @param {string} key - Storage key
   * @param {*} data - Data to save
   * @param {Object} options - { storage: 'localStorage'|'sessionStorage', namespace: string }
   * @returns {boolean} Success status
   */
  function save(key, data, options = {}) {
    const storage = getStorage(options.storage);
    if (!storage) return false;

    const fullKey = buildKey(key, options.namespace);
    const serialized = serialize(data);
    
    if (serialized === null) return false;

    try {
      storage.setItem(fullKey, serialized);
      return true;
    } catch (e) {
      console.error('[Storage] Save error:', e);
      return false;
    }
  }

  /**
   * Load data from storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @param {Object} options - { storage: 'localStorage'|'sessionStorage', namespace: string }
   * @returns {*} Loaded data or default value
   */
  function load(key, defaultValue = null, options = {}) {
    const storage = getStorage(options.storage);
    if (!storage) return defaultValue;

    const fullKey = buildKey(key, options.namespace);
    
    try {
      const item = storage.getItem(fullKey);
      return deserialize(item, defaultValue);
    } catch (e) {
      console.error('[Storage] Load error:', e);
      return defaultValue;
    }
  }

  /**
   * Remove data from storage
   * @param {string} key - Storage key
   * @param {Object} options - { storage: 'localStorage'|'sessionStorage', namespace: string }
   * @returns {boolean} Success status
   */
  function clear(key, options = {}) {
    const storage = getStorage(options.storage);
    if (!storage) return false;

    const fullKey = buildKey(key, options.namespace);
    
    try {
      storage.removeItem(fullKey);
      return true;
    } catch (e) {
      console.error('[Storage] Clear error:', e);
      return false;
    }
  }

  /**
   * Check if key exists in storage
   * @param {string} key - Storage key
   * @param {Object} options - { storage: 'localStorage'|'sessionStorage', namespace: string }
   * @returns {boolean} True if key exists
   */
  function exists(key, options = {}) {
    const storage = getStorage(options.storage);
    if (!storage) return false;

    const fullKey = buildKey(key, options.namespace);
    return storage.getItem(fullKey) !== null;
  }

  // ============================================================================
  // STORAGE EVENT WATCHING (Cross-tab synchronization)
  // ============================================================================

  /**
   * Watch storage key for changes
   * @param {string} key - Storage key to watch
   * @param {Function} callback - (newValue, oldValue) => void
   * @param {Object} options - { storage, namespace, immediate }
   * @returns {Function} Cleanup function
   */
  function watch(key, callback, options = {}) {
    if (typeof window === 'undefined') {
      console.warn('[Storage] Watch requires window object');
      return () => {};
    }

    const storage = getStorage(options.storage);
    if (!storage) return () => {};

    const fullKey = buildKey(key, options.namespace);
    
    // Get initial value
    let oldValue = deserialize(storage.getItem(fullKey));
    
    // Call immediately if requested
    if (options.immediate) {
      try {
        callback(oldValue, undefined);
      } catch (e) {
        console.error('[Storage] Watch callback error:', e);
      }
    }
    
    // Listen to storage events (cross-tab changes)
    const handler = (e) => {
      if (e.key === fullKey && e.storageArea === storage) {
        const newValue = deserialize(e.newValue);
        try {
          callback(newValue, oldValue);
        } catch (err) {
          console.error('[Storage] Watch callback error:', err);
        }
        oldValue = newValue;
      }
    };
    
    window.addEventListener('storage', handler);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handler);
    };
  }

  // ============================================================================
  // AUTO-SAVE HELPER (Debounced storage updates)
  // ============================================================================

  /**
   * Create auto-save manager for a storage key
   * @param {string} key - Storage key
   * @param {Object} options - { storage, namespace, debounce, onSave, onLoad }
   * @returns {Object} Auto-save manager
   */
  function createAutoSave(key, options = {}) {
    const storage = getStorage(options.storage);
    const debounceMs = options.debounce || 300;
    const fullKey = buildKey(key, options.namespace);
    
    let timeoutId = null;
    let isStopped = false;
    
    const manager = {
      /**
       * Save data (debounced)
       */
      save(data) {
        if (isStopped || !storage) return;
        
        if (timeoutId) clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
          const serialized = serialize(data);
          if (serialized !== null) {
            try {
              storage.setItem(fullKey, serialized);
              if (options.onSave) {
                options.onSave(data);
              }
            } catch (e) {
              console.error('[Storage] Auto-save error:', e);
            }
          }
        }, debounceMs);
      },
      
      /**
       * Save immediately (no debounce)
       */
      saveNow(data) {
        if (isStopped || !storage) return;
        if (timeoutId) clearTimeout(timeoutId);
        
        const serialized = serialize(data);
        if (serialized !== null) {
          try {
            storage.setItem(fullKey, serialized);
            if (options.onSave) {
              options.onSave(data);
            }
          } catch (e) {
            console.error('[Storage] Save now error:', e);
          }
        }
      },
      
      /**
       * Load data from storage
       */
      load(defaultValue = null) {
        if (isStopped || !storage) return defaultValue;
        
        try {
          const data = deserialize(storage.getItem(fullKey), defaultValue);
          if (options.onLoad) {
            options.onLoad(data);
          }
          return data;
        } catch (e) {
          console.error('[Storage] Load error:', e);
          return defaultValue;
        }
      },
      
      /**
       * Clear from storage
       */
      clear() {
        if (timeoutId) clearTimeout(timeoutId);
        if (storage) {
          storage.removeItem(fullKey);
        }
      },
      
      /**
       * Stop auto-saving
       */
      stop() {
        if (timeoutId) clearTimeout(timeoutId);
        isStopped = true;
      },
      
      /**
       * Resume auto-saving
       */
      start() {
        isStopped = false;
      },
      
      /**
       * Check if stopped
       */
      get isStopped() {
        return isStopped;
      }
    };
    
    return manager;
  }

  // ============================================================================
  // STORAGE INFO & UTILITIES
  // ============================================================================

  /**
   * Get storage information
   * @param {Object} options - { storage, namespace }
   * @returns {Object} Storage info
   */
  function getInfo(options = {}) {
    const storage = getStorage(options.storage);
    if (!storage) {
      return {
        available: false,
        keys: [],
        size: 0
      };
    }

    const keys = [];
    const prefix = options.namespace ? `${options.namespace}:` : '';
    
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (prefix === '' || key.startsWith(prefix)) {
        keys.push(prefix ? key.slice(prefix.length) : key);
      }
    }

    return {
      available: true,
      keys,
      size: keys.length,
      storageType: options.storage || 'localStorage'
    };
  }

  /**
   * Clear all keys in namespace
   * @param {Object} options - { storage, namespace }
   * @returns {number} Number of keys cleared
   */
  function clearAll(options = {}) {
    const storage = getStorage(options.storage);
    if (!storage) return 0;

    const prefix = options.namespace ? `${options.namespace}:` : '';
    const keysToRemove = [];
    
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (prefix === '' || key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => storage.removeItem(key));
    return keysToRemove.length;
  }

  // ============================================================================
  // MAIN API
  // ============================================================================

  const StorageUtils = {
    // Basic operations
    save,
    load,
    clear,
    exists,
    
    // Advanced operations
    watch,
    createAutoSave,
    
    // Utilities
    getInfo,
    clearAll,
    serialize,
    deserialize,
    
    // Version
    version: '1.0.0'
  };

  // ============================================================================
  // GLOBAL EXPORT
  // ============================================================================

  global.StorageUtils = StorageUtils;

  // ============================================================================
  // DOM HELPERS INTEGRATION
  // ============================================================================

  // Add to Elements if available
  if (global.Elements) {
    global.Elements.Storage = StorageUtils;
  }

  // Add to Collections if available
  if (global.Collections) {
    global.Collections.Storage = StorageUtils;
  }

  // Add to Selector if available
  if (global.Selector) {
    global.Selector.Storage = StorageUtils;
  }

  // ============================================================================
  // MODULE EXPORT
  // ============================================================================

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageUtils;
  } else if (typeof define === 'function' && define.amd) {
    define([], () => StorageUtils);
  }

  // ============================================================================
  // SUCCESS MESSAGE
  // ============================================================================

  console.log('[Storage] StorageUtils v1.0.0 loaded');
  console.log('[Storage] Standalone storage (no reactive dependency)');
  if (global.ReactiveUtils && global.ReactiveUtils.autoSave) {
    console.log('[Storage] ✓ Coexisting with reactive storage');
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);