/**
 *  04_dh-reactive-form
 * 
 * Forms Extension for DOM Helpers Reactive State
 * Standalone file - no library modifications needed
 * @license MIT
 */

(function(global) {
  'use strict';

  // Check if ReactiveUtils exists
  if (!global.ReactiveUtils) {
    console.error('[Forms] ReactiveUtils not found. Please load the reactive library first.');
    return;
  }

  const { state: createState, batch } = global.ReactiveUtils;

  /**
   * Create a reactive form with validation and state management
   * @param {Object} initialValues - Initial form values
   * @param {Object} options - Form options (validators, onSubmit)
   * @returns {Object} Reactive form
   */
  function createForm(initialValues = {}, options = {}) {
    // Create the base object BEFORE making it reactive
    const formObj = {
      values: { ...initialValues },
      errors: {},
      touched: {},
      isSubmitting: false,
      submitCount: 0
    };

    // Make it reactive
    const form = createState(formObj);

    // Add computed properties
    form.$computed('isValid', function() {
      const errorKeys = Object.keys(this.errors);
      return errorKeys.length === 0 || errorKeys.every(k => !this.errors[k]);
    });

    form.$computed('isDirty', function() {
      return Object.keys(this.touched).length > 0;
    });

    form.$computed('hasErrors', function() {
      return Object.keys(this.errors).some(k => this.errors[k]);
    });

    form.$computed('touchedFields', function() {
      return Object.keys(this.touched);
    });

    form.$computed('errorFields', function() {
      return Object.keys(this.errors).filter(k => this.errors[k]);
    });

    // Store validators
    const validators = options.validators || {};
    const onSubmitCallback = options.onSubmit;

    // Form methods
    const methods = {
      // Set a single field value
      setValue(field, value) {
        this.values[field] = value;
        this.touched[field] = true;
        
        // Auto-validate if validator exists
        if (validators[field]) {
          this.validateField(field);
        }
        
        return this;
      },

      // Set multiple field values
      setValues(values) {
        return batch(() => {
          Object.entries(values).forEach(([field, value]) => {
            this.setValue(field, value);
          });
          return this;
        });
      },

      // Set a field error
      setError(field, error) {
        if (error) {
          this.errors[field] = error;
        } else {
          delete this.errors[field];
        }
        return this;
      },

      // Set multiple errors
      setErrors(errors) {
        return batch(() => {
          Object.entries(errors).forEach(([field, error]) => {
            this.setError(field, error);
          });
          return this;
        });
      },

      // Clear a field error
      clearError(field) {
        delete this.errors[field];
        return this;
      },

      // Clear all errors
      clearErrors() {
        this.errors = {};
        return this;
      },

      // Mark field as touched
      setTouched(field, touched = true) {
        if (touched) {
          this.touched[field] = true;
        } else {
          delete this.touched[field];
        }
        return this;
      },

      // Mark multiple fields as touched
      setTouchedFields(fields) {
        return batch(() => {
          fields.forEach(field => this.setTouched(field));
          return this;
        });
      },

      // Mark all fields as touched
      touchAll() {
        return batch(() => {
          Object.keys(this.values).forEach(field => {
            this.touched[field] = true;
          });
          return this;
        });
      },

      // Validate a single field
      validateField(field) {
        const validator = validators[field];
        if (!validator) return true;

        const error = validator(this.values[field], this.values);
        
        if (error) {
          this.errors[field] = error;
          return false;
        } else {
          delete this.errors[field];
          return true;
        }
      },

      // Validate all fields
      validate() {
        return batch(() => {
          let isValid = true;
          
          Object.keys(validators).forEach(field => {
            const valid = this.validateField(field);
            if (!valid) isValid = false;
          });
          
          return isValid;
        });
      },

      // Reset form to initial or new values
      reset(newValues = initialValues) {
        return batch(() => {
          this.values = { ...newValues };
          this.errors = {};
          this.touched = {};
          this.isSubmitting = false;
          return this;
        });
      },

      // Reset a single field
      resetField(field) {
        return batch(() => {
          this.values[field] = initialValues[field];
          delete this.errors[field];
          delete this.touched[field];
          return this;
        });
      },

      // Handle form submission
      async submit(customHandler) {
        const handler = customHandler || onSubmitCallback;
        
        if (!handler) {
          console.warn('[Forms] No submit handler provided');
          return;
        }

        // Mark all fields as touched
        this.touchAll();

        // Validate
        const isValid = this.validate();
        
        if (!isValid) {
          console.log('[Forms] Validation failed');
          return { success: false, errors: this.errors };
        }

        this.isSubmitting = true;
        
        try {
          const result = await handler(this.values, this);
          this.submitCount++;
          this.isSubmitting = false;
          return { success: true, result };
        } catch (error) {
          this.isSubmitting = false;
          console.error('[Forms] Submit error:', error);
          return { success: false, error };
        }
      },

      // Handle input change event
      handleChange(event) {
        const target = event.target;
        const field = target.name || target.id;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        
        this.setValue(field, value);
      },

      // Handle input blur event
      handleBlur(event) {
        const target = event.target;
        const field = target.name || target.id;
        
        this.setTouched(field);
        
        if (validators[field]) {
          this.validateField(field);
        }
      },

      // Get field props for easy binding
      getFieldProps(field) {
        return {
          name: field,
          value: this.values[field] || '',
          onChange: (e) => this.handleChange(e),
          onBlur: (e) => this.handleBlur(e)
        };
      },

      // Check if field has error
      hasError(field) {
        return !!this.errors[field];
      },

      // Check if field is touched
      isTouched(field) {
        return !!this.touched[field];
      },

      // Get field error message
      getError(field) {
        return this.errors[field] || null;
      },

      // Get field value
      getValue(field) {
        return this.values[field];
      },

      // Check if field should show error (touched + has error)
      shouldShowError(field) {
        return this.isTouched(field) && this.hasError(field);
      },

      // Bind form to DOM inputs
      bindToInputs(selector) {
        const inputs = typeof selector === 'string' 
          ? document.querySelectorAll(selector)
          : selector;

        inputs.forEach(input => {
          const field = input.name || input.id;
          
          if (!field) return;

          // Set initial value
          if (input.type === 'checkbox') {
            input.checked = !!this.values[field];
          } else {
            input.value = this.values[field] || '';
          }

          // Add event listeners
          input.addEventListener('input', (e) => this.handleChange(e));
          input.addEventListener('blur', (e) => this.handleBlur(e));
        });

        return this;
      },

      // Convert to plain object
      toObject() {
        return {
          values: { ...this.values },
          errors: { ...this.errors },
          touched: { ...this.touched },
          isValid: this.isValid,
          isDirty: this.isDirty,
          isSubmitting: this.isSubmitting,
          submitCount: this.submitCount
        };
      }
    };

    // Attach methods to form
    Object.keys(methods).forEach(key => {
      form[key] = methods[key].bind(form);
    });

    return form;
  }

  /**
   * Common validators
   */
  const Validators = {
    required(message = 'This field is required') {
      return (value) => {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return message;
        }
        return null;
      };
    },

    email(message = 'Invalid email address') {
      return (value) => {
        if (!value) return null;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? null : message;
      };
    },

    minLength(min, message) {
      return (value) => {
        if (!value) return null;
        const msg = message || `Must be at least ${min} characters`;
        return value.length >= min ? null : msg;
      };
    },

    maxLength(max, message) {
      return (value) => {
        if (!value) return null;
        const msg = message || `Must be no more than ${max} characters`;
        return value.length <= max ? null : msg;
      };
    },

    pattern(regex, message = 'Invalid format') {
      return (value) => {
        if (!value) return null;
        return regex.test(value) ? null : message;
      };
    },

    min(min, message) {
      return (value) => {
        if (value === '' || value == null) return null;
        const msg = message || `Must be at least ${min}`;
        return Number(value) >= min ? null : msg;
      };
    },

    max(max, message) {
      return (value) => {
        if (value === '' || value == null) return null;
        const msg = message || `Must be no more than ${max}`;
        return Number(value) <= max ? null : msg;
      };
    },

    match(fieldName, message) {
      return (value, allValues) => {
        const msg = message || `Must match ${fieldName}`;
        return value === allValues[fieldName] ? null : msg;
      };
    },

    custom(validatorFn) {
      return validatorFn;
    },

    combine(...validators) {
      return (value, allValues) => {
        for (const validator of validators) {
          const error = validator(value, allValues);
          if (error) return error;
        }
        return null;
      };
    }
  };

  // Export Forms API
  const FormsAPI = {
    create: createForm,
    form: createForm,
    validators: Validators,
    v: Validators // Shorthand
  };

  // Attach to global
  global.Forms = global.Forms || {};
  Object.assign(global.Forms, FormsAPI);

  // Add to ReactiveUtils
  if (global.ReactiveUtils) {
    global.ReactiveUtils.form = createForm;
    global.ReactiveUtils.createForm = createForm;
    global.ReactiveUtils.validators = Validators;
  }

  // Add to ReactiveState if it exists
  if (global.ReactiveState) {
    global.ReactiveState.form = createForm;
  }

})(typeof window !== 'undefined' ? window : global);