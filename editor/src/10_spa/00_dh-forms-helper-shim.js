/**
 * 00_dh-forms-helper-shim.js
 *
 * DOM Helpers — Forms.helper Proxy shim for bundled builds
 *
 * Problem:
 *   The Forms Proxy get trap in 01_dh-form.js only reflects through properties
 *   that are *functions* on the underlying FormsHelper target. `helper` is an
 *   object reference set directly on the Proxy (not on FormsHelper), so
 *   `Forms.helper` falls through to `_getForm('helper')` → null.
 *   Then `02_dh-form-enhance.js` crashes: "Forms.helper.addEnhancer is not a function".
 *
 * Fix:
 *   Wrap global.Forms in a thin Proxy that intercepts 'helper' and returns
 *   the real FormsHelper instance. All other property access is delegated
 *   unchanged to the original Forms Proxy.
 *   Also attach addEnhancer directly on FormsHelper as an own (non-prototype)
 *   bound method so it is always reachable regardless of class mangling.
 *
 * Load order: immediately after 07_dom-form/01_dh-form.js,
 *             before 07_dom-form/02_dh-form-enhance.js
 *
 * @version 1.1.0
 * @license MIT
 */

(function (global) {
  'use strict';

  if (!global.Forms || !global.ProductionFormsHelper) return;

  var FormsHelper   = global.ProductionFormsHelper;
  var originalForms = global.Forms;

  // Ensure addEnhancer is an own bound method on the instance,
  // not just a prototype method — survives minification / mangling.
  if (typeof FormsHelper.addEnhancer !== 'function') {
    // Fallback: grab from Forms directly (set on line 821 of 01_dh-form.js)
    var direct = originalForms.addEnhancer;
    if (typeof direct === 'function') {
      FormsHelper.addEnhancer = direct.bind(FormsHelper);
    }
  } else {
    // Bind own copy so it survives Proxy interception
    FormsHelper.addEnhancer = FormsHelper.addEnhancer.bind(FormsHelper);
  }

  // Wrap Forms in a new Proxy that intercepts 'helper' specifically
  global.Forms = new Proxy(originalForms, {
    get: function (target, prop, receiver) {
      if (prop === 'helper') return FormsHelper;
      return Reflect.get(target, prop, receiver);
    },
    set: function (target, prop, value, receiver) {
      return Reflect.set(target, prop, value, receiver);
    }
  });

  // Keep DOMHelpers namespace in sync if present
  if (global.DOMHelpers) {
    global.DOMHelpers.Forms = global.Forms;
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
