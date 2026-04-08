// dh-getElementsBy-enhance.js
// Enhances document.getElementsByClassName / TagName / Name
// to pass through the full DOM Helpers enhancement pipeline.
// Load AFTER all other DOM Helpers modules.

(function(global) {
  'use strict';

  // ===== DEPENDENCY CHECKS =====
  const has = {
    updateUtility  : typeof global.EnhancedUpdateUtility !== 'undefined',
    bulkUpdaters   : typeof global.BulkPropertyUpdaters  !== 'undefined',
    arrayUpdates   : typeof global.ArrayBasedUpdates     !== 'undefined',
    indexedUpdates : typeof global.IndexedUpdates        !== 'undefined',
    collections    : typeof global.Collections           !== 'undefined',
  };

  if (!has.updateUtility) console.warn('[dh-getElementsBy] EnhancedUpdateUtility not found. Load 01_dh-core.js first!');
  if (!has.bulkUpdaters)  console.warn('[dh-getElementsBy] BulkPropertyUpdaters not found. Load 01_dh-bulk-property-updaters.js first!');
  if (!has.arrayUpdates)  console.warn('[dh-getElementsBy] ArrayBasedUpdates not found. Load 10_dh-array-based-updates.js first!');

  // ===== FULL ENHANCEMENT PIPELINE =====
  // Passes a raw HTMLCollection through every enhancer in the library
  // in the same order the library itself does it.
  function enhanceCollection(collection) {
    if (!collection) return collection;

    // Step 1 — core .update() from EnhancedUpdateUtility
    if (has.updateUtility && global.EnhancedUpdateUtility.enhanceCollectionWithUpdate) {
      try {
        collection = global.EnhancedUpdateUtility.enhanceCollectionWithUpdate(collection);
      } catch (e) {
        console.warn('[dh-getElementsBy] EnhancedUpdateUtility.enhanceCollectionWithUpdate failed:', e.message);
      }
    }

    // Step 2 — index-based shorthand methods from BulkPropertyUpdaters
    if (has.bulkUpdaters && global.BulkPropertyUpdaters.enhanceCollectionInstance) {
      try {
        collection = global.BulkPropertyUpdaters.enhanceCollectionInstance(collection);
      } catch (e) {
        console.warn('[dh-getElementsBy] BulkPropertyUpdaters.enhanceCollectionInstance failed:', e.message);
      }
    }

    // Step 3 — array distribution from ArrayBasedUpdates
    if (has.arrayUpdates && global.ArrayBasedUpdates.enhance) {
      try {
        collection = global.ArrayBasedUpdates.enhance(collection);
      } catch (e) {
        console.warn('[dh-getElementsBy] ArrayBasedUpdates.enhance failed:', e.message);
      }
    }

    // Step 4 — indexed updates patch if available
    if (has.indexedUpdates && global.IndexedUpdates.patch) {
      try {
        collection = global.IndexedUpdates.patch(collection);
      } catch (e) {
        console.warn('[dh-getElementsBy] IndexedUpdates.patch failed:', e.message);
      }
    }

    return collection;
  }

  // ===== FUNCTION-LEVEL BULK SHORTHANDS =====
  // Shared factory — builds .update() and all shorthand methods
  // that operate by collection name, delegating to Collections helper.

  function buildFunctionShorthands(fn, collectionType) {

    // .update({ btn: { textContent: 'Click' }, card: { style: { color: 'red' } } })
    fn.update = function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn(`[dh-getElementsBy] .update() requires an object with collection names as keys`);
        return;
      }

      // Delegate to Collections.update() using "type:name" format
      if (has.collections && typeof global.Collections.update === 'function') {
        const prefixed = {};
        Object.entries(updates).forEach(([name, data]) => {
          prefixed[`${collectionType}:${name}`] = data;
        });
        return global.Collections.update(prefixed);
      }

      // Fallback: call the enhanced function directly per name
      Object.entries(updates).forEach(([name, data]) => {
        const collection = fn(name);
        if (collection && typeof collection.update === 'function') {
          collection.update(data);
        }
      });
    };

    // Shared factory for shorthand methods on the function itself
    // e.g. document.getElementsByClassName.textContent({ btn: 'Hello', card: 'World' })
    function fnShorthand(prop) {
      return function(updates = {}) {
        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
          console.warn(`[dh-getElementsBy] .${prop}() requires an object with collection names as keys`);
          return;
        }
        Object.entries(updates).forEach(([name, value]) => {
          const collection = fn(name);
          if (!collection) { console.warn(`[dh-getElementsBy] '${name}' not found`); return; }
          // Use collection shorthand if available, else .update()
          if (typeof collection[prop] === 'function') collection[prop]({ ...spreadByIndex(collection, value) });
          else if (typeof collection.update === 'function') collection.update({ [prop]: spreadByIndex(collection, value) });
          else applyBulkToCollection(collection, prop, value);
        });
      };
    }

    // Helper — spread a scalar value as { 0: v, 1: v, ... } OR pass object as-is
    function spreadByIndex(collection, value) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        // Scalar — apply to every element
        const out = {};
        for (let i = 0; i < collection.length; i++) out[i] = value;
        return out;
      }
      return value; // already an index map
    }

    // Fallback: apply a property directly to all elements in a collection
    function applyBulkToCollection(collection, prop, value) {
      for (let i = 0; i < collection.length; i++) {
        if (collection[i] && collection[i].nodeType === Node.ELEMENT_NODE) {
          collection[i][prop] = value;
        }
      }
    }

    // Attach — exact same set as Elements and the getById module
    fn.textContent  = fnShorthand('textContent');
    fn.innerHTML    = fnShorthand('innerHTML');
    fn.innerText    = fnShorthand('innerText');
    fn.value        = fnShorthand('value');
    fn.placeholder  = fnShorthand('placeholder');
    fn.title        = fnShorthand('title');
    fn.disabled     = fnShorthand('disabled');
    fn.checked      = fnShorthand('checked');
    fn.readonly     = fnShorthand('readOnly');
    fn.hidden       = fnShorthand('hidden');
    fn.selected     = fnShorthand('selected');
    fn.src          = fnShorthand('src');
    fn.href         = fnShorthand('href');
    fn.alt          = fnShorthand('alt');

    // style / classes / attrs / dataset need special handling
    fn.style = function(updates = {}) {
      Object.entries(updates).forEach(([name, styleObj]) => {
        const col = fn(name);
        if (!col) { console.warn(`[dh-getElementsBy] '${name}' not found`); return; }
        if (typeof col.style === 'function') col.style(spreadByIndex(col, styleObj));
        else if (typeof col.update === 'function') col.update({ style: styleObj });
      });
    };

    fn.classes = function(updates = {}) {
      Object.entries(updates).forEach(([name, cfg]) => {
        const col = fn(name);
        if (!col) { console.warn(`[dh-getElementsBy] '${name}' not found`); return; }
        if (typeof col.classes === 'function') col.classes(spreadByIndex(col, cfg));
        else if (typeof col.update === 'function') col.update({ classList: cfg });
      });
    };

    fn.attrs = function(updates = {}) {
      Object.entries(updates).forEach(([name, attrsObj]) => {
        const col = fn(name);
        if (!col) { console.warn(`[dh-getElementsBy] '${name}' not found`); return; }
        if (typeof col.attrs === 'function') col.attrs(spreadByIndex(col, attrsObj));
        else if (typeof col.update === 'function') col.update({ setAttribute: attrsObj });
      });
    };

    fn.dataset = function(updates = {}) {
      Object.entries(updates).forEach(([name, dataObj]) => {
        const col = fn(name);
        if (!col) { console.warn(`[dh-getElementsBy] '${name}' not found`); return; }
        if (typeof col.dataset === 'function') col.dataset(spreadByIndex(col, dataObj));
        else if (typeof col.update === 'function') col.update({ dataset: dataObj });
      });
    };

    fn.prop = function(propertyPath, updates = {}) {
      if (typeof propertyPath !== 'string') {
        console.warn('[dh-getElementsBy] .prop() requires a property name as first argument');
        return;
      }
      Object.entries(updates).forEach(([name, value]) => {
        const col = fn(name);
        if (!col) { console.warn(`[dh-getElementsBy] '${name}' not found`); return; }
        if (typeof col.prop === 'function') col.prop(propertyPath, spreadByIndex(col, value));
        else if (typeof col.update === 'function') col.update({ [propertyPath]: value });
      });
    };

    return fn;
  }

  // ===== ENHANCE EACH NATIVE METHOD =====

  // --- getElementsByClassName ---
  const _byClass = document.getElementsByClassName.bind(document);
  function enhancedByClassName(name) {
    return enhanceCollection(_byClass(name));
  }
  buildFunctionShorthands(enhancedByClassName, 'class');
  document.getElementsByClassName = enhancedByClassName;

  // --- getElementsByTagName ---
  const _byTag = document.getElementsByTagName.bind(document);
  function enhancedByTagName(name) {
    return enhanceCollection(_byTag(name));
  }
  buildFunctionShorthands(enhancedByTagName, 'tag');
  document.getElementsByTagName = enhancedByTagName;

  // --- getElementsByName ---
  const _byName = document.getElementsByName.bind(document);
  function enhancedByName(name) {
    return enhanceCollection(_byName(name));
  }
  buildFunctionShorthands(enhancedByName, 'name');
  document.getElementsByName = enhancedByName;

  // ===== REGISTER WITH DOMHelpers =====
  if (typeof global.DOMHelpers !== 'undefined') {
    global.DOMHelpers.GetElementsByEnhance = {
      version: '2.5.2',
      enhanceCollection,
    };
  }

  console.log('[dh-getElementsBy] v2.5.2 loaded — getElementsByClassName / TagName / Name enhanced');

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);