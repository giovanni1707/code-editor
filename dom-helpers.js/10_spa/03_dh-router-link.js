/**
 * 03_dh-router-link.js
 *
 * DOM Helpers — Router Link Module
 * Declarative navigation via [data-route] attributes and automatic active-class management.
 *
 * ─── WHAT THIS MODULE ADDS ────────────────────────────────────────────────────
 *  · [data-route="/path"]              — click navigates to that path
 *  · [data-route-active-class="foo"]   — "foo" is added when the link is active
 *  · [data-route-exact]                — only mark active on exact path match
 *                                        (default is prefix matching for nested routes)
 *  · Router.refreshLinks()             — manually re-scan for new [data-route] elements
 *                                        (useful after dynamic content insertion)
 *  · Works on ANY element (div, button, li, a, span…)
 *  · Intercepts <a> tags to prevent default navigation
 *
 * ─── LOAD ORDER ────────────────────────────────────────────────────────────────
 *  <script src="01_dh-router.js"></script>      ← required
 *  <script src="03_dh-router-link.js"></script> ← this file
 *
 * ─── USAGE ─────────────────────────────────────────────────────────────────────
 *  <a data-route="/" data-route-active-class="active">Home</a>
 *  <button data-route="/about" data-route-active-class="is-active">About</button>
 *  <li data-route="/blog" data-route-active-class="selected" data-route-exact>Blog</li>
 *
 * @version 1.0.0
 * @license MIT
 */

(function (global) {
  'use strict';

  // ============================================================================
  // DEPENDENCY CHECK
  // ============================================================================

  if (!global.Router) {
    console.error(
      '[DOM Helpers Router Link] Router not found — ' +
      'load 01_dh-router.js before 03_dh-router-link.js'
    );
    return;
  }

  // ============================================================================
  // ACTIVE LINK UPDATER
  // ============================================================================

  /**
   * Update all [data-route] elements to reflect the currently active path.
   * Called by the router core after every navigation via Router._setLinkUpdater().
   *
   * Active logic:
   *  - If the element has [data-route-exact], the path must match exactly.
   *  - Otherwise, path must start with the route value (prefix match).
   *    This means a link for '/' only becomes active when the path IS '/',
   *    but a link for '/blog' is active for '/blog', '/blog/post-1', etc.
   *  - '/' is always treated as exact to avoid matching everything.
   *
   * @param {string} activePath
   */
  function updateLinks(activePath) {
    const links = document.querySelectorAll('[data-route]');

    links.forEach(function (el) {
      const route      = el.getAttribute('data-route');
      const activeClass = el.getAttribute('data-route-active-class');
      const exact      = el.hasAttribute('data-route-exact') || route === '/';

      if (!activeClass) return; // no active class configured — skip

      const isActive = exact
        ? activePath === route
        : activePath === route || activePath.startsWith(route + '/');

      if (isActive) {
        el.classList.add(activeClass);
        el.setAttribute('aria-current', 'page');
      } else {
        el.classList.remove(activeClass);
        el.removeAttribute('aria-current');
      }
    });
  }

  // Register our updater with the core router
  Router._setLinkUpdater(updateLinks);

  // ============================================================================
  // CLICK HANDLER
  // Uses event delegation on document — works for dynamically added elements.
  // ============================================================================

  /**
   * Delegated click handler for [data-route] elements.
   * Prevents default <a> navigation and calls Router.go().
   *
   * @param {MouseEvent} e
   */
  function onDocumentClick(e) {
    // Walk up the DOM tree to find the closest [data-route] element.
    // This handles clicks on child elements (e.g. <a data-route="/x"><span>text</span></a>).
    let target = e.target;

    while (target && target !== document.body) {
      if (target.hasAttribute && target.hasAttribute('data-route')) {
        break;
      }
      target = target.parentElement;
    }

    if (!target || !target.hasAttribute('data-route')) return;

    // Ignore modified clicks (open in new tab, etc.)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

    const path = target.getAttribute('data-route');
    if (!path) return;

    // Prevent default <a> navigation
    e.preventDefault();

    Router.go(path);
  }

  document.addEventListener('click', onDocumentClick);

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Re-scan the document for [data-route] elements and refresh active states.
   * Use this after dynamically inserting new link elements into the DOM.
   *
   * @returns {Router}
   */
  Router.refreshLinks = function () {
    const current = Router.current();
    if (current) updateLinks(current.path);
    return this;
  };

  /**
   * Programmatically create a router link element.
   *
   * @param {string} path             — the route path
   * @param {string} [label]          — inner text
   * @param {string} [activeClass]    — active CSS class
   * @param {string} [tag='a']        — element tag to create
   * @returns {HTMLElement}
   *
   * @example
   *   const link = Router.createLink('/about', 'About', 'active');
   *   document.querySelector('nav').appendChild(link);
   */
  Router.createLink = function (path, label, activeClass, tag) {
    const el = document.createElement(tag || 'a');
    el.setAttribute('data-route', path);
    if (label)      el.textContent = label;
    if (activeClass) el.setAttribute('data-route-active-class', activeClass);
    return el;
  };

})(typeof window !== 'undefined' ? window : this);
