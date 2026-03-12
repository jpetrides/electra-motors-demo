/**
 * Electra Motors — Data Cloud Sitemap
 *
 * The CDN c360a.min.js already handles SDK init. This file only calls
 * initSitemap() to register page types and event listeners.
 * Wrapped in an interval to wait for SalesforceInteractions to be ready.
 */
(function () {
  var attempts = 0;

  function setup() {
    var SI = window.SalesforceInteractions;
    if (!SI || !SI.initSitemap) {
      if (++attempts < 50) return;
      console.warn('[Sitemap] SalesforceInteractions not available after 5s');
      clearInterval(poll);
      return;
    }
    clearInterval(poll);
    console.log('[Sitemap] SDK found after', attempts, 'attempts. Skipping init (CDN handles it). Setting consent...');

    SI.setLoggingLevel('DEBUG');

    SI.updateConsents([{
      provider: "Electra Motors",
      purpose: SI.ConsentPurpose.Tracking,
      status: SI.ConsentStatus.OptIn,
    }]);

    console.log('[Sitemap] updateConsents() called. Opt-in:', SI.currentConsentOptInExists());
    console.log('[Sitemap] Calling initSitemap...');

    {

      var listener = SI.listener;
      var cashDom = SI.cashDom;
      var sendEvent = SI.sendEvent;
      var CatalogObjectInteractionName = SI.CatalogObjectInteractionName;

      SI.initSitemap({
        global: {
          locale: "en_US",
          onActionEvent: function (actionEvent) { return actionEvent; },
        },
        pageTypeDefault: { name: "default" },
        pageTypes: [
          {
            name: "home",
            isMatch: function () {
              return window.location.pathname === "/" || window.location.pathname === "/index.html";
            },
          },
          {
            name: "modelsOverview",
            isMatch: function () { return /^\/models\/?$/.test(window.location.pathname); },
          },
          {
            name: "vehicleDetailReaktive",
            isMatch: function () { return /^\/models\/electra-reaktive\/?$/.test(window.location.pathname); },
            interaction: {
              name: CatalogObjectInteractionName.ViewCatalogObject,
              catalogObject: { type: "Vehicle", id: "ELK-SUV-7", attributes: { name: "Electra Reaktive Touring", vehicleFamily: "SUV" } },
            },
          },
          {
            name: "vehicleDetailMegavolt",
            isMatch: function () { return /^\/models\/electra-megavolt\/?$/.test(window.location.pathname); },
            interaction: {
              name: CatalogObjectInteractionName.ViewCatalogObject,
              catalogObject: { type: "Vehicle", id: "ELK-COUPE-GT", attributes: { name: "Electra Megavolt GT", vehicleFamily: "Sport Coupe" } },
            },
          },
          {
            name: "vehicleDetailHarmonic",
            isMatch: function () { return /^\/models\/electra-harmonic\/?$/.test(window.location.pathname); },
            interaction: {
              name: CatalogObjectInteractionName.ViewCatalogObject,
              catalogObject: { type: "Vehicle", id: "ELK-SEDAN-AWD", attributes: { name: "Electra Harmonic SE", vehicleFamily: "Sedan" } },
            },
          },
          {
            name: "vehicleDetailBeam",
            isMatch: function () { return /^\/models\/electra-beam\/?$/.test(window.location.pathname); },
            interaction: {
              name: CatalogObjectInteractionName.ViewCatalogObject,
              catalogObject: { type: "Vehicle", id: "ELK-HATCH-PLUS", attributes: { name: "Electra Beam Plus", vehicleFamily: "Hatchback" } },
            },
          },
          {
            name: "vehicleDetailIgnite",
            isMatch: function () { return /^\/models\/electra-ignite\/?$/.test(window.location.pathname); },
            interaction: {
              name: CatalogObjectInteractionName.ViewCatalogObject,
              catalogObject: { type: "Vehicle", id: "ELK-TRUCK-PLAT", attributes: { name: "Electra Ignite Platinum", vehicleFamily: "Truck" } },
            },
          },
          {
            name: "vehicleDetailRegulator",
            isMatch: function () { return /^\/models\/electra-regulator\/?$/.test(window.location.pathname); },
            interaction: {
              name: CatalogObjectInteractionName.ViewCatalogObject,
              catalogObject: { type: "Vehicle", id: "ELK-EV-PERF", attributes: { name: "Electra Regulator Performance", vehicleFamily: "Full EV" } },
            },
          },
          {
            name: "configurator",
            isMatch: function () { return /^\/configure\/?/.test(window.location.pathname); },
            listeners: [
              listener("change", "#trim-select, .color-swatch, .addon-checkbox", function () {
                var trimEl = document.getElementById("trim-select");
                var colorEl = document.querySelector(".color-swatch.active");
                if (trimEl) {
                  sendEvent({
                    interaction: {
                      name: "vehicleConfigure",
                      eventType: "vehicleConfigure",
                      attributes: {
                        vehicleModel: trimEl.options[trimEl.selectedIndex] ? trimEl.options[trimEl.selectedIndex].text : "",
                        vehicleSKU: trimEl.value || "",
                        trim: trimEl.options[trimEl.selectedIndex] ? trimEl.options[trimEl.selectedIndex].text : "",
                        color: colorEl ? colorEl.getAttribute("data-color") : "",
                      },
                    },
                  });
                }
              }),
            ],
          },
          {
            name: "leadForm",
            isMatch: function () { return /^\/get-a-quote\/?/.test(window.location.pathname); },
            listeners: [
              listener("submit", "#quote-form, .lead-form", function () {
                var email = (cashDom("#email").val() || "").trim();
                var firstName = (cashDom("#firstName").val() || "").trim();
                var lastName = (cashDom("#lastName").val() || "").trim();
                var phone = (cashDom("#phone").val() || "").trim();
                if (email) { sendEvent({ user: { attributes: { email: email, eventType: "contactPointEmail" } } }); }
                if (phone) { sendEvent({ user: { attributes: { phoneNumber: phone, eventType: "contactPointPhone" } } }); }
                if (firstName || lastName) { sendEvent({ user: { attributes: { firstName: firstName, lastName: lastName, eventType: "identity", isAnonymous: "0" } } }); }
              }),
            ],
          },
          {
            name: "testDriveForm",
            isMatch: function () { return /^\/test-drive\/?/.test(window.location.pathname); },
            listeners: [
              listener("submit", "#test-drive-form, .test-drive-form", function () {
                var email = (cashDom("#email, #td-email").val() || "").trim();
                var firstName = (cashDom("#firstName, #td-firstName").val() || "").trim();
                var lastName = (cashDom("#lastName, #td-lastName").val() || "").trim();
                var phone = (cashDom("#phone, #td-phone").val() || "").trim();
                if (email) { sendEvent({ user: { attributes: { email: email, eventType: "contactPointEmail" } } }); }
                if (phone) { sendEvent({ user: { attributes: { phoneNumber: phone, eventType: "contactPointPhone" } } }); }
                if (firstName || lastName) { sendEvent({ user: { attributes: { firstName: firstName, lastName: lastName, eventType: "identity", isAnonymous: "0" } } }); }
              }),
            ],
          },
          {
            name: "thankYou",
            isMatch: function () { return /^\/thank-you\/?/.test(window.location.pathname); },
          },
        ],
      });

    }
  }

  var poll = setInterval(setup, 100);
  setup();
})();
