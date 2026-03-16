/**
 * Electra Motors — EM helper namespace
 *
 * The real Data Cloud Web SDK (c360a.min.js) is injected by the server and
 * handles init, consent, sitemap, page views, and form listeners automatically.
 * This file only provides EM.track / EM.identify as convenience wrappers for
 * any ad-hoc manual event calls from inline scripts.
 */

const EM = (() => {

  function _logAndDispatch(eventName, payload) {
    console.log('[EM] sendEvent:', eventName, payload);
    window.dispatchEvent(new CustomEvent('em:sdk:event', {
      detail: { eventName, payload, ts: new Date().toISOString() },
    }));
  }

  function track(eventName, attributes = {}) {
    if (typeof SalesforceInteractions === 'undefined') {
      console.log('[EM] stub track:', eventName, attributes);
      return;
    }
    _logAndDispatch(eventName, attributes);
    SalesforceInteractions.sendEvent({
      interaction: { name: eventName, eventType: eventName, ...attributes },
    });
  }

  function identify(userData, eventName = 'lead_submit', attributes = {}) {
    if (typeof SalesforceInteractions === 'undefined') {
      console.log('[EM] stub identify:', eventName, userData);
      return;
    }
    var SI = SalesforceInteractions;

    if (userData.email) {
      _logAndDispatch(eventName, { email: userData.email, eventType: 'contactPointEmail' });
      SI.sendEvent({
        interaction: { name: eventName },
        user: { attributes: { email: userData.email, eventType: "contactPointEmail" } },
      });
    }
    if (userData.phone) {
      _logAndDispatch(eventName, { phoneNumber: userData.phone, eventType: 'contactPointPhone' });
      SI.sendEvent({
        interaction: { name: eventName },
        user: { attributes: { phoneNumber: userData.phone, eventType: "contactPointPhone" } },
      });
    }
    if (userData.firstName || userData.lastName) {
      _logAndDispatch(eventName, { firstName: userData.firstName, lastName: userData.lastName, eventType: 'identity' });
      SI.sendEvent({
        interaction: { name: eventName },
        user: { attributes: { firstName: userData.firstName, lastName: userData.lastName, eventType: "identity", isAnonymous: "0" } },
      });
    }
  }

  return { track, identify };
})();
