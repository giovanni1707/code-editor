/**
 * src/dh-docs.js
 * DOM Helpers API reference tooltip.
 * Shows signature + description when the cursor rests on a known DH identifier.
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   API DATABASE  (all 10 modules — comprehensive)
══════════════════════════════════════════════════════════════ */
const DH_DOCS = {

  /* ── Module 1 · Core ────────────────────────────────────────── */

  /* DOMHelpers top-level namespace */
  'DOMHelpers':           { sig: 'DOMHelpers',                                             desc: 'Top-level namespace that aggregates all DOM Helpers modules.',                     mod: 'Core' },
  'DOMHelpers.isReady':   { sig: 'DOMHelpers.isReady()',                                   desc: 'Returns true when the DOM Helpers library is fully initialised.',                  mod: 'Core' },
  'DOMHelpers.getStats':  { sig: 'DOMHelpers.getStats()',                                  desc: 'Return runtime statistics for all active helpers.',                                mod: 'Core' },
  'DOMHelpers.clearAll':  { sig: 'DOMHelpers.clearAll()',                                  desc: 'Clear all internal caches across every module.',                                   mod: 'Core' },
  'DOMHelpers.destroyAll':{ sig: 'DOMHelpers.destroyAll()',                                desc: 'Destroy all module instances and release resources.',                              mod: 'Core' },
  'DOMHelpers.configure': { sig: 'DOMHelpers.configure(options)',                          desc: 'Set global configuration options for all modules.',                                mod: 'Core' },
  'DOMHelpers.version':   { sig: 'DOMHelpers.version',                                    desc: 'Current library version string (e.g. "2.3.1").',                                   mod: 'Core' },
  'DOMHelpers.createElement': { sig: 'DOMHelpers.createElement(tag, options?)',           desc: 'Create and return an enhanced DOM element.',                                       mod: 'Core' },

  /* Global query shortcuts */
  'querySelector':        { sig: 'querySelector(selector, context = document)',            desc: 'Query a single element — returns an enhanced element with .update().',            mod: 'Core' },
  'querySelectorAll':     { sig: 'querySelectorAll(selector, context = document)',         desc: 'Query all matching elements — returns an enhanced collection with .update().',    mod: 'Core' },
  'query':                { sig: 'query(selector, context = document)',                    desc: 'Alias for querySelector().',                                                       mod: 'Core' },
  'queryAll':             { sig: 'queryAll(selector, context = document)',                 desc: 'Alias for querySelectorAll().',                                                    mod: 'Core' },
  'queryWithin':          { sig: 'queryWithin(container, selector)',                       desc: 'Query a single element scoped to a container.',                                   mod: 'Core' },
  'queryAllWithin':       { sig: 'queryAllWithin(container, selector)',                    desc: 'Query all elements scoped to a container.',                                       mod: 'Core' },
  'eachEntries':          { sig: 'eachEntries(obj, callback, selector?)',                  desc: 'Iterate over object entries and optionally update matching elements.',             mod: 'Core' },
  'mapEntries':           { sig: 'mapEntries(obj, callback, joinHTML?, selector?)',        desc: 'Map object entries to HTML strings and inject into matching elements.',           mod: 'Core' },

  /* Elements namespace */
  'Elements':             { sig: 'Elements[id]  |  Elements.get(id)',                     desc: 'ID-based element cache — access any DOM element by its id as a property.',        mod: 'Core' },
  'Elements.get':         { sig: 'Elements.get(id, fallback?)',                            desc: 'Get cached element by id, optionally returning a fallback value.',                mod: 'Core' },
  'Elements.exists':      { sig: 'Elements.exists(id)',                                   desc: 'Returns true if an element with the given id exists in the DOM.',                  mod: 'Core' },
  'Elements.getRequired': { sig: 'Elements.getRequired(...ids)',                           desc: 'Get elements by id — throws if any are missing.',                                  mod: 'Core' },
  'Elements.getMultiple': { sig: 'Elements.getMultiple(...ids)',                           desc: 'Get multiple elements by id at once as an array.',                                 mod: 'Core' },
  'Elements.getProperty': { sig: 'Elements.getProperty(id, prop, fallback?)',             desc: 'Read a property from a cached element.',                                           mod: 'Core' },
  'Elements.setProperty': { sig: 'Elements.setProperty(id, prop, value)',                 desc: 'Set a property on a cached element.',                                              mod: 'Core' },
  'Elements.getAttribute':{ sig: 'Elements.getAttribute(id, attr, fallback?)',            desc: 'Read an attribute from a cached element.',                                         mod: 'Core' },
  'Elements.setAttribute':{ sig: 'Elements.setAttribute(id, attr, value)',                desc: 'Set an attribute on a cached element.',                                            mod: 'Core' },
  'Elements.waitFor':     { sig: 'Elements.waitFor(id, timeout = 5000)',                  desc: 'Returns a Promise that resolves when the element appears in the DOM.',             mod: 'Core' },
  'Elements.destructure': { sig: 'Elements.destructure(...ids)',                           desc: 'Destructure multiple elements by id in one call.',                                 mod: 'Core' },
  'Elements.clear':       { sig: 'Elements.clear()',                                      desc: 'Clear the internal element cache.',                                                mod: 'Core' },
  'Elements.destroy':     { sig: 'Elements.destroy()',                                    desc: 'Destroy the Elements helper and release all resources.',                           mod: 'Core' },
  'Elements.stats':       { sig: 'Elements.stats()',                                      desc: 'Return cache statistics (hits, misses, size).',                                   mod: 'Core' },
  'Elements.isCached':    { sig: 'Elements.isCached(id)',                                 desc: 'Returns true if the element is already in the internal cache.',                    mod: 'Core' },
  'Elements.configure':   { sig: 'Elements.configure(options)',                           desc: 'Set options for the Elements helper (e.g. cache TTL).',                           mod: 'Core' },
  'Elements.update':      { sig: 'Elements.update(updates)',                              desc: 'Bulk update multiple elements by id in one call.',                                 mod: 'Core' },

  /* Collections namespace */
  'Collections':          { sig: 'Collections.ClassName[name]  |  Collections.TagName[tag]  |  Collections.Name[attr]', desc: 'Access element collections by className, tagName, or name attribute.', mod: 'Core' },
  'ClassName':            { sig: 'ClassName[className]  |  ClassName(className)',          desc: 'Proxy — returns all elements matching a class name.',                              mod: 'Core' },
  'TagName':              { sig: 'TagName[tagName]  |  TagName(tagName)',                  desc: 'Proxy — returns all elements matching a tag name.',                               mod: 'Core' },
  'Name':                 { sig: 'Name[attrName]  |  Name(attrName)',                      desc: 'Proxy — returns all elements with a matching name attribute.',                    mod: 'Core' },
  'Collections.stats':    { sig: 'Collections.stats()',                                   desc: 'Return cache statistics for the Collections helper.',                              mod: 'Core' },
  'Collections.clear':    { sig: 'Collections.clear()',                                   desc: 'Clear the Collections internal cache.',                                            mod: 'Core' },
  'Collections.destroy':  { sig: 'Collections.destroy()',                                 desc: 'Destroy the Collections helper and release resources.',                            mod: 'Core' },
  'Collections.isCached': { sig: 'Collections.isCached(type, value)',                     desc: 'Returns true if the collection result is already cached.',                         mod: 'Core' },
  'Collections.getMultiple': { sig: 'Collections.getMultiple(requests)',                  desc: 'Get multiple collections in a single call.',                                       mod: 'Core' },
  'Collections.waitFor':  { sig: 'Collections.waitFor(type, value, minCount?, timeout?)', desc: 'Wait for at least minCount elements to match the query.',                         mod: 'Core' },
  'Collections.configure':{ sig: 'Collections.configure(options)',                        desc: 'Set options for the Collections helper.',                                          mod: 'Core' },
  'Collections.update':   { sig: 'Collections.update(updates)',                           desc: 'Bulk update multiple collections in one call.',                                    mod: 'Core' },

  /* Selector namespace */
  'Selector':             { sig: 'Selector.query(selector)  |  Selector.queryAll(selector)', desc: 'CSS selector–based access, returns enhanced elements/collections with .update().', mod: 'Core' },
  'Selector.query':       { sig: 'Selector.query(selector, context?)',                    desc: 'Query a single element by CSS selector — returns enhanced element.',              mod: 'Core' },
  'Selector.queryAll':    { sig: 'Selector.queryAll(selector, context?)',                 desc: 'Query all matching elements by CSS selector — returns enhanced collection.',      mod: 'Core' },
  'Selector.waitFor':     { sig: 'Selector.waitFor(selector, timeout = 5000)',            desc: 'Returns a Promise that resolves when the selector matches an element.',           mod: 'Core' },
  'Selector.waitForAll':  { sig: 'Selector.waitForAll(selector, minCount?, timeout?)',    desc: 'Wait for at least minCount elements to match the CSS selector.',                  mod: 'Core' },
  'Selector.stats':       { sig: 'Selector.stats()',                                      desc: 'Return cache statistics for the Selector helper.',                                mod: 'Core' },
  'Selector.clear':       { sig: 'Selector.clear()',                                      desc: 'Clear the Selector internal cache.',                                               mod: 'Core' },
  'Selector.configure':   { sig: 'Selector.configure(options)',                           desc: 'Set options for the Selector helper.',                                             mod: 'Core' },
  'Selector.update':      { sig: 'Selector.update(updates)',                              desc: 'Bulk update results of multiple selectors in one call.',                           mod: 'Core' },

  /* Id shortcut */
  'Id':                   { sig: 'Id(elementId)',                                          desc: 'Fast ID-based element access — returns element with .update() and helper methods.', mod: 'Core' },
  'Id.multiple':          { sig: 'Id.multiple(...ids)',                                   desc: 'Get multiple elements by id at once.',                                             mod: 'Core' },
  'Id.required':          { sig: 'Id.required(...ids)',                                   desc: 'Get elements by id — throws if any are missing.',                                  mod: 'Core' },
  'Id.waitFor':           { sig: 'Id.waitFor(id, timeout = 5000)',                        desc: 'Promise that resolves when the element with id appears in the DOM.',              mod: 'Core' },
  'Id.exists':            { sig: 'Id.exists(id)',                                         desc: 'Returns true if an element with the given id exists.',                             mod: 'Core' },
  'Id.get':               { sig: 'Id.get(id, fallback?)',                                 desc: 'Get element by id with optional fallback.',                                        mod: 'Core' },
  'Id.update':            { sig: 'Id.update(updates)',                                    desc: 'Apply bulk updates to elements by id.',                                            mod: 'Core' },
  'Id.setProperty':       { sig: 'Id.setProperty(id, property, value)',                   desc: 'Set a property on a cached element by id.',                                       mod: 'Core' },
  'Id.getProperty':       { sig: 'Id.getProperty(id, property, fallback?)',               desc: 'Get a property from a cached element by id.',                                     mod: 'Core' },
  'Id.setAttribute':      { sig: 'Id.setAttribute(id, attribute, value)',                 desc: 'Set an attribute on a cached element by id.',                                     mod: 'Core' },
  'Id.getAttribute':      { sig: 'Id.getAttribute(id, attribute, fallback?)',             desc: 'Get an attribute from a cached element by id.',                                   mod: 'Core' },
  'Id.stats':             { sig: 'Id.stats()',                                            desc: 'Return cache statistics for the Id helper.',                                      mod: 'Core' },
  'Id.isCached':          { sig: 'Id.isCached(id)',                                       desc: 'Returns true if the element is already in the Id cache.',                         mod: 'Core' },
  'Id.clearCache':        { sig: 'Id.clearCache()',                                       desc: 'Clear the internal Id element cache.',                                             mod: 'Core' },

  /* .update() universal method */
  'update':               { sig: '.update(updates)',                                       desc: 'Universal update on any element or collection. Keys: style, classList, attrs, dataset, textContent, innerHTML, value, addEventListener…', mod: 'Core' },

  /* ── Module 2 · Enhancers ───────────────────────────────────── */
  'textContent':          { sig: 'Elements.textContent({ id: value, … })',                desc: 'Bulk-set textContent on multiple elements by id.',                                mod: 'Enhancers' },
  'innerHTML':            { sig: 'Elements.innerHTML({ id: value, … })',                  desc: 'Bulk-set innerHTML on multiple elements by id.',                                   mod: 'Enhancers' },
  'innerText':            { sig: 'Elements.innerText({ id: value, … })',                  desc: 'Bulk-set innerText on multiple elements by id.',                                   mod: 'Enhancers' },
  'value':                { sig: 'Elements.value({ id: value, … })',                      desc: 'Bulk-set value on multiple form elements by id.',                                 mod: 'Enhancers' },
  'placeholder':          { sig: 'Elements.placeholder({ id: text, … })',                 desc: 'Bulk-set placeholder on multiple inputs by id.',                                  mod: 'Enhancers' },
  'title':                { sig: 'Elements.title({ id: text, … })',                       desc: 'Bulk-set title attribute on multiple elements by id.',                            mod: 'Enhancers' },
  'disabled':             { sig: 'Elements.disabled({ id: bool, … })',                    desc: 'Bulk-set disabled state on multiple elements by id.',                             mod: 'Enhancers' },
  'checked':              { sig: 'Elements.checked({ id: bool, … })',                     desc: 'Bulk-set checked state on multiple checkboxes/radios by id.',                    mod: 'Enhancers' },
  'hidden':               { sig: 'Elements.hidden({ id: bool, … })',                      desc: 'Bulk-set hidden state on multiple elements by id.',                               mod: 'Enhancers' },
  'readonly':             { sig: 'Elements.readonly({ id: bool, … })',                    desc: 'Bulk-set readonly state on multiple inputs by id.',                               mod: 'Enhancers' },
  'selected':             { sig: 'Elements.selected({ id: bool, … })',                    desc: 'Bulk-set selected state on multiple option elements by id.',                      mod: 'Enhancers' },
  'src':                  { sig: 'Elements.src({ id: url, … })',                          desc: 'Bulk-set src on multiple elements by id.',                                        mod: 'Enhancers' },
  'href':                 { sig: 'Elements.href({ id: url, … })',                         desc: 'Bulk-set href on multiple elements by id.',                                       mod: 'Enhancers' },
  'alt':                  { sig: 'Elements.alt({ id: text, … })',                         desc: 'Bulk-set alt text on multiple elements by id.',                                   mod: 'Enhancers' },
  'style':                { sig: 'Elements.style({ id: { prop: value }, … })',            desc: 'Bulk-set inline styles on multiple elements by id.',                              mod: 'Enhancers' },
  'dataset':              { sig: 'Elements.dataset({ id: { key: value }, … })',           desc: 'Bulk-set data-* attributes on multiple elements by id.',                          mod: 'Enhancers' },
  'attrs':                { sig: 'Elements.attrs({ id: { attr: value }, … })',            desc: 'Bulk-set arbitrary attributes on multiple elements by id.',                       mod: 'Enhancers' },
  'classes':              { sig: 'Elements.classes({ id: { add?, remove?, toggle? }, … })', desc: 'Bulk classList operations (add/remove/toggle) on multiple elements by id.',    mod: 'Enhancers' },
  'prop':                 { sig: 'Elements.prop(propertyPath, { id: value, … })',         desc: 'Bulk-set a generic property path on multiple elements by id.',                    mod: 'Enhancers' },

  /* ── Module 3 · Conditions ──────────────────────────────────── */
  'Conditions':           { sig: 'Conditions.whenState(valueFn, conditions, selector, options?)', desc: 'Conditional rendering — reactively apply DOM changes based on state values.', mod: 'Conditions' },
  'Conditions.whenState': { sig: 'Conditions.whenState(valueFn, conditions, selector, options?)', desc: 'Re-apply conditions whenever the value returned by valueFn changes.',        mod: 'Conditions' },
  'Conditions.apply':     { sig: 'Conditions.apply(value, conditions, selector)',          desc: 'Apply conditions once (no reactivity) to all matching elements.',                 mod: 'Conditions' },
  'Conditions.watch':     { sig: 'Conditions.watch(valueFn, conditions, selector)',        desc: 'Re-apply conditions every time the valueFn result changes.',                      mod: 'Conditions' },
  'Conditions.batch':     { sig: 'Conditions.batch(fn)',                                   desc: 'Batch multiple condition updates into one DOM pass.',                              mod: 'Conditions' },
  'Conditions.registerMatcher': { sig: 'Conditions.registerMatcher(name, { test(val, key), match(el, props, val) })', desc: 'Register a custom condition matcher plugin.', mod: 'Conditions' },
  'Conditions.registerHandler': { sig: 'Conditions.registerHandler(name, { test(key), apply(el, key, val) })', desc: 'Register a custom property handler plugin.',           mod: 'Conditions' },
  'Conditions.getMatchers':     { sig: 'Conditions.getMatchers()',                         desc: 'Return all registered condition matchers.',                                       mod: 'Conditions' },
  'Conditions.getHandlers':     { sig: 'Conditions.getHandlers()',                         desc: 'Return all registered property handlers.',                                        mod: 'Conditions' },

  /* whenState/whenApply/whenWatch integrated on Elements/Collections/Selector */
  'whenState':            { sig: 'Elements.whenState(valueFn, conditions, selector, options?)', desc: 'Reactively apply Conditions directly via the Elements namespace.', mod: 'Conditions' },
  'whenApply':            { sig: 'Elements.whenApply(value, conditions, selector)',        desc: 'One-shot condition apply via the Elements namespace.',                             mod: 'Conditions' },
  'whenWatch':            { sig: 'Elements.whenWatch(valueFn, conditions, selector)',      desc: 'Watched condition apply via the Elements namespace.',                             mod: 'Conditions' },

  /* ── Module 4 · Reactive ────────────────────────────────────── */
  'ReactiveUtils':        { sig: 'ReactiveUtils.state(initialObject)',                     desc: 'Entry point for the reactive system — create state, effects, computed values and more.', mod: 'Reactive' },
  'ReactiveUtils.state':  { sig: 'ReactiveUtils.state(initialObject)',                     desc: 'Create a reactive state proxy. Any property access inside effect() is tracked automatically.', mod: 'Reactive' },
  'ReactiveUtils.createState': { sig: 'ReactiveUtils.createState(initialValues, bindingDefs?)', desc: 'Create reactive state with optional DOM bindings in one call.',            mod: 'Reactive' },
  'ReactiveUtils.ref':    { sig: 'ReactiveUtils.ref(value)',                               desc: 'Create a single reactive value. Access and mutate with .value.',                 mod: 'Reactive' },
  'ReactiveUtils.refs':   { sig: 'ReactiveUtils.refs(definitions)',                        desc: 'Create multiple reactive refs from an object of initial values.',                mod: 'Reactive' },
  'ReactiveUtils.form':   { sig: 'ReactiveUtils.form(initialValues = {})',                 desc: 'Create form state with values, errors, touched and isSubmitting fields.',        mod: 'Reactive' },
  'ReactiveUtils.async':  { sig: 'ReactiveUtils.async(initialValue = null)',               desc: 'Create async state with data, loading, error fields and $execute() method.',     mod: 'Reactive' },
  'ReactiveUtils.store':  { sig: 'ReactiveUtils.store(initialState, options?)',            desc: 'Create a store with getters and actions.',                                       mod: 'Reactive' },
  'ReactiveUtils.component': { sig: 'ReactiveUtils.component(config)',                    desc: 'Create component state with computed, watch, effects and actions.',              mod: 'Reactive' },
  'ReactiveUtils.effect': { sig: 'ReactiveUtils.effect(fn)',                               desc: 'Run fn immediately and re-run whenever its reactive dependencies change.',       mod: 'Reactive' },
  'ReactiveUtils.effects':{ sig: 'ReactiveUtils.effects(defs)',                            desc: 'Register multiple named effects from an object of functions.',                   mod: 'Reactive' },
  'ReactiveUtils.watch':  { sig: 'ReactiveUtils.watch(state, { key: callback })',          desc: 'Watch specific state properties and call callbacks when they change.',           mod: 'Reactive' },
  'ReactiveUtils.computed':{ sig: 'ReactiveUtils.computed(state, { key: fn })',            desc: 'Define computed (derived) properties on a reactive state object.',              mod: 'Reactive' },
  'ReactiveUtils.batch':  { sig: 'ReactiveUtils.batch(fn)',                                desc: 'Batch multiple state mutations — effects fire only once after fn returns.',      mod: 'Reactive' },
  'ReactiveUtils.notify': { sig: 'ReactiveUtils.notify(state, key)',                       desc: 'Manually trigger effects that depend on state[key].',                            mod: 'Reactive' },
  'ReactiveUtils.pause':  { sig: 'ReactiveUtils.pause()',                                  desc: 'Pause all reactive updates globally.',                                            mod: 'Reactive' },
  'ReactiveUtils.resume': { sig: 'ReactiveUtils.resume(flush?)',                           desc: 'Resume reactive updates after pause(). Pass true to flush queued effects.',      mod: 'Reactive' },
  'ReactiveUtils.untrack':{ sig: 'ReactiveUtils.untrack(fn)',                              desc: 'Execute fn without registering any reactive dependencies.',                      mod: 'Reactive' },
  'ReactiveUtils.isReactive': { sig: 'ReactiveUtils.isReactive(value)',                   desc: 'Returns true if value is a reactive proxy.',                                     mod: 'Reactive' },
  'ReactiveUtils.toRaw':  { sig: 'ReactiveUtils.toRaw(value)',                             desc: 'Get the raw (non-proxy) underlying object from a reactive value.',               mod: 'Reactive' },
  'ReactiveUtils.collection': { sig: 'ReactiveUtils.collection(items = [])',              desc: 'Create a reactive array with $add, $remove, $update, $clear methods.',          mod: 'Reactive' },
  'ReactiveUtils.list':   { sig: 'ReactiveUtils.list(items = [])',                         desc: 'Alias for ReactiveUtils.collection().',                                          mod: 'Reactive' },
  'ReactiveUtils.reactive': { sig: 'ReactiveUtils.reactive(initialState)',                desc: 'Fluent builder: .computed().watch().effect().bind().action().build().',          mod: 'Reactive' },
  'ReactiveUtils.builder':{ sig: 'ReactiveUtils.builder()',                                desc: 'Alias for ReactiveUtils.reactive() — start a fluent reactive builder.',         mod: 'Reactive' },
  'ReactiveUtils.bindings':{ sig: 'ReactiveUtils.bindings()',                              desc: 'Create a two-way DOM binding helper.',                                           mod: 'Reactive' },
  'ReactiveUtils.destroy':{ sig: 'ReactiveUtils.destroy(component)',                      desc: 'Destroy a component and run its cleanup functions.',                              mod: 'Reactive' },
  'ReactiveUtils.execute':{ sig: 'ReactiveUtils.execute(asyncState)',                     desc: 'Trigger execution on an async state object.',                                    mod: 'Reactive' },
  'ReactiveUtils.reset':  { sig: 'ReactiveUtils.reset(asyncState)',                        desc: 'Reset async state back to its initial value.',                                   mod: 'Reactive' },
  'ReactiveUtils.updateAll': { sig: 'ReactiveUtils.updateAll(callback)',                  desc: 'Run a callback after the next reactive update cycle completes.',                  mod: 'Reactive' },

  /* state instance $ methods */
  '$computed':            { sig: 'state.$computed(key, fn)',                               desc: 'Add a computed (derived) property to an existing reactive state.',               mod: 'Reactive' },
  '$watch':               { sig: 'state.$watch(keyOrFn, callback)',                        desc: 'Watch a key or expression on this state object.',                                 mod: 'Reactive' },
  '$batch':               { sig: 'state.$batch(fn)',                                       desc: 'Batch mutations on this state — effects fire once after fn.',                     mod: 'Reactive' },
  '$notify':              { sig: 'state.$notify(key)',                                     desc: 'Manually notify dependents of state[key].',                                       mod: 'Reactive' },
  '$update':              { sig: 'state.$update(updates)',                                 desc: 'Apply a mixed update object (values + DOM bindings).',                            mod: 'Reactive' },
  '$set':                 { sig: 'state.$set(updates)',                                    desc: 'Set properties using plain values or resolver functions.',                        mod: 'Reactive' },
  '$bind':                { sig: 'state.$bind(bindingDefs)',                               desc: 'Create two-way DOM bindings on this state.',                                      mod: 'Reactive' },
  '$execute':             { sig: 'asyncState.$execute(...args)',                           desc: 'Run the async operation on an async state object.',                               mod: 'Reactive' },
  '$abort':               { sig: 'asyncState.$abort()',                                    desc: 'Abort an in-flight async operation.',                                             mod: 'Reactive' },
  '$reset':               { sig: 'asyncState.$reset()',                                   desc: 'Reset async state to its initial value.',                                         mod: 'Reactive' },
  '$add':                 { sig: 'collection.$add(item)',                                  desc: 'Add an item to a reactive collection.',                                           mod: 'Reactive' },
  '$remove':              { sig: 'collection.$remove(item | index)',                       desc: 'Remove an item from a reactive collection.',                                      mod: 'Reactive' },
  '$clear':               { sig: 'collection.$clear()',                                   desc: 'Remove all items from a reactive collection.',                                    mod: 'Reactive' },
  '$destroy':             { sig: 'component.$destroy()',                                  desc: 'Destroy a component and run its cleanup.',                                         mod: 'Reactive' },
  '$save':                { sig: 'state.$save(key, options?)',                             desc: 'Persist reactive state to storage.',                                              mod: 'Reactive' },
  '$load':                { sig: 'state.$load(key, options?)',                             desc: 'Load state from storage into this reactive state.',                               mod: 'Reactive' },
  '$startAutoSave':       { sig: 'state.$startAutoSave(key, options?)',                   desc: 'Begin auto-saving state changes to storage on every mutation.',                   mod: 'Reactive' },
  '$stopAutoSave':        { sig: 'state.$stopAutoSave()',                                 desc: 'Stop auto-saving state changes.',                                                  mod: 'Reactive' },

  /* ── Module 5 · Storage ─────────────────────────────────────── */
  'StorageUtils':         { sig: 'StorageUtils.save(key, data, options?)',                 desc: 'Persistent storage utilities — save, load, watch, auto-save with namespacing.',  mod: 'Storage' },
  'StorageUtils.save':    { sig: 'StorageUtils.save(key, data, options?)',                 desc: 'Save data to localStorage (auto-serialises objects).',                           mod: 'Storage' },
  'StorageUtils.load':    { sig: 'StorageUtils.load(key, defaultValue?, options?)',        desc: 'Load data from localStorage (auto-deserialises).',                               mod: 'Storage' },
  'StorageUtils.clear':   { sig: 'StorageUtils.clear(key, namespace?)',                   desc: 'Remove a key from localStorage.',                                                 mod: 'Storage' },
  'StorageUtils.exists':  { sig: 'StorageUtils.exists(key, namespace?)',                  desc: 'Returns true if the key exists in localStorage.',                                 mod: 'Storage' },
  'StorageUtils.watch':   { sig: 'StorageUtils.watch(key, callback, options?)',            desc: 'Watch a storage key for changes — works cross-tab via StorageEvent.',            mod: 'Storage' },
  'StorageUtils.createAutoSave': { sig: 'StorageUtils.createAutoSave(key, options?)',     desc: 'Create a debounced auto-save manager with .save(), .load(), .stop() methods.',   mod: 'Storage' },
  'StorageUtils.getInfo': { sig: 'StorageUtils.getInfo(namespace?)',                      desc: 'Return storage metadata: size, keys, and usage information.',                    mod: 'Storage' },
  'StorageUtils.clearAll':{ sig: 'StorageUtils.clearAll(namespace?)',                     desc: 'Clear all keys under a namespace.',                                               mod: 'Storage' },
  'StorageUtils.serialize':   { sig: 'StorageUtils.serialize(value)',                     desc: 'Manually serialise a value to a storage-safe string.',                           mod: 'Storage' },
  'StorageUtils.deserialize': { sig: 'StorageUtils.deserialize(str, defaultValue?)',      desc: 'Manually deserialise a storage string back to its original value.',              mod: 'Storage' },

  /* ── Module 6 · Native Enhance ──────────────────────────────── */
  'GetByIdEnhance':       { sig: 'GetByIdEnhance',                                        desc: 'Enhancement utilities that add .update() to native getElementById results.',      mod: 'Native' },

  /* ── Module 7 · Forms ───────────────────────────────────────── */
  'Forms':                { sig: 'Forms[formId]',                                          desc: 'Access and control a form by its DOM id — returns an enhanced form object.',     mod: 'Forms' },
  'Forms.addEnhancer':    { sig: 'Forms.addEnhancer(fn)',                                  desc: 'Register a plugin hook to extend all form instances with custom behaviour.',     mod: 'Forms' },
  'Forms.stats':          { sig: 'Forms.stats()',                                          desc: 'Return statistics for the Forms helper (number of cached forms, etc.).',        mod: 'Forms' },
  'Forms.clear':          { sig: 'Forms.clear()',                                          desc: 'Clear the Forms internal cache.',                                                mod: 'Forms' },
  'Forms.destroy':        { sig: 'Forms.destroy()',                                        desc: 'Destroy the Forms helper and release all resources.',                            mod: 'Forms' },
  'Forms.getAllForms':     { sig: 'Forms.getAllForms()',                                    desc: 'Return all currently cached/enhanced form instances.',                           mod: 'Forms' },
  'Forms.validateAll':    { sig: 'Forms.validateAll(rules)',                               desc: 'Run validation rules against all cached forms.',                                 mod: 'Forms' },
  'Forms.resetAll':       { sig: 'Forms.resetAll()',                                       desc: 'Reset all cached forms to their initial values.',                                mod: 'Forms' },
  'Forms.configure':      { sig: 'Forms.configure(options)',                               desc: 'Set global options for the Forms module.',                                       mod: 'Forms' },

  /* Form instance methods (on the object returned by Forms[id]) */
  'form.values':          { sig: 'form.values  (getter/setter)',                           desc: 'Get or set all field values of the form as a plain object.',                     mod: 'Forms' },
  'form.validate':        { sig: 'form.validate(rules)',                                   desc: 'Run HTML5 + custom validation rules; returns { valid, errors }.',               mod: 'Forms' },
  'form.clearValidation': { sig: 'form.clearValidation()',                                 desc: 'Remove all validation state and error messages from the form.',                  mod: 'Forms' },
  'form.getField':        { sig: 'form.getField(name)',                                    desc: 'Get a single field element by its name attribute.',                              mod: 'Forms' },
  'form.setField':        { sig: 'form.setField(name, value, options?)',                   desc: 'Set the value of a single field by name.',                                       mod: 'Forms' },
  'form.serialize':       { sig: "form.serialize(format = 'object')",                     desc: "Serialise form data. Formats: 'object' | 'json' | 'formdata' | 'urlencoded'.",  mod: 'Forms' },
  'form.submitData':      { sig: 'form.submitData(options?)',                              desc: 'Asynchronously submit form data with loading state management.',                 mod: 'Forms' },
  'form.reset':           { sig: 'form.reset(options?)',                                   desc: 'Reset the form to its initial values (enhanced reset).',                         mod: 'Forms' },

  /* ── Module 8 · Animation ───────────────────────────────────── */
  'Animation':            { sig: 'Animation.fadeIn(element, options?)',                    desc: 'CSS transition-based animation utilities for elements and collections.',         mod: 'Animation' },
  'Animation.fadeIn':     { sig: 'Animation.fadeIn(element, options?)',                    desc: 'Fade element in (opacity 0 → 1). Options: duration, delay, easing.',            mod: 'Animation' },
  'Animation.fadeOut':    { sig: 'Animation.fadeOut(element, options?)',                   desc: 'Fade element out (opacity 1 → 0). Options: duration, delay, easing.',           mod: 'Animation' },
  'Animation.slideUp':    { sig: 'Animation.slideUp(element, options?)',                   desc: 'Collapse element height with a slide-up animation.',                             mod: 'Animation' },
  'Animation.slideDown':  { sig: 'Animation.slideDown(element, options?)',                 desc: 'Expand element height with a slide-down animation.',                             mod: 'Animation' },
  'Animation.slideToggle':{ sig: 'Animation.slideToggle(element, options?)',               desc: 'Toggle between slideUp and slideDown based on current height.',                  mod: 'Animation' },
  'Animation.transform':  { sig: 'Animation.transform(element, transforms, options?)',     desc: 'Apply CSS transform animations: translate, rotate, scale, skew, etc.',          mod: 'Animation' },
  'Animation.chain':      { sig: 'Animation.chain(element)',                               desc: 'Create a fluent animation chain: .fadeIn().slideDown().delay(200).play().',     mod: 'Animation' },
  'Animation.enhance':    { sig: 'Animation.enhance(element)',                             desc: 'Add all animation methods directly onto an element as instance methods.',        mod: 'Animation' },
  'Animation.clearQueue': { sig: 'Animation.clearQueue(element)',                          desc: 'Cancel all queued animations on an element.',                                    mod: 'Animation' },
  'Animation.setDefaults':{ sig: 'Animation.setDefaults(config)',                          desc: 'Override default animation options: duration, easing, delay, etc.',             mod: 'Animation' },
  'Animation.getDefaults':{ sig: 'Animation.getDefaults()',                                desc: 'Get the current default animation options object.',                              mod: 'Animation' },
  'Animation.isSupported':{ sig: "Animation.isSupported(feature)",                         desc: "Check browser support for a feature: 'transitions' | 'transforms'.",            mod: 'Animation' },
  'Animation.easing':     { sig: 'Animation.easing',                                      desc: 'Object mapping easing names to CSS cubic-bezier values (e.g. Animation.easing.easeInOut).', mod: 'Animation' },

  /* ── Module 9 · Async ───────────────────────────────────────── */
  'AsyncHelpers':         { sig: 'AsyncHelpers.debounce(func, delay?, options?)',          desc: 'Async utilities: debounce, throttle, fetch wrappers, sleep, sanitize.',         mod: 'Async' },
  'AsyncHelpers.debounce':{ sig: 'AsyncHelpers.debounce(func, delay = 300, options?)',     desc: 'Return a debounced version of func. Has .cancel() and .flush().',               mod: 'Async' },
  'AsyncHelpers.throttle':{ sig: 'AsyncHelpers.throttle(func, delay = 200, options?)',     desc: 'Return a throttled version of func. Has .cancel() and .flush().',               mod: 'Async' },
  'AsyncHelpers.sanitize':{ sig: 'AsyncHelpers.sanitize(input, options?)',                 desc: 'XSS-safe HTML/string sanitizer — strips dangerous tags and attributes.',        mod: 'Async' },
  'AsyncHelpers.sleep':   { sig: 'AsyncHelpers.sleep(ms)',                                 desc: 'Promise-based delay. Use: await AsyncHelpers.sleep(1000).',                     mod: 'Async' },
  'AsyncHelpers.fetch':   { sig: 'AsyncHelpers.fetch(url, options?)',                      desc: 'Enhanced fetch with timeout, retry, and lifecycle hooks (beforeFetch, onSuccess, onError).', mod: 'Async' },
  'AsyncHelpers.fetchJSON':{ sig: 'AsyncHelpers.fetchJSON(url, options?)',                 desc: 'Fetch and automatically parse JSON response.',                                   mod: 'Async' },
  'AsyncHelpers.fetchText':{ sig: 'AsyncHelpers.fetchText(url, options?)',                 desc: 'Fetch and return a plain text response.',                                        mod: 'Async' },
  'AsyncHelpers.fetchBlob':{ sig: 'AsyncHelpers.fetchBlob(url, options?)',                 desc: 'Fetch and return a Blob response (for files, images, etc.).',                   mod: 'Async' },
  'AsyncHelpers.asyncHandler': { sig: 'AsyncHelpers.asyncHandler(handler, element?, options?)', desc: 'Wrap an async event listener — manages loading state and errors automatically.', mod: 'Async' },
  'AsyncHelpers.parallelAll':  { sig: 'AsyncHelpers.parallelAll(requests, options?)',      desc: 'Run multiple requests in parallel with combined progress tracking.',             mod: 'Async' },
  'AsyncHelpers.raceWithTimeout': { sig: 'AsyncHelpers.raceWithTimeout(promise, ms)',     desc: 'Reject a promise if it does not resolve within ms milliseconds.',                mod: 'Async' },
  'AsyncHelpers.configure':{ sig: 'AsyncHelpers.configure(options)',                       desc: 'Set global defaults for debounce delay, throttle delay, fetch timeout, and retries.', mod: 'Async' },
  'AsyncHelpers.defaults': { sig: 'AsyncHelpers.defaults',                                 desc: 'Object with default settings: debounceDelay, throttleDelay, fetchTimeout, fetchRetries.', mod: 'Async' },

  /* ── Module 10 · SPA / Router ───────────────────────────────── */
  'Router':               { sig: 'Router.define(routes).mount(outlet).start()',            desc: 'Client-side SPA router with hash and history mode.',                             mod: 'Router' },
  'Router.define':        { sig: 'Router.define(routeDefinitions)',                        desc: 'Define all routes. Each route: { path, view, title?, onEnter?, onLeave? }.',    mod: 'Router' },
  'Router.mount':         { sig: 'Router.mount(selectorOrElement)',                        desc: 'Set the DOM outlet element where route views are rendered.',                     mod: 'Router' },
  'Router.start':         { sig: "Router.start(options?)",                                 desc: "Start the router. Options: mode ('hash'|'history'), scrollToTop, base.",        mod: 'Router' },
  'Router.go':            { sig: 'Router.go(path)',                                        desc: 'Navigate programmatically to a path.',                                           mod: 'Router' },
  'Router.back':          { sig: 'Router.back()',                                          desc: 'Go back one step in browser history.',                                           mod: 'Router' },
  'Router.forward':       { sig: 'Router.forward()',                                       desc: 'Go forward one step in browser history.',                                        mod: 'Router' },
  'Router.current':       { sig: 'Router.current()',                                       desc: 'Get the current route: { path, params, query, title }.',                         mod: 'Router' },
  'Router.configure':     { sig: 'Router.configure(options)',                              desc: 'Change runtime router configuration after start().',                             mod: 'Router' },
  'Router.on':            { sig: "Router.on(event, handler)",                              desc: "Subscribe to router events: 'change', 'error', 'notfound'.",                    mod: 'Router' },
  'Router.off':           { sig: "Router.off(event, handler)",                             desc: 'Unsubscribe a previously registered router event handler.',                      mod: 'Router' },
  'Router.beforeEach':    { sig: 'Router.beforeEach(fn)',                                  desc: 'Register a navigation guard: fn(to, from, next) — call next() to proceed.',     mod: 'Router' },
  'Router.afterEach':     { sig: 'Router.afterEach(fn)',                                   desc: 'Register a post-navigation hook: fn(to, from).',                                 mod: 'Router' },
  'Router.clearOutlet':   { sig: 'Router.clearOutlet()',                                   desc: 'Manually clear the outlet element without navigating.',                          mod: 'Router' },
  'Router.transitions':   { sig: 'Router.transitions()',                                   desc: 'List available built-in view transition presets (fade, slide, etc.).',           mod: 'Router' },
  'Router.createLink':    { sig: 'Router.createLink(path, label, activeClass?, tag?)',     desc: 'Utility to programmatically create a router-aware link element.',               mod: 'Router' },
  'Router.setTitleResolver': { sig: 'Router.setTitleResolver(titleFn)',                    desc: 'Set a function to dynamically resolve document.title per route.',               mod: 'Router' },
};

