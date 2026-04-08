/**
 * smooth-scroll.js — Smooth anchor scrolling + scroll-to-top button
 *
 * Features:
 *   1. Smooth scroll for any <a href="#section-id"> links on the page
 *   2. Scroll-to-top button that appears after scrolling 300px
 *
 * Data attributes:
 *   data-scroll-top             — place on any element to use as the scroll-to-top
 *                                  button. If not present, a button is auto-created.
 *
 * CSS variables used (can override in :root):
 *   --scroll-top-bg             — button background (default: var(--color-secondary))
 *   --scroll-top-color          — button text/icon color (default: white)
 *
 * Threshold: button appears after scrolling 300px.
 */

(function () {
  'use strict';

  // ── Smooth anchor scroll ──────────────────────────────────────────────────
  var NAV_OFFSET = 80;

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var targetId = link.getAttribute('href').slice(1);
    if (!targetId) return;
    var target = document.getElementById(targetId);
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    window.scrollTo({ top: top, behavior: 'smooth' });
  });

  // ── Scroll-to-top button ──────────────────────────────────────────────────
  var btn = document.querySelector('[data-scroll-top]');

  if (!btn) {
    btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.setAttribute('data-scroll-top', '');
    btn.textContent = '\u2B06'; // ⬆ upward arrow
    document.body.appendChild(btn);
  }

  // Inject styles
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    'html{scroll-behavior:smooth}',
    '[data-scroll-top]{',
    '  position:fixed;bottom:32px;right:32px;z-index:9999;',
    '  width:48px;height:48px;border-radius:50%;border:none;cursor:pointer;',
    '  background:var(--scroll-top-bg,var(--color-secondary,#C5963A));',
    '  color:var(--scroll-top-color,#fff);',
    '  font-size:24px;line-height:1;',
    '  box-shadow:0 4px 16px rgba(0,0,0,0.2);',
    '  opacity:0;transform:translateY(16px);pointer-events:none;',
    '  transition:opacity 0.3s ease,transform 0.3s ease;',
    '}',
    '[data-scroll-top].visible{opacity:1;transform:translateY(0);pointer-events:auto}',
    '[data-scroll-top]:hover{transform:translateY(-3px) !important;box-shadow:0 8px 24px rgba(0,0,0,0.25)}',
  ].join('');
  document.head.appendChild(styleEl);

  var THRESHOLD = 300;
  var ticking = false;

  function updateBtn() {
    if (window.scrollY > THRESHOLD) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(updateBtn);
      ticking = true;
    }
  }, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

})();
