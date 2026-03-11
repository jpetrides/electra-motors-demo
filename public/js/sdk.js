/**
 * Elektra Motors — Data Cloud Web SDK wrapper
 *
 * Reads bundle ID from <meta name="dc-bundle-id"> injected by the server.
 * Initializes SalesforceInteractions and exposes EM.track / EM.identify helpers.
 */

const EM = (() => {
  const meta = document.querySelector('meta[name="dc-bundle-id"]');
  const BUNDLE_ID = meta ? meta.content : '__YOUR_BUNDLE_ID__';

  let initialized = false;

  function init() {
    if (typeof SalesforceInteractions === 'undefined') {
      console.warn('[EM SDK] SalesforceInteractions not loaded — running in stub mode');
      return;
    }
    if (initialized) return;

    SalesforceInteractions.init({
      consents: [{
        provider: 'Elektra Motors',
        purpose:  'Tracking',
        status:   'OptIn',
      }],
    });

    initialized = true;
    console.log('[EM SDK] Initialized. Bundle ID:', BUNDLE_ID);
  }

  /**
   * Fire a standard interaction event.
   * Automatically dispatches to the debug panel if active.
   */
  function track(eventName, attributes = {}) {
    const payload = {
      interaction: {
        name:       eventName,
        eventType:  eventName,
        attributes: attributes,
      },
    };

    _debugLog(eventName, attributes);

    if (typeof SalesforceInteractions === 'undefined') {
      console.log('[EM SDK stub] track:', eventName, attributes);
      return;
    }

    try {
      SalesforceInteractions.sendEvent(payload);
    } catch (e) {
      console.error('[EM SDK] sendEvent error:', e);
    }
  }

  /**
   * Fire a Data Cloud Identity event.
   * This is the key event for identity resolution — ties anonymous visitor to a known contact.
   */
  function identify(userData, eventName = 'lead_submit', attributes = {}) {
    const payload = {
      user: {
        attributes: userData,
      },
      interaction: {
        name:       eventName,
        eventType:  eventName,
        attributes: attributes,
      },
    };

    _debugLog('IDENTITY: ' + eventName, { user: userData, ...attributes });

    if (typeof SalesforceInteractions === 'undefined') {
      console.log('[EM SDK stub] identify:', eventName, userData, attributes);
      return;
    }

    try {
      SalesforceInteractions.Identity.sendEvent(payload);
    } catch (e) {
      console.error('[EM SDK] Identity.sendEvent error:', e);
    }
  }

  // ─── Internal debug log dispatcher ───────────────────────────────────────
  function _debugLog(eventName, payload) {
    const event = new CustomEvent('em:sdk:event', {
      detail: { eventName, payload, ts: new Date().toISOString() },
    });
    window.dispatchEvent(event);
  }

  // ─── Auto page_view on every load ────────────────────────────────────────
  function _firePageView() {
    track('page_view', {
      pageUrl:   window.location.href,
      pageTitle: document.title,
      referrer:  document.referrer || '',
    });
  }

  // ─── Init on DOM ready ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    init();
    _firePageView();
  });

  return { init, track, identify };
})();
