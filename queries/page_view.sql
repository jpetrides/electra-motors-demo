-- Event: pageViewEvent
-- Fires on every page load via the sitemap
-- Table: Electra_Heroku_Behavioral_Event_E3F8DAD6__dll

SELECT
    "dateTime__c",
    "deviceId__c",
    "sessionId__c",
    "eventId__c",
    "pageViewEvent_attributePageUrl__c",
    "pageViewEvent_attributePageTitle__c",
    "pageViewEvent_attributeReferrer__c",
    "pageViewEvent_sourcePageType__c",
    "pageViewEvent_sourceChannel__c",
    "pageViewEvent_sourceLocale__c",
    "pageViewEvent_sourceUrlReferrer__c",
    "cdp_sys_DeviceType__c",
    "cdp_sys_BrowserName__c",
    "cdp_sys_OSFamily__c"
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'pageViewEvent'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
ORDER BY "dateTime__c" DESC
LIMIT 50;


-- Page views by page type
SELECT
    "pageViewEvent_sourcePageType__c",
    COUNT(*) AS view_count
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'pageViewEvent'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
GROUP BY "pageViewEvent_sourcePageType__c"
ORDER BY view_count DESC;
