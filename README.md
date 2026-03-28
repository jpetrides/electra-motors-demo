# Electra Motors Demo Storefront

Demo website for **Electra Motors**, a fictional EV manufacturer. Built to showcase Salesforce Data Cloud's real-time identity resolution and Web SDK integration.

## What It Does

A visitor browses vehicle models, configures options, and submits a lead or test-drive request. Every interaction fires events through the Salesforce Data Cloud Web SDK, enabling real-time identity resolution, behavioral tracking, and automated lead capture in Salesforce.

## Live Site

https://electra-motors-demo-04da06bf66e0.herokuapp.com

## Quick Start

```bash
cp .env.example .env
# Edit .env with your Data Cloud SDK credentials
npm install
npm start
# Open http://localhost:3000
```

## Environment Variables

| Variable | Description |
|---|---|
| `DC_SDK_BUNDLE_ID` | Salesforce Data Cloud Web SDK bundle ID |
| `DC_TENANT_ID` | Salesforce Data Cloud tenant ID |
| `PORT` | Server port (default: 3000) |

## Architecture

**Node.js + Express** serves static HTML with runtime SDK injection.

The server middleware intercepts every HTML response to:
1. Replace `__DC_BUNDLE_ID__` and `__DC_TENANT_ID__` placeholders with env var values
2. Inject the Salesforce Data Cloud SDK `<script>` tag and sitemap initialization

This means HTML files contain no hardcoded credentials -- SDK configuration happens entirely at runtime.

## Project Structure

```
server.js                  Express server + SDK injection middleware
Procfile                   Heroku process definition
public/
  index.html               Homepage
  configure/index.html     Vehicle configurator
  get-a-quote/index.html   Lead capture form
  test-drive/index.html    Test drive request form
  thank-you/index.html     Post-submission confirmation
  models/                  Individual vehicle model pages
  js/
    sitemap.js             SDK consent, page types, event listeners
    sdk.js                 EM.track() / EM.identify() helper namespace
    vehicles.js            Vehicle catalog data (IDs, trims, pricing)
    debug-panel.js         Dev overlay showing SDK event payloads
    nav.js                 Navigation behavior
  css/                     Stylesheets
  images/                  Vehicle hero images, logos
```

## Data Cloud Event Types

| Event | Trigger | Category |
|---|---|---|
| `pageViewEvent` | Every page load | Engagement |
| `productView` | Vehicle model page viewed | Engagement |
| `vehicleConfigure` | Trim/color/addon selection | Engagement |
| `leadSubmit` | Quote request form submitted | Engagement |
| `testDriveRequest` | Test drive form submitted | Engagement |
| `identity` | Form submission (name, anonymous flag) | Profile |
| `contactPointEmail` | Email captured | Profile |
| `contactPointPhone` | Phone captured | Profile |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/lead` | Logs lead submission payload |
| `POST` | `/api/test-drive` | Logs test drive request payload |
| `GET` | `/health` | Health check (returns SDK bundle ID) |

These endpoints log to console only. The actual CRM pipeline runs through Data Cloud: SDK events are ingested into Data Cloud, identity resolution unifies the visitor, and a Data Cloud automation flow triggers an Apex action that creates Person Accounts and Leads in Salesforce.

## Deployment

Push to `master` branch -- Heroku auto-deploys.

```bash
git push origin master
```
