/**
 * Elektra Chat — page-level widget loader.
 *
 * Injected into every HTML page by server.js. Responsible for:
 *   1. Rendering a floating "chat with advisor" button (FAB) in the
 *      bottom-right corner of the viewport.
 *   2. Rendering a slide-in side drawer (initially hidden) that hosts
 *      the React chat widget.
 *   3. Lazy-loading /js/elektra-chat.js + /css/elektra-chat.css the
 *      first time the user clicks the FAB. Pages where the user never
 *      opens chat pay ZERO cost beyond this tiny loader script.
 *   4. Calling window.ElektraChat.mount(drawerBody, { onClose }) once
 *      the bundle has loaded, and unmount on close.
 *
 * This file is a classic script (not a module). It must stay small and
 * have no build step — it ships as-is.
 */
(function () {
  // Opt-out hook for the /chat full-page route: we don't want a floating
  // button on a page whose entire job is being the chat already.
  if (window.__ELEKTRA_CHAT_SKIP_LOADER__) return;
  if (window.location.pathname.startsWith('/chat')) return;

  // Guard against double-init (defense in depth; the server only injects
  // the <script> tag once).
  if (window.__ELEKTRA_CHAT_LOADER_INITED__) return;
  window.__ELEKTRA_CHAT_LOADER_INITED__ = true;

  var BUNDLE_URL = '/js/elektra-chat.js';
  var CSS_URL = '/css/elektra-chat.css';
  var HOST_ID = 'elektra-chat-host';

  // ─── DOM scaffolding ──────────────────────────────────────────────────
  // Appended to <body> on first interaction. Contains:
  //   .elektra-chat-fab      — the floating circular button
  //   .elektra-chat-backdrop — dimmed overlay behind the drawer (mobile)
  //   .elektra-chat-drawer   — the sliding panel holding the widget
  //   .elektra-chat-mount    — the React root (window.ElektraChat.mount target)

  function injectStyles() {
    if (document.getElementById('elektra-chat-loader-styles')) return;
    // NOTE on pointer-events: the host <div> is position:fixed inset:0
    // (full viewport) but must NOT block clicks on the page behind it.
    // Each interactive child opts back in explicitly. Previous version
    // used a blanket `#elektra-chat-host *{pointer-events:auto}` which
    // leaked onto the closed backdrop and swallowed every click on the
    // page, including on the FAB itself (because the backdrop sits on
    // top of the FAB in stacking order).
    var css = [
      '#elektra-chat-host{position:fixed;inset:0;pointer-events:none;z-index:2147483000}',
      '.elektra-chat-fab{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;',
      '  background:linear-gradient(135deg,#00d1ff 0%,#0ea5e9 100%);border:none;cursor:pointer;',
      '  box-shadow:0 10px 30px -5px rgba(0,209,255,.45),0 6px 12px rgba(0,0,0,.25);',
      '  display:flex;align-items:center;justify-content:center;color:#0a0e13;',
      '  transition:transform .2s ease,box-shadow .2s ease;',
      '  z-index:2147483001;pointer-events:auto}',
      '.elektra-chat-fab:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 14px 36px -4px rgba(0,209,255,.6),0 8px 16px rgba(0,0,0,.3)}',
      '.elektra-chat-fab:active{transform:translateY(0) scale(1)}',
      '.elektra-chat-fab svg{width:26px;height:26px}',
      '.elektra-chat-fab[data-hidden="true"]{display:none}',
      // Backdrop: stays pointer-events:none unless explicitly opened.
      // On desktop the widget floats over the page so no dimming is used;
      // we keep a transparent backdrop purely to catch outside-clicks on mobile.
      '.elektra-chat-backdrop{position:fixed;inset:0;background:rgba(5,8,12,.55);',
      '  opacity:0;pointer-events:none;transition:opacity .25s ease;z-index:2147483002}',
      '.elektra-chat-backdrop[data-open="true"]{opacity:1;pointer-events:auto}',
      '@media (min-width:768px){.elektra-chat-backdrop{background:transparent}}',
      // Desktop: floating chat-widget anchored in bottom-right, rounded corners,
      // capped height so it feels like a popover rather than a full-height shelf.
      // Mobile (≤767px): falls back to a full-screen sheet.
      '.elektra-chat-drawer{position:fixed;right:24px;bottom:96px;width:400px;height:640px;max-height:calc(100vh - 120px);',
      '  background:#0a0e13;border:1px solid rgba(255,255,255,.08);border-radius:16px;',
      '  box-shadow:0 24px 60px rgba(0,0,0,.55),0 8px 20px rgba(0,0,0,.35);',
      '  transform:translateY(16px) scale(.98);opacity:0;pointer-events:none;',
      '  transform-origin:bottom right;transition:transform .25s cubic-bezier(.4,0,.2,1),opacity .2s ease;',
      '  z-index:2147483003;display:flex;flex-direction:column;overflow:hidden}',
      '.elektra-chat-drawer[data-open="true"]{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}',
      '.elektra-chat-mount{flex:1;min-height:0;display:flex;flex-direction:column}',
      '@media (max-width:767px){',
      '  .elektra-chat-drawer{right:0;bottom:0;top:0;left:0;width:auto;height:auto;max-height:none;border-radius:0;border:none}',
      '}',
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'elektra-chat-loader-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function makeHost() {
    if (document.getElementById(HOST_ID)) return document.getElementById(HOST_ID);
    var host = document.createElement('div');
    host.id = HOST_ID;
    host.innerHTML = [
      '<button class="elektra-chat-fab" type="button" aria-label="Chat with Elektra Advisor" title="Chat with Advisor">',
      '  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.48 3 2 7.02 2 11.96c0 2.39 1.05 4.56 2.75 6.13-.1 1.1-.54 2.58-1.49 3.69 0 0 2.89-.41 4.71-1.64.99.28 2.02.43 3.03.43 5.52 0 10-4.02 10-8.61S17.52 3 12 3z"/></svg>',
      '</button>',
      '<div class="elektra-chat-backdrop" aria-hidden="true"></div>',
      '<aside class="elektra-chat-drawer" role="dialog" aria-label="Elektra Advisor chat" aria-modal="false" data-open="false">',
      '  <div class="elektra-chat-mount"></div>',
      '</aside>',
    ].join('');
    document.body.appendChild(host);
    return host;
  }

  // ─── Lazy bundle loader ───────────────────────────────────────────────
  var bundleLoadingPromise = null;

  function loadBundleOnce() {
    if (window.ElektraChat) return Promise.resolve();
    if (bundleLoadingPromise) return bundleLoadingPromise;

    bundleLoadingPromise = new Promise(function (resolve, reject) {
      // CSS first (non-blocking)
      if (!document.querySelector('link[data-elektra-chat-css]')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = CSS_URL;
        link.setAttribute('data-elektra-chat-css', '1');
        document.head.appendChild(link);
      }

      // Then the JS bundle
      var script = document.createElement('script');
      script.src = BUNDLE_URL;
      script.async = true;
      script.onload = function () {
        if (window.ElektraChat) resolve();
        else reject(new Error('elektra-chat bundle loaded but window.ElektraChat is missing'));
      };
      script.onerror = function () { reject(new Error('Failed to load ' + BUNDLE_URL)); };
      document.head.appendChild(script);
    });

    return bundleLoadingPromise;
  }

  // ─── Open / close logic ───────────────────────────────────────────────
  var isOpen = false;
  var mountHandle = null;

  function open() {
    injectStyles();
    var host = makeHost();
    var drawer = host.querySelector('.elektra-chat-drawer');
    var backdrop = host.querySelector('.elektra-chat-backdrop');
    var fab = host.querySelector('.elektra-chat-fab');
    var mountEl = host.querySelector('.elektra-chat-mount');

    drawer.setAttribute('data-open', 'true');
    backdrop.setAttribute('data-open', 'true');
    fab.setAttribute('data-hidden', 'true');
    isOpen = true;

    loadBundleOnce()
      .then(function () {
        if (!isOpen) return; // user closed before bundle finished loading
        if (mountHandle) return; // already mounted
        mountHandle = window.ElektraChat.mount(mountEl, { onClose: close });
      })
      .catch(function (err) {
        console.error('[ElektraChat] Failed to load chat widget:', err);
        mountEl.innerHTML =
          '<div style="color:#f87171;padding:24px;font:14px system-ui">' +
          'Sorry, the chat couldn\'t load. Please try again in a moment.' +
          '</div>';
      });
  }

  function close() {
    var host = document.getElementById(HOST_ID);
    if (!host) return;
    var drawer = host.querySelector('.elektra-chat-drawer');
    var backdrop = host.querySelector('.elektra-chat-backdrop');
    var fab = host.querySelector('.elektra-chat-fab');
    drawer.setAttribute('data-open', 'false');
    backdrop.setAttribute('data-open', 'false');
    fab.setAttribute('data-hidden', 'false');
    isOpen = false;

    // We unmount on close so a subsequent open() starts a fresh conversation.
    // This matches the old /chat page-navigation behavior, so nothing here
    // is lost vs. the prior UX. Persistence is a follow-up.
    if (mountHandle) {
      mountHandle.unmount();
      mountHandle = null;
    }
  }

  // ─── Wire up the FAB ──────────────────────────────────────────────────
  // We inject the FAB eagerly (so the user sees it) but delay the React
  // bundle load until the first click.
  function bootstrap() {
    injectStyles();
    var host = makeHost();
    host.querySelector('.elektra-chat-fab').addEventListener('click', open);
    host.querySelector('.elektra-chat-backdrop').addEventListener('click', close);
    // Escape key closes the drawer (only when open)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) close();
    });
  }

  // ─── Public API on window for nav.js / other scripts ──────────────────
  // Lets the existing nav link open the drawer instead of navigating to /chat.
  window.ElektraChatLoader = {
    open: open,
    close: close,
    isOpen: function () { return isOpen; },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
