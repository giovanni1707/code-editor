/**
 * 02_dh-form-enhance
 *
 * DOM Helpers - Form Enhancement Module
 * Adds production-ready submission features and an optional reactive bridge.
 *
 * ─── RECOMMENDED USAGE ────────────────────────────────────────────────────────
 *
 *  Non-reactive (this file enhances 01_dh-form.js only):
 *    <script src="01_dh-core.js"></script>
 *    <script src="Form/01_dh-form.js"></script>
 *    <script src="Form/02_dh-form-enhance.js"></script>
 *
 *  Bridge (reactive forms + enhanced DOM forms side-by-side):
 *    <script src="01_dh-core.js"></script>
 *    <script src="03_reactive/01_dh-reactive.js"></script>
 *    <script src="03_reactive/04_dh-reactive-form.js"></script>
 *    <script src="Form/01_dh-form.js"></script>
 *    <script src="Form/02_dh-form-enhance.js"></script>
 *
 *  Rule of thumb: load reactive modules only when you actually need reactivity.
 *
 * ─── FEATURES ─────────────────────────────────────────────────────────────────
 *  ✅ Auto-prevent default submit   ✅ Button disable / restore
 *  ✅ ARIA loading states           ✅ Success / error CSS + custom events
 *  ✅ Submission queue guard        ✅ Retry with configurable delay
 *  ✅ Fetch timeout (AbortController)
 *  ✅ Declarative [data-enhanced] attribute handling
 *  ✅ form.connectReactive()        — optional two-way reactive bridge
 *  ✅ Unified Validators set        — works for both DOM and reactive forms
 *
 * ─── INTEGRATION STRATEGY ─────────────────────────────────────────────────────
 *  Uses  Forms.helper.addEnhancer()  — the public plugin hook from 01_dh-form.js.
 *  No monkey-patching of internal methods.
 *
 * @version 1.1.0
 * @license MIT
 */

