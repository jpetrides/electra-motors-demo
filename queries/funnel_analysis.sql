-- Funnel Analysis
-- Table: Electra_Heroku_Behavioral_Event_E3F8DAD6__dll
--        Electra_Heroku_identity_F4AD4B6B__dll


-- Overall event volume by type (health check)
SELECT
    "eventType__c",
    COUNT(*) AS event_count
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "dateTime__c" >= '2026-03-15T00:00:00Z'
GROUP BY "eventType__c"
ORDER BY event_count DESC;


-- Full device journey — trace all events for one visitor in order
-- Replace deviceId value to investigate a specific visitor
SELECT
    "dateTime__c",
    "eventType__c",
    "sessionId__c",
    "productView_attributeVehicleModel__c",
    "vehicleConfigure_attributeVehicleModel__c",
    "vehicleConfigure_attributeTrim__c",
    "testDriveRequest_attributeVehicleModel__c",
    "leadSubmit_attributeVehicleModel__c",
    "leadSubmit_attributeTrim__c"
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "deviceId__c" = '258fa94438db382b'
ORDER BY "dateTime__c" ASC;


-- Funnel: productView -> vehicle_configure -> leadSubmit (per device)
SELECT
    "deviceId__c",
    COUNT(CASE WHEN "eventType__c" = 'productView'       THEN 1 END) AS product_views,
    COUNT(CASE WHEN "eventType__c" = 'vehicle_configure' THEN 1 END) AS configure_events,
    COUNT(CASE WHEN "eventType__c" = 'testDriveRequest'  THEN 1 END) AS test_drive_requests,
    COUNT(CASE WHEN "eventType__c" = 'leadSubmit'        THEN 1 END) AS leads_submitted,
    MIN(CASE WHEN "eventType__c" = 'productView'         THEN "dateTime__c" END) AS first_product_view,
    MIN(CASE WHEN "eventType__c" = 'leadSubmit'          THEN "dateTime__c" END) AS first_lead_submit
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "dateTime__c" >= '2026-03-15T00:00:00Z'
GROUP BY "deviceId__c"
ORDER BY leads_submitted DESC, configure_events DESC;


-- Known visitors: identity joined to behavioral events
SELECT
    "Electra_Heroku_identity_F4AD4B6B__dll"."email__c",
    "Electra_Heroku_identity_F4AD4B6B__dll"."firstName__c",
    "Electra_Heroku_identity_F4AD4B6B__dll"."lastName__c",
    "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"."eventType__c",
    "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"."dateTime__c",
    "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"."productView_attributeVehicleModel__c",
    "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"."vehicleConfigure_attributeVehicleModel__c",
    "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"."leadSubmit_attributeVehicleModel__c"
FROM "Electra_Heroku_identity_F4AD4B6B__dll"
JOIN "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
  ON "Electra_Heroku_identity_F4AD4B6B__dll"."deviceId__c" = "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"."deviceId__c"
WHERE "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"."dateTime__c" >= '2026-03-15T00:00:00Z'
ORDER BY "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"."dateTime__c" DESC
LIMIT 100;


-- Devices that submitted a lead — what did they view first?
SELECT
    "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"."deviceId__c",
    MAX(CASE WHEN "eventType__c" = 'productView'  THEN "productView_attributeVehicleModel__c" END) AS last_viewed_model,
    MAX(CASE WHEN "eventType__c" = 'leadSubmit'   THEN "leadSubmit_attributeVehicleModel__c"  END) AS submitted_model,
    MAX(CASE WHEN "eventType__c" = 'leadSubmit'   THEN "leadSubmit_attributeTrim__c"          END) AS submitted_trim,
    MIN(CASE WHEN "eventType__c" = 'leadSubmit'   THEN "dateTime__c"                          END) AS lead_submitted_at
FROM "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"
WHERE "dateTime__c" >= '2026-03-15T00:00:00Z'
GROUP BY "Electra_Heroku_Behavioral_Event_E3F8DAD6__dll"."deviceId__c"
HAVING COUNT(CASE WHEN "eventType__c" = 'leadSubmit' THEN 1 END) > 0
ORDER BY lead_submitted_at DESC;
