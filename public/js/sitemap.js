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
    if (!SI || !SI.init) {
      if (++attempts < 50) return;
      console.warn('[Sitemap] SalesforceInteractions not available after 5s');
      clearInterval(poll);
      return;
    }
    clearInterval(poll);
    console.log('[Sitemap] SDK found after', attempts, 'attempts. Calling init()...');

    SI.init({
      consents: [{
        provider: "Electra Motors",
        purpose: SI.ConsentPurpose.Tracking,
        status: SI.ConsentStatus.OptIn,
      }],
    }).then(function() {
      console.log('[Sitemap] SDK initialized. Calling initSitemap...');

    {

      var listener = SI.listener;
      var cashDom = SI.cashDom;
      var sendEvent = function(payload) {
        var eventName = (payload.interaction && payload.interaction.name) || 'sendEvent';
        console.log('[Sitemap] sendEvent:', eventName, payload);
        window.dispatchEvent(new CustomEvent('em:sdk:event', {
          detail: { eventName: eventName, payload: payload, ts: new Date().toISOString() },
        }));
        return SI.sendEvent(payload);
      };
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
            interaction: { name: "pageView", eventType: "pageViewEvent" },
          },
          {
            name: "modelsOverview",
            isMatch: function () { return /^\/models\/?$/.test(window.location.pathname); },
            interaction: { name: "pageView", eventType: "pageViewEvent" },
          },
          {
            name: "vehicleDetailReaktive",
            isMatch: function () { return /^\/models\/electra-reaktive\/?$/.test(window.location.pathname); },
            interaction: {
              name: "vehicleView", eventType: "productView",
              catalogObject: { type: "Vehicle", id: "ELK-SUV-7", attributes: { name: "Electra Reaktive Touring", vehicleFamily: "SUV" } },
              attributes: { attributeVehicleSKU: "ELK-SUV-7", attributeVehicleModel: "Electra Reaktive Touring", attributeVehicleFamily: "SUV" },
            },
          },
          {
            name: "vehicleDetailMegavolt",
            isMatch: function () { return /^\/models\/electra-megavolt\/?$/.test(window.location.pathname); },
            interaction: {
              name: "vehicleView", eventType: "productView",
              catalogObject: { type: "Vehicle", id: "ELK-COUPE-GT", attributes: { name: "Electra Megavolt GT", vehicleFamily: "Sport Coupe" } },
              attributes: { attributeVehicleSKU: "ELK-COUPE-GT", attributeVehicleModel: "Electra Megavolt GT", attributeVehicleFamily: "Sport Coupe" },
            },
          },
          {
            name: "vehicleDetailHarmonic",
            isMatch: function () { return /^\/models\/electra-harmonic\/?$/.test(window.location.pathname); },
            interaction: {
              name: "vehicleView", eventType: "productView",
              catalogObject: { type: "Vehicle", id: "ELK-SEDAN-AWD", attributes: { name: "Electra Harmonic SE", vehicleFamily: "Sedan" } },
              attributes: { attributeVehicleSKU: "ELK-SEDAN-AWD", attributeVehicleModel: "Electra Harmonic SE", attributeVehicleFamily: "Sedan" },
            },
          },
          {
            name: "vehicleDetailBeam",
            isMatch: function () { return /^\/models\/electra-beam\/?$/.test(window.location.pathname); },
            interaction: {
              name: "vehicleView", eventType: "productView",
              catalogObject: { type: "Vehicle", id: "ELK-HATCH-PLUS", attributes: { name: "Electra Beam Plus", vehicleFamily: "Hatchback" } },
              attributes: { attributeVehicleSKU: "ELK-HATCH-PLUS", attributeVehicleModel: "Electra Beam Plus", attributeVehicleFamily: "Hatchback" },
            },
          },
          {
            name: "vehicleDetailIgnite",
            isMatch: function () { return /^\/models\/electra-ignite\/?$/.test(window.location.pathname); },
            interaction: {
              name: "vehicleView", eventType: "productView",
              catalogObject: { type: "Vehicle", id: "ELK-TRUCK-PLAT", attributes: { name: "Electra Ignite Platinum", vehicleFamily: "Truck" } },
              attributes: { attributeVehicleSKU: "ELK-TRUCK-PLAT", attributeVehicleModel: "Electra Ignite Platinum", attributeVehicleFamily: "Truck" },
            },
          },
          {
            name: "vehicleDetailRegulator",
            isMatch: function () { return /^\/models\/electra-regulator\/?$/.test(window.location.pathname); },
            interaction: {
              name: "vehicleView", eventType: "productView",
              catalogObject: { type: "Vehicle", id: "ELK-EV-PERF", attributes: { name: "Electra Regulator Performance", vehicleFamily: "Full EV" } },
              attributes: { attributeVehicleSKU: "ELK-EV-PERF", attributeVehicleModel: "Electra Regulator Performance", attributeVehicleFamily: "Full EV" },
            },
          },
          {
            name: "configurator",
            isMatch: function () { return /^\/configure\/?/.test(window.location.pathname); },
            interaction: { name: "pageView", eventType: "pageViewEvent" },
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
            interaction: { name: "pageView", eventType: "pageViewEvent" },
            listeners: [
              listener("submit", "#quote-form, .lead-form", function () {
                var email = (cashDom("#email").val() || "").trim();
                var firstName = (cashDom("#firstName").val() || "").trim();
                var lastName = (cashDom("#lastName").val() || "").trim();
                var phone = (cashDom("#phone").val() || "").trim();
                if (email) { sendEvent({ interaction: { name: "lead_submit", eventType: "contactPointEmail" }, user: { attributes: { email: email, eventType: "contactPointEmail" } } }); }
                if (phone) { sendEvent({ interaction: { name: "lead_submit", eventType: "contactPointPhone" }, user: { attributes: { phoneNumber: phone, eventType: "contactPointPhone" } } }); }
                if (firstName || lastName) { sendEvent({ interaction: { name: "lead_submit", eventType: "identity" }, user: { attributes: { firstName: firstName, lastName: lastName, eventType: "identity", isAnonymous: "0" } } }); }
              }),
            ],
          },
          {
            name: "testDriveForm",
            isMatch: function () { return /^\/test-drive\/?/.test(window.location.pathname); },
            interaction: { name: "pageView", eventType: "pageViewEvent" },
            listeners: [
              listener("submit", "#test-drive-form, .test-drive-form", function () {
                var email = (cashDom("#email, #td-email").val() || "").trim();
                var firstName = (cashDom("#firstName, #td-firstName").val() || "").trim();
                var lastName = (cashDom("#lastName, #td-lastName").val() || "").trim();
                var phone = (cashDom("#phone, #td-phone").val() || "").trim();
                if (email) { sendEvent({ interaction: { name: "test_drive_request", eventType: "contactPointEmail" }, user: { attributes: { email: email, eventType: "contactPointEmail" } } }); }
                if (phone) { sendEvent({ interaction: { name: "test_drive_request", eventType: "contactPointPhone" }, user: { attributes: { phoneNumber: phone, eventType: "contactPointPhone" } } }); }
                if (firstName || lastName) { sendEvent({ interaction: { name: "test_drive_request", eventType: "identity" }, user: { attributes: { firstName: firstName, lastName: lastName, eventType: "identity", isAnonymous: "0" } } }); }
              }),
            ],
          },
          {
            name: "thankYou",
            isMatch: function () { return /^\/thank-you\/?/.test(window.location.pathname); },
            interaction: { name: "pageView", eventType: "pageViewEvent" },
          },
        ],
      });
    }}); // close extra block, then callback
  }

  var poll = setInterval(setup, 100);
  setup();
})();
