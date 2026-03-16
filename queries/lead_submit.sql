-- Event: leadSubmit
-- Fires when a visitor submits the Get a Quote form
-- Table: Electra_Heroku_Behavioral_Event_E3F8DAD6__dll

SELECT
    "dateTime__c",
    "deviceId__c",
    "sessionId__c",
    "eventId__c",
    "leadSubmit_attributeVehicleModel__c",
    "leadSubmit_attributeSkuCode__c",
    "leadSubmit_attributeTrim__c",
    "leadSubmit_attributePreferredColor__c",
    "leadSubmit_attributePreferredDealer__c",
    "leadSubmit_attributePageUrl__c",
    "leadSubmit_sourceUrl__c",
    "leadSubmit_sourceChannel__c",
    "leadSubmit_sourceUrlReferrer__c",
    "cdp_sys_DeviceType__c",
    "cdp_sys_BrowserName__c"
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'leadSubmit'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
ORDER BY "dateTime__c" DESC
LIMIT 50;


-- Leads by vehicle model
SELECT
    "leadSubmit_attributeVehicleModel__c",
    "leadSubmit_attributeTrim__c",
    COUNT(*) AS lead_count
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'leadSubmit'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
  AND "leadSubmit_attributeVehicleModel__c" IS NOT NULL
GROUP BY "leadSubmit_attributeVehicleModel__c", "leadSubmit_attributeTrim__c"
ORDER BY lead_count DESC;
