/**
 * Navigation — scroll state + mobile hamburger
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

  // Active link
  const links = nav.querySelectorAll('.nav__links a');
  const path = window.location.pathname;
  links.forEach(link => {
    const href = new URL(link.href).pathname;
    if (href === path || (href !== '/' && path.startsWith(href))) {
      link.classList.add('active');
    }
  });
})();