/* Colour per module */
const DH_MOD_COLORS = {
  'Core':       '#58a6ff',
  'Enhancers':  '#79c0ff',
  'Conditions': '#d2a8ff',
  'Reactive':   '#3fb950',
  'Storage':    '#e3b341',
  'Native':     '#79c0ff',
  'Forms':      '#f78166',
  'Animation':  '#ffa657',
  'Async':      '#56d364',
  'Router':     '#ff7b72',
};

/* ══════════════════════════════════════════════════════════════
   TOOLTIP DOM
══════════════════════════════════════════════════════════════ */
let _tip = null;
let _hideTimer = null;

function _buildTip() {
  if (_tip) return;
  _tip = document.createElement('div');
  _tip.id = 'dhDocTip';
  document.body.appendChild(_tip);
}

function _showTip(entry, anchorRect) {
  _buildTip();
  clearTimeout(_hideTimer);

  const color = DH_MOD_COLORS[entry.mod] || '#58a6ff';

  _tip.innerHTML =
    `<div class="dh-tip-mod" style="color:${color}">${entry.mod}</div>` +
    `<div class="dh-tip-sig">${_esc(entry.sig)}</div>` +
    `<div class="dh-tip-desc">${_esc(entry.desc)}</div>`;

  _tip.style.display = 'block';

  // Position above the anchor; flip below if not enough room
  const tw = _tip.offsetWidth  || 340;
  const th = _tip.offsetHeight || 80;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top  = anchorRect.top - th - 8;
  let left = anchorRect.left;

  if (top < 8)              top  = anchorRect.bottom + 8;
  if (left + tw > vw - 8)  left = vw - tw - 8;
  if (left < 8)             left = 8;
  if (top + th > vh - 8)   top  = vh - th - 8;

  _tip.style.top  = top  + 'px';
  _tip.style.left = left + 'px';
}