(function (global) {
  'use strict';

  // ============================================================================
  // DEPENDENCY CHECK
  // ============================================================================

  const hasDOMForms      = typeof global.Forms !== 'undefined' && typeof global.Forms.helper !== 'undefined';
  const hasReactiveForms = typeof global.ReactiveUtils !== 'undefined';

  if (!hasDOMForms) {
    console.warn(
      '[Form Enhancements] Forms not found — load Form/01_dh-form.js before this module'
    );
    return;
  }

  console.log('[Form Enhancements] Initializing...');
  console.log(`[Form Enhancements] DOM Forms:      ✓`);
  console.log(`[Form Enhancements] Reactive bridge: ${hasReactiveForms ? '✓ available' : '✗ not loaded (optional)'}`);

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const defaultConfig = {
    // Submission
    autoPreventDefault : true,
    autoDisableButtons : true,
    showLoadingStates  : true,
    queueSubmissions   : true,    // prevents double-submits

    // CSS classes applied to the <form>
    loadingClass       : 'form-loading',
    buttonLoadingClass : 'button-loading',
    successClass       : 'form-success',
    errorClass         : 'form-error',

    // Feedback messages
    messageTimeout     : 3000,    // ms; 0 = never auto-dismiss
    showSuccessMessage : true,
    showErrorMessage   : true,

    // Loading indicator injected into submit buttons
    loadingText        : 'Loading...',
    loadingSpinner     : '⌛',
    showLoadingSpinner : true,

    // Retry
    retryAttempts      : 0,
    retryDelay         : 1000,

    // Fetch
    timeout            : 30000,   // ms; 0 = no timeout

    // Reactive bridge (only relevant when ReactiveUtils is loaded)
    autoSyncReactive   : true,
    syncOnInput        : true,
    syncOnBlur         : true,

    enableLogging      : false,
  };

  let globalConfig      = { ...defaultConfig };
  const submissionQueue = new Map();   // form → state while submitting
  const formStates      = new WeakMap();

  // ============================================================================
  // UTILITIES
  // ============================================================================

  function _log(...args)  { if (globalConfig.enableLogging) console.log('[Form Enhancements]', ...args); }
  function _warn(...args) { console.warn('[Form Enhancements]', ...args); }

  function _getState(form) {
    if (!formStates.has(form)) {
      formStates.set(form, {
        isSubmitting        : false,
        submitCount         : 0,
        lastSubmit          : null,
        originalButtonStates: new Map(),
        reactiveForm        : null,
        config              : { ...globalConfig },
      });
    }
    return formStates.get(form);
  }

  function _cfg(base, overrides = {}) { return { ...base, ...overrides }; }

  // ============================================================================
  // BUTTON STATE MANAGEMENT
  // ============================================================================

  function _getSubmitButtons(form) {
    return Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"]'));
  }

  function _disableButtons(form, cfg) {
    const state   = _getState(form);
    const buttons = _getSubmitButtons(form);

    buttons.forEach(btn => {
      state.originalButtonStates.set(btn, {
        disabled : btn.disabled,
        innerHTML: btn.innerHTML,
      });

      btn.disabled = true;
      btn.classList.add(cfg.buttonLoadingClass);

      if (cfg.showLoadingSpinner && btn.tagName === 'BUTTON') {
        btn.setAttribute('data-orig-html', btn.innerHTML);
        btn.innerHTML = `${cfg.loadingSpinner} ${cfg.loadingText}`;
      }
    });
    _log(`Disabled ${buttons.length} button(s)`);
  }

  function _enableButtons(form, cfg) {
    const state   = _getState(form);
    const buttons = _getSubmitButtons(form);

    buttons.forEach(btn => {
      const orig = state.originalButtonStates.get(btn);
      if (orig) {
        btn.disabled = orig.disabled;
        if (btn.tagName === 'BUTTON') {
          const saved = btn.getAttribute('data-orig-html');
          btn.innerHTML = saved !== null ? saved : orig.innerHTML;
          btn.removeAttribute('data-orig-html');
        }
      } else {
        btn.disabled = false;
      }
      btn.classList.remove(cfg.buttonLoadingClass);
    });

    state.originalButtonStates.clear();
    _log(`Re-enabled ${buttons.length} button(s)`);
  }

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  function _addLoading(form, cfg) {
    form.classList.add(cfg.loadingClass);
    form.setAttribute('aria-busy', 'true');
    form.dispatchEvent(new CustomEvent('formsubmitstart', {
      bubbles: true, detail: { form, timestamp: Date.now() },
    }));
  }

  function _removeLoading(form, cfg) {
    form.classList.remove(cfg.loadingClass);
    form.removeAttribute('aria-busy');
  }

  // ============================================================================
  // VISUAL FEEDBACK
  // ============================================================================

  function _showSuccess(form, cfg, message) {
    form.classList.remove(cfg.errorClass);
    form.classList.add(cfg.successClass);
    form.setAttribute('data-form-state', 'success');

    if (cfg.showSuccessMessage && message) _showMsg(form, message, 'success');

    form.dispatchEvent(new CustomEvent('formsubmitsuccess', {
      bubbles: true, detail: { form, message, timestamp: Date.now() },
    }));

    if (cfg.messageTimeout > 0) {
      setTimeout(() => {
        form.classList.remove(cfg.successClass);
        form.removeAttribute('data-form-state');
        _removeMsg(form);
      }, cfg.messageTimeout);
    }
  }

  function _showError(form, cfg, error) {
    form.classList.remove(cfg.successClass);
    form.classList.add(cfg.errorClass);
    form.setAttribute('data-form-state', 'error');

    const msg = typeof error === 'string' ? error : (error?.message || 'Submission failed');
    if (cfg.showErrorMessage) _showMsg(form, msg, 'error');

    form.dispatchEvent(new CustomEvent('formsubmiterror', {
      bubbles: true, detail: { form, error, timestamp: Date.now() },
    }));

    if (cfg.messageTimeout > 0) {
      setTimeout(() => {
        form.classList.remove(cfg.errorClass);
        form.removeAttribute('data-form-state');
        _removeMsg(form);
      }, cfg.messageTimeout);
    }
  }

  function _showMsg(form, text, type) {
    _removeMsg(form);
    const el = document.createElement('div');
    el.className = `form-message form-message-${type}`;
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'polite');
    el.textContent = text;
    Object.assign(el.style, {
      padding        : '12px 16px',
      marginTop      : '16px',
      borderRadius   : '4px',
      fontSize       : '14px',
      fontWeight     : '500',
      backgroundColor: type === 'success' ? '#d4edda' : '#f8d7da',
      color          : type === 'success' ? '#155724' : '#721c24',
      border         : `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
    });
    const pos = form.getAttribute('data-message-position') || 'end';
    pos === 'start' ? form.insertBefore(el, form.firstChild) : form.appendChild(el);
  }

  function _removeMsg(form) {
    form.querySelectorAll('.form-message').forEach(el => el.remove());
  }

  // ============================================================================
  // SUBMISSION QUEUE GUARD
  // ============================================================================

  function _canSubmit(form, cfg) {
    return !cfg.queueSubmissions || !_getState(form).isSubmitting;
  }

  function _begin(form) {
    const s = _getState(form);
    s.isSubmitting = true;
    s.lastSubmit   = Date.now();
    submissionQueue.set(form, s);
  }

  function _end(form) {
    const s = _getState(form);
    s.isSubmitting = false;
    s.submitCount++;
    submissionQueue.delete(form);
  }

  function _cleanup(form, cfg) {
    _end(form);
    _removeLoading(form, cfg);
    _enableButtons(form, cfg);
  }

  // ============================================================================
  // RETRY
  // ============================================================================

  async function _withRetry(fn, cfg, attempt = 0) {
    try {
      return { success: true, result: await fn() };
    } catch (error) {
      _log(`Attempt ${attempt + 1} failed:`, error.message);
      if (attempt < cfg.retryAttempts) {
        await new Promise(r => setTimeout(r, cfg.retryDelay));
        return _withRetry(fn, cfg, attempt + 1);
      }
      return { success: false, error };
    }
  }

  // ============================================================================
  // ENHANCED SUBMISSION  (the core feature of this module)
  //
  // Full pipeline:
  //   queue guard → loading → button disable → beforeSubmit →
  //   reactive validation → fetch with retry → cleanup → feedback → callbacks
  //
  // @param {HTMLFormElement} form
  // @param {Object}   [opts]
  // @param {Function} [opts.onSubmit]      async (values, form) => any  — custom handler
  // @param {string}   [opts.url]           override form.action
  // @param {string}   [opts.method]        override form.method
  // @param {Function} [opts.beforeSubmit]  async (values, form) => boolean
  // @param {Function} [opts.onSuccess]     (result, values) => void
  // @param {Function} [opts.onError]       (error) => void
  // @param {Function} [opts.transform]     (values) => transformedValues
  // @param {string}   [opts.successMessage]
  // @param {boolean}  [opts.resetOnSuccess]
  // ============================================================================

  async function enhancedSubmit(form, opts = {}) {
    const state = _getState(form);
    const cfg   = _cfg(state.config, opts);

    if (!_canSubmit(form, cfg)) {
      _warn('Already submitting — ignoring duplicate');
      return { success: false, error: 'Already submitting' };
    }

    _begin(form);
    if (cfg.showLoadingStates)  _addLoading(form, cfg);
    if (cfg.autoDisableButtons) _disableButtons(form, cfg);
    _removeMsg(form);
    form.classList.remove(cfg.successClass, cfg.errorClass);

    // Default fetch handler — used when opts.onSubmit is not provided
    const defaultFetch = async (values) => {
      const url    = opts.url    || form.action              || window.location.href;
      const method = (opts.method || form.method || 'POST').toUpperCase();

      const controller = cfg.timeout > 0 ? new AbortController() : null;
      const timeoutId  = controller
        ? setTimeout(() => controller.abort(), cfg.timeout)
        : null;

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body   : method !== 'GET' ? JSON.stringify(values) : undefined,
          signal : controller?.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
        return data;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    const handler = opts.onSubmit || defaultFetch;

    try {
      // Read values via the .values getter from 01_dh-form.js
      let values = form.values;
      if (typeof opts.transform === 'function') values = opts.transform(values);

      // beforeSubmit hook — returning false cancels submission
      if (typeof opts.beforeSubmit === 'function') {
        const ok = await opts.beforeSubmit(values, form);
        if (ok === false) {
          _cleanup(form, cfg);
          return { success: false, cancelled: true };
        }
      }

      // Validate against connected reactive form (bridge path only)
      if (state.reactiveForm?.validate) {
        if (!state.reactiveForm.validate()) {
          _cleanup(form, cfg);
          _showError(form, cfg, 'Please correct the highlighted errors');
          return { success: false, errors: state.reactiveForm.errors };
        }
      }

      const outcome = await _withRetry(() => handler(values, form), cfg);
      _cleanup(form, cfg);

      if (outcome.success) {
        _showSuccess(form, cfg, opts.successMessage || 'Submitted successfully!');
        opts.onSuccess?.(outcome.result, values);
        if (opts.resetOnSuccess) {
          setTimeout(() => {
            form.reset?.();
            state.reactiveForm?.reset?.();
          }, 500);
        }
      } else {
        _showError(form, cfg, outcome.error);
        opts.onError?.(outcome.error);
      }

      return outcome;

    } catch (error) {
      _cleanup(form, cfg);
      _showError(form, cfg, error);
      opts.onError?.(error);
      return { success: false, error };
    }
  }

  // ============================================================================
  // REACTIVE BRIDGE  (only active when ReactiveUtils is loaded)
  //
  // Two-way sync between a DOM <form> and a ReactiveUtils form object.
  //   DOM → Reactive:  input + blur listeners
  //   Reactive → DOM:  $watch on values and errors
  // ============================================================================

  function connectReactiveForm(domForm, reactiveForm, opts = {}) {
    if (!hasReactiveForms || !reactiveForm) {
      _warn('connectReactiveForm() — ReactiveUtils not loaded or reactiveForm not provided');
      return null;
    }

    const state = _getState(domForm);
    state.reactiveForm = reactiveForm;
    const cfg = _cfg(state.config, opts);

    // DOM → Reactive: sync value on input
    if (cfg.syncOnInput || cfg.autoSyncReactive) {
      domForm.addEventListener('input', e => {
        const field = e.target.name || e.target.id;
        if (field && typeof reactiveForm.setValue === 'function') {
          const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
          reactiveForm.setValue(field, value);
        }
      });
    }

    // DOM → Reactive: mark touched on blur
    if (cfg.syncOnBlur || cfg.autoSyncReactive) {
      domForm.addEventListener('blur', e => {
        const field = e.target.name || e.target.id;
        if (field && typeof reactiveForm.setTouched === 'function') {
          reactiveForm.setTouched(field);
        }
      }, true /* capture — blur does not bubble */);
    }

    if (reactiveForm.$watch && cfg.autoSyncReactive) {
      // Reactive → DOM: reflect value changes
      reactiveForm.$watch('values', newValues => {
        Object.entries(newValues).forEach(([field, value]) => {
          const input = domForm.querySelector(`[name="${field}"], #${CSS.escape(field)}`);
          if (!input) return;
          if (input.type === 'checkbox') {
            input.checked = !!value;
          } else if (String(input.value) !== String(value ?? '')) {
            input.value = value ?? '';
          }
        });
      }, { deep: true });

      // Reactive → DOM: reflect validation errors
      reactiveForm.$watch('errors', errors => {
        domForm.querySelectorAll('.form-error-message').forEach(el => el.remove());
        domForm.querySelectorAll('.form-invalid').forEach(el => {
          el.classList.remove('form-invalid');
          el.removeAttribute('aria-invalid');
        });

        Object.entries(errors).forEach(([field, message]) => {
          if (!message) return;
          const input = domForm.querySelector(`[name="${field}"], #${CSS.escape(field)}`);
          if (!input) return;

          input.classList.add('form-invalid');
          input.setAttribute('aria-invalid', 'true');

          const existing = input.parentNode?.querySelector(`.form-error-message[data-for="${field}"]`);
          if (existing) existing.remove();

          const errorEl = document.createElement('div');
          errorEl.className   = 'form-error-message';
          errorEl.style.cssText = 'color:#dc3545;font-size:0.875em;margin-top:0.25rem;';
          errorEl.setAttribute('role', 'alert');
          errorEl.setAttribute('data-for', field);
          errorEl.textContent = message;
          input.insertAdjacentElement('afterend', errorEl);
        });
      }, { deep: true });
    }

    _log('Reactive form connected to DOM form:', domForm.id);

    return {
      disconnect() {
        state.reactiveForm = null;
        _log('Reactive form disconnected from:', domForm.id);
      },
    };
  }

  // ============================================================================
  // VALIDATORS
  //
  // A single unified set that works for both DOM forms and reactive forms.
  //
  // DOM form rule:      (value, allValues, field) => errorMessage | null | true
  // Reactive form rule: (value, allValues)        => errorMessage | null
  //
  // Both signatures are compatible — the extra `field` argument is simply
  // ignored by validators that only inspect the value.
  // ============================================================================

  const Validators = {
    required(message = 'This field is required') {
      return value =>
        !value || (typeof value === 'string' && !value.trim()) ? message : null;
    },

    email(message = 'Invalid email address') {
      return value => {
        if (!value) return null;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message;
      };
    },

    minLength(min, message) {
      return value => {
        if (!value) return null;
        return value.length >= min ? null : (message || `Must be at least ${min} characters`);
      };
    },

    maxLength(max, message) {
      return value => {
        if (!value) return null;
        return value.length <= max ? null : (message || `Must be no more than ${max} characters`);
      };
    },

    pattern(regex, message = 'Invalid format') {
      return value => {
        if (!value) return null;
        return new RegExp(regex).test(value) ? null : message;
      };
    },

    min(min, message) {
      return value => {
        if (value === '' || value == null) return null;
        return Number(value) >= min ? null : (message || `Must be at least ${min}`);
      };
    },

    max(max, message) {
      return value => {
        if (value === '' || value == null) return null;
        return Number(value) <= max ? null : (message || `Must be no more than ${max}`);
      };
    },

    match(fieldName, message) {
      return (value, allValues) =>
        value === allValues[fieldName] ? null : (message || `Must match ${fieldName}`);
    },

    custom(fn) { return fn; },

    combine(...validators) {
      return (value, allValues, field) => {
        for (const v of validators) {
          const err = v(value, allValues, field);
          if (err) return err;
        }
        return null;
      };
    },
  };

  // ============================================================================
  // REGISTER WITH 01_dh-form.js VIA addEnhancer()
  //
  // Every form enhanced by ProductionFormsHelper._enhanceForm() automatically
  // receives the extra methods below through the public plugin hook.
  // ============================================================================

  global.Forms.helper.addEnhancer(function(form) {
    if (form._hasEnhancedSubmit) return form;

    Object.defineProperty(form, '_hasEnhancedSubmit', {
      value: true, writable: false, enumerable: false, configurable: false,
    });

    // Replace the basic submitData from 01_dh-form.js with the full pipeline
    form.submitData = (opts = {}) => enhancedSubmit(form, opts);

    // Optional reactive bridge — only relevant in the bridge load path
    form.connectReactive = (reactiveForm, opts = {}) =>
      connectReactiveForm(form, reactiveForm, opts);

    // Per-form config
    form.configure = (opts = {}) => {
      const state = _getState(form);
      state.config = _cfg(state.config, opts);
      return form;
    };

    _log('Enhanced form:', form.id || '(no id)');
    return form;
  });

  // ============================================================================
  // DECLARATIVE [data-enhanced] FORMS
  //
  // Reads data-* attributes to configure the enhanced submission pipeline.
  //
  //   data-submit-url        — fetch URL (overrides form.action)
  //   data-submit-method     — HTTP method
  //   data-success-message   — message shown on success
  //   data-reset-on-success  — presence flag resets form after success
  //   data-message-position  — 'start' | 'end'  (default 'end')
  //   data-auto-disable      — 'false' to keep buttons enabled
  //   data-show-loading      — 'false' to skip loading class
  //   data-allow-default     — presence flag skips auto-preventDefault
  // ============================================================================

  function _wireDeclarative(form) {
    if (!form || form._enhancedWired) return;
    Object.defineProperty(form, '_enhancedWired', {
      value: true, writable: false, enumerable: false, configurable: false,
    });

    const submitOpts = {
      url               : form.getAttribute('data-submit-url')    || form.action,
      method            : form.getAttribute('data-submit-method') || form.method,
      successMessage    : form.getAttribute('data-success-message'),
      resetOnSuccess    : form.hasAttribute('data-reset-on-success'),
      autoDisableButtons: form.getAttribute('data-auto-disable')  !== 'false',
      showLoadingStates : form.getAttribute('data-show-loading')  !== 'false',
    };

    if (!form.hasAttribute('data-allow-default')) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        await enhancedSubmit(form, submitOpts);
      });
    }

    _log('Declarative form wired:', form.id || '(no id)');
  }

  // Auto-wire forms already in the DOM and watch for dynamically added ones
  function _autoInit() {
    document.querySelectorAll('form[data-enhanced]').forEach(_wireDeclarative);
    _log('Auto-initialized declarative forms');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoInit, { once: true });
  } else {
    _autoInit();
  }

  if (typeof MutationObserver !== 'undefined') {
    const root = document.body || document.documentElement;
    new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE &&
              node.tagName.toLowerCase() === 'form' &&
              node.hasAttribute('data-enhanced')) {
            _wireDeclarative(node);
          }
        });
        if (m.type === 'attributes' && m.attributeName === 'data-enhanced' &&
            m.target.tagName.toLowerCase() === 'form') {
          _wireDeclarative(m.target);
        }
      });
    }).observe(root, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['data-enhanced'],
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const FormEnhancements = {
    version: '1.1.0',

    configure : opts => { Object.assign(globalConfig, opts); },
    getConfig : ()   => ({ ...globalConfig }),

    // Manually enhance a form (for forms without [data-enhanced])
    enhance: (form, opts = {}) => {
      _wireDeclarative(form);
      const state = _getState(form);
      state.config = _cfg(state.config, opts);
      return form;
    },

    submit  : (form, opts = {}) => enhancedSubmit(form, opts),
    connect : (domForm, reactiveForm, opts = {}) => connectReactiveForm(domForm, reactiveForm, opts),

    getState  : form => _getState(form),
    clearQueue: ()   => submissionQueue.clear(),

    // Unified validators — works for both DOM forms and reactive forms
    validators: Validators,
    v         : Validators,

    // Direct UI controls (for custom flows)
    disableButtons: form        => _disableButtons(form, _getState(form).config),
    enableButtons : form        => _enableButtons(form, _getState(form).config),
    showSuccess   : (form, msg) => _showSuccess(form, _getState(form).config, msg),
    showError     : (form, err) => _showError(form, _getState(form).config, err),
    removeMessage : form        => _removeMsg(form),
  };

  // ============================================================================
  // EXPORTS
  // ============================================================================

  global.FormEnhancements = FormEnhancements;

  // Attach to Forms namespace
  global.Forms.enhance      = FormEnhancements;
  global.Forms.enhancements = FormEnhancements;
  global.Forms.validators   = Validators;
  global.Forms.v            = Validators;

  if (global.DOMHelpers) {
    global.DOMHelpers.FormEnhancements = FormEnhancements;
  }

  console.log('[Form Enhancements] ✓ v1.1.0 loaded');
  console.log('[Form Enhancements] Available via: FormEnhancements  |  Forms.enhance  |  Forms.validators');

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);