/**
 * Electra Motors — Data Cloud Inspector Panel
 *
 * Slide-out panel that queries the Data Graph API via the server proxy
 * to show real-time identity resolution status for a given device ID.
 *
 * Activated by the floating DC button (always visible) or ?inspector=true.
 */
document.addEventListener('DOMContentLoaded', function () {
  let expanded = sessionStorage.getItem('dci-open') === '1';
  let polling = null;

  // ─── Build DOM ──────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'dc-inspector';
  panel.innerHTML = `
    <div class="dci-header">
      <div class="dci-header-left">
        <svg class="dci-logo" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
        </svg>
        <span class="dci-title">Data Cloud Inspector</span>
      </div>
      <button class="dci-close" aria-label="Close">&times;</button>
    </div>

    <div class="dci-body">
      <div class="dci-input-row">
        <input type="text" id="dci-device-id" placeholder="Enter device ID..." spellcheck="false" />
        <button id="dci-lookup-btn" class="dci-btn">Lookup</button>
      </div>
      <div class="dci-auto-row">
        <label><input type="checkbox" id="dci-auto-poll" /> Auto-refresh every 5s</label>
        <span id="dci-last-checked" class="dci-meta"></span>
      </div>

      <div id="dci-status-bar" class="dci-status-bar" style="display:none">
        <span id="dci-status-badge" class="dci-badge"></span>
        <span id="dci-status-text"></span>
      </div>

      <div id="dci-content" class="dci-content"></div>
    </div>
  `;
  document.body.appendChild(panel);

  // Floating toggle button
  const fab = document.createElement('button');
  fab.id = 'dc-inspector-fab';
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
    </svg>
    <span>DC Inspector</span>
  `;
  document.body.appendChild(fab);

  // ─── Toggle (persists across page navigations) ──────────────────────────
  function open() {
    expanded = true;
    panel.classList.add('open');
    fab.classList.add('hidden');
    sessionStorage.setItem('dci-open', '1');
  }
  function close() {
    expanded = false;
    panel.classList.remove('open');
    fab.classList.remove('hidden');
    stopPolling();
    sessionStorage.setItem('dci-open', '0');
  }

  fab.addEventListener('click', open);
  panel.querySelector('.dci-close').addEventListener('click', close);

  // Restore open state from previous page, or open via ?inspector=true
  if (expanded || new URLSearchParams(window.location.search).get('inspector')) open();

  // ─── Try to read device ID from SDK cookie ─────────────────────────────
  function readDeviceId() {
    // The SF Web SDK stores device ID in a cookie named like _sfdc_dc_<bundleId>
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const trimmed = c.trim();
      if (trimmed.startsWith('_sfdc_')) {
        try {
          const val = decodeURIComponent(trimmed.split('=').slice(1).join('='));
          const parsed = JSON.parse(val);
          if (parsed.anonymousId) return parsed.anonymousId;
        } catch (_) { /* not JSON, skip */ }
      }
    }
    return '';
  }

  const input = document.getElementById('dci-device-id');
  // Restore device ID: saved value > SDK cookie > empty
  const savedDeviceId = sessionStorage.getItem('dci-device-id');
  if (savedDeviceId) {
    input.value = savedDeviceId;
  } else {
    const detected = readDeviceId();
    if (detected) input.value = detected;
  }

  // ─── Lookup ─────────────────────────────────────────────────────────────
  const lookupBtn = document.getElementById('dci-lookup-btn');
  const autoPoll = document.getElementById('dci-auto-poll');
  const statusBar = document.getElementById('dci-status-bar');
  const statusBadge = document.getElementById('dci-status-badge');
  const statusText = document.getElementById('dci-status-text');
  const lastChecked = document.getElementById('dci-last-checked');
  const content = document.getElementById('dci-content');

  lookupBtn.addEventListener('click', () => doLookup());
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLookup(); });

  autoPoll.addEventListener('change', () => {
    if (autoPoll.checked) {
      sessionStorage.setItem('dci-auto-poll', '1');
      doLookup();
      polling = setInterval(doLookup, 5000);
    } else {
      stopPolling();
    }
  });

  function stopPolling() {
    if (polling) { clearInterval(polling); polling = null; }
    autoPoll.checked = false;
    sessionStorage.setItem('dci-auto-poll', '0');
  }

  // Restore auto-poll on page load
  if (sessionStorage.getItem('dci-auto-poll') === '1' && input.value.trim()) {
    autoPoll.checked = true;
    polling = setInterval(doLookup, 5000);
  }

  function saveResults() {
    sessionStorage.setItem('dci-results', JSON.stringify({
      statusBarDisplay: statusBar.style.display,
      statusBadgeClass: statusBadge.className,
      statusBadgeText: statusBadge.textContent,
      statusTextContent: statusText.textContent,
      lastCheckedText: lastChecked.textContent,
      contentHtml: content.innerHTML,
    }));
  }

  function restoreResults() {
    const saved = sessionStorage.getItem('dci-results');
    if (!saved) return;
    try {
      const r = JSON.parse(saved);
      statusBar.style.display = r.statusBarDisplay;
      statusBadge.className = r.statusBadgeClass;
      statusBadge.textContent = r.statusBadgeText;
      statusText.textContent = r.statusTextContent;
      lastChecked.textContent = r.lastCheckedText;
      content.innerHTML = r.contentHtml;
    } catch (_) { /* ignore corrupt data */ }
  }

  // Restore previous results on page load
  restoreResults();

  async function doLookup() {
    const deviceId = input.value.trim();
    if (!deviceId) return;

    sessionStorage.setItem('dci-device-id', deviceId);
    lookupBtn.disabled = true;
    lookupBtn.textContent = '...';

    try {
      const res = await fetch(`/api/dc-lookup/${encodeURIComponent(deviceId)}`);
      const data = await res.json();

      if (data.error) {
        showError(data.error);
        return;
      }

      const now = new Date().toLocaleTimeString();
      lastChecked.textContent = `checked ${now}`;

      statusBar.style.display = 'flex';
      statusBadge.className = 'dci-badge dci-badge--' + data.status;
      statusBadge.textContent = data.status.toUpperCase();

      if (data.status === 'anonymous') {
        statusText.textContent = 'Device not yet seen in Data Cloud';
        content.innerHTML = `
          <div class="dci-empty">
            <div class="dci-empty-icon">?</div>
            <p>No profile found for this device ID.</p>
            <p class="dci-meta">Browse the site and submit a lead — then check again.</p>
          </div>
        `;
      } else {
        const p = data.profile;
        statusText.textContent = data.leads.length
          ? `Unified with ${data.leads.length} lead${data.leads.length > 1 ? 's' : ''}`
          : 'Identity resolved';

        let html = '';

        // Profile card
        html += `
          <div class="dci-card">
            <div class="dci-card-header">Unified Individual</div>
            <div class="dci-profile">
              <div class="dci-avatar">${esc(p.firstName?.[0] || '?')}${esc(p.lastName?.[0] || '')}</div>
              <div class="dci-profile-info">
                <div class="dci-name">${esc(p.firstName || '')} ${esc(p.lastName || '')}</div>
                <div class="dci-meta">${esc(p.unifiedId)}</div>
              </div>
            </div>
            <div class="dci-fields">
              ${p.emails.length ? `<div class="dci-field"><span class="dci-field-label">Email</span><span>${esc(p.emails.join(', '))}</span></div>` : ''}
              ${p.phones.length ? `<div class="dci-field"><span class="dci-field-label">Phone</span><span>${esc(p.phones.join(', '))}</span></div>` : ''}
              ${p.addresses.map(a => `<div class="dci-field"><span class="dci-field-label">Address</span><span>${esc(a.street)}, ${esc(a.city)} ${esc(a.state)} ${esc(a.zip)}</span></div>`).join('')}
              ${p.partyIds.map(id => `<div class="dci-field"><span class="dci-field-label">${esc(id.type)}</span><span>${esc(id.value)}</span></div>`).join('')}
            </div>
          </div>
        `;

        // Source links
        if (data.sources && data.sources.length) {
          html += `
            <div class="dci-card">
              <div class="dci-card-header">Resolved Sources (${data.sources.length})</div>
              ${data.sources.map(s => `
                <div class="dci-source">
                  <span class="dci-source-id">${esc(s.sourceId)}</span>
                  <span class="dci-meta">${esc(s.dataSource)}</span>
                </div>
              `).join('')}
            </div>
          `;
        }

        // Lead cards
        for (const lead of data.leads) {
          const time = lead.timestamp ? new Date(lead.timestamp).toLocaleString() : '';
          html += `
            <div class="dci-card dci-card--lead">
              <div class="dci-card-header">
                Lead — ${esc(lead.model || 'Unknown')}
                <span class="dci-meta">${esc(time)}</span>
              </div>
              <div class="dci-fields">
                ${lead.sku ? `<div class="dci-field"><span class="dci-field-label">SKU</span><span>${esc(lead.sku)}</span></div>` : ''}
                ${lead.trim ? `<div class="dci-field"><span class="dci-field-label">Trim</span><span>${esc(lead.trim)}</span></div>` : ''}
                ${lead.color ? `<div class="dci-field"><span class="dci-field-label">Color</span><span>${esc(lead.color)}</span></div>` : ''}
                ${lead.location ? `<div class="dci-field"><span class="dci-field-label">Location</span><span>${esc(lead.location)}</span></div>` : ''}
                ${lead.email ? `<div class="dci-field"><span class="dci-field-label">Email</span><span>${esc(lead.email)}</span></div>` : ''}
                ${lead.phone ? `<div class="dci-field"><span class="dci-field-label">Phone</span><span>${esc(lead.phone)}</span></div>` : ''}
              </div>
            </div>
          `;
        }

        content.innerHTML = html;
      }
      saveResults();
    } catch (err) {
      showError(err.message);
    } finally {
      lookupBtn.disabled = false;
      lookupBtn.textContent = 'Lookup';
    }
  }

  function showError(msg) {
    statusBar.style.display = 'flex';
    statusBadge.className = 'dci-badge dci-badge--error';
    statusBadge.textContent = 'ERROR';
    statusText.textContent = msg;
    content.innerHTML = '';
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
})();