function _hideTip(immediate) {
  if (!_tip) return;
  if (immediate) { _tip.style.display = 'none'; return; }
  clearTimeout(_hideTimer);
  _hideTimer = setTimeout(() => { if (_tip) _tip.style.display = 'none'; }, 150);
}

function _esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ══════════════════════════════════════════════════════════════
   WORD UNDER CURSOR
══════════════════════════════════════════════════════════════ */
function _wordAtPos(ta, pos) {
  const val = ta.value;
  // Expand left — allow dots for "ReactiveUtils.state", "$execute", etc.
  let l = pos;
  while (l > 0 && /[a-zA-Z0-9_$.]/.test(val[l - 1])) l--;
  // Expand right — word chars only, no dots to the right
  let r = pos;
  while (r < val.length && /[a-zA-Z0-9_$]/.test(val[r])) r++;
  const word = val.slice(l, r);
  return word || null;
}

/* ══════════════════════════════════════════════════════════════
   CARET-BASED LOOKUP (fires while typing / clicking)
══════════════════════════════════════════════════════════════ */
let _caretTimer = null;

function _checkCaret(ta) {
  clearTimeout(_caretTimer);
  _caretTimer = setTimeout(() => {
    if (!state.settings.dhDocs) { _hideTip(true); return; }

    const pos  = ta.selectionStart;
    const word = _wordAtPos(ta, pos);
    if (!word) { _hideTip(true); return; }

    const entry = DH_DOCS[word];
    if (!entry) { _hideTip(true); return; }

    // Position tip near caret
    const coords = getCaretCoords(ta);
    _showTip(entry, { top: coords.top, bottom: coords.bottom, left: coords.left });
  }, 400);
}

/* ══════════════════════════════════════════════════════════════
   WIRE
══════════════════════════════════════════════════════════════ */
function wireDhDocs() {
  _buildTip();

  ['left', 'right'].forEach(side => {
    const tabs = tabsFor(side);
    Object.values(tabs).forEach(({ ta }) => {
      if (!ta) return;

      // Show tip while typing (caret-based)
      ta.addEventListener('input', () => _checkCaret(ta));
      ta.addEventListener('keyup', () => _checkCaret(ta));
      ta.addEventListener('click', () => _checkCaret(ta));

      // Hide when focus leaves
      ta.addEventListener('blur', () => _hideTip(false));
    });
  });
}
