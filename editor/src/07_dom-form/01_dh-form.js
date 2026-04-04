/**
 * 01_dh-form
 *
 * DOM Helpers - Form Module
 * Non-reactive form handling that integrates with the core DOM Helpers library.
 *
 * ─── RECOMMENDED USAGE ────────────────────────────────────────────────────────
 *
 *  Non-reactive path (this file only):
 *    <script src="01_dh-core.js"></script>
 *    <script src="Form/01_dh-form.js"></script>
 *    <script src="Form/02_dh-form-enhance.js"></script>   ← optional
 *
 *  Reactive path (no need to load this file):
 *    <script src="01_dh-core.js"></script>
 *    <script src="03_reactive/01_dh-reactive.js"></script>
 *    <script src="03_reactive/04_dh-reactive-form.js"></script>
 *
 *  Bridge path (both worlds, reactive + enhanced DOM forms):
 *    <script src="01_dh-core.js"></script>
 *    <script src="03_reactive/01_dh-reactive.js"></script>
 *    <script src="03_reactive/04_dh-reactive-form.js"></script>
 *    <script src="Form/01_dh-form.js"></script>
 *    <script src="Form/02_dh-form-enhance.js"></script>   ← provides the bridge
 *
 *  Rule of thumb: if you do not need reactivity, do not load any reactive module.
 *
 * ─── FEATURES ─────────────────────────────────────────────────────────────────
 *  · Forms proxy  — access any form by ID: Forms.myForm  (mirrors Elements style)
 *  · .values      — getter/setter for all field values as a plain object
 *  · .validate()  — native HTML5 + custom rule validation
 *  · .reset()     — enhanced reset with validation clearing and custom event
 *  · .serialize() — object | json | formdata | urlencoded
 *  · .submitData()— async fetch submission with beforeSubmit / onSuccess / onError
 *  · .update()    — form-aware wrapper: handles values / validate / reset / submit
 *  · addEnhancer()— plugin hook so 02_dh-form-enhance.js (and user code) can
 *                   extend every form without monkey-patching internals
 *
 * @version 1.1.0
 * @license MIT
 */

