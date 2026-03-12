/**
 * Electra Motors — EM helper namespace
 *
 * The real Data Cloud Web SDK (c360a.min.js) is injected by the server and
 * handles init, consent, sitemap, page views, and form listeners automatically.
 * This file only provides EM.track / EM.identify as convenience wrappers for
 * any ad-hoc manual event calls from inline scripts.
 */

const EM = (() => {

  function track(eventName, attributes = {}) {
    if (typeof SalesforceInteractions === 'undefined') {
      console.log('[EM] stub track:', eventName, attributes);
      return;
    }
    SalesforceInteractions.sendEvent({
      interaction: { name: eventName, eventType: eventName, attributes },
    });
  }

  function identify(userData, eventName = 'lead_submit', attributes = {}) {
    if (typeof SalesforceInteractions === 'undefined') {
      console.log('[EM] stub identify:', eventName, userData);
      return;
    }
    SalesforceInteractions.sendEvent({
      user: { attributes: userData },
      interaction: { name: eventName, eventType: eventName, attributes },
    });
  }

  return { track, identify };
})();
