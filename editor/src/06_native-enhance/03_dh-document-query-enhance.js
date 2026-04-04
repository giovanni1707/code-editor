// dh-document-query-enhance.js

(function(global) {
  'use strict';

  const _nativeQS  = document.querySelector.bind(document);
  const _nativeQSA = document.querySelectorAll.bind(document);

  const has = {
    updateUtility : typeof global.EnhancedUpdateUtility !== 'undefined',
    bulkUpdaters  : typeof global.BulkPropertyUpdaters  !== 'undefined',
    arrayUpdates  : typeof global.ArrayBasedUpdates     !== 'undefined',
    indexedUpdates: typeof global.IndexedUpdates        !== 'undefined',
  };

  function enhanceElement(el) {
    if (!el) return null;
    if (el._hasEnhancedUpdateMethod || el._domHelpersEnhanced || el._hasGlobalQueryUpdate)
      return el;
    if (has.updateUtility && global.EnhancedUpdateUtility.enhanceElementWithUpdate)
      return global.EnhancedUpdateUtility.enhanceElementWithUpdate(el);
    return el;
  }

  function enhanceCollection(col) {
    if (!col) return col;
    if (has.updateUtility && global.EnhancedUpdateUtility.enhanceCollectionWithUpdate) {
      try { col = global.EnhancedUpdateUtility.enhanceCollectionWithUpdate(col); }
      catch (e) { console.warn('[dh-document-query] EnhancedUpdateUtility.enhanceCollectionWithUpdate failed:', e.message); }
    }
    if (has.bulkUpdaters && global.BulkPropertyUpdaters.enhanceCollectionInstance) {
      try { col = global.BulkPropertyUpdaters.enhanceCollectionInstance(col); }
      catch (e) { console.warn('[dh-document-query] BulkPropertyUpdaters.enhanceCollectionInstance failed:', e.message); }
    }
    if (has.arrayUpdates && global.ArrayBasedUpdates.enhance) {
      try { col = global.ArrayBasedUpdates.enhance(col); }
      catch (e) { console.warn('[dh-document-query] ArrayBasedUpdates.enhance failed:', e.message); }
    }
    if (has.indexedUpdates && global.IndexedUpdates.patch) {
      try { col = global.IndexedUpdates.patch(col); }
      catch (e) { console.warn('[dh-document-query] IndexedUpdates.patch failed:', e.message); }
    }
    return col;
  }

  document.querySelector = function(selector) {
    const el = _nativeQS(selector);
    try {
      return enhanceElement(el);
    } catch (e) {
      return el;
    }
  };

  document.querySelectorAll = function(selector) {
    try {
      const nodeList = _nativeQSA(selector);
      return enhanceCollection(nodeList); // ✅ pass NodeList directly — no Array.from()
    } catch (e) {
      console.error('[dh-document-query] querySelectorAll error:', e.message);
      return enhanceCollection(document.createDocumentFragment().childNodes);
    }
  };

  if (typeof global.DOMHelpers !== 'undefined') {
    global.DOMHelpers.DocumentQueryEnhance = {
      version: '2.5.2',
      enhanceElement,
      enhanceCollection
    };
  }

  console.log('[dh-document-query] v2.5.2 loaded');

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);