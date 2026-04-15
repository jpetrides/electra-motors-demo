/**
 * Elektra Vehicle Advisor — Agentforce Chat Widget
 *
 * Floating chat button → Agentforce session → SSE streaming.
 * On vehicle pages, sends a silent priming message so the agent
 * already knows which model the customer is looking at.
 * Fires Data Cloud SDK events (identity + testDriveRequest) when a
 * test drive booking confirmation is detected in the agent response.
 */
(function () {
  'use strict';

  // ── Page context map (mirrors sitemap.js vehicle page types) ─────────────
  const PAGE_CONTEXTS = {
    'electra-reaktive':  { vehicleModel: 'Reaktive',  vehicleSku: 'ELK-SUV-7',      vehicleFamily: 'SUV',         displayName: 'Elektra Reaktive' },
    'electra-megavolt':  { vehicleModel: 'Megavolt',  vehicleSku: 'ELK-COUPE-GT',   vehicleFamily: 'Sport Coupe', displayName: 'Elektra Megavolt' },
    'electra-harmonic':  { vehicleModel: 'Harmonic',  vehicleSku: 'ELK-SEDAN-AWD',  vehicleFamily: 'Sedan',       displayName: 'Elektra Harmonic' },
    'electra-beam':      { vehicleModel: 'Beam',      vehicleSku: 'ELK-HATCH-PLUS', vehicleFamily: 'Hatchback',   displayName: 'Elektra Beam' },
    'electra-ignite':    { vehicleModel: 'Ignite',    vehicleSku: 'ELK-TRUCK-PLAT', vehicleFamily: 'Truck',       displayName: 'Elektra Ignite' },
    'electra-regulator': { vehicleModel: 'Regulator', vehicleSku: 'ELK-EV-PERF',   vehicleFamily: 'Full EV',     displayName: 'Elektra Regulator' },
  };

  function getPageContext() {
    if (window.EM_PAGE_CONTEXT) return window.EM_PAGE_CONTEXT;
    const path = window.location.pathname;
    for (const slug of Object.keys(PAGE_CONTEXTS)) {
      if (path.includes(slug)) return PAGE_CONTEXTS[slug];
    }
    return null;
  }

  // ── Widget state ──────────────────────────────────────────────────────────
  let sessionId        = null;
  let isOpen           = false;
  let isSessionReady   = false;
  let isSending        = false;
  let pendingMessage   = null;
  let capturedEmail    = null;
  let capturedFirstName = '';
  let capturedLastName  = '';

  const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/;

  // ── Styles (self-contained, uses design tokens where available) ───────────
  const STYLES = `
    .em-chat-toggle {
      position: fixed;
      bottom: 24px;
      left: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #00b4d8;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(0,180,216,0.45);
      z-index: 9000;
      transition: transform .2s, box-shadow .2s;
    }
    .em-chat-toggle:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(0,180,216,0.65); }
    .em-chat-toggle svg   { width: 26px; height: 26px; fill: #fff; flex-shrink: 0; }
    .em-chat-pulse {
      position: absolute;
      top: -2px; right: -2px;
      width: 13px; height: 13px;
      border-radius: 50%;
      background: #2ec4b6;
      border: 2px solid #0a0c12;
    }

    .em-chat-panel {
      position: fixed;
      bottom: 88px;
      left: 24px;
      width: 380px;
      max-height: 580px;
      display: flex;
      flex-direction: column;
      background: #111318;
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 16px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.8);
      z-index: 9000;
      overflow: hidden;
      opacity: 0;
      transform: translateY(16px) scale(0.97);
      pointer-events: none;
      transition: opacity .2s, transform .2s;
    }
    .em-chat-panel.em-open {
      opacity: 1;
      transform: none;
      pointer-events: all;
    }
    @media (max-width: 480px) {
      .em-chat-panel { right:0; bottom:0; left:0; width:100%; max-height:70vh; border-radius:16px 16px 0 0; }
      .em-chat-toggle { bottom:16px; left:16px; }
    }

    /* Header */
    .em-chat-hdr {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: #0a0c12;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }
    .em-chat-hdr-icon {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg,#00b4d8,#0090ae);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .em-chat-hdr-icon svg { width: 18px; height: 18px; fill:#fff; }
    .em-chat-hdr-name  { font-size:14px; font-weight:600; color:#e8eaf0; line-height:1.2; }
    .em-chat-hdr-status {
      font-size:11px; color:#2ec4b6; display:flex; align-items:center; gap:4px; margin-top:2px;
    }
    .em-chat-hdr-status::before {
      content:''; width:6px; height:6px; border-radius:50%; background:#2ec4b6; flex-shrink:0;
    }
    .em-chat-hdr-status.em-connecting::before { background:#9aa3b8; }
    .em-chat-hdr-status.em-connecting { color:#9aa3b8; }
    .em-chat-close {
      margin-left:auto; background:none; border:none; cursor:pointer; color:#9aa3b8;
      padding:4px; border-radius:4px; transition:color .15s,background .15s; line-height:0;
    }
    .em-chat-close:hover { color:#e8eaf0; background:rgba(255,255,255,0.07); }
    .em-chat-close svg { width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; }

    /* Context pill */
    .em-ctx-pill {
      margin: 10px 16px 0;
      padding: 5px 12px;
      background: rgba(0,180,216,0.1);
      border: 1px solid rgba(0,180,216,0.25);
      border-radius: 100px;
      font-size: 11px;
      color: #00b4d8;
      text-align: center;
      flex-shrink: 0;
    }

    /* Messages */
    .em-chat-msgs {
      flex: 1;
      overflow-y: auto;
      padding: 14px 14px 8px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .em-chat-msgs::-webkit-scrollbar { width:4px; }
    .em-chat-msgs::-webkit-scrollbar-track { background:transparent; }
    .em-chat-msgs::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }

    .em-msg {
      max-width: 86%;
      padding: 9px 13px;
      border-radius: 12px;
      font-size: 13.5px;
      line-height: 1.55;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    .em-msg-agent  { align-self:flex-start; background:#1a1d26; border:1px solid rgba(255,255,255,0.07); color:#e8eaf0; border-bottom-left-radius:3px; }
    .em-msg-user   { align-self:flex-end;   background:#00b4d8; color:#fff; border-bottom-right-radius:3px; }
    .em-msg-system { align-self:center; font-size:11px; color:#5c6478; background:none; padding:2px 0; border-radius:0; max-width:100%; text-align:center; }

    /* Typing indicator */
    .em-typing {
      align-self: flex-start;
      background: #1a1d26;
      border: 1px solid rgba(255,255,255,0.07);
      padding: 10px 14px;
      border-radius: 12px;
      border-bottom-left-radius: 3px;
    }
    .em-dots { display:inline-flex; gap:4px; align-items:center; }
    .em-dots span {
      width:5px; height:5px; border-radius:50%; background:#9aa3b8;
      animation: em-bounce 1.3s infinite ease-in-out;
    }
    .em-dots span:nth-child(2) { animation-delay:.2s; }
    .em-dots span:nth-child(3) { animation-delay:.4s; }
    @keyframes em-bounce {
      0%,60%,100% { transform:translateY(0); opacity:.6; }
      30%          { transform:translateY(-5px); opacity:1; }
    }

    /* Footer / input */
    .em-chat-ftr {
      padding: 10px 10px 12px;
      border-top: 1px solid rgba(255,255,255,0.07);
      display: flex;
      gap: 8px;
      align-items: flex-end;
      flex-shrink: 0;
      background: #0a0c12;
    }
    .em-chat-input {
      flex: 1;
      background: #1a1d26;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      color: #e8eaf0;
      font-family: inherit;
      font-size: 13.5px;
      padding: 8px 12px;
      resize: none;
      outline: none;
      min-height: 38px;
      max-height: 100px;
      overflow-y: auto;
      transition: border-color .15s;
      line-height: 1.45;
    }
    .em-chat-input:focus { border-color: rgba(0,180,216,0.5); }
    .em-chat-input::placeholder { color:#5c6478; }
    .em-chat-input:disabled { opacity:.5; }
    .em-chat-send {
      width:36px; height:36px; border-radius:8px;
      background:#00b4d8; border:none; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
      transition: background .15s, transform .1s;
    }
    .em-chat-send:hover:not(:disabled) { background:#0090ae; }
    .em-chat-send:active:not(:disabled) { transform:scale(0.94); }
    .em-chat-send:disabled { background:#1a1d26; cursor:default; }
    .em-chat-send svg { width:16px; height:16px; fill:#fff; }
    .em-chat-send:disabled svg { fill:#5c6478; }
  `;

  // ── DOM references (set during init) ─────────────────────────────────────
  let msgsEl, inputEl, sendBtn, statusEl, panelEl;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function scrollDown() { msgsEl.scrollTop = msgsEl.scrollHeight; }

  function appendMsg(text, role) {
    const el = document.createElement('div');
    el.className = `em-msg em-msg-${role}`;
    el.textContent = text;
    msgsEl.appendChild(el);
    scrollDown();
    return el;
  }

  function appendSystem(text) { appendMsg(text, 'system'); }

  function showTyping() {
    if (document.getElementById('em-typing-el')) return;
    const el = document.createElement('div');
    el.id = 'em-typing-el';
    el.className = 'em-typing';
    el.innerHTML = '<div class="em-dots"><span></span><span></span><span></span></div>';
    msgsEl.appendChild(el);
    scrollDown();
  }

  function hideTyping() {
    const el = document.getElementById('em-typing-el');
    if (el) el.remove();
  }

  function setStatus(text, connecting) {
    statusEl.textContent = text;
    statusEl.className = 'em-chat-hdr-status' + (connecting ? ' em-connecting' : '');
  }

  function setSendEnabled(on) {
    sendBtn.disabled = !on;
    inputEl.disabled = !on;
  }

  // ── Session lifecycle ─────────────────────────────────────────────────────
  async function startSession() {
    setStatus('Connecting…', true);
    setSendEnabled(false);
    try {
      const resp = await fetch('/api/agent/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await resp.json();
      if (!resp.ok || !data.sessionId) throw new Error(data.error || 'No sessionId returned');
      sessionId = data.sessionId;

      // Silent priming message with page vehicle context
      const ctx = getPageContext();
      if (ctx) {
        const priming = `[PAGE_CONTEXT] The customer is currently viewing the ${ctx.displayName} ${ctx.vehicleFamily} page (model: ${ctx.vehicleModel}, SKU: ${ctx.vehicleSku}). Do not ask which vehicle they are interested in — assume ${ctx.vehicleModel} unless they say otherwise.`;
        await sendSilentPrime(priming);

        // Show a small context pill above messages
        const pill = document.createElement('div');
        pill.className = 'em-ctx-pill';
        pill.textContent = `Viewing: ${ctx.displayName}`;
        panelEl.querySelector('.em-chat-msgs').before(pill);
      } else {
        appendMsg("Hi! I'm Elektra's Vehicle Advisor. Ask me anything about our vehicles, or I can help you book a test drive.", 'agent');
      }

      isSessionReady = true;
      setStatus('Online');
      setSendEnabled(true);

      if (pendingMessage) {
        const msg = pendingMessage;
        pendingMessage = null;
        await doSend(msg);
      }
    } catch (err) {
      console.error('[ChatWidget] Session start error:', err);
      setStatus('Offline', true);
      appendSystem('Could not connect to the agent. Please try again.');
    }
  }

  async function sendSilentPrime(text) {
    try {
      await fetch('/api/agent/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text, noStream: true }),
      });
    } catch (e) {
      console.warn('[ChatWidget] Priming message failed (non-fatal):', e.message);
    }
  }

  async function endSession() {
    if (!sessionId) return;
    const sid = sessionId;
    sessionId = null;
    isSessionReady = false;
    try {
      await fetch(`/api/agent/session/${sid}`, { method: 'DELETE' });
    } catch (_) { /* ignore */ }
  }

  // ── Panel open / close ────────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panelEl.classList.add('em-open');
    inputEl.focus();
    if (!sessionId) startSession();
  }

  function closePanel() {
    isOpen = false;
    panelEl.classList.remove('em-open');
    endSession();
  }

  // ── Send / stream ─────────────────────────────────────────────────────────
  async function doSend(text) {
    text = text.trim();
    if (!text || isSending) return;

    if (!sessionId || !isSessionReady) {
      pendingMessage = text;
      if (!sessionId) startSession();
      return;
    }

    // Capture email / name hints from user text
    const emailMatch = text.match(EMAIL_RE);
    if (emailMatch) capturedEmail = emailMatch[0];
    const nameMatch = text.match(/(?:I'?m|my name is|i am)\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/i);
    if (nameMatch) {
      if (nameMatch[1]) capturedFirstName = nameMatch[1];
      if (nameMatch[2]) capturedLastName  = nameMatch[2];
    }

    appendMsg(text, 'user');
    inputEl.value = '';
    inputEl.style.height = 'auto';
    isSending = true;
    setSendEnabled(false);
    showTyping();

    let agentEl  = null;
    let fullText = '';

    try {
      const resp = await fetch('/api/agent/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      // Parse SSE stream
      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';
      let evtName   = '';

      const flush = (line) => {
        if (line.startsWith('event:')) {
          evtName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const raw = line.slice(5).trim();
          if (!raw) return;
          let payload;
          try { payload = JSON.parse(raw); } catch (_) { return; }

          if (evtName === 'REPLY_MESSAGE') {
            const chunk = (payload.message && payload.message.text) || '';
            if (chunk) {
              hideTyping();
              if (!agentEl) agentEl = appendMsg('', 'agent');
              fullText += chunk;
              agentEl.textContent = fullText;
              scrollDown();
            }
          } else if (evtName === 'INFORM') {
            // Agent is working — keep typing indicator
            if (!agentEl) showTyping();
          } else if (evtName === 'ERROR') {
            hideTyping();
            appendSystem('An error occurred. Please try again.');
          }
          // END_OF_TURN handled after loop
        } else if (line === '') {
          evtName = '';
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        lines.forEach(flush);
      }
      // Flush remainder
      if (buffer) flush(buffer);

      hideTyping();

      // Check for booking confirmation in agent reply
      if (fullText && fullText.includes('test drive request has been received') && capturedEmail) {
        const ctx = getPageContext();
        fireTestDriveEvents({
          email:        capturedEmail,
          firstName:    capturedFirstName,
          lastName:     capturedLastName,
          vehicleModel: ctx ? ctx.vehicleModel : '',
          vehicleSku:   ctx ? ctx.vehicleSku   : '',
        });
      }
    } catch (err) {
      console.error('[ChatWidget] Send error:', err);
      hideTyping();
      if (!agentEl) appendSystem('Message failed. Please try again.');
    }

    isSending = false;
    setSendEnabled(true);
    inputEl.focus();
  }

  // ── Data Cloud events on booking ──────────────────────────────────────────
  function fireTestDriveEvents(data) {
    try {
      if (typeof EM === 'undefined') return;
      EM.identify({ email: data.email, firstName: data.firstName, lastName: data.lastName }, 'testDriveBooking');
      EM.track('testDriveRequest', {
        eventType:             'testDriveRequest',
        attributeVehicleModel: data.vehicleModel || '',
        attributeSkuCode:      data.vehicleSku   || '',
      });
      console.log('[ChatWidget] DC test drive events fired for', data.email);
    } catch (e) {
      console.warn('[ChatWidget] DC event error:', e.message);
    }
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────
  function init() {
    // Styles
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);

    // Toggle button
    const toggle = document.createElement('button');
    toggle.className = 'em-chat-toggle';
    toggle.setAttribute('aria-label', 'Chat with Elektra Vehicle Advisor');
    toggle.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
      <span class="em-chat-pulse"></span>
    `;

    // Panel
    const panel = document.createElement('div');
    panel.className = 'em-chat-panel';
    panel.innerHTML = `
      <div class="em-chat-hdr">
        <div class="em-chat-hdr-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </div>
        <div style="flex:1;min-width:0">
          <div class="em-chat-hdr-name">Elektra Vehicle Advisor</div>
          <div class="em-chat-hdr-status em-connecting" id="em-status">Initializing…</div>
        </div>
        <button class="em-chat-close" aria-label="Close chat">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="em-chat-msgs" id="em-msgs"></div>
      <div class="em-chat-ftr">
        <textarea id="em-input" class="em-chat-input" rows="1"
          placeholder="Ask about vehicles or book a test drive…"
          aria-label="Chat message" disabled></textarea>
        <button id="em-send" class="em-chat-send" disabled aria-label="Send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(panel);
    panelEl  = panel;
    msgsEl   = panel.querySelector('#em-msgs');
    inputEl  = panel.querySelector('#em-input');
    sendBtn  = panel.querySelector('#em-send');
    statusEl = panel.querySelector('#em-status');

    // Events
    toggle.addEventListener('click', () => isOpen ? closePanel() : openPanel());
    panel.querySelector('.em-chat-close').addEventListener('click', closePanel);

    sendBtn.addEventListener('click', () => doSend(inputEl.value));
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(inputEl.value); }
    });
    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
