/**
 * Navigation — scroll state, mobile hamburger, active-link highlighting,
 * and runtime injection of a "Chat with Advisor" entry point that deep-links
 * into the custom MIAW chat at /chat.
 *
 * On model VDP pages (/models/electra-<slug>/), the link carries the
 * vehicleModel + vehicleSku as query params so the TestDriveForm inside
 * the chat pre-fills and the MIAW routingAttributes attach the context
 * to the conversation for the Agentforce bot.
 */
(function () {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  // Scroll class
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Mobile toggle
  const hamburger = nav.querySelector('.nav__hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }

  // ─── Build the /chat URL with optional VDP context ─────────────────
  // Maps the VDP slug → canonical model name + SKU, sourced from the
  // existing EM.track('productView', ...) values on each model page.
  const VDP_CONTEXT = {
    'electra-beam':      { model: 'Electra Beam Plus',            sku: 'ELK-HATCH-PLUS' },
    'electra-harmonic':  { model: 'Electra Harmonic SE',          sku: 'ELK-SEDAN-AWD'  },
    'electra-ignite':    { model: 'Electra Ignite Platinum',      sku: 'ELK-TRUCK-PLAT' },
    'electra-megavolt':  { model: 'Electra Megavolt GT',          sku: 'ELK-COUPE-GT'   },
    'electra-reaktive':  { model: 'Electra Reaktive Touring',     sku: 'ELK-SUV-7'      },
    'electra-regulator': { model: 'Electra Regulator Performance',sku: 'ELK-EV-PERF'    },
  };

  function buildChatUrl() {
    const m = window.location.pathname.match(/^\/models\/(electra-[a-z]+)\//);
    if (!m) return '/chat';
    const ctx = VDP_CONTEXT[m[1]];
    if (!ctx) return '/chat';
    const qs = new URLSearchParams({
      vehicleModel: ctx.model,
      vehicleSku:   ctx.sku,
      currentPage:  window.location.pathname,
    });
    return '/chat?' + qs.toString();
  }

  // ─── Inject the "Chat" link into nav__links + nav__cta ─────────────
  //
  // The href is still the full /chat deep-link URL so the link is
  // semantically a real navigation — useful for right-click "open in new
  // tab", middle-click, users without JS, and search engines. The click
  // handler hijacks the normal left-click case and opens the floating
  // chat widget drawer instead (via window.ElektraChatLoader.open),
  // keeping the user on the current page.
  const chatHref = buildChatUrl();

  function openDrawerOrFollow(e) {
    // Respect modifier clicks and middle-click → let the browser handle it
    // as a real navigation to /chat.
    if (e.defaultPrevented) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.ElektraChatLoader && typeof window.ElektraChatLoader.open === 'function') {
      e.preventDefault();
      window.ElektraChatLoader.open();
    }
    // If the loader isn't available for some reason (failed to load), fall
    // through and let the browser navigate to /chat as the safe fallback.
  }

  const navLinks = nav.querySelector('.nav__links');
  if (navLinks) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = chatHref;
    a.textContent = 'Chat';
    a.addEventListener('click', openDrawerOrFollow);
    li.appendChild(a);
    navLinks.appendChild(li);
  }

  // Add a prominent cyan pill in the CTA area — becomes the primary path
  // while the native ESW widget is hidden.
  const navCta = nav.querySelector('.nav__cta');
  if (navCta) {
    const chatBtn = document.createElement('a');
    chatBtn.href = chatHref;
    chatBtn.className = 'btn btn-primary nav__cta-chat';
    chatBtn.textContent = 'Chat with Advisor';
    chatBtn.addEventListener('click', openDrawerOrFollow);
    // Insert as first child so it lands to the left of existing CTAs
    navCta.insertBefore(chatBtn, navCta.firstChild);
  }

  // Active-link highlighting (runs after the Chat link is added so it
  // can be the active one when we're at /chat).
  const links = nav.querySelectorAll('.nav__links a');
  const path = window.location.pathname;
  links.forEach(link => {
    const href = new URL(link.href).pathname;
    if (href === path || (href !== '/' && path.startsWith(href))) {
      link.classList.add('active');
    }
  });
})();
