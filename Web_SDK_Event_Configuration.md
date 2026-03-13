# Electra Motors — Web SDK Event Configuration

**Last updated:** 2026-03-12
**Site URL:** https://electra-motors-demo-04da06bf66e0.herokuapp.com/
**GitHub:** https://github.com/jpetrides/electra-motors-demo (public)
**Heroku App:** electra-motors-demo
**Salesforce Org:** `auto` alias

---

## Architecture Overview

The Electra Motors demo website runs on Heroku (Node.js/Express) and sends real-time web events to Salesforce Data Cloud via the **Data Cloud Web SDK** (`SalesforceInteractions`).

```
Browser (Heroku site)
  ├── c360a.min.js        ← SDK loaded from Salesforce CDN, auto-initializes
  ├── sitemap.js           ← Served locally, sets consent + page type matching + event listeners
  └── sdk.js               ← EM.track / EM.identify helpers for inline form handlers
        │
        ▼
  Data Cloud CDP Receiver  ← Events translated and sent here automatically by the SDK
        │
        ▼
  Data Cloud Data Stream   ← YOU CONFIGURE THIS — maps events to DLOs/DMOs
```

### How the SDK Loads

`server.js` dynamically injects two `<script>` tags into the `<head>` of every HTML page:

1. **`c360a.min.js`** from `https://cdn.c360a.salesforce.com/beacon/c360a/{BUNDLE_ID}/scripts/c360a.min.js` — this is the Salesforce Interactions SDK. It auto-initializes when loaded.
2. **`/js/sitemap.js`** — served from the Heroku app itself. This sets up consent, page type matching, and event listeners.

The Bundle ID is set via Heroku config var `DC_SDK_BUNDLE_ID` (currently `64903ebc-02ac-4b43-ac85-7ac2ab0514cd`).

### Why the Sitemap Is Served Locally

The sitemap was uploaded to the Data Cloud Website Connector, but the CDN bundle wasn't including it. So we serve `sitemap.js` directly from Heroku. This actually gives us more control — we can update event logic and redeploy to Heroku without going through the Data Cloud connector UI.

---

## Consent

The SDK requires explicit consent before forwarding events to Data Cloud. On every page load, `sitemap.js` calls:

```javascript
SalesforceInteractions.updateConsents([{
  provider: "Electra Motors",
  purpose: SalesforceInteractions.ConsentPurpose.Tracking,   // resolves to "Tracking"
  status: SalesforceInteractions.ConsentStatus.OptIn,        // resolves to "Opt In" (with space)
}]);
```

**Key detail:** The enum `ConsentStatus.OptIn` resolves to the string `"Opt In"` (with a space). Using the string `"OptIn"` (no space) will NOT work — the SDK silently rejects it and events won't reach Data Cloud.

---

## Event Types

Every event needs an `interaction.eventType` field for Data Cloud to translate it. Without `eventType`, the SDK fires the event internally but `Events translated for Data Cloud` will be empty (`[]`).

### Engagement Events (automatic via sitemap)

| Page | URL Pattern | eventType | Category | Notes |
|---|---|---|---|---|
| Homepage | `/` or `/index.html` | `pageView` | Engagement | |
| Models Overview | `/models/` | `pageView` | Engagement | |
| Vehicle Detail (×6) | `/models/electra-{model}/` | `vehicleView` | Engagement | Includes `catalogObject` with SKU |
| Configurator | `/configure/` | `pageView` on load, `vehicleConfigure` on change | Engagement | Fires on trim/color/addon change |
| Get a Quote | `/get-a-quote/` | `pageView` on load | Engagement | Identity events on submit (see below) |
| Test Drive | `/test-drive/` | `pageView` on load | Engagement | Identity events on submit (see below) |
| Thank You | `/thank-you/` | `pageView` | Engagement | |

### Profile / Identity Events (on form submit)

When a user submits the Get a Quote or Test Drive form, three separate identity events fire:

| eventType | Category | user.attributes | Purpose |
|---|---|---|---|
| `contactPointEmail` | Profile | `{ email, eventType: "contactPointEmail" }` | Links anonymous device to email |
| `contactPointPhone` | Profile | `{ phoneNumber, eventType: "contactPointPhone" }` | Links anonymous device to phone |
| `identity` | Profile | `{ firstName, lastName, eventType: "identity", isAnonymous: "0" }` | Provides name, marks as known |

These are the events that power identity resolution — they tie the anonymous `deviceId`/`sessionId` to a known person.

**Important:** Each identity event must include `user.attributes.eventType` as a string. If this field is missing or undefined, the SDK rejects the event with: `Missing or invalid required "user.attributes.eventType"`.

### Vehicle Detail SKU Mapping

