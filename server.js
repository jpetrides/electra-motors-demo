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

function sfRequest(method, urlPath, token, bodyObj) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, tokenCache.instanceUrl);
    const payload = bodyObj ? JSON.stringify(bodyObj) : null;
    const headers = { 'Authorization': `Bearer ${token}` };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers,
    }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`SF API ${res.statusCode}: ${body.slice(0, 300)}`));
        resolve(body ? JSON.parse(body) : {});
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sfQuery(soql, token) {
  const encoded = encodeURIComponent(soql);
  return sfGet(`/services/data/v56.0/query?q=${encoded}`, token)
    .then(r => r.records || []);
}

function dcQueryHttp(sql, token) {
  return sfRequest('POST', '/services/data/v64.0/ssot/query-sql', token, { sql })
    .then(r => {
      const cols = (r.metadata || []).map(m => typeof m === 'object' ? m.name : m);
      return { cols, rows: r.data || [] };
    });
}

app.use(express.json());

// Presentation — served before the SDK injection middleware
app.get('/preso', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'preso', 'index.html'));
});

// Demo Tools — served before SDK injection middleware (no tracking needed)
app.get('/tools', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tools', 'index.html'));
});

// Custom MIAW chat app — two deliverables from the same chat-app/ React code:
//
//   1. SPA at /chat (chat-app/dist/)    — legacy full-page route, kept as a
//      deep-link/deploy-verify target.
//   2. Embeddable widget (chat-app/dist-widget/) — single IIFE bundle served
//      at /js/elektra-chat.js and CSS at /css/elektra-chat.css. Every HTML
//      page gets /js/chat-widget-loader.js injected (see middleware below),
//      which lazy-loads this bundle on first FAB click.
//
// Both paths inject the DC Web SDK (c360a.min.js, sitemap.js, sdk.js) so
// the chat emits the same leadSubmit / testDriveRequest engagement events
// the static forms do, feeding the existing Real_Time_Lead_Capture Flow.
const chatAppDist = path.join(__dirname, 'chat-app', 'dist');
const chatAppWidget = path.join(__dirname, 'chat-app', 'dist-widget');

