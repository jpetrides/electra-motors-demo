/**
 * Elektra Motors — SDK Debug Panel
 *
 * Activated by appending ?debug=true to any URL.
 * Shows a fixed bottom panel listing every SDK event fired on the page.
 * Great for live demos — narrators can show exactly what Data Cloud receives.
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  if (!params.get('debug')) return;

  let expanded = true;
  let eventCount = 0;

  // ─── Build panel DOM ──────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'em-debug-panel';
  panel.className = 'expanded';
  panel.innerHTML = `
    <div id="em-debug-header">
      <span class="title">Data Cloud SDK Events &nbsp;— <span id="em-debug-count">0 events</span></span>
      <span class="toggle-hint">click to collapse</span>
    </div>
    <div id="em-debug-log"></div>
  `;
  document.body.appendChild(panel);

  // Floating badge (shown when panel is collapsed)
  const badge = document.createElement('div');
  badge.id = 'em-debug-badge';
  badge.textContent = '⚡ SDK Debug';
  document.body.appendChild(badge);

  // ─── Toggle ───────────────────────────────────────────────────────────────
  document.getElementById('em-debug-header').addEventListener('click', () => {
    expanded = !expanded;
    panel.className = expanded ? 'expanded' : 'collapsed';
    badge.style.display = expanded ? 'none' : 'block';
    document.getElementById('em-debug-header').querySelector('.toggle-hint').textContent =
      expanded ? 'click to collapse' : 'click to expand';
  });

  badge.addEventListener('click', () => {
    expanded = true;
    panel.className = 'expanded';
    badge.style.display = 'none';
  });

  // ─── Event listener ───────────────────────────────────────────────────────
  window.addEventListener('em:sdk:event', (e) => {
    const { eventName, payload, ts } = e.detail;
    eventCount++;

    const log = document.getElementById('em-debug-log');
    const entry = document.createElement('div');
    entry.className = 'debug-entry';

    const timeStr = ts.split('T')[1].split('.')[0];
    const payloadStr = JSON.stringify(payload).slice(0, 200);

    entry.innerHTML = `
      <span class="ts">${timeStr}</span>
      <span class="event-name">${escapeHtml(eventName)}</span>
      <span class="payload">${escapeHtml(payloadStr)}</span>
    `;

    // Prepend newest on top
    log.insertBefore(entry, log.firstChild);

    document.getElementById('em-debug-count').textContent =
      eventCount + (eventCount === 1 ? ' event' : ' events');
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Push panel up to avoid obscuring content
  document.body.style.paddingBottom = '300px';
})();
