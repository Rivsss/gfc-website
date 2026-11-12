/* The Grasse Fragrance Co. — small site script (no dependencies) */
(function () {
  // Mark local/staging so the draft note shows only on localhost.
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    document.body.classList.add('is-local');
  }

  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Highlight the current page in the menu
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(function (a) {
    var href = a.getAttribute('href').split('/').pop();
    if (href === here || (here.indexOf('blog') === 0 && href === 'blog.html')) {
      a.classList.add('active');
    }
  });

  // Footer year
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Demo form handler: no backend on the static draft. Shows a success note.
  document.querySelectorAll('form[data-demo]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = form.parentElement.querySelector('.form-success');
      form.style.display = 'none';
      if (ok) ok.style.display = 'block';
    });
  });

  /* ------------------------------------------------------------------
     Motion (pairs with the MOTION block at the end of style.css)
     ------------------------------------------------------------------ */

  // Header tightens once the page scrolls. Two thresholds stop it flickering.
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (y > 70) header.classList.add('scrolled');
      else if (y < 20) header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  // What reveals on scroll. To keep an element still, add data-no-reveal to it.
  // [selector, extra class]. Items in the same row stagger automatically.
  var targets = [
    ['.section-head, .proofbar-inner, .cta .container > *, .article-nav, .band .container.narrow', ''],
    ['.split:not(.reverse) > :first-child, .split.reverse > :last-child', 'reveal-left'],
    ['.split:not(.reverse) > :last-child, .split.reverse > :first-child', 'reveal-right'],
    ['.card, .card-img, .tile, .branch, .path-card, .family, .value, .post-card, .contact-box, .bir-seal', ''],
    ['.feature-list > li, .check-list > li, .timeline > li, .faq-item, .stats > div', ''],
    ['.grid > .img-frame, .social-grid > a, .map-embed', 'reveal-zoom']
  ];

  // Hide the targets instantly (no fade-out), then switch transitions back on.
  var root = document.documentElement;
  root.classList.add('no-anim');

  var items = [];
  targets.forEach(function (t) {
    document.querySelectorAll(t[0]).forEach(function (el) {
      if (el.classList.contains('reveal') || el.hasAttribute('data-no-reveal')) return;
      if (el.closest('.hero, .page-hero, .site-header, .site-footer')) return; // heroes animate on load in CSS
      el.classList.add('reveal');
      if (t[1]) el.classList.add(t[1]);
      items.push(el);
    });
  });

  // Stagger: 90 ms per position within a visual row of siblings.
  var rows = new Map();
  items.forEach(function (el) {
    var key = el.parentElement;
    var top = Math.round(el.getBoundingClientRect().top);
    var row = rows.get(key);
    if (!row || Math.abs(row.top - top) > 40) { row = { top: top, n: 0 }; rows.set(key, row); }
    if (row.n) el.style.setProperty('--d', Math.min(row.n, 6) * 90 + 'ms');
    row.n++;
  });

  // Count-up for whole-number stats (2006, 20, 4). Text values are left alone.
  function countUp(el) {
    var text = el.textContent.trim();
    if (!/^\d+$/.test(text)) return;
    var end = parseInt(text, 10);
    var start = end > 100 ? end - 40 : 0;
    var t0 = null, dur = 1400;
    el.textContent = start;
    requestAnimationFrame(function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (end - start) * eased);
      if (p < 1) requestAnimationFrame(step);
    });
  }

  // After the reveal finishes, drop the classes so hover transitions are crisp.
  function settle(el) {
    el.classList.remove('reveal', 'in', 'reveal-left', 'reveal-right', 'reveal-zoom');
    el.style.removeProperty('--d');
  }

  void document.body.offsetWidth; // apply the hidden state with transitions off
  root.classList.remove('no-anim');
  void document.body.offsetWidth;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      io.unobserve(el);
      el.classList.add('in');
      var num = el.querySelector('.num');
      if (num && el.parentElement.classList.contains('stats')) countUp(num);
      var delay = parseInt(el.style.getPropertyValue('--d'), 10) || 0;
      setTimeout(function () { settle(el); }, 900 + delay);
    });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

  items.forEach(function (el) { io.observe(el); });
})();