| Model | URL slug | SKU | catalogObject.id |
|---|---|---|---|
| Reaktive (SUV) | `electra-reaktive` | ELK-SUV-7 | ELK-SUV-7 |
| Megavolt (Coupe) | `electra-megavolt` | ELK-COUPE-GT | ELK-COUPE-GT |
| Harmonic (Sedan) | `electra-harmonic` | ELK-SEDAN-AWD | ELK-SEDAN-AWD |
| Beam (Hatchback) | `electra-beam` | ELK-HATCH-PLUS | ELK-HATCH-PLUS |
| Ignite (Truck) | `electra-ignite` | ELK-TRUCK-PLAT | ELK-TRUCK-PLAT |
| Regulator (EV) | `electra-regulator` | ELK-EV-PERF | ELK-EV-PERF |

---

## JSON Schema (Data Cloud Connector)

The schema was uploaded to the Data Cloud Website Connector as `electra-web-connector-schema.json` (in the repo root). It defines 11 event type records:

| Schema developerName | SDK eventType | Category | Key Fields |
|---|---|---|---|
| `identity` | `identity` | Profile | firstName, lastName, isAnonymous |
| `contactPointEmail` | `contactPointEmail` | Profile | email |
| `contactPointPhone` | `contactPointPhone` | Profile | phoneNumber |
| `consentLog` | `consentLog` | Engagement | provider, purpose, status |
| `pageViewEvent` | `pageView` | Engagement | pageView, sourceUrl, sourcePageType |
| `productView` | `vehicleView` | Engagement | vehicleModel, vehicleSKU, vehicleFamily |
| `vehicleConfigure` | `vehicleConfigure` | Engagement | vehicleModel, vehicleSKU, trim, msrp, color |
| `leadSubmit` | `lead_submit` | Engagement | vehicleModel, vehicleSKU, trim, preferredColor, preferredDealer |
| `testDriveRequest` | `testDriveRequest` | Engagement | vehicleModel, vehicleSKU, preferredDate |
| `filterModels` | `filterModels` | Engagement | filter |
| `partyIdentification` | `partyIdentification` | Profile | IDNameWeb, IDType, userId |

All event types share common fields: `deviceId`, `eventId`, `dateTime`, `eventType`, `category`, `sessionId`, `interactionName`, `sourceUrl`, `sourceUrlReferrer`, `sourceChannel`, `sourcePageType`.

---

## What Needs to Be Done in Data Cloud

### 1. Create the Data Stream

The Website Connector is already set up and showing "Connected" in Data Cloud. You need to create a **Data Stream** from this connector:

- Go to **Data Cloud Setup → Data Streams → New**
- Select the **Website Connector** (Electra Motors)
- Map the event type records from the schema to Data Lake Objects (DLOs)
- The Profile events (`identity`, `contactPointEmail`, `contactPointPhone`) should map to profile-type DLOs
- The Engagement events (`pageView`, `vehicleView`, `vehicleConfigure`, `leadSubmit`) should map to engagement-type DLOs

### 2. Verify Events Are Arriving

Once the data stream is active, browse the site to generate events. Then:

- Check the Data Stream detail page for record counts
- Query the DLOs in Data Explorer to see the raw events
- The `deviceId` and `sessionId` fields will be `258fa94438db382b` (or whatever anonymous ID the SDK assigns to your browser)

### 3. Create DMO Mappings

Map the DLOs to Data Model Objects (DMOs):
- Profile events → Individual, Contact Point Email, Contact Point Phone
- Engagement events → Web Engagement DMO (custom), or standard engagement DMOs

### 4. Identity Resolution

The identity resolution ruleset should use:
- `deviceId` as the anonymous identifier
- `contactPointEmail.email` for email-based matching
- `contactPointPhone.phoneNumber` for phone-based matching
- `identity.firstName` + `identity.lastName` for name matching

---

## Debugging

To see live SDK events in the browser console:

```javascript
SalesforceInteractions.setLoggingLevel('DEBUG')
```

This doesn't persist across page reloads. The sitemap currently has `SI.setLoggingLevel('DEBUG')` enabled by default — remove this line from `public/js/sitemap.js` (line 22) when you're done testing.

The key log line to watch: `Events translated for Data Cloud: [...]` — if this array has event objects, data is flowing. If it's `[]`, events aren't reaching Data Cloud.

---

## Heroku Config Vars

| Var | Value | Purpose |
|---|---|---|
| `DC_SDK_BUNDLE_ID` | `64903ebc-02ac-4b43-ac85-7ac2ab0514cd` | Identifies the Data Cloud connector bundle |
| `DC_TENANT_ID` | (not yet set) | Optional tenant ID for multi-tenant orgs |

---

## File Reference

| File | Purpose |
|---|---|
| `server.js` | Express server — injects SDK + sitemap scripts into HTML |
| `public/js/sitemap.js` | Consent, page type matching, event listeners (the core config) |
| `public/js/sdk.js` | `EM.track()` / `EM.identify()` helpers for inline form handlers |
| `public/js/vehicles.js` | Vehicle data (models, SKUs, ProductCodes, trims, colors) |
| `electra-web-connector-schema.json` | JSON schema uploaded to Data Cloud connector |
| `electra-sitemap.js` | Original sitemap uploaded to connector (now superseded by `public/js/sitemap.js`) |
