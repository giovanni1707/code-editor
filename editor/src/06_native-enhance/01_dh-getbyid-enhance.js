// dh-getbyid-enhance.js
// Seamlessly extends document.getElementById to match the DOM Helpers library
// Load AFTER: 01_dh-core.js, 01_dh-bulk-property-updaters.js

(function(global) {
  'use strict';

  // ===== DEPENDENCY CHECK =====
  const hasUpdateUtility  = typeof global.EnhancedUpdateUtility !== 'undefined';
  const hasBulkUpdaters   = typeof global.BulkPropertyUpdaters  !== 'undefined';
  const hasElements       = typeof global.Elements              !== 'undefined';

  if (!hasUpdateUtility) {
    console.warn('[dh-getbyid] EnhancedUpdateUtility not found. Load 01_dh-core.js first!');
  }

  if (!hasBulkUpdaters) {
    console.warn('[dh-getbyid] BulkPropertyUpdaters not found. Load 01_dh-bulk-property-updaters.js for full shorthand support.');
  }

  // ===== ELEMENT ENHANCEMENT =====
  // Delegates entirely to EnhancedUpdateUtility — same .update() as Elements, querySelector, etc.
  function enhanceElement(element) {
    if (!element) return null;

    // Already enhanced by any part of the library — skip
    if (element._hasEnhancedUpdateMethod || element._domHelpersEnhanced || element._hasGlobalQueryUpdate) {
      return element;
    }

    // Use the library's own enhancer — keeps behaviour 100% consistent
    if (hasUpdateUtility && global.EnhancedUpdateUtility.enhanceElementWithUpdate) {
      return global.EnhancedUpdateUtility.enhanceElementWithUpdate(element);
    }

    // Fallback warning if core isn't loaded
    console.warn('[dh-getbyid] Cannot enhance element — EnhancedUpdateUtility missing.');
    return element;
  }

  // ===== ENHANCED getElementById FUNCTION =====
  const _original = document.getElementById.bind(document);

  function enhancedGetById(id) {
    return enhanceElement(_original(id));
  }

  // ===== BULK .update() ON THE FUNCTION =====
  // Mirrors Elements.update() exactly
  enhancedGetById.update = function(updates = {}) {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      console.warn('[dh-getbyid] .update() requires an object with element IDs as keys');
      return;
    }

    // If Elements helper is available, delegate to it directly — same behaviour, same logging
    if (hasElements && typeof global.Elements.update === 'function') {
      return global.Elements.update(updates);
    }

    // Fallback: manual loop
    Object.entries(updates).forEach(([id, updateData]) => {
      const el = enhancedGetById(id);
      if (el && typeof el.update === 'function') el.update(updateData);
      else console.warn(`[dh-getbyid] Element '${id}' not found`);
    });
  };

  // ===== BULK PROPERTY SHORTHANDS ON THE FUNCTION =====
  // Mirrors 01_dh-bulk-property-updaters exactly — same properties, same logic

  function bulkProp(prop) {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn(`[dh-getbyid] .${prop}() requires an object with element IDs as keys`);
        return;
      }
      Object.entries(updates).forEach(([id, value]) => {
        const el = enhancedGetById(id);
        if (el) {
          if (el.update) el.update({ [prop]: value });
          else el[prop] = value;
        } else {
          console.warn(`[dh-getbyid] Element '${id}' not found`);
        }
      });
    };
  }

  function bulkStyle() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[dh-getbyid] .style() requires an object with element IDs as keys');
        return;
      }
      Object.entries(updates).forEach(([id, styleObj]) => {
        const el = enhancedGetById(id);
        if (el) {
          if (el.update) el.update({ style: styleObj });
          else Object.entries(styleObj).forEach(([p, v]) => el.style[p] = v);
        } else {
          console.warn(`[dh-getbyid] Element '${id}' not found`);
        }
      });
    };
  }

  function bulkClasses() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[dh-getbyid] .classes() requires an object with element IDs as keys');
        return;
      }
      Object.entries(updates).forEach(([id, cfg]) => {
        const el = enhancedGetById(id);
        if (el) {
          if (el.update) el.update({ classList: cfg });
          else if (typeof cfg === 'string') el.className = cfg;
        } else {
          console.warn(`[dh-getbyid] Element '${id}' not found`);
        }
      });
    };
  }

  function bulkAttrs() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[dh-getbyid] .attrs() requires an object with element IDs as keys');
        return;
      }
      Object.entries(updates).forEach(([id, attrsObj]) => {
        const el = enhancedGetById(id);
        if (el) {
          if (el.update) el.update({ setAttribute: attrsObj });
          else Object.entries(attrsObj).forEach(([attr, val]) => {
            if (val === null || val === false) el.removeAttribute(attr);
            else el.setAttribute(attr, String(val));
          });
        } else {
          console.warn(`[dh-getbyid] Element '${id}' not found`);
        }
      });
    };
  }

  function bulkDataset() {
    return function(updates = {}) {
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.warn('[dh-getbyid] .dataset() requires an object with element IDs as keys');
        return;
      }
      Object.entries(updates).forEach(([id, dataObj]) => {
        const el = enhancedGetById(id);
        if (el) {
          if (el.update) el.update({ dataset: dataObj });
          else Object.entries(dataObj).forEach(([k, v]) => el.dataset[k] = v);
        } else {
          console.warn(`[dh-getbyid] Element '${id}' not found`);
        }
      });
    };
  }

  function bulkProp_generic() {
    return function(propertyPath, updates = {}) {
      if (typeof propertyPath !== 'string') {
        console.warn('[dh-getbyid] .prop() requires a property name as first argument');
        return;
      }
      Object.entries(updates).forEach(([id, value]) => {
        const el = enhancedGetById(id);
        if (el) {
          if (el.update) el.update({ [propertyPath]: value });
          else {
            const parts = propertyPath.split('.');
            let obj = el;
            for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
            obj[parts[parts.length - 1]] = value;
          }
        } else {
          console.warn(`[dh-getbyid] Element '${id}' not found`);
        }
      });
    };
  }

  // Attach — exact same set as 01_dh-bulk-property-updaters adds to Elements
  enhancedGetById.textContent  = bulkProp('textContent');
  enhancedGetById.innerHTML    = bulkProp('innerHTML');
  enhancedGetById.innerText    = bulkProp('innerText');
  enhancedGetById.value        = bulkProp('value');
  enhancedGetById.placeholder  = bulkProp('placeholder');
  enhancedGetById.title        = bulkProp('title');
  enhancedGetById.disabled     = bulkProp('disabled');
  enhancedGetById.checked      = bulkProp('checked');
  enhancedGetById.readonly     = bulkProp('readOnly');
  enhancedGetById.hidden       = bulkProp('hidden');
  enhancedGetById.selected     = bulkProp('selected');
  enhancedGetById.src          = bulkProp('src');
  enhancedGetById.href         = bulkProp('href');
  enhancedGetById.alt          = bulkProp('alt');
  enhancedGetById.style        = bulkStyle();
  enhancedGetById.dataset      = bulkDataset();
  enhancedGetById.attrs        = bulkAttrs();
  enhancedGetById.classes      = bulkClasses();
  enhancedGetById.prop         = bulkProp_generic();

  // ===== REPLACE NATIVE METHOD =====
  document.getElementById = enhancedGetById;

  // ===== REGISTER WITH DOMHelpers =====
  if (typeof global.DOMHelpers !== 'undefined') {
    global.DOMHelpers.GetByIdEnhance = {
      version: '2.5.2',
      enhanceElement
    };
  }

  console.log('[dh-getbyid] v2.5.2 loaded — document.getElementById enhanced');

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);