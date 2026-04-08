/** 
*05_dh-index-selection
*/

(function patchSelectorForBulkUpdates() {
  if (typeof Selector === 'undefined' || typeof BulkPropertyUpdaters === 'undefined') return;

  const originalQueryAll = Selector.queryAll;
  Selector.queryAll = function(...args) {
    const result = originalQueryAll.apply(this, args);
    return BulkPropertyUpdaters.enhanceCollectionInstance(result);
  };
})();