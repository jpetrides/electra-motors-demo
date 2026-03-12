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
    var SI = SalesforceInteractions;

    if (userData.email) {
      SI.sendEvent({
        user: { attributes: { email: userData.email, eventType: "contactPointEmail" } },
        interaction: { name: eventName, eventType: eventName, attributes },
      });
    }
    if (userData.phone) {
      SI.sendEvent({
        user: { attributes: { phoneNumber: userData.phone, eventType: "contactPointPhone" } },
      });
    }
    if (userData.firstName || userData.lastName) {
      SI.sendEvent({
        user: { attributes: { firstName: userData.firstName, lastName: userData.lastName, eventType: "identity", isAnonymous: "0" } },
      });
    }
  }

  return { track, identify };
})();
