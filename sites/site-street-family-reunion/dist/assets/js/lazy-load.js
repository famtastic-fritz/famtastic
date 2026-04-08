/**
 * lazy-load.js — Lazy loading with fade-in for images
 *
 * Usage:
 *   Add loading="lazy" and data-lazy to any <img> you want to fade in on scroll.
 *   Script adds native lazy loading where supported, then layers on fade-in via
 *   Intersection Observer.
 *
 *   <img src="photo.jpg" loading="lazy" data-lazy alt="..." />
 *
 * If data-src is used instead of src (for no-JS fallback), the script will
 * swap data-src → src when the image enters the viewport.
 *
 *   <img data-src="photo.jpg" data-lazy alt="..." />
 *
 * CSS classes added:
 *   .lazy-pending   — added on init (opacity 0)
 *   .lazy-loaded    — added when image has loaded (triggers fade-in)
 *
 * Respects prefers-reduced-motion (images appear immediately, no transition).
 */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Inject styles once
  var styleEl = document.createElement('style');
  if (prefersReducedMotion) {
    styleEl.textContent = '[data-lazy]{opacity:1 !important}';
  } else {
    styleEl.textContent = [
      '[data-lazy].lazy-pending{opacity:0;transition:opacity 0.6s ease}',
      '[data-lazy].lazy-loaded{opacity:1}',
    ].join('');
  }
  document.head.appendChild(styleEl);

  var imgs = document.querySelectorAll('[data-lazy]');
  if (!imgs.length) return;

  function loadImage(img) {
    // Swap data-src if used
    var dataSrc = img.getAttribute('data-src');
    if (dataSrc) {
      img.src = dataSrc;
      img.removeAttribute('data-src');
    }

    function onLoad() {
      img.classList.remove('lazy-pending');
      img.classList.add('lazy-loaded');
    }

    if (img.complete && img.naturalWidth) {
      onLoad();
    } else {
      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onLoad, { once: true }); // still reveal on error
    }
  }

  if (!prefersReducedMotion) {
    imgs.forEach(function (img) { img.classList.add('lazy-pending'); });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          loadImage(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '100px' });

    imgs.forEach(function (img) { observer.observe(img); });
  } else {
    // Fallback: load all immediately
    imgs.forEach(loadImage);
  }

})();
