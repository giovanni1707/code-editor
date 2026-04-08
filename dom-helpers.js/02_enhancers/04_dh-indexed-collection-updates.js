/**
 * 04_dh-indexed-collection-updates
 * 
 * DOM Helpers - Indexed Collection Updates 
 * Standalone module that adds indexed update support to collections
 * 
 * IMPORTANT: Load this AFTER the main DOM helpers bundle AND global-query.js!
 * 
 * Enables syntax like:
 * querySelectorAll('.btn').update({
 *   [0]: { textContent: 'First', style: { color: 'red' } },
 *   [1]: { textContent: 'Second', style: { color: 'blue' } },
 *   classList: { add: ['shared-class'] }  // Applied to ALL elements
 * })
 * 
 * @version 1.1.0 - FIXED: Now applies both bulk and index updates
 * @license MIT
 */
(function(global) {
    "use strict";

    // ===== DEPENDENCY CHECKS =====
    const hasEnhancedUpdateUtility = typeof global.EnhancedUpdateUtility !== "undefined";
    const hasGlobalQuery = typeof global.querySelectorAll === "function" || typeof global.queryAll === "function";

    if (!hasEnhancedUpdateUtility) {
        console.warn("[Indexed Updates] EnhancedUpdateUtility not found. Load main DOM helpers first!");
    }
    if (!hasGlobalQuery) {
        console.warn("[Indexed Updates] Global query functions not found. Load global-query.js first!");
    }

    // ===== HELPER: APPLY UPDATES TO SINGLE ELEMENT =====
    /**
     * Applies updates to a single element
     */
    function applyUpdatesToElement(element, updates) {
        if (typeof global.EnhancedUpdateUtility !== "undefined" && 
            global.EnhancedUpdateUtility.applyEnhancedUpdate) {
            Object.entries(updates).forEach(([key, value]) => {
                global.EnhancedUpdateUtility.applyEnhancedUpdate(element, key, value);
            });
        } else if (typeof element.update === "function") {
            element.update(updates);
        } else {
            applyBasicUpdate(element, updates);
        }
    }

    // ===== BASIC UPDATE FALLBACK =====
    /**
     * Basic update implementation for elements without .update() method
     */
    function applyBasicUpdate(element, updates) {
        Object.entries(updates).forEach(([key, value]) => {
            try {
                if (key === "style" && typeof value === "object" && value !== null) {
                    Object.entries(value).forEach(([styleProperty, styleValue]) => {
                        if (styleValue !== null && styleValue !== undefined) {
                            element.style[styleProperty] = styleValue;
                        }
                    });
                    return;
                }

                if (key === "classList" && typeof value === "object" && value !== null) {
                    Object.entries(value).forEach(([method, classes]) => {
                        const classList = Array.isArray(classes) ? classes : [classes];
                        switch (method) {
                            case "add":
                                element.classList.add(...classList);
                                break;
                            case "remove":
                                element.classList.remove(...classList);
                                break;
                            case "toggle":
                                classList.forEach(c => element.classList.toggle(c));
                                break;
                        }
                    });
                    return;
                }

                if (key === "setAttribute") {
                    if (Array.isArray(value) && value.length >= 2) {
                        element.setAttribute(value[0], value[1]);
                    } else if (typeof value === "object") {
                        Object.entries(value).forEach(([attr, val]) => element.setAttribute(attr, val));
                    }
                    return;
                }

                if (key in element) {
                    element[key] = value;
                } else if (typeof value === "string" || typeof value === "number") {
                    element.setAttribute(key, value);
                }
            } catch (error) {
                console.warn(`[Indexed Updates] Failed to apply ${key}:`, error.message);
            }
        });
    }

    // ===== CORE: INDEXED UPDATE FUNCTION (FIXED) =====
    /**
     * Updates collection with support for indexed updates AND bulk updates
     * FIXED: Now applies both types of updates correctly
     */
    function updateCollectionWithIndices(collection, updates) {
        if (!collection) {
            console.warn("[Indexed Updates] .update() called on null collection");
            return collection;
        }

        // Extract elements from collection
        let elements = [];
        if (collection.length !== undefined) {
            try {
                elements = Array.from(collection);
            } catch (e) {
                // Fallback for non-iterable collections
                for (let i = 0; i < collection.length; i++) {
                    elements.push(collection[i]);
                }
            }
        } else if (collection._originalCollection) {
            elements = Array.from(collection._originalCollection);
        } else if (collection._originalNodeList) {
            elements = Array.from(collection._originalNodeList);
        } else {
            console.warn("[Indexed Updates] .update() called on unrecognized collection type");
            return collection;
        }

        if (elements.length === 0) {
            console.info("[Indexed Updates] .update() called on empty collection");
            return collection;
        }

        try {
            const updateKeys = Object.keys(updates);
            
            // FIXED: Separate numeric indices from bulk properties
            const indexUpdates = {};
            const bulkUpdates = {};
            let hasIndexUpdates = false;
            let hasBulkUpdates = false;

            updateKeys.forEach(key => {
                // Skip Symbol keys
                if (typeof key === 'symbol') return;
                
                const asNumber = Number(key);
                // Check if it's a valid numeric index
                if (Number.isFinite(asNumber) && 
                    Number.isInteger(asNumber) && 
                    String(asNumber) === key) {
                    indexUpdates[key] = updates[key];
                    hasIndexUpdates = true;
                } else {
                    bulkUpdates[key] = updates[key];
                    hasBulkUpdates = true;
                }
            });

            // FIXED: Apply BOTH bulk and index updates

            // 1. First, apply bulk updates to ALL elements
            if (hasBulkUpdates) {
                console.log("[Indexed Updates] Applying bulk updates to all elements");
                elements.forEach(element => {
                    if (element && element.nodeType === Node.ELEMENT_NODE) {
                        applyUpdatesToElement(element, bulkUpdates);
                    }
                });
            }

            // 2. Then, apply index-specific updates (these can override bulk)
            if (hasIndexUpdates) {
                console.log("[Indexed Updates] Applying index-specific updates");
                Object.entries(indexUpdates).forEach(([key, elementUpdates]) => {
                    let index = Number(key);
                    
                    // Handle negative indices
                    if (index < 0) {
                        index = elements.length + index;
                    }

                    const element = elements[index];
                    if (element && element.nodeType === Node.ELEMENT_NODE) {
                        if (elementUpdates && typeof elementUpdates === "object") {
                            applyUpdatesToElement(element, elementUpdates);
                        }
                    } else if (index >= 0 && index < elements.length) {
                        console.warn(`[Indexed Updates] Element at index ${key} is not a valid DOM element`);
                    } else {
                        console.warn(`[Indexed Updates] No element at index ${key} (resolved to ${index}, collection has ${elements.length} elements)`);
                    }
                });
            }

            // Log summary
            if (!hasIndexUpdates && !hasBulkUpdates) {
                console.log("[Indexed Updates] No updates applied");
            }

        } catch (error) {
            console.warn(`[Indexed Updates] Error in collection .update(): ${error.message}`);
            console.error(error);
        }

        return collection;
    }

    // ===== PATCH COLLECTION UPDATE METHOD =====
    /**
     * Patches a collection's update method to support indexed updates
     */
    function patchCollectionUpdate(collection) {
        if (!collection || collection._hasIndexedUpdateSupport) {
            return collection;
        }

        // Store reference to original update method
        const originalUpdate = collection.update;

        try {
            Object.defineProperty(collection, "update", {
                value: function(updates = {}) {
                    // Always use the fixed indexed update logic
                    return updateCollectionWithIndices(this, updates);
                },
                writable: false,
                enumerable: false,
                configurable: true
            });

            Object.defineProperty(collection, "_hasIndexedUpdateSupport", {
                value: true,
                writable: false,
                enumerable: false,
                configurable: false
            });
        } catch (e) {
            // Fallback if defineProperty fails
            collection.update = function(updates = {}) {
                return updateCollectionWithIndices(this, updates);
            };
            collection._hasIndexedUpdateSupport = true;
        }

        return collection;
    }

    // ===== PATCH GLOBAL QUERY FUNCTIONS =====

    const originalQS = global.querySelector;
    const originalQSA = global.querySelectorAll;
    const originalQSShort = global.query;
    const originalQSAShort = global.queryAll;

    function enhancedQuerySelectorAll(selector, context = document) {
        let collection;
        if (originalQSA) {
            collection = originalQSA.call(global, selector, context);
        } else if (originalQSAShort) {
            collection = originalQSAShort.call(global, selector, context);
        } else {
            console.warn("[Indexed Updates] No querySelectorAll function found");
            return null;
        }

        // Only patch if collection doesn't already have indexed update support
        if (collection && !collection._hasIndexedUpdateSupport) {
            return patchCollectionUpdate(collection);
        }
        
        return collection;
    }

    function enhancedQSA(selector, context = document) {
        return enhancedQuerySelectorAll(selector, context);
    }

    if (originalQSA) {
        global.querySelectorAll = enhancedQuerySelectorAll;
        console.log("[Indexed Updates] Enhanced querySelectorAll");
    }

    if (originalQSAShort) {
        global.queryAll = enhancedQSA;
        console.log("[Indexed Updates] Enhanced queryAll");
    }

    // ===== PATCH COLLECTIONS HELPER =====

    if (global.Collections) {
        const originalCollectionsUpdate = global.Collections.update;
        global.Collections.update = function(updates = {}) {
            // Check if using colon-based selector syntax (e.g., ".btn:0")
            const hasColonKeys = Object.keys(updates).some(key => key.includes(":"));
            if (hasColonKeys && originalCollectionsUpdate) {
                // Use original Collections update for selector syntax
                return originalCollectionsUpdate.call(this, updates);
            } else {
                // Use new indexed update logic
                return updateCollectionWithIndices(this, updates);
            }
        };
        console.log("[Indexed Updates] Patched Collections.update");
    }

    // ===== PATCH SELECTOR HELPER =====

    if (global.Selector) {
        const originalSelectorUpdate = global.Selector.update;
        global.Selector.update = function(updates = {}) {
            const firstKey = Object.keys(updates)[0];
            // Check if using selector-based syntax
            const looksLikeSelector = firstKey && (firstKey.startsWith("#") || firstKey.startsWith(".") || firstKey.includes("["));
            if (looksLikeSelector && originalSelectorUpdate) {
                return originalSelectorUpdate.call(this, updates);
            } else {
                return updateCollectionWithIndices(this, updates);
            }
        };
        console.log("[Indexed Updates] Patched Selector.update");
    }

    // ===== PATCH ENHANCED UPDATE UTILITY =====

    if (hasEnhancedUpdateUtility && global.EnhancedUpdateUtility.enhanceCollectionWithUpdate) {
        const originalEnhance = global.EnhancedUpdateUtility.enhanceCollectionWithUpdate;
        global.EnhancedUpdateUtility.enhanceCollectionWithUpdate = function(collection) {
            const enhanced = originalEnhance.call(this, collection);
            return patchCollectionUpdate(enhanced);
        };
        console.log("[Indexed Updates] Patched EnhancedUpdateUtility.enhanceCollectionWithUpdate");
    }

    // ===== EXPORTS =====

    const IndexedUpdates = {
        version: "1.1.0",
        updateCollectionWithIndices: updateCollectionWithIndices,
        patchCollectionUpdate: patchCollectionUpdate,
        patch(collection) {
            return patchCollectionUpdate(collection);
        },
        hasSupport(collection) {
            return !!(collection && collection._hasIndexedUpdateSupport);
        },
        restore() {
            if (originalQSA) global.querySelectorAll = originalQSA;
            if (originalQSAShort) global.queryAll = originalQSAShort;
            console.log("[Indexed Updates] Restored original functions");
        }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = IndexedUpdates;
    } else if (typeof define === "function" && define.amd) {
        define([], function() {
            return IndexedUpdates;
        });
    } else {
        global.IndexedUpdates = IndexedUpdates;
    }

    if (typeof global.DOMHelpers !== "undefined") {
        global.DOMHelpers.IndexedUpdates = IndexedUpdates;
    }

    console.log("[DOM Helpers] Indexed collection updates loaded - v1.1.0 (FIXED)");
    console.log("[Indexed Updates] ✓ Now supports BOTH bulk and index-specific updates");
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);