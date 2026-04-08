/**
 * 03_dh-reactive-collections
 * 
 * Collections Extension for DOM Helpers Reactive State
 * Standalone file - no library modifications needed
 * @license MIT
 */

(function(global) {
  'use strict';

  // Check if ReactiveUtils exists
  if (!global.ReactiveUtils) {
    console.error('[Collections] ReactiveUtils not found. Please load the reactive library first.');
    return;
  }

  const { state: createState, batch } = global.ReactiveUtils;

  /**
   * Create a reactive collection with array management methods
   * @param {Array} items - Initial items
   * @returns {Object} Reactive collection
   */
  function createCollection(items = []) {
    // Create the base object with items array and methods BEFORE making it reactive
    const collectionObj = {
      items: [...items]
    };

    // Make it reactive first
    const collection = createState(collectionObj);

    // Now add collection-specific methods that won't conflict
    // These are added after reactive proxy creation
    const methods = {
      add(item) {
        this.items.push(item);
        return this;
      },
      
      remove(predicate) {
        const idx = typeof predicate === 'function'
          ? this.items.findIndex(predicate)
          : this.items.indexOf(predicate);
        if (idx !== -1) {
          this.items.splice(idx, 1);
        }
        return this;
      },
      
      update(predicate, updates) {
        const idx = typeof predicate === 'function'
          ? this.items.findIndex(predicate)
          : this.items.indexOf(predicate);
        if (idx !== -1) {
          Object.assign(this.items[idx], updates);
        }
        return this;
      },
      
      clear() {
        this.items.length = 0;
        return this;
      },
      
      find(predicate) {
        return typeof predicate === 'function'
          ? this.items.find(predicate)
          : this.items.find(item => item === predicate);
      },
      
      filter(predicate) {
        return this.items.filter(predicate);
      },
      
      map(fn) {
        return this.items.map(fn);
      },
      
      forEach(fn) {
        this.items.forEach(fn);
        return this;
      },
      
      sort(compareFn) {
        this.items.sort(compareFn);
        return this;
      },
      
      reverse() {
        this.items.reverse();
        return this;
      },
      
      get length() {
        return this.items.length;
      },
      
      get first() {
        return this.items[0];
      },
      
      get last() {
        return this.items[this.items.length - 1];
      },
      
      at(index) {
        return this.items[index];
      },
      
      includes(item) {
        return this.items.includes(item);
      },
      
      indexOf(item) {
        return this.items.indexOf(item);
      },
      
      slice(start, end) {
        return this.items.slice(start, end);
      },
      
      splice(start, deleteCount, ...items) {
        this.items.splice(start, deleteCount, ...items);
        return this;
      },
      
      push(...items) {
        this.items.push(...items);
        return this;
      },
      
      pop() {
        return this.items.pop();
      },
      
      shift() {
        return this.items.shift();
      },
      
      unshift(...items) {
        this.items.unshift(...items);
        return this;
      },
      
      toggle(predicate, field = 'done') {
        const idx = typeof predicate === 'function'
          ? this.items.findIndex(predicate)
          : this.items.indexOf(predicate);
        if (idx !== -1 && this.items[idx]) {
          this.items[idx][field] = !this.items[idx][field];
        }
        return this;
      },
      
      removeWhere(predicate) {
        for (let i = this.items.length - 1; i >= 0; i--) {
          if (predicate(this.items[i], i)) {
            this.items.splice(i, 1);
          }
        }
        return this;
      },
      
      updateWhere(predicate, updates) {
        this.items.forEach((item, idx) => {
          if (predicate(item, idx)) {
            Object.assign(this.items[idx], updates);
          }
        });
        return this;
      },
      
      reset(newItems = []) {
        this.items.length = 0;
        this.items.push(...newItems);
        return this;
      },
      
      toArray() {
        return [...this.items];
      },
      
      isEmpty() {
        return this.items.length === 0;
      }
    };

    // Attach methods to collection
    Object.keys(methods).forEach(key => {
      const descriptor = Object.getOwnPropertyDescriptor(methods, key);
      if (descriptor.get) {
        // It's a getter
        Object.defineProperty(collection, key, {
          get: descriptor.get,
          enumerable: false,
          configurable: true
        });
      } else {
        // It's a method
        collection[key] = methods[key].bind(collection);
      }
    });

    return collection;
  }

  /**
   * Create a collection with computed properties
   * @param {Array} items - Initial items
   * @param {Object} computed - Computed properties
   * @returns {Object} Reactive collection with computed properties
   */
  function createCollectionWithComputed(items = [], computed = {}) {
    const collection = createCollection(items);
    
    if (computed && typeof computed === 'object') {
      Object.entries(computed).forEach(([key, fn]) => {
        collection.$computed(key, fn);
      });
    }
    
    return collection;
  }

  /**
   * Create a filtered view of a collection
   * @param {Object} collection - Source collection
   * @param {Function} predicate - Filter predicate
   * @returns {Object} Reactive filtered collection
   */
  function createFilteredCollection(collection, predicate) {
    const filtered = createCollection([]);
    
    // Sync filtered items whenever source changes
    global.effect(() => {
      const newItems = collection.items.filter(predicate);
      filtered.reset(newItems);
    });
    
    return filtered;
  }

  // Export Collections API
  const CollectionsAPI = {
    create: createCollection,
    createWithComputed: createCollectionWithComputed,
    createFiltered: createFilteredCollection,
    
    // Alias for convenience
    collection: createCollection,
    list: createCollection
  };

  // Attach to global
  global.Collections = global.Collections || {};
  Object.assign(global.Collections, CollectionsAPI);

  // Also add to ReactiveUtils for convenience
  if (global.ReactiveUtils) {
    global.ReactiveUtils.collection = createCollection;
    global.ReactiveUtils.list = createCollection;
    global.ReactiveUtils.createCollection = createCollection;
  }

  // Also add to ReactiveState if it exists
  if (global.ReactiveState) {
    global.ReactiveState.collection = createCollection;
    global.ReactiveState.list = createCollection;
  }

  console.log('[Collections Extension] v1.0.0 loaded successfully');
  console.log('[Collections Extension] Available methods:');
  console.log('  - Collections.create(items) / ReactiveUtils.collection(items)');
  console.log('  - collection.add(item)');
  console.log('  - collection.remove(predicate)');
  console.log('  - collection.update(predicate, updates)');
  console.log('  - collection.clear()');
  console.log('  - Plus: find, filter, map, forEach, sort, toggle, and more!');

})(typeof window !== 'undefined' ? window : global);


