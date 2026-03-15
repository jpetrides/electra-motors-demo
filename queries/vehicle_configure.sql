-- Event: vehicle_configure
-- Fires when a visitor selects a trim on the configurator page,
-- and again when they click "Build Mine — Get a Quote"
-- Table: Electra_Heroku_Behavioral_Event_E3F8DAD6__dll

SELECT
    "dateTime__c",
    "deviceId__c",
    "sessionId__c",
    "eventId__c",
    "vehicleConfigure_attributeVehicleModel__c",
    "vehicleConfigure_attributeVehicleSKU__c",
    "vehicleConfigure_attributeVehicleFamily__c",
    "vehicleConfigure_attributeTrim__c",
    "vehicleConfigure_attributeMsrp__c",
    "vehicleConfigure_attributeEstimatedMsrp__c",
    "vehicleConfigure_attributeColor__c",
    "vehicleConfigure_attributeAddons__c",
    "vehicleConfigure_attributeProductCode__c",
    "vehicleConfigure_sourceUrl__c",
    "vehicleConfigure_sourceChannel__c",
    "cdp_sys_DeviceType__c",
    "cdp_sys_BrowserName__c"
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'vehicle_configure'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
ORDER BY "dateTime__c" DESC
LIMIT 50;


-- Most configured trims
SELECT
    "vehicleConfigure_attributeVehicleModel__c",
    "vehicleConfigure_attributeTrim__c",
    COUNT(*) AS configure_count
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'vehicle_configure'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
  AND "vehicleConfigure_attributeVehicleModel__c" IS NOT NULL
GROUP BY "vehicleConfigure_attributeVehicleModel__c", "vehicleConfigure_attributeTrim__c"
ORDER BY configure_count DESC;
