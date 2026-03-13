# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Demo storefront for Electra Motors (fictional EV manufacturer) that integrates with Salesforce Data Cloud Web SDK to track user behavior and capture leads.

## Commands

```bash
npm start    # Start server on port 3000 (or $PORT)
```

## Architecture

**Key Integration Point**: `server.js` contains middleware that dynamically injects the Salesforce SDK script tag into every HTML response and replaces `__DC_BUNDLE_ID__` and `__DC_TENANT_ID__` placeholders. This means:
- SDK configuration happens at runtime via environment variables
- HTML files contain placeholders, not actual IDs
- The SDK script (`https://cdn.c360a.salesforce.com/beacon/c360a/${BUNDLE_ID}/scripts/c360a.min.js`) is injected on-the-fly

**Event Tracking Flow**:
1. `electra-sitemap.js` initializes the Salesforce SDK with page type definitions and event listeners
2. User actions (form submissions, configuration changes) trigger events via the SDK
3. `public/js/sdk.js` provides the `EM` namespace with `track()` and `identify()` helpers
4. Events are sent to Salesforce Data Cloud according to schemas in `electra-web-connector-schema.json`
5. Form submissions also POST to `/api/lead` or `/api/test-drive` (currently just log to console)

**Vehicle Data**: `public/js/vehicles.js` contains the complete catalog. Vehicle IDs like `ELK-SUV-7` map to `Product2.ProductCode` in Salesforce.

## Configuration

Required environment variables (see `.env.example`):
- `DC_SDK_BUNDLE_ID` - Salesforce Data Cloud SDK bundle ID
- `DC_TENANT_ID` - Salesforce tenant ID