if (fs.existsSync(chatAppDist)) {
  // /chat full-page route
  app.use('/chat/assets', express.static(path.join(chatAppDist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use('/chat/favicon.svg', express.static(path.join(chatAppDist, 'favicon.svg')));
  app.get(/^\/chat(\/.*)?$/, (_req, res) => {
    let html = fs.readFileSync(path.join(chatAppDist, 'index.html'), 'utf8');
    const sdkScript = `<script src="https://cdn.c360a.salesforce.com/beacon/c360a/${BUNDLE_ID}/scripts/c360a.min.js"></script>`;
    const sitemapScript = `<script src="/js/sitemap.js"></script>`;
    const emHelperScript = `<script src="/js/sdk.js"></script>`;
    html = html.replace('</head>', `${sdkScript}\n${sitemapScript}\n${emHelperScript}\n</head>`);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });
} else {
  app.get('/chat', (_req, res) => {
    res.status(503).send('Chat app not built. Run: cd chat-app && npm install && npm run build');
  });
}

// Widget bundle assets — served at stable URLs so the loader can fetch them.
// Cache-Control is short (5 min) + must-revalidate with ETag. The widget
// bundle is ~75KB gzipped and is only fetched when the user actually opens
// the chat, so the bandwidth hit is minor; keeping the TTL short means
// bug fixes propagate quickly without users needing to clear cache.
if (fs.existsSync(chatAppWidget)) {
  const widgetCache = 'public, max-age=300, must-revalidate';
  app.get('/js/elektra-chat.js', (_req, res) => {
    res.setHeader('Cache-Control', widgetCache);
    res.sendFile(path.join(chatAppWidget, 'elektra-chat.js'));
  });
  app.get('/css/elektra-chat.css', (_req, res) => {
    res.setHeader('Cache-Control', widgetCache);
    res.sendFile(path.join(chatAppWidget, 'elektra-chat.css'));
  });
}

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
  // Elektra Chat widget loader — adds a floating chat FAB + slide-in drawer
  // to every page, lazy-loads the React widget bundle on first click. The
  // loader skips itself on /chat (where the SPA is the whole page).
  const chatWidgetLoader = `<script src="/js/chat-widget-loader.js" defer></script>`;
  const inspectorCss = `<link rel="stylesheet" href="/css/inspector.css">`;
  const inspectorScript = `<script src="/js/dc-inspector.js"></script>`;
  const embeddedChat = `<script type="text/javascript">
    function initEmbeddedMessaging() {
      try {
        embeddedservice_bootstrap.settings.language = 'en_US';
        embeddedservice_bootstrap.init(
          '00DHo00000d5PwC',
          'ASA_Vehicle_Questions_Agent',
          'https://storm-ca6e20bd4496e0.my.site.com/ESWASAVehicleQuestions1776269359768',
          { scrt2URL: 'https://storm-ca6e20bd4496e0.my.salesforce-scrt.com' }
        );
      } catch (err) {
        console.error('Error loading Embedded Messaging: ', err);
      }
    }
  </script>
  <script type="text/javascript" src="https://storm-ca6e20bd4496e0.my.site.com/ESWASAVehicleQuestions1776269359768/assets/js/bootstrap.min.js" onload="initEmbeddedMessaging()"></script>`;
  html = html.replace('</head>', `${inspectorCss}\n${sdkScript}\n${sitemapScript}\n${inspectorScript}\n${chatWidgetLoader}\n</head>`);
  html = html.replace('</body>', `${embeddedChat}\n</body>`);

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

// D360 Inspector — lookup device ID via Data Graph API
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
            kind: 'quote',
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
        // Test drive engagement events — same graph path as LeadEngagement,
        // just a different DMO. Fold them into the same leads array so the
        // inspector panel shows quote + test drive activity together.
        for (const td of ind.Test_Drive_Electra__dlm || []) {
          leads.push({
            kind: 'testDrive',
            model: td.testDriveRequest_attributeVehicleModel__c,
            sku: td.testDriveRequest_attributeSkuCode__c,
            preferredDate: td.testDriveRequest_attributePreferredDate__c,
            preferredDealer: td.testDriveRequest_attributePreferredDealer__c,
            timestamp: td.dateTime__c,
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

// ── Demo Tools API ────────────────────────────────────────────────────────────

// GET /api/tools/accounts — list all demo-eligible accounts with status
app.get('/api/tools/accounts', async (req, res) => {
  if (!SF_CLIENT_ID) return res.status(500).json({ error: 'SF_CLIENT_ID not configured' });
  try {
    const { accessToken } = await getSfToken();

    // 1. All Person Accounts with PAccount MDM IDs
    const accounts = await sfQuery(
      "SELECT Id, FirstName, LastName, PersonEmail, DC_Individual_Id__c, External_ID__pc " +
      "FROM Account WHERE IsPersonAccount = true AND External_ID__pc LIKE 'PAccount.%' ORDER BY LastName",
      accessToken
    );

    if (!accounts.length) return res.json({ accounts: [] });

    // 2. Count active leads per account
    const idList = accounts.map(a => `'${a.Id}'`).join(',');
    const leadRows = await sfQuery(
      `SELECT Person_Account__c, COUNT(Id) cnt FROM Lead WHERE Person_Account__c IN (${idList}) AND IsConverted = false GROUP BY Person_Account__c`,
      accessToken
    );
    const leadCounts = {};
    for (const l of leadRows) leadCounts[l.Person_Account__c] = l.cnt;

    // 3. Vehicle ownership counts from Data Cloud
    const mdmIds = accounts.map(a => a.External_ID__pc).filter(Boolean);
    const mdmList = mdmIds.map(m => `'${m}'`).join(',');
    const vehicleCounts = {};
    if (mdmList) {
      const { rows } = await dcQueryHttp(
        `SELECT "iv_mdm_id__c", COUNT(*) AS "cnt" FROM "Vehicle_Ownership__dlm" WHERE "iv_mdm_id__c" IN (${mdmList}) GROUP BY "iv_mdm_id__c"`,
        accessToken
      );
      for (const row of rows) {
        const mdm = Array.isArray(row) ? row[0] : row['iv_mdm_id__c'];
        const cnt = Array.isArray(row) ? row[1] : row['cnt'];
        vehicleCounts[mdm] = cnt || 0;
      }
    }

    // 4. Build result
    const result = accounts.map(acc => {
      const mdm = acc.External_ID__pc;
      const dcUid = acc.DC_Individual_Id__c;
      const leads = leadCounts[acc.Id] || 0;
      const vehicles = vehicleCounts[mdm] || 0;
      let status;
      if (vehicles === 0) status = 'NO DATA';
      else if (dcUid || leads > 0) status = 'NEEDS RESET';
      else status = 'READY';
      return {
        id: acc.Id,
        name: `${acc.FirstName || ''} ${acc.LastName || ''}`.trim(),
        email: acc.PersonEmail || '',
        mdmId: mdm || '',
        dcUid: dcUid || '',
        leads,
        vehicles,
        status,
      };
    });

    res.json({ accounts: result });
  } catch (err) {
    console.error('[Tools/accounts]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/tools/status?email= — inspect a specific account
app.get('/api/tools/status', async (req, res) => {
  if (!SF_CLIENT_ID) return res.status(500).json({ error: 'SF_CLIENT_ID not configured' });
  const email = (req.query.email || '').trim();
  if (!email) return res.status(400).json({ error: 'email param required' });
  try {
    const { accessToken } = await getSfToken();
    const esc = v => v.replace(/'/g, "\\'");
    const accounts = await sfQuery(
      `SELECT Id, FirstName, LastName, PersonEmail, DC_Individual_Id__c, External_ID__pc FROM Account WHERE IsPersonAccount = true AND PersonEmail = '${esc(email)}' LIMIT 1`,
      accessToken
    );
    if (!accounts.length) return res.status(404).json({ error: `No Person Account found for ${email}` });
    const acc = accounts[0];

    const leads = await sfQuery(
      `SELECT Id, Vehicle_Model__c, Vehicle_SKU__c, Status, CreatedDate FROM Lead WHERE Person_Account__c = '${acc.Id}' AND IsConverted = false ORDER BY CreatedDate DESC`,
      accessToken
    );

    res.json({
      id: acc.Id,
      name: `${acc.FirstName || ''} ${acc.LastName || ''}`.trim(),
      email: acc.PersonEmail,
      mdmId: acc.External_ID__pc || '',
      dcUid: acc.DC_Individual_Id__c || '',
      leads: leads.map(l => ({
        id: l.Id,
        model: l.Vehicle_Model__c || '',
        sku: l.Vehicle_SKU__c || '',
        status: l.Status,
        createdDate: (l.CreatedDate || '').slice(0, 10),
      })),
    });
  } catch (err) {
    console.error('[Tools/status]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/tools/reset — delete leads + clear DC UID for an account
app.post('/api/tools/reset', async (req, res) => {
  if (!SF_CLIENT_ID) return res.status(500).json({ error: 'SF_CLIENT_ID not configured' });
  const email = (req.body.email || '').trim();
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const { accessToken } = await getSfToken();
    const esc = v => v.replace(/'/g, "\\'");
    const accounts = await sfQuery(
      `SELECT Id, FirstName, LastName, DC_Individual_Id__c FROM Account WHERE IsPersonAccount = true AND PersonEmail = '${esc(email)}' LIMIT 1`,
      accessToken
    );
    if (!accounts.length) return res.status(404).json({ error: `No Person Account found for ${email}` });
    const acc = accounts[0];

    const leads = await sfQuery(
      `SELECT Id, Vehicle_Model__c FROM Lead WHERE Person_Account__c = '${acc.Id}' AND IsConverted = false`,
      accessToken
    );

    const deleted = [];
    const failed = [];
    for (const l of leads) {
      try {
        await sfRequest('DELETE', `/services/data/v56.0/sobjects/Lead/${l.Id}`, accessToken);
        deleted.push({ id: l.Id, model: l.Vehicle_Model__c || '' });
      } catch (e) {
        failed.push({ id: l.Id, error: e.message });
      }
    }

    let dcCleared = false;
    if (acc.DC_Individual_Id__c) {
      await sfRequest('PATCH', `/services/data/v56.0/sobjects/Account/${acc.Id}`, accessToken, { DC_Individual_Id__c: null });
      dcCleared = true;
    }

    res.json({
      name: `${acc.FirstName || ''} ${acc.LastName || ''}`.trim(),
      email,
      deleted,
      failed,
      dcCleared,
    });
  } catch (err) {
    console.error('[Tools/reset]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Health check for Heroku
app.get('/health', (_req, res) => res.json({ status: 'ok', bundleId: BUNDLE_ID }));

app.listen(PORT, () => {
  console.log(`Elektra Motors site running on http://localhost:${PORT}`);
  console.log(`SDK Bundle ID: ${BUNDLE_ID}`);
});
