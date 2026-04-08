/**
 * counter-animation.js — Scroll-triggered count-up animation
 *
 * Data attributes on each counter element:
 *   data-count-to="150"         — target number to count up to
 *   data-count-suffix="+"       — optional suffix appended after number (e.g. "+", "%", " States")
 *   data-count-prefix=""        — optional prefix before number (e.g. "$")
 *   data-count-duration="2000"  — animation duration in ms (default: 2000)
 *
 * Example HTML:
 *   <span data-count-to="150" data-count-suffix="+" data-count-duration="2000">0</span>
 *
 * The element's text content is set to the animated value during counting
 * and the final formatted value at completion.
 *
 * Uses Intersection Observer — fires once per element.
 * Respects prefers-reduced-motion (jumps to final value instantly).
 */

(function () {
  'use strict';

  var counterEls = document.querySelectorAll('[data-count-to]');
  if (!counterEls.length) return;
  if (!('IntersectionObserver' in window)) {
    // Fallback: just show final values
    counterEls.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count-to'), 10);
      var prefix = el.getAttribute('data-count-prefix') || '';
      var suffix = el.getAttribute('data-count-suffix') || '';
      el.textContent = prefix + target + suffix;
    });
    return;
  }

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count-to'), 10);
    var prefix = el.getAttribute('data-count-prefix') || '';
    var suffix = el.getAttribute('data-count-suffix') || '';
    var duration = parseInt(el.getAttribute('data-count-duration'), 10) || 2000;

    if (prefersReducedMotion) {
      el.textContent = prefix + target + suffix;
      return;
    }

    var startTime = null;
    var startValue = 0;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(startValue + (target - startValue) * eased);
      el.textContent = prefix + current + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = prefix + target + suffix;
      }
    }

    requestAnimationFrame(step);
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counterEls.forEach(function (el) {
    observer.observe(el);
  });

})();
