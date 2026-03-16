-- Event: testDriveRequest
-- Fires when a visitor submits the test drive booking form
-- Table: Electra_Heroku_Behavioral_Event_E3F8DAD6__dll
-- Note: two preferredDate columns exist — use attributePreferredDate__c (full name)

SELECT
    "dateTime__c",
    "deviceId__c",
    "sessionId__c",
    "eventId__c",
    "testDriveRequest_attributeVehicleModel__c",
    "testDriveRequest_attributeSkuCode__c",
    "testDriveRequest_attributePreferredDate__c",
    "testDriveRequest_sourceUrl__c",
    "testDriveRequest_sourcePageType__c",
    "testDriveRequest_sourceChannel__c",
    "testDriveRequest_sourceUrlReferrer__c",
    "cdp_sys_DeviceType__c",
    "cdp_sys_BrowserName__c"
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'testDriveRequest'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
ORDER BY "dateTime__c" DESC
LIMIT 50;


-- Test drive requests by vehicle model
SELECT
    "testDriveRequest_attributeVehicleModel__c",
    COUNT(*) AS request_count
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "eventType__c" = 'testDriveRequest'
  AND "dateTime__c" >= '2026-03-15T00:00:00Z'
  AND "testDriveRequest_attributeVehicleModel__c" IS NOT NULL
GROUP BY "testDriveRequest_attributeVehicleModel__c"
ORDER BY request_count DESC;
