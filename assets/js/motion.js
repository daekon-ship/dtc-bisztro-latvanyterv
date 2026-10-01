/* ==========================================================================
   DTC Bisztró – látványterv | mozgás
   reveal, navbar, parallax, timeline-progress, számlálók, magnetic, tilt,
   cursor-follow. Minden reduced-motion és touch-vezérlésre érzékeny.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var wide = window.matchMedia('(min-width: 900px)');

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }

  /* ------------------------------------------------------ 01. reveal ----- */
  function initReveal() {
    var items = [].slice.call(doc.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window) || reduce.matches) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------- 01b. hero belépés --- */
  function initHero() {
    var hero = doc.querySelector('.hero');
    if (!hero) return;
    if (reduce.matches) { hero.classList.add('in'); return; }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { hero.classList.add('in'); });
    });
  }

  /* --------------------------------------------------- 02. navbar -------- */
  function initNav() {
    var nav = doc.getElementById('nav');
    if (!nav) return;
    var ticking = false;
    function update() {
      nav.classList.toggle('is-scrolled', window.scrollY > 30);
      ticking = false;
    }
    on(window, 'scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();

    /* aktív menüpont */
    var links = [].slice.call(doc.querySelectorAll('.nav__links a'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) {
      var t = doc.querySelector(a.getAttribute('href'));
      if (t) map[t.id] = a;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = map[e.target.id];
        if (!link) return;
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    Object.keys(map).forEach(function (id) { io.observe(doc.getElementById(id)); });
  }

  /* --------------------------------- 03. parallax + timeline + sticky ----- */
  var parallaxEls = [].slice.call(doc.querySelectorAll('[data-parallax]'));
  var timeline = doc.querySelector('[data-timeline]');
  var stickyCta = doc.querySelector('.sticky-cta');
  var scrollTicking = false;

  function clearParallax() {
    parallaxEls.forEach(function (el) {
      el.style.removeProperty('transform');
      el.style.removeProperty('--px');
      el.style.removeProperty('--py');
    });
  }

  function frame() {
    scrollTicking = false;
    var vh = window.innerHeight;

    if (!reduce.matches && wide.matches) {
      parallaxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -240 || r.top > vh + 240) return;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0;
        var rel = (r.top + r.height / 2) - vh / 2;
        var y = -rel * speed;
        if (el.hasAttribute('data-cursor')) {
          el.style.setProperty('--py', y.toFixed(1) + 'px');
        } else {
          el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
        }
      });
    } else {
      clearParallax();
    }

    if (timeline) {
      var tr = timeline.getBoundingClientRect();
      var p = clamp((vh * 0.85 - tr.top) / (tr.height + vh * 0.3), 0, 1);
      timeline.style.setProperty('--p', p.toFixed(3));
    }

    if (stickyCta) {
      stickyCta.classList.toggle('is-on', window.scrollY > vh * 0.8);
    }
  }

  function requestFrame() {
    if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(frame); }
  }

  function initScroll() {
    on(window, 'scroll', requestFrame, { passive: true });
    on(window, 'resize', requestFrame);
    on(wide, 'change', requestFrame);
    requestFrame();
  }

  /* -------------------------------------------------- 04. számlálók ------ */
  function initCounters() {
    var els = [].slice.call(doc.querySelectorAll('[data-count]'));
    if (!els.length) return;

    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduce.matches) { el.textContent = target; return; }
      var start = null;
      var dur = 1000;
      function step(ts) {
        if (start === null) start = ts;
        var t = clamp((ts - start) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* -------------------------------------------------- 05. magnetic CTA ---- */
  function initMagnetic() {
    if (!fine.matches || reduce.matches) return;
    [].slice.call(doc.querySelectorAll('[data-magnetic]')).forEach(function (btn) {
      var raf = null;
      on(btn, 'pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.34;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          btn.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
          raf = null;
        });
      });
      on(btn, 'pointerleave', function () {
        btn.style.transition = 'transform .55s cubic-bezier(.16,1,.3,1)';
        btn.style.transform = '';
        window.setTimeout(function () { btn.style.transition = ''; }, 560);
      });
      on(btn, 'pointerenter', function () { btn.style.transition = ''; });
    });
  }

  /* ------------------------------------------ 06. cursor-follow (hero) ---- */
  function initCursor() {
    var els = [].slice.call(doc.querySelectorAll('[data-cursor]'));
    if (!els.length || !fine.matches || reduce.matches) return;
    var mx = 0, my = 0, cx = 0, cy = 0, running = false;

    on(window, 'pointermove', function (e) {
      mx = (e.clientX / window.innerWidth) - 0.5;
      my = (e.clientY / window.innerHeight) - 0.5;
      if (!running) { running = true; loop(); }
    }, { passive: true });

    function loop() {
      cx += (mx - cx) * 0.055;
      cy += (my - cy) * 0.055;
      els.forEach(function (el) {
        var f = (parseFloat(el.getAttribute('data-cursor')) || 0) * 120;
        el.style.setProperty('--cx', (cx * f).toFixed(2) + 'px');
        el.style.setProperty('--cy', (cy * f).toFixed(2) + 'px');
      });
      if (Math.abs(mx - cx) > 0.001 || Math.abs(my - cy) > 0.001) {
        requestAnimationFrame(loop);
      } else { running = false; }
    }
  }

  /* ---------------------------------------------------- 07. tilt ---------- */
  function initTilt() {
    if (!fine.matches || reduce.matches) return;
    [].slice.call(doc.querySelectorAll('[data-tilt]')).forEach(function (card) {
      on(card, 'pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = ((e.clientX - r.left) / r.width) - 0.5;
        var py = ((e.clientY - r.top) / r.height) - 0.5;
        var rx = clamp(-py * 2.4, -1.6, 1.6);
        var ry = clamp(px * 3.2, -2, 2);
        card.style.transform =
          'translateY(-4px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      });
      on(card, 'pointerleave', function () { card.style.transform = ''; });
      on(card, 'pointercancel', function () { card.style.transform = ''; });
    });
  }

  /* -------------------------------------------------- init ---------------- */
  function init() {
    initReveal();
    initHero();
    initNav();
    initScroll();
    initCounters();
    initMagnetic();
    initCursor();
    initTilt();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