(function (global) {
  'use strict';

  // ============================================================================
  // DEPENDENCY CHECK
  // ============================================================================

  if (typeof global.EnhancedUpdateUtility === 'undefined') {
    console.warn(
      '[DOM Helpers Form] EnhancedUpdateUtility not found — ' +
      'load 01_dh-core.js before Form/01_dh-form.js'
    );
    return;
  }

  // ============================================================================
  // ENHANCER REGISTRY
  //
  // 02_dh-form-enhance.js (and user code) registers enhancer functions here
  // via  Forms.helper.addEnhancer(fn)  instead of monkey-patching _enhanceForm.
  //
  // Every function is called once per form element inside _enhanceForm(), after
  // the core library and form-specific methods have already been applied.
  // Each function receives the form and must return it (modified or not).
  // ============================================================================

  const _enhancers = [];

  function addEnhancer(fn) {
    if (typeof fn !== 'function') {
      console.warn('[DOM Helpers Form] addEnhancer() requires a function');
      return;
    }
    _enhancers.push(fn);
  }

  // ============================================================================
  // FORM VALUE UTILITIES
  // ============================================================================

  /**
   * Read all form field values into a plain object.
   *  - Multiple fields with the same name   → array value
   *  - Unchecked checkboxes                 → false  (FormData omits them)
   *  - Radio groups                         → selected value (absent when none selected)
   */
  function getFormValues(form) {
    const values   = {};
    const formData = new FormData(form);

    for (const [name, value] of formData.entries()) {
      if (Object.prototype.hasOwnProperty.call(values, name)) {
        values[name] = Array.isArray(values[name])
          ? [...values[name], value]
          : [values[name], value];
      } else {
        values[name] = value;
      }
    }

    // FormData does not include unchecked checkboxes — add them as false
    form.querySelectorAll('input[type="checkbox"]').forEach(input => {
      if (input.name && !Object.prototype.hasOwnProperty.call(values, input.name)) {
        values[input.name] = false;
      }
    });

    return values;
  }

  /**
   * Write a values object back into the form's fields.
   *
   * @param {HTMLFormElement} form
   * @param {Object}  values
   * @param {Object}  [options]
   * @param {boolean} [options.silent=false]  Suppress 'change' events on each field.
   *   Use when doing programmatic bulk sets and you do not want existing change
   *   listeners to fire for every field.
   */
  function setFormValues(form, values, options = {}) {
    if (!values || typeof values !== 'object') {
      console.warn('[DOM Helpers Form] setFormValues() — values must be a plain object');
      return;
    }
    Object.entries(values).forEach(([name, value]) => {
      _setFormField(form, name, value, options);
    });
  }

  /**
   * Return the first element matching [name="…"] inside the form,
   * falling back to an #id match.
   */
  function getFormField(form, name) {
    return (
      form.querySelector(`[name="${name}"]`) ||
      form.querySelector(`#${CSS.escape(name)}`) ||
      null
    );
  }

  /** Set a named field, resolving radio/checkbox groups automatically. */
  function _setFormField(form, name, value, options = {}) {
    const fields = Array.from(form.querySelectorAll(`[name="${name}"]`));

    if (fields.length === 0) {
      // Fallback: id lookup
      const byId = form.querySelector(`#${CSS.escape(name)}`);
      if (byId) _setFieldValue(byId, value, options);
      return;
    }

    if (fields.length === 1) {
      _setFieldValue(fields[0], value, options);
      return;
    }

    // Multiple elements sharing a name — radio / checkbox groups
    fields.forEach(field => {
      if (field.type === 'radio') {
        field.checked = field.value === String(value);
        if (!options.silent) field.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (field.type === 'checkbox') {
        field.checked = Array.isArray(value)
          ? value.map(String).includes(field.value)
          : Boolean(value);
        if (!options.silent) field.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        _setFieldValue(field, value, options); // dispatches its own event
      }
    });
  }

  /** Low-level: set a single element's value by its input type. */
  function _setFieldValue(field, value, options = {}) {
    if (!field) return;

    switch (field.type) {
      case 'checkbox':
        field.checked = Boolean(value);
        break;
      case 'radio':
        field.checked = field.value === String(value);
        break;
      case 'file':
        // Browser security prevents programmatic population of file inputs
        console.warn('[DOM Helpers Form] Cannot set file input values programmatically');
        return;
      case 'select-multiple':
        if (Array.isArray(value)) {
          const strVals = value.map(String);
          Array.from(field.options).forEach(opt => {
            opt.selected = strVals.includes(opt.value);
          });
        }
        break;
      default:
        field.value = value != null ? value : '';
        break;
    }

    if (!options.silent) {
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate a form against optional custom rules.
   *
   * Always runs the browser's native checkValidity() first, then processes
   * any custom rules you supply.
   *
   * Rule formats per field:
   *   Function:  (value, allValues, field) => errorMessage | null | undefined | true
   *   Object:    { required, minLength, maxLength, pattern, email, custom }
   *
   * @param {HTMLFormElement} form
   * @param {Object} [rules={}]
   * @returns {{ isValid: boolean, errors: Object, values: Object }}
   */
  function validateForm(form, rules = {}) {
    const errors = {};
    const values = getFormValues(form);

    clearFormValidation(form);

    // — Native HTML5 validation —
    if (!form.checkValidity()) {
      form.querySelectorAll(':invalid').forEach(field => {
        if (field.name) {
          errors[field.name] = field.validationMessage || 'Invalid value';
          _markFieldInvalid(field, errors[field.name]);
        }
      });
    }

    // — Custom rules —
    Object.entries(rules).forEach(([fieldName, rule]) => {
      if (errors[fieldName]) return; // already caught by native validation

      const value = values[fieldName];
      const field = getFormField(form, fieldName);

      if (typeof rule === 'function') {
        const result = rule(value, values, field);
        if (result !== true && result != null) {
          errors[fieldName] = String(result || 'Invalid value');
          if (field) _markFieldInvalid(field, errors[fieldName]);
        }
        return;
      }

      if (typeof rule === 'object' && rule !== null) {
        for (const [ruleName, ruleValue] of Object.entries(rule)) {
          if (errors[fieldName]) break;

          let message = null;

          switch (ruleName) {
            case 'required':
              if (ruleValue && (!value || (typeof value === 'string' && !value.trim())))
                message = 'This field is required';
              break;
            case 'minLength':
              if (value && value.length < ruleValue)
                message = `Minimum length is ${ruleValue} characters`;
              break;
            case 'maxLength':
              if (value && value.length > ruleValue)
                message = `Maximum length is ${ruleValue} characters`;
              break;
            case 'pattern':
              if (value && !new RegExp(ruleValue).test(value))
                message = 'Invalid format';
              break;
            case 'email':
              if (ruleValue && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                message = 'Invalid email address';
              break;
            case 'custom':
              if (typeof ruleValue === 'function') {
                const result = ruleValue(value, values, field);
                if (result !== true && result != null)
                  message = String(result || 'Invalid value');
              }
              break;
          }

          if (message) {
            errors[fieldName] = message;
            if (field) _markFieldInvalid(field, message);
          }
        }
      }
    });

    return { isValid: Object.keys(errors).length === 0, errors, values };
  }

  /**
   * Add invalid visual state and insert the error message directly after the
   * field element using insertAdjacentElement('afterend'), so it always appears
   * immediately below its field regardless of sibling order in the parent.
   */
  function _markFieldInvalid(field, message) {
    field.classList.add('form-invalid');
    field.setAttribute('aria-invalid', 'true');

    const ref = field.name || field.id;
    if (ref) {
      const existing = field.parentNode?.querySelector(
        `.form-error-message[data-for="${ref}"]`
      );
      if (existing) existing.remove();
    }

    const el = document.createElement('div');
    el.className   = 'form-error-message';
    el.style.cssText = 'color:#dc3545;font-size:0.875em;margin-top:0.25rem;';
    el.setAttribute('role', 'alert');
    if (ref) el.setAttribute('data-for', ref);
    el.textContent = message;

    field.insertAdjacentElement('afterend', el);
  }

  /** Remove all validation state (classes, aria-invalid, error elements) from a form. */
  function clearFormValidation(form) {
    form.querySelectorAll('.form-invalid').forEach(el => {
      el.classList.remove('form-invalid');
      el.removeAttribute('aria-invalid');
    });
    form.querySelectorAll('.form-error-message').forEach(el => el.remove());
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  /**
   * Serialize form data in one of four formats.
   *
   * @param {HTMLFormElement} form
   * @param {'object'|'json'|'formdata'|'urlencoded'} [format='object']
   */
  function serializeForm(form, format = 'object') {
    const values = getFormValues(form);

    switch (format) {
      case 'json':
        return JSON.stringify(values);

      case 'formdata': {
        const fd = new FormData();
        Object.entries(values).forEach(([key, val]) => {
          if (Array.isArray(val)) val.forEach(v => fd.append(key, v));
          else fd.append(key, val);
        });
        return fd;
      }

      case 'urlencoded':
        return new URLSearchParams(values).toString();

      case 'object':
      default:
        return values;
    }
  }

  // ============================================================================
  // SUBMISSION
  // ============================================================================

  /**
   * Async fetch-based form submission.
   *
   * NOTE — when called from the synchronous .update({ submit: options }) path,
   * the returned Promise is fire-and-forget. Attach onSuccess / onError in the
   * options object to react to the outcome rather than awaiting the return value.
   * Call  form.submitData(opts)  directly when you need to await the result.
   *
   * @param {HTMLFormElement} form
   * @param {Object}   [options]
   * @param {string}   [options.url]             Override form.action
   * @param {string}   [options.method]          Override form.method (default POST)
   * @param {boolean}  [options.validate=true]   Run validation before submitting
   * @param {Object}   [options.validationRules] Custom rules for validateForm()
   * @param {Function} [options.beforeSubmit]    async (data, form) => false | any
   * @param {Function} [options.onSuccess]       (result, data) => void
   * @param {Function} [options.onError]         (error, validationErrors?) => void
   * @param {Function} [options.transform]       (data) => transformedData
   * @param {boolean}  [options.silent=false]    Suppress change events
   * @returns {Promise<{success:boolean, data?, errors?, error?, cancelled?}>}
   */
  async function submitFormData(form, options = {}) {
    const {
      url             = form.action || window.location.href,
      method          = form.method || 'POST',
      validate        = true,
      validationRules = {},
      beforeSubmit    = null,
      onSuccess       = null,
      onError         = null,
      transform       = null,
    } = options;

    try {
      if (validate) {
        const validation = validateForm(form, validationRules);
        if (!validation.isValid) {
          if (onError) onError(new Error('Validation failed'), validation.errors);
          return { success: false, errors: validation.errors };
        }
      }

      let data = getFormValues(form);
      if (typeof transform === 'function') data = transform(data);

      if (typeof beforeSubmit === 'function') {
        const shouldContinue = await beforeSubmit(data, form);
        if (shouldContinue === false) return { success: false, cancelled: true };
      }

      const reqOpts = {
        method : method.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
      };
      if (reqOpts.method !== 'GET') reqOpts.body = JSON.stringify(data);

      const response = await fetch(url, reqOpts);
      const result   = await response.json().catch(() => ({}));

      if (response.ok) {
        if (onSuccess) onSuccess(result, data);
        return { success: true, data: result };
      }
      throw new Error(result.message || `HTTP ${response.status}`);

    } catch (error) {
      if (onError) onError(error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // FORM-AWARE .update() METHOD
  //
  // Wraps the core library's .update() to intercept form-specific keys first
  // then delegate the rest to the original EnhancedUpdateUtility update.
  //
  // Handled keys (consumed and removed before delegation):
  //   values   → setFormValues()
  //   validate → validateForm()
  //   reset    → form.reset()
  //   submit   → submitFormData()  ← fire-and-forget from .update(); await
  //                                  form.submitData() when you need the result
  // ============================================================================

  function _createFormUpdateMethod(form, coreUpdate) {
    return function formUpdate(updates = {}) {
      if (!updates || typeof updates !== 'object') {
        console.warn('[DOM Helpers Form] .update() requires a plain object');
        return form;
      }

      const rest = { ...updates };

      if (Object.prototype.hasOwnProperty.call(rest, 'values')) {
        setFormValues(form, rest.values, { silent: rest.silent || false });
        delete rest.values;
      }

      if (Object.prototype.hasOwnProperty.call(rest, 'validate')) {
        validateForm(form, rest.validate === true ? {} : rest.validate);
        delete rest.validate;
      }

      if (Object.prototype.hasOwnProperty.call(rest, 'reset')) {
        form.reset(rest.reset === true ? {} : rest.reset);
        delete rest.reset;
      }

      if (Object.prototype.hasOwnProperty.call(rest, 'submit')) {
        // Fire-and-forget — .update() is synchronous.
        // Use form.submitData(opts) directly if you need to await the result.
        submitFormData(form, rest.submit === true ? {} : rest.submit);
        delete rest.submit;
      }

      if (Object.keys(rest).length > 0 && typeof coreUpdate === 'function') {
        coreUpdate.call(form, rest);
      }

      return form;
    };
  }

  // ============================================================================
  // PER-ELEMENT FORM ENHANCEMENT
  // Adds form-specific API to a raw <form> element.
  // Protected against double-enhancement via _hasFormMethods flag.
  // ============================================================================

  function _applyFormMethods(form) {
    if (!form || form._hasFormMethods) return form;

    Object.defineProperty(form, '_hasFormMethods', {
      value: true, writable: false, enumerable: false, configurable: false,
    });

    // values getter / setter
    Object.defineProperty(form, 'values', {
      get()      { return getFormValues(form); },
      set(vals)  { setFormValues(form, vals); },
      enumerable: true, configurable: true,
    });

    // reset — clears validation state and dispatches 'formreset' event
    const _originalReset = form.reset.bind(form);
    form.reset = function (opts = {}) {
      if (opts.clearCustom !== false) clearFormValidation(form);
      _originalReset();
      form.dispatchEvent(new CustomEvent('formreset', {
        detail: { form }, bubbles: true,
      }));
      return form;
    };

    form.validate        = (rules = {}) => validateForm(form, rules);
    form.clearValidation = ()            => { clearFormValidation(form); return form; };
    form.getField        = name          => getFormField(form, name);
    form.setField        = (name, val, opts = {}) => {
      _setFormField(form, name, val, opts);
      return form;
    };
    form.serialize  = (fmt = 'object') => serializeForm(form, fmt);
    form.submitData = (opts = {})      => submitFormData(form, opts);

    return form;
  }

  // ============================================================================
  // PRODUCTION FORMS HELPER
  // Mirrors the architecture of ProductionElementsHelper / ProductionCollectionHelper.
  // ============================================================================

  class ProductionFormsHelper {
    constructor(options = {}) {
      this.cache       = new Map();
      this.isDestroyed = false;
      this.options     = {
        enableLogging  : false,
        autoCleanup    : true,
        cleanupInterval: 30000,
        maxCacheSize   : 500,
        ...options,
      };
      this.stats        = { hits: 0, misses: 0, cacheSize: 0, lastCleanup: Date.now() };
      this.cleanupTimer = null;

      this._initProxy();
      this._initMutationObserver();
      this._scheduleCleanup();
    }

    // ── Plugin hook ──────────────────────────────────────────────────────────
    /** Register an external enhancer — used by 02_dh-form-enhance.js and user code. */
    addEnhancer(fn) { addEnhancer(fn); }

    // ── Proxy ────────────────────────────────────────────────────────────────
    _initProxy() {
      this.Forms = new Proxy(this, {
        get: (target, prop) => {
          if (typeof prop === 'symbol' || prop.startsWith('_') || prop === 'helper' || prop === 'addEnhancer' || typeof target[prop] === 'function') {
            return Reflect.get(target, prop);
          }
          return target._getForm(prop);
        },
        has:    (target, prop) => target._hasForm(prop),
        ownKeys:(target)       => target._getKeys(),
        getOwnPropertyDescriptor: (target, prop) => {
          if (target._hasForm(prop))
            return { enumerable: true, configurable: true, value: target._getForm(prop) };
          return undefined;
        },
      });
    }

    // ── Form retrieval ───────────────────────────────────────────────────────
    _getForm(prop) {
      if (typeof prop !== 'string') return null;

      // Cache hit
      if (this.cache.has(prop)) {
        const cached = this.cache.get(prop);
        if (cached?.nodeType === Node.ELEMENT_NODE && document.contains(cached)) {
          this.stats.hits++;
          return cached;
        }
        this.cache.delete(prop);
      }

      // DOM lookup
      const el = document.getElementById(prop);
      if (el?.tagName.toLowerCase() === 'form') {
        const enhanced = this._enhanceForm(el);
        this._addToCache(prop, enhanced);
        this.stats.misses++;
        return enhanced;
      }

      this.stats.misses++;
      this._log(`Form '${prop}' not found`);
      return null;
    }

    _hasForm(prop) {
      if (typeof prop !== 'string') return false;
      if (this.cache.has(prop)) {
        const cached = this.cache.get(prop);
        if (cached?.nodeType === Node.ELEMENT_NODE && document.contains(cached)) return true;
        this.cache.delete(prop);
      }
      const el = document.getElementById(prop);
      return !!(el?.tagName.toLowerCase() === 'form');
    }

    _getKeys() {
      return Array.from(document.querySelectorAll('form[id]')).map(f => f.id).filter(Boolean);
    }

    // ── Enhancement pipeline ─────────────────────────────────────────────────
    /**
     * Full enhancement pipeline for a single <form> element:
     *
     *   1. EnhancedUpdateUtility.enhanceElementWithUpdate   (core .update())
     *   2. _applyFormMethods                                (values, validate, reset …)
     *   3. _createFormUpdateMethod                          (form-aware .update() wrapper)
     *   4. _enhancers[]                                     (external plugins via addEnhancer)
     */
    _enhanceForm(form) {
      if (!form || form._isEnhancedForm) return form;

      // Step 1 — core .update() via the public EnhancedUpdateUtility API
      let coreUpdate = null;
      if (typeof global.EnhancedUpdateUtility.enhanceElementWithUpdate === 'function') {
        try {
          form       = global.EnhancedUpdateUtility.enhanceElementWithUpdate(form);
          coreUpdate = form.update; // capture before we replace it in step 3
        } catch (e) {
          console.warn('[DOM Helpers Form] enhanceElementWithUpdate failed:', e.message);
        }
      }

      // Step 2 — form-specific methods
      form = _applyFormMethods(form);

      // Step 3 — form-aware .update() that delegates unknowns to coreUpdate
      form.update = _createFormUpdateMethod(form, coreUpdate);

      // Step 4 — external enhancers registered via addEnhancer()
      for (const fn of _enhancers) {
        try { form = fn(form) || form; }
        catch (e) { console.warn('[DOM Helpers Form] Enhancer error:', e.message); }
      }

      Object.defineProperty(form, '_isEnhancedForm', {
        value: true, writable: false, enumerable: false, configurable: false,
      });

      return form;
    }

    // ── Cache ────────────────────────────────────────────────────────────────
    _addToCache(id, form) {
      if (this.cache.size >= this.options.maxCacheSize) {
        this.cache.delete(this.cache.keys().next().value); // evict oldest
      }
      this.cache.set(id, form);
      this.stats.cacheSize = this.cache.size;
    }

    // ── MutationObserver — keeps cache in sync with DOM changes ──────────────
    _initMutationObserver() {
      this.observer = new MutationObserver(m => !this.isDestroyed && this._processMutations(m));

      const observe = () => {
        if (document.body && !this.isDestroyed) {
          this.observer.observe(document.body, {
            childList:        true,
            subtree:          true,
            attributes:       true,
            attributeFilter:  ['id'],
            attributeOldValue: true,
          });
        }
      };

      document.body
        ? observe()
        : document.addEventListener('DOMContentLoaded', observe, { once: true });
    }

    _processMutations(mutations) {
      const added   = new Set();
      const removed = new Set();

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE &&
              node.tagName.toLowerCase() === 'form' && node.id) {
            added.add(node.id);
          }
        }
        for (const node of mutation.removedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE &&
              node.tagName.toLowerCase() === 'form' && node.id) {
            removed.add(node.id);
          }
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'id') {
          const t = mutation.target;
          if (t.tagName.toLowerCase() === 'form') {
            if (mutation.oldValue) removed.add(mutation.oldValue);
            if (t.id)              added.add(t.id);
          }
        }
      }

      removed.forEach(id => this.cache.delete(id));
      added.forEach(id => {
        const el = document.getElementById(id);
        if (el?.tagName.toLowerCase() === 'form') this._addToCache(id, el);
      });
      this.stats.cacheSize = this.cache.size;
    }

    // ── Periodic stale-entry cleanup ─────────────────────────────────────────
    _scheduleCleanup() {
      if (!this.options.autoCleanup || this.isDestroyed) return;
      this.cleanupTimer = setTimeout(() => {
        this._performCleanup();
        this._scheduleCleanup();
      }, this.options.cleanupInterval);
    }

    _performCleanup() {
      if (this.isDestroyed) return;
      const stale = [];
      for (const [id, form] of this.cache) {
        if (!form || !document.contains(form) ||
            form.id !== id || form.tagName.toLowerCase() !== 'form') {
          stale.push(id);
        }
      }
      stale.forEach(id => this.cache.delete(id));
      this.stats.cacheSize   = this.cache.size;
      this.stats.lastCleanup = Date.now();
      if (this.options.enableLogging && stale.length) {
        this._log(`Cleanup: removed ${stale.length} stale entries`);
      }
    }

    // ── Logging ──────────────────────────────────────────────────────────────
    _log(msg)  { if (this.options.enableLogging) console.log(`[Forms] ${msg}`); }
    _warn(msg) { if (this.options.enableLogging) console.warn(`[Forms] ${msg}`); }

    // ── Public API ───────────────────────────────────────────────────────────
    getStats() {
      const t = this.stats.hits + this.stats.misses;
      return { ...this.stats, hitRate: t ? this.stats.hits / t : 0,
               uptime: Date.now() - this.stats.lastCleanup };
    }

    clearCache() {
      this.cache.clear();
      this.stats.cacheSize = 0;
      this._log('Cache cleared');
    }

    destroy() {
      this.isDestroyed = true;
      if (this.observer)     { this.observer.disconnect(); this.observer = null; }
      if (this.cleanupTimer) { clearTimeout(this.cleanupTimer); this.cleanupTimer = null; }
      this.cache.clear();
      this._log('Forms helper destroyed');
    }

    getAllForms() {
      return Array.from(document.querySelectorAll('form[id]'))
        .map(f => f._isEnhancedForm ? f : this._enhanceForm(f));
    }

    validateAll(rules = {}) {
      const results = {};
      this.getAllForms().forEach(f => {
        if (f.id) results[f.id] = f.validate(rules[f.id] || {});
      });
      return results;
    }

    resetAll() { this.getAllForms().forEach(f => f.reset()); }
  }

  // ============================================================================
  // INSTANTIATE & EXPORT
  // ============================================================================

  const FormsHelper = new ProductionFormsHelper();

  const Forms        = FormsHelper.Forms;
  Forms.helper       = FormsHelper;
  Forms.addEnhancer  = addEnhancer;
  Forms.stats        = ()      => FormsHelper.getStats();
  Forms.clear        = ()      => FormsHelper.clearCache();
  Forms.destroy      = ()      => FormsHelper.destroy();
  Forms.getAllForms   = ()      => FormsHelper.getAllForms();
  Forms.validateAll  = rules   => FormsHelper.validateAll(rules);
  Forms.resetAll     = ()      => FormsHelper.resetAll();
  Forms.configure    = opts    => { Object.assign(FormsHelper.options, opts); return Forms; };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Forms, ProductionFormsHelper };
  } else if (typeof define === 'function' && define.amd) {
    define([], () => ({ Forms, ProductionFormsHelper }));
  } else {
    global.Forms                 = Forms;
    global.ProductionFormsHelper = ProductionFormsHelper;
  }

  if (global.DOMHelpers) {
    global.DOMHelpers.Forms                 = Forms;
    global.DOMHelpers.ProductionFormsHelper = ProductionFormsHelper;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => FormsHelper.destroy(), { once: true });
  }

  console.log('[DOM Helpers Form] v1.1.0 loaded');

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);