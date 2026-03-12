/**
 * Electra Motors — Data Cloud Web SDK Sitemap
 *
 * Loaded after the SDK <script> tag. Defines page-type matching rules so the
 * SDK can automatically classify pages and fire structured page-view events.
 *
 * Custom interaction events (vehicle_configure, lead_submit, etc.) are still
 * fired manually via EM.track() / EM.identify() in each page's inline JS.
 */

(function () {
  if (typeof SalesforceInteractions === 'undefined') {
    console.warn('[EM Sitemap] SalesforceInteractions not loaded — skipping sitemap init');
    return;
  }

  const { listener, CatalogObjectInteractionName, resolvers } = SalesforceInteractions;

  const global = {
    locale: 'en_US',
    onActionEvent: (actionEvent) => {
      return actionEvent;
    },
  };

  const pageTypeDefault = {
    name: 'default',
  };

  const homePage = {
    name: 'home',
    isMatch: () => window.location.pathname === '/' || window.location.pathname === '/index.html',
  };

  const modelsOverview = {
    name: 'models_overview',
    isMatch: () => /^\/models\/?$/.test(window.location.pathname),
  };

  const vehicleDetail = {
    name: 'vehicle_detail',
    isMatch: () => /^\/models\/electra-[a-z]+\/?$/.test(window.location.pathname),
    interaction: {
      name: CatalogObjectInteractionName.ViewCatalogObject,
      catalogObject: {
        type: 'Vehicle',
        id: resolvers.fromSelector('.vehicle-detail-page [data-vehicle-sku]', (el) => {
          return el ? el.getAttribute('data-vehicle-sku') : undefined;
        }),
      },
    },
  };

  const configurator = {
    name: 'configurator',
    isMatch: () => /^\/configure\/?/.test(window.location.pathname),
  };

  const getAQuote = {
    name: 'lead_form',
    isMatch: () => /^\/get-a-quote\/?/.test(window.location.pathname),
  };

  const testDrive = {
    name: 'test_drive_form',
    isMatch: () => /^\/test-drive\/?/.test(window.location.pathname),
  };

  const thankYou = {
    name: 'thank_you',
    isMatch: () => /^\/thank-you\/?/.test(window.location.pathname),
  };

  SalesforceInteractions.initSitemap({
    global,
    pageTypeDefault,
    pageTypes: [
      homePage,
      modelsOverview,
      vehicleDetail,
      configurator,
      getAQuote,
      testDrive,
      thankYou,
    ],
  });

  console.log('[EM Sitemap] Sitemap initialized');
})();
