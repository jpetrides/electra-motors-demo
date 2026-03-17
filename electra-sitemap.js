SalesforceInteractions.init({
  consents: [{
    provider: "Electra Motors",
    purpose: SalesforceInteractions.ConsentPurpose.Tracking,
    status: SalesforceInteractions.ConsentStatus.OptIn,
  }],
}).then(() => {

  const {
    listener,
    cashDom,
    resolvers,
    sendEvent,
    CatalogObjectInteractionName,
  } = SalesforceInteractions;

  const global = {
    locale: "en_US",
    onActionEvent: (actionEvent) => {
      return actionEvent;
    },
  };

  const pageTypeDefault = {
    name: "default",
  };

  const homePage = {
    name: "home",
    isMatch: () =>
      window.location.pathname === "/" ||
      window.location.pathname === "/index.html",
  };

  const modelsOverview = {
    name: "modelsOverview",
    isMatch: () => /^\/models\/?$/.test(window.location.pathname),
  };

  const vehicleDetailReaktive = {
    name: "vehicleDetailReaktive",
    isMatch: () => /^\/models\/electra-reaktive\/?$/.test(window.location.pathname),
    interaction: {
      name: CatalogObjectInteractionName.ViewCatalogObject,
      catalogObject: {
        type: "Vehicle",
        id: "ELK-SUV-7",
        attributes: {
          name: "Electra Reaktive Touring",
          vehicleFamily: "SUV",
        },
      },
    },
  };

  const vehicleDetailMegavolt = {
    name: "vehicleDetailMegavolt",
    isMatch: () => /^\/models\/electra-megavolt\/?$/.test(window.location.pathname),
    interaction: {
      name: CatalogObjectInteractionName.ViewCatalogObject,
      catalogObject: {
        type: "Vehicle",
        id: "ELK-COUPE-GT",
        attributes: {
          name: "Electra Megavolt GT",
          vehicleFamily: "Sport Coupe",
        },
      },
    },
  };

  const vehicleDetailHarmonic = {
    name: "vehicleDetailHarmonic",
    isMatch: () => /^\/models\/electra-harmonic\/?$/.test(window.location.pathname),
    interaction: {
      name: CatalogObjectInteractionName.ViewCatalogObject,
      catalogObject: {
        type: "Vehicle",
        id: "ELK-SEDAN-AWD",
        attributes: {
          name: "Electra Harmonic SE",
          vehicleFamily: "Sedan",
        },
      },
    },
  };

  const vehicleDetailBeam = {
    name: "vehicleDetailBeam",
    isMatch: () => /^\/models\/electra-beam\/?$/.test(window.location.pathname),
    interaction: {
      name: CatalogObjectInteractionName.ViewCatalogObject,
      catalogObject: {
        type: "Vehicle",
        id: "ELK-HATCH-PLUS",
        attributes: {
          name: "Electra Beam Plus",
          vehicleFamily: "Hatchback",
        },
      },
    },
  };

  const vehicleDetailIgnite = {
    name: "vehicleDetailIgnite",
    isMatch: () => /^\/models\/electra-ignite\/?$/.test(window.location.pathname),
    interaction: {
      name: CatalogObjectInteractionName.ViewCatalogObject,
      catalogObject: {
        type: "Vehicle",
        id: "ELK-TRUCK-PLAT",
        attributes: {
          name: "Electra Ignite Platinum",
          vehicleFamily: "Truck",
        },
      },
    },
  };

  const vehicleDetailRegulator = {
    name: "vehicleDetailRegulator",
    isMatch: () => /^\/models\/electra-regulator\/?$/.test(window.location.pathname),
    interaction: {
      name: CatalogObjectInteractionName.ViewCatalogObject,
      catalogObject: {
        type: "Vehicle",
        id: "ELK-EV-PERF",
        attributes: {
          name: "Electra Regulator Performance",
          vehicleFamily: "Full EV",
        },
      },
    },
  };

  const configuratorPage = {
    name: "configurator",
    isMatch: () => /^\/configure\/?/.test(window.location.pathname),
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
                vehicleModel: trimEl.options[trimEl.selectedIndex]
                  ? trimEl.options[trimEl.selectedIndex].text
                  : "",
                vehicleSKU: trimEl.value || "",
                trim: trimEl.options[trimEl.selectedIndex]
                  ? trimEl.options[trimEl.selectedIndex].text
                  : "",
                color: colorEl ? colorEl.getAttribute("data-color") : "",
              },
            },
          });
        }
      }),
    ],
  };

  const getAQuotePage = {
    name: "leadForm",
    isMatch: () => /^\/get-a-quote\/?/.test(window.location.pathname),
    listeners: [
      listener("submit", "#lead-form, #quote-form, .lead-form", () => {
        const email = (cashDom("#email").val() || "").trim();
        const firstName = (cashDom("#firstName").val() || "").trim();
        const lastName = (cashDom("#lastName").val() || "").trim();
        const phone = (cashDom("#phone").val() || "").trim();

        if (email) {
          sendEvent({
            user: {
              attributes: {
                email: email,
                eventType: "contactPointEmail",
              },
            },
          });
        }

        if (phone) {
          sendEvent({
            user: {
              attributes: {
                phoneNumber: phone,
                eventType: "contactPointPhone",
              },
            },
          });
        }

        if (firstName || lastName) {
          sendEvent({
            user: {
              attributes: {
                firstName: firstName,
                lastName: lastName,
                eventType: "identity",
                isAnonymous: "0",
              },
            },
          });
        }
      }),
    ],
  };

  const testDrivePage = {
    name: "testDriveForm",
    isMatch: () => /^\/test-drive\/?/.test(window.location.pathname),
    listeners: [
      listener("submit", "#test-drive-form, .test-drive-form", () => {
        const email = (cashDom("#email, #td-email").val() || "").trim();
        const firstName = (cashDom("#firstName, #td-firstName").val() || "").trim();
        const lastName = (cashDom("#lastName, #td-lastName").val() || "").trim();
        const phone = (cashDom("#phone, #td-phone").val() || "").trim();

        if (email) {
          sendEvent({
            user: {
              attributes: {
                email: email,
                eventType: "contactPointEmail",
              },
            },
          });
        }

        if (phone) {
          sendEvent({
            user: {
              attributes: {
                phoneNumber: phone,
                eventType: "contactPointPhone",
              },
            },
          });
        }

        if (firstName || lastName) {
          sendEvent({
            user: {
              attributes: {
                firstName: firstName,
                lastName: lastName,
                eventType: "identity",
                isAnonymous: "0",
              },
            },
          });
        }
      }),
    ],
  };

  const thankYouPage = {
    name: "thankYou",
    isMatch: () => /^\/thank-you\/?/.test(window.location.pathname),
  };

  SalesforceInteractions.initSitemap({
    global,
    pageTypeDefault,
    pageTypes: [
      homePage,
      modelsOverview,
      vehicleDetailReaktive,
      vehicleDetailMegavolt,
      vehicleDetailHarmonic,
      vehicleDetailBeam,
      vehicleDetailIgnite,
      vehicleDetailRegulator,
      configuratorPage,
      getAQuotePage,
      testDrivePage,
      thankYouPage,
    ],
  });
});