/**
 * toggleAll() Method Extension
 * 
  * Adds a toggleAll method to reactive collections
 */

(function(global) {
  'use strict';

  // Check if ReactiveUtils exists
  if (!global.ReactiveUtils || !global.ReactiveUtils.collection) {
    console.error('[toggleAll Extension] ReactiveUtils.collection not found.');
    return;
  }

  // Store the original collection creation function
  const originalCreateCollection = global.ReactiveUtils.collection;

  // Enhanced collection creation with toggleAll
  function createCollectionWithToggleAll(items = []) {
    const collection = originalCreateCollection(items);

    // Add toggleAll method
    collection.toggleAll = function(predicate, field = 'done') {
      let count = 0;

      this.items.forEach((item, index) => {
        // Check if item matches predicate
        const matches = typeof predicate === 'function'
          ? predicate(item, index)
          : item === predicate;

        if (matches && this.items[index]) {
          this.items[index][field] = !this.items[index][field];
          count++;
        }
      });

      return count; // Return number of items toggled
    };

    return collection;
  }

  // Replace the collection creation function
  global.ReactiveUtils.collection = createCollectionWithToggleAll;
  global.ReactiveUtils.list = createCollectionWithToggleAll;
  global.ReactiveUtils.createCollection = createCollectionWithToggleAll;

  // Also update Collections if it exists
  if (global.Collections) {
    global.Collections.create = createCollectionWithToggleAll;
    global.Collections.collection = createCollectionWithToggleAll;
    global.Collections.list = createCollectionWithToggleAll;
  }

})(typeof window !== 'undefined' ? window : global);