const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const querystring = require('querystring');

const app = express();
const PORT = process.env.PORT || 3000;
const BUNDLE_ID = process.env.DC_SDK_BUNDLE_ID || '__YOUR_BUNDLE_ID__';
const TENANT_ID = process.env.DC_TENANT_ID || '__YOUR_TENANT_ID__';

// Salesforce OAuth (client credentials flow)
const SF_CLIENT_ID = process.env.SF_CLIENT_ID;
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET;
const SF_LOGIN_URL = process.env.SF_LOGIN_URL; // e.g. https://storm-xxx.my.salesforce.com

let tokenCache = { accessToken: null, instanceUrl: null, expiresAt: 0 };

function getSfToken() {
  return new Promise((resolve, reject) => {
    if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
      return resolve(tokenCache);
    }
    const postData = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: SF_CLIENT_ID,
      client_secret: SF_CLIENT_SECRET,
    });
    const url = new URL(`${SF_LOGIN_URL}/services/oauth2/token`);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) },
    }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`OAuth failed: ${res.statusCode} ${body}`));
        const data = JSON.parse(body);
        tokenCache = {
          accessToken: data.access_token,
          instanceUrl: data.instance_url,
          expiresAt: Date.now() + 90 * 60 * 1000, // cache 90 min
        };
        resolve(tokenCache);
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function sfGet(urlPath, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, tokenCache.instanceUrl);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`SF API ${res.statusCode}: ${body}`));
        resolve(JSON.parse(body));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

app.use(express.json());

// Presentation — served before the SDK injection middleware
app.get('/preso', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'preso', 'index.html'));
});

// Inject SDK meta tags into every HTML response
app.use((req, res, next) => {
  if (!req.path.endsWith('.html') && !req.path.endsWith('/') && req.path !== '/') {
    return next();
  }
  const filePath = req.path.endsWith('/')
    ? path.join(__dirname, 'public', req.path, 'index.html')
    : path.join(__dirname, 'public', req.path);

  if (!fs.existsSync(filePath)) return next();

  let html = fs.readFileSync(filePath, 'utf8');
  html = html
    .replace('__DC_BUNDLE_ID__', BUNDLE_ID)
    .replace('__DC_TENANT_ID__', TENANT_ID);

  const sdkScript = `<script src="https://cdn.c360a.salesforce.com/beacon/c360a/${BUNDLE_ID}/scripts/c360a.min.js"></script>`;
  const sitemapScript = `<script src="/js/sitemap.js"></script>`;
  const inspectorCss = `<link rel="stylesheet" href="/css/inspector.css">`;
  const inspectorScript = `<script src="/js/dc-inspector.js"></script>`;
  html = html.replace('</head>', `${inspectorCss}\n${sdkScript}\n${sitemapScript}\n${inspectorScript}\n</head>`);

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Static files (images, css, js — bypass HTML middleware above)
app.use(express.static(path.join(__dirname, 'public')));

// Lead capture endpoint — logs the payload, returns 200
// In a real deployment this would write to a database or call Salesforce
app.post('/api/lead', (req, res) => {
  const { firstName, lastName, email, phone, zip, vehicleModel, vehicleSKU, trim, preferredDealer, message } = req.body;
  console.log('[Lead]', JSON.stringify({ firstName, lastName, email, vehicleModel, vehicleSKU, trim }));
  res.json({ success: true, message: 'Your request has been received.' });
});

// Test-drive endpoint
app.post('/api/test-drive', (req, res) => {
  const { firstName, lastName, email, phone, zip, vehicleModel, vehicleSKU, preferredDate } = req.body;
  console.log('[TestDrive]', JSON.stringify({ firstName, lastName, email, vehicleModel, vehicleSKU }));
  res.json({ success: true, message: 'Test drive request received.' });
});

// Data Cloud Inspector — lookup device ID via Data Graph API
app.get('/api/dc-lookup/:deviceId', async (req, res) => {
  if (!SF_CLIENT_ID) return res.status(500).json({ error: 'SF_CLIENT_ID not configured' });
  try {
    const { accessToken } = await getSfToken();
    const deviceId = req.params.deviceId;
    const lookup = encodeURIComponent(`[UnifiedLinkssotIndividualElkt__dlm.SourceRecordId__c=${deviceId}]`);
    const graphUrl = `/services/data/v64.0/ssot/data-graphs/data/RealTimeLeads?lookupKeys=${lookup}`;
    const result = await sfGet(graphUrl, accessToken);

    if (!result.data || result.data.length === 0) {
      return res.json({ status: 'anonymous', deviceId, unified: null });
    }

    // Decode the json_blob (DC returns &quot; entities)
    const raw = result.data[0].json_blob__c.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const blob = JSON.parse(raw);

    // Extract unified profile
    const profile = {
      unifiedId: blob.ssot__Id__c,
      firstName: blob.ssot__FirstName__c,
      lastName: blob.ssot__LastName__c,
      isAnonymous: blob.ssot__IsAnonymous__c === '1',
    };

    // Extract emails, phones, addresses from unified-level nodes
    profile.emails = (blob.UnifiedssotContactPointEmailElkt__dlm || []).map(e => e.ssot__EmailAddress__c);
    profile.phones = [];
    profile.addresses = (blob.UnifiedssotContactPointAddressElkt__dlm || []).map(a => ({
      street: a.ssot__AddressLine1__c,
      city: a.ssot__CityName__c,
      state: a.ssot__StateProvinceName__c,
      zip: a.ssot__PostalCodeId__c,
      country: a.ssot__CountryName__c,
    }));

    // Extract leads and source links
    const leads = [];
    const sources = [];
    for (const link of blob.UnifiedLinkssotIndividualElkt__dlm || []) {
      sources.push({
        sourceId: link.SourceRecordId__c,
        dataSource: link.ssot__DataSourceId__c,
        dataSourceObject: link.ssot__DataSourceObjectId__c,
      });
      for (const ind of link.ssot__Individual__dlm || []) {
        for (const phone of ind.ssot__ContactPointPhone__dlm || []) {
          if (phone.ssot__TelephoneNumber__c && !profile.phones.includes(phone.ssot__TelephoneNumber__c)) {
            profile.phones.push(phone.ssot__TelephoneNumber__c);
          }
        }
        for (const le of ind.ssot__LeadEngagement__dlm || []) {
          leads.push({
            model: le.Electra_Model__c,
            sku: le.Electra_SKU__c,
            trim: le.Electra_Trim__c,
            color: le.Electra_Color__c,
            location: le.Electra_Location__c,
            email: le.Email__c,
            phone: le.Phone__c,
            firstName: le.First_Name__c,
            lastName: le.Last_Name__c,
            timestamp: le.ssot__EngagementDateTime__c,
          });
        }
      }
    }

    // Extract MDM IDs
    profile.partyIds = (blob.UnifiedssotPartyIdentificationElkt__dlm || []).map(p => ({
      type: p.ssot__PartyIdentificationTypeId__c,
      value: p.ssot__IdentificationNumber__c,
    }));

    const status = leads.length > 0 ? 'resolved' : (profile.isAnonymous ? 'anonymous' : 'identified');
    res.json({ status, deviceId, profile, leads, sources });
  } catch (err) {
    console.error('[DC Lookup Error]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Health check for Heroku
app.get('/health', (_req, res) => res.json({ status: 'ok', bundleId: BUNDLE_ID }));

app.listen(PORT, () => {
  console.log(`Elektra Motors site running on http://localhost:${PORT}`);
  console.log(`SDK Bundle ID: ${BUNDLE_ID}`);
});
