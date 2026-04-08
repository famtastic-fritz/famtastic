/**
 * parallax.js — Multi-layer parallax + scroll-reveal animations
 *
 * Data attributes:
 *   data-parallax-speed="0.3"   — element scrolls at N× the natural scroll speed
 *                                  (0 = pinned, 1 = normal, 0.3 = slow drift)
 *   data-animate="fade-up"      — element fades in and slides up when entering viewport
 *   data-animate="fade-in"      — element fades in when entering viewport
 *
 * CSS classes added by this script:
 *   .is-visible                 — added when animate element enters viewport
 *   .parallax-ready             — added to body when parallax is initialized
 *
 * Disabled on mobile (<768px) for performance. Respects prefers-reduced-motion.
 */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = function () { return window.innerWidth < 768; };

  // ── Scroll-reveal (works on all viewports) ───────────────────────────────

  var animateEls = document.querySelectorAll('[data-animate]');

  if (animateEls.length && 'IntersectionObserver' in window) {
    // Inject base styles once
    var styleEl = document.createElement('style');
    styleEl.textContent = [
      '[data-animate]{opacity:0;transition:opacity 0.7s ease,transform 0.7s ease}',
      '[data-animate="fade-up"]{transform:translateY(40px)}',
      '[data-animate="fade-in"]{transform:none}',
      '[data-animate].is-visible{opacity:1;transform:translateY(0) !important}',
    ].join('');
    document.head.appendChild(styleEl);

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    animateEls.forEach(function (el) {
      if (!prefersReducedMotion) {
        revealObserver.observe(el);
      } else {
        el.classList.add('is-visible');
      }
    });
  }

  // ── Parallax (desktop only, no reduced-motion) ────────────────────────────

  if (prefersReducedMotion || isMobile()) return;

  var parallaxEls = document.querySelectorAll('[data-parallax-speed]');
  if (!parallaxEls.length) return;

  document.body.classList.add('parallax-ready');

  var ticking = false;

  function applyParallax() {
    var scrollY = window.scrollY;
    parallaxEls.forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0.3;
      var rect = el.getBoundingClientRect();
      var offsetTop = rect.top + scrollY;
      var relativeScroll = scrollY - offsetTop;
      var shift = relativeScroll * speed;

      // Apply to background image layers
      if (el.style.backgroundImage || el.tagName === 'SECTION') {
        el.style.backgroundPositionY = 'calc(50% + ' + shift + 'px)';
      } else {
        el.style.transform = 'translateY(' + shift + 'px)';
      }
    });
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', function () {
    if (isMobile()) {
      parallaxEls.forEach(function (el) {
        el.style.backgroundPositionY = '';
        el.style.transform = '';
      });
    }
  });

})();
