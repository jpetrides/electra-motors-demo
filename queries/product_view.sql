-- Event: productView
-- Fires when a visitor lands on an individual model page
-- Table: Electra_Heroku_Behavioral_Event_E3F8DAD6__dll

SELECT
    "dateTime__c",
    "deviceId__c",
    "sessionId__c",
    "eventId__c",
    "productView_attributeVehicleModel__c",
    "productView_attributeVehicleSKU__c",
    "productView_attributeVehicleFamily__c",
    "productView_sourceUrl__c",
    "productView_sourcePageType__c",
    "productView_sourceChannel__c",
    "productView_sourceUrlReferrer__c",
    "cdp_sys_DeviceType__c",
    "cdp_sys_BrowserName__c",
    "cdp_sys_OSFamily__c"
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'productView'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
ORDER BY "dateTime__c" DESC
LIMIT 50;


-- Top viewed vehicles
SELECT
    "productView_attributeVehicleModel__c",
    "productView_attributeVehicleFamily__c",
    COUNT(*) AS view_count
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'productView'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
  AND "productView_attributeVehicleModel__c" IS NOT NULL
GROUP BY "productView_attributeVehicleModel__c", "productView_attributeVehicleFamily__c"
ORDER BY view_count DESC;
