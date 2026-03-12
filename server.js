const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const BUNDLE_ID = process.env.DC_SDK_BUNDLE_ID || '__YOUR_BUNDLE_ID__';
const TENANT_ID = process.env.DC_TENANT_ID || '__YOUR_TENANT_ID__';

app.use(express.json());

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
  html = html.replace('</head>', `${sdkScript}\n${sitemapScript}\n</head>`);

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

// Health check for Heroku
app.get('/health', (_req, res) => res.json({ status: 'ok', bundleId: BUNDLE_ID }));

app.listen(PORT, () => {
  console.log(`Elektra Motors site running on http://localhost:${PORT}`);
  console.log(`SDK Bundle ID: ${BUNDLE_ID}`);
});
