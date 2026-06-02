/* ============================================================
   Agent Business OS — landing.js
   Nav state, scroll reveals, ROI calculator, qualification form.
   ============================================================ */
(function () {
  'use strict';

  /* ----- Endpoint config -----
     Set window.ABOS_LEAD_ENDPOINT (e.g. "/api/lead") to POST leads to a
     backend. When unset, the form stores leads in localStorage so nothing
     is lost before the backend is wired. */
  var LEAD_ENDPOINT = window.ABOS_LEAD_ENDPOINT || '';

  var fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  /* ---------- Booking links ----------
     When window.ABOS_BOOKING_URL is set, "Book Strategy Call" CTAs open the
     scheduler in a new tab instead of scrolling to the on-page form. */
  (function wireBooking() {
    var url = window.ABOS_BOOKING_URL || '';
    if (!url) return;
    document.querySelectorAll('[data-booking]').forEach(function (a) {
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
  })();

  /* ---------- Nav: scrolled state + close mobile menu on click ---------- */
  var nav = document.querySelector('.site-nav');
  var navToggle = document.getElementById('nav-toggle');

  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.querySelectorAll('.nav-mobile-menu a').forEach(function (a) {
    a.addEventListener('click', function () { if (navToggle) navToggle.checked = false; });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- ROI calculator ---------- */
  var calc = document.getElementById('roi-calc');
  if (calc) {
    var fields = {
      leads:   document.getElementById('roi-leads'),
      close:   document.getElementById('roi-close'),
      deal:    document.getElementById('roi-deal'),
      lift:    document.getElementById('roi-lift'),
      cost:    document.getElementById('roi-cost')
    };
    var out = {
      figure:  document.getElementById('roi-figure'),
      annual:  document.getElementById('roi-annual'),
      added:   document.getElementById('roi-added'),
      cost:    document.getElementById('roi-cost-out'),
      multiple:document.getElementById('roi-multiple')
    };

    function num(el) { var v = parseFloat(el && el.value); return isNaN(v) ? 0 : Math.max(0, v); }

    function recalc(flash) {
      var leads = num(fields.leads);
      var close = Math.min(100, num(fields.close));
      var deal  = num(fields.deal);
      var lift  = Math.min(100, num(fields.lift));
      var cost  = num(fields.cost);

      // Incremental closed deals = leads * (lift percentage-points / 100)
      var addedDeals   = leads * (lift / 100);
      var addedRevenue = addedDeals * deal;
      var net          = addedRevenue - cost;
      var multiple     = cost > 0 ? (addedRevenue / cost) : 0;

      out.figure.textContent = fmt.format(Math.round(net));
      out.annual.textContent = fmt.format(Math.round(net * 12)) + ' / yr';
      out.added.textContent  = addedDeals.toFixed(1).replace(/\.0$/, '') + ' deals · ' + fmt.format(Math.round(addedRevenue));
      out.cost.textContent   = '-' + fmt.format(Math.round(cost));
      out.multiple.textContent = cost > 0 ? multiple.toFixed(1) + '×' : '—';

      out.figure.classList.toggle('flash', !!flash);
      if (flash) { setTimeout(function () { out.figure.classList.remove('flash'); }, 500); }
    }

    Object.keys(fields).forEach(function (k) {
      if (fields[k]) fields[k].addEventListener('input', function () { recalc(true); });
    });
    recalc(false);
  }

  /* ---------- Qualification form ---------- */
  var form = document.getElementById('apply-form');
  if (form) {
    var msg = document.getElementById('form-msg');
    var formInner = document.getElementById('apply-form-inner');
    var success = document.getElementById('apply-success');

    function setMsg(text, kind) {
      if (!msg) return;
      msg.textContent = text || '';
      msg.className = 'form-msg' + (kind ? ' ' + kind : '');
    }

    function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

    // Read controls via form.elements so a field named "name" doesn't
    // collide with the form's own .name property.
    function val(field) {
      var el = form.elements[field];
      return el ? String(el.value || '') : '';
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var data = {
        name:        val('name').trim(),
        email:       val('email').trim(),
        revenue:     val('revenue'),
        bottleneck:  val('bottleneck'),
        lift:        val('lift'),
        start7:      val('start7'),
        company_website: val('company_website'), // honeypot — real users leave this blank
        utm:         attribution(),
        submitted_at: new Date().toISOString()
      };

      if (!data.name) { setMsg('Please enter your name.', 'error'); return; }
      if (!validEmail(data.email)) { setMsg('Please enter a valid work email.', 'error'); return; }
      if (!data.bottleneck) { setMsg('Select your primary bottleneck.', 'error'); return; }

      setMsg('Submitting…', '');
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Submitting…'; }

      saveLead(data).then(function () {
        if (formInner && success) { formInner.classList.add('hidden'); success.classList.remove('hidden'); }
        else { setMsg('Request received — we will be in touch within one business day.', 'ok'); form.reset(); }
      }).catch(function () {
        // Local fallback so a lead is never lost.
        stash(data);
        if (formInner && success) { formInner.classList.add('hidden'); success.classList.remove('hidden'); }
      }).then(function () {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Submit Build Request'; }
      });
    });

    function saveLead(data) {
      if (LEAD_ENDPOINT) {
        return fetch(LEAD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (r) { if (!r.ok) throw new Error('bad status'); return r; });
      }
      // No backend configured yet — persist locally.
      stash(data);
      return Promise.resolve();
    }

    function stash(data) {
      try {
        var key = 'abos_leads';
        var arr = JSON.parse(localStorage.getItem(key) || '[]');
        arr.push(data);
        localStorage.setItem(key, JSON.stringify(arr));
      } catch (e) { /* storage unavailable — ignore */ }
    }
  }

  /* ---------- Attribution (UTM capture) ---------- */
  function attribution() {
    try {
      var p = new URLSearchParams(window.location.search);
      var out = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'].forEach(function (k) {
        if (p.get(k)) out[k] = p.get(k);
      });
      if (document.referrer) out.referrer = document.referrer;
      return out;
    } catch (e) { return {}; }
  }

  /* ---------- Footer year ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
