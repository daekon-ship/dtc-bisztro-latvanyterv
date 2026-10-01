/* ==========================================================================
   DTC Bisztró – látványterv | UI
   mobil menü, lightbox, napi menü hidratálás, évszám
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }

  /* ------------------------------------------------- 01. mobil menü ------ */
  function initMobileMenu() {
    var burger = doc.querySelector('.burger');
    var menu = doc.getElementById('mobile-menu');
    if (!burger || !menu) return;
    var open = false;

    function setOpen(state) {
      open = state;
      burger.setAttribute('aria-expanded', String(state));
      burger.setAttribute('aria-label', state ? 'Menü bezárása' : 'Menü megnyitása');
      doc.body.style.overflow = state ? 'hidden' : '';
      if (state) {
        menu.hidden = false;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { menu.classList.add('is-open'); });
        });
        var first = menu.querySelector('a');
        if (first) window.setTimeout(function () { first.focus(); }, 260);
      } else {
        menu.classList.remove('is-open');
        window.setTimeout(function () { if (!open) menu.hidden = true; }, 460);
      }
    }

    on(burger, 'click', function () { setOpen(!open); });
    [].slice.call(menu.querySelectorAll('a')).forEach(function (a) {
      on(a, 'click', function () { setOpen(false); });
    });
    on(doc, 'keydown', function (e) {
      if (e.key === 'Escape' && open) { setOpen(false); burger.focus(); }
    });
    on(window, 'resize', function () {
      if (open && window.innerWidth >= 960) setOpen(false);
    });
  }

  /* ---------------------------------------------------- 02. lightbox ----- */
  function initLightbox() {
    var triggers = [].slice.call(doc.querySelectorAll('[data-lightbox]'));
    var box = doc.getElementById('lightbox');
    if (!triggers.length || !box) return;

    var img = box.querySelector('img');
    var cap = box.querySelector('figcaption');
    var closeBtn = box.querySelector('.lightbox__close');
    var prevBtn = box.querySelector('.lightbox__nav--prev');
    var nextBtn = box.querySelector('.lightbox__nav--next');
    var index = 0;
    var lastFocus = null;

    function show(i) {
      index = (i + triggers.length) % triggers.length;
      var t = triggers[index];
      var thumb = t.querySelector('img');
      img.src = t.getAttribute('data-lightbox');
      img.alt = thumb ? thumb.alt : (t.getAttribute('data-alt') || '');
      cap.textContent = (index + 1) + ' / ' + triggers.length;
    }

    function open(i) {
      lastFocus = doc.activeElement;
      show(i);
      box.hidden = false;
      doc.body.style.overflow = 'hidden';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { box.classList.add('is-open'); });
      });
      closeBtn.focus();
    }

    function close() {
      box.classList.remove('is-open');
      doc.body.style.overflow = '';
      window.setTimeout(function () {
        box.hidden = true;
        img.src = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }, 340);
    }

    triggers.forEach(function (t, i) {
      on(t, 'click', function () { open(i); });
    });
    on(closeBtn, 'click', close);
    on(prevBtn, 'click', function () { show(index - 1); });
    on(nextBtn, 'click', function () { show(index + 1); });
    on(box, 'click', function (e) { if (e.target === box) close(); });
    on(doc, 'keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
      if (e.key === 'Tab') {
        var f = [closeBtn, prevBtn, nextBtn];
        var at = f.indexOf(doc.activeElement);
        if (e.shiftKey && at === 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && at === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });

    /* mobil csúsztatás */
    var x0 = null;
    on(box, 'touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    on(box, 'touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 55) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  }

  /* -------------------------------------- 03. napi menü hidratálás ------- */
  function hydrateMenu() {
    var data = window.DTC_MENU;
    if (!data) return;

    function setField(key, value) {
      var el = doc.querySelector('[data-field="' + key + '"]');
      if (el && value) el.textContent = value;
    }

    if (data.fields) {
      Object.keys(data.fields).forEach(function (k) { setField(k, data.fields[k]); });
    }

    if (data.tags) {
      Object.keys(data.tags).forEach(function (k) {
        var list = doc.querySelector('[data-field="' + k + '"]');
        if (!list) return;
        list.textContent = '';
        data.tags[k].forEach(function (label) {
          var li = doc.createElement('li');
          li.textContent = label;
          list.appendChild(li);
        });
      });
    }

    if (data.sizes) {
      var sizes = doc.querySelector('.sizes');
      if (sizes) {
        sizes.textContent = '';
        data.sizes.forEach(function (s) {
          var li = doc.createElement('li');
          if (s.active) li.className = 'is-on';
          var b = doc.createElement('b');
          b.textContent = s.name;
          var span = doc.createElement('span');
          span.textContent = s.hint;
          li.appendChild(b);
          li.appendChild(span);
          sizes.appendChild(li);
        });
      }
    }
  }

  /* ------------------------------------------------- 04. évszám ---------- */
  function initYear() {
    var y = String(new Date().getFullYear());
    [].slice.call(doc.querySelectorAll('[data-year]')).forEach(function (el) {
      el.textContent = y;
    });
  }

  function init() {
    initMobileMenu();
    initLightbox();
    hydrateMenu();
    initYear();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
