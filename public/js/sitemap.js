/**
 * Electra Motors — Data Cloud Sitemap
 *
 * The CDN c360a.min.js already initializes the SDK. This file:
 *   1. Sets consent via updateConsents() (NOT init())
 *   2. Registers page types with eventType on every interaction
 *   3. Attaches form listeners for identity events (with interaction for interactionName)
 */
(function () {
  var attempts = 0;

  function setup() {
    var SI = window.SalesforceInteractions;
    if (!SI || !SI.initSitemap) {
      if (++attempts < 50) return;
      clearInterval(poll);
      return;
    }
    clearInterval(poll);

    SI.setLoggingLevel('DEBUG');
    console.log('[Sitemap] SDK ready. Setting consent and initializing sitemap...');

    SI.updateConsents([{
      provider: "Electra Motors",
      purpose: SI.ConsentPurpose.Tracking,
      status: SI.ConsentStatus.OptIn,
    }]);

    const {
      listener,
      cashDom,
      sendEvent,
      CatalogObjectInteractionName,
    } = SI;

    SI.initSitemap({
      global: {
        locale: "en_US",
        onActionEvent: (actionEvent) => actionEvent,
      },
      pageTypeDefault: { name: "default" },
      pageTypes: [
        {
          name: "home",
          isMatch: () => window.location.pathname === "/" || window.location.pathname === "/index.html",
          interaction: { name: "pageView", eventType: "pageView" },
        },
        {
          name: "modelsOverview",
          isMatch: () => /^\/models\/?$/.test(window.location.pathname),
          interaction: { name: "pageView", eventType: "pageView" },
        },
        {
          name: "vehicleDetailReaktive",
          isMatch: () => /^\/models\/electra-reaktive\/?$/.test(window.location.pathname),
          interaction: {
            name: "vehicleView", eventType: "vehicleView",
            catalogObject: { type: "Vehicle", id: "ELK-SUV-7", attributes: { name: "Electra Reaktive Touring", vehicleFamily: "SUV" } },
          },
        },
        {
          name: "vehicleDetailMegavolt",
          isMatch: () => /^\/models\/electra-megavolt\/?$/.test(window.location.pathname),
          interaction: {
            name: "vehicleView", eventType: "vehicleView",
            catalogObject: { type: "Vehicle", id: "ELK-COUPE-GT", attributes: { name: "Electra Megavolt GT", vehicleFamily: "Sport Coupe" } },
          },
        },
        {
          name: "vehicleDetailHarmonic",
          isMatch: () => /^\/models\/electra-harmonic\/?$/.test(window.location.pathname),
          interaction: {
            name: "vehicleView", eventType: "vehicleView",
            catalogObject: { type: "Vehicle", id: "ELK-SEDAN-AWD", attributes: { name: "Electra Harmonic SE", vehicleFamily: "Sedan" } },
          },
        },
        {
          name: "vehicleDetailBeam",
          isMatch: () => /^\/models\/electra-beam\/?$/.test(window.location.pathname),
          interaction: {
            name: "vehicleView", eventType: "vehicleView",
            catalogObject: { type: "Vehicle", id: "ELK-HATCH-PLUS", attributes: { name: "Electra Beam Plus", vehicleFamily: "Hatchback" } },
          },
        },
        {
          name: "vehicleDetailIgnite",
          isMatch: () => /^\/models\/electra-ignite\/?$/.test(window.location.pathname),
          interaction: {
            name: "vehicleView", eventType: "vehicleView",
            catalogObject: { type: "Vehicle", id: "ELK-TRUCK-PLAT", attributes: { name: "Electra Ignite Platinum", vehicleFamily: "Truck" } },
          },
        },
        {
          name: "vehicleDetailRegulator",
          isMatch: () => /^\/models\/electra-regulator\/?$/.test(window.location.pathname),
          interaction: {
            name: "vehicleView", eventType: "vehicleView",
            catalogObject: { type: "Vehicle", id: "ELK-EV-PERF", attributes: { name: "Electra Regulator Performance", vehicleFamily: "Full EV" } },
          },
        },
        {
          name: "configurator",
          isMatch: () => /^\/configure\/?/.test(window.location.pathname),
          interaction: { name: "pageView", eventType: "pageView" },
          listeners: [
            listener("change", "#trim-select, .color-swatch, .addon-checkbox", () => {
              const trimEl = document.getElementById("trim-select");
              const colorEl = document.querySelector(".color-swatch.active");
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
          isMatch: () => /^\/get-a-quote\/?/.test(window.location.pathname),
          interaction: { name: "pageView", eventType: "pageView" },
          listeners: [
            listener("submit", "#quote-form, .lead-form", () => {
              const email = (cashDom("#email").val() || "").trim();
              const firstName = (cashDom("#firstName").val() || "").trim();
              const lastName = (cashDom("#lastName").val() || "").trim();
              const phone = (cashDom("#phone").val() || "").trim();

              if (email) {
                sendEvent({
                  interaction: { name: "lead_submit", eventType: "contactPointEmail" },
                  user: { attributes: { email: email, eventType: "contactPointEmail" } },
                });
              }
              if (phone) {
                sendEvent({
                  interaction: { name: "lead_submit", eventType: "contactPointPhone" },
                  user: { attributes: { phoneNumber: phone, eventType: "contactPointPhone" } },
                });
              }
              if (firstName || lastName) {
                sendEvent({
                  interaction: { name: "lead_submit", eventType: "identity" },
                  user: { attributes: { firstName: firstName, lastName: lastName, eventType: "identity", isAnonymous: "0" } },
                });
              }
            }),
          ],
        },
        {
          name: "testDriveForm",
          isMatch: () => /^\/test-drive\/?/.test(window.location.pathname),
          interaction: { name: "pageView", eventType: "pageView" },
          listeners: [
            listener("submit", "#test-drive-form, .test-drive-form", () => {
              const email = (cashDom("#email, #td-email").val() || "").trim();
              const firstName = (cashDom("#firstName, #td-firstName").val() || "").trim();
              const lastName = (cashDom("#lastName, #td-lastName").val() || "").trim();
              const phone = (cashDom("#phone, #td-phone").val() || "").trim();

              if (email) {
                sendEvent({
                  interaction: { name: "test_drive_request", eventType: "contactPointEmail" },
                  user: { attributes: { email: email, eventType: "contactPointEmail" } },
                });
              }
              if (phone) {
                sendEvent({
                  interaction: { name: "test_drive_request", eventType: "contactPointPhone" },
                  user: { attributes: { phoneNumber: phone, eventType: "contactPointPhone" } },
                });
              }
              if (firstName || lastName) {
                sendEvent({
                  interaction: { name: "test_drive_request", eventType: "identity" },
                  user: { attributes: { firstName: firstName, lastName: lastName, eventType: "identity", isAnonymous: "0" } },
                });
              }
            }),
          ],
        },
        {
          name: "thankYou",
          isMatch: () => /^\/thank-you\/?/.test(window.location.pathname),
          interaction: { name: "pageView", eventType: "pageView" },
        },
      ],
    });
  }

  var poll = setInterval(setup, 100);
  setup();
})();
