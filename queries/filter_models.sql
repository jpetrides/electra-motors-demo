-- Event: filterModels
-- Fires when a visitor uses the filter on the models listing page
-- Table: Electra_Heroku_Behavioral_Event_E3F8DAD6__dll

SELECT
    "dateTime__c",
    "deviceId__c",
    "sessionId__c",
    "eventId__c",
    "filterModels_attributeFilter__c",
    "filterModels_sourceUrl__c",
    "filterModels_sourcePageType__c",
    "filterModels_sourceChannel__c",
    "filterModels_sourceLocale__c",
    "filterModels_sourceUrlReferrer__c",
    "cdp_sys_DeviceType__c",
    "cdp_sys_BrowserName__c"
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'filterModels'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
ORDER BY "dateTime__c" DESC
LIMIT 50;


-- Most used filters
SELECT
    "filterModels_attributeFilter__c",
    COUNT(*) AS filter_count
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'filterModels'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
  AND "filterModels_attributeFilter__c" IS NOT NULL
GROUP BY "filterModels_attributeFilter__c"
ORDER BY filter_count DESC;
