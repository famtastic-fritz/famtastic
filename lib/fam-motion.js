/**
 * fam-motion.js — FAMtastic scroll animation engine
 *
 * Watches elements with data-fam-animate attributes and applies
 * CSS animation classes when they enter the viewport.
 *
 * Usage:
 *   <div data-fam-animate="fade-up">...</div>
 *   <div data-fam-animate="fade-in" data-fam-delay="200">...</div>
 *   <script src="assets/js/fam-motion.js"></script>
 *
 * Animations (set via data-fam-animate):
 *   fade-up     — fade in + translate up
 *   fade-in     — simple fade in
 *   slide-left  — slide in from right
 *   slide-right — slide in from left
 *   zoom-in     — scale from 0.85
 *   bounce-in   — scale bounce effect
 *
 * Options (data-fam-* attributes):
 *   data-fam-delay="200"     — delay in ms before animation triggers
 *   data-fam-duration="600"  — animation duration in ms (default: 500)
 *   data-fam-threshold="0.2" — viewport intersection threshold (default: 0.15)
 *   data-fam-once            — only animate once (default behavior)
 *   data-fam-repeat          — animate every time element enters viewport
 */

(function () {
  'use strict';

  var CSS_INJECTED = false;

  var ANIMATIONS = {
    'fade-up': {
      from: 'opacity:0;transform:translateY(32px)',
      to: 'opacity:1;transform:translateY(0)',
    },
    'fade-in': {
      from: 'opacity:0',
      to: 'opacity:1',
    },
    'slide-left': {
      from: 'opacity:0;transform:translateX(48px)',
      to: 'opacity:1;transform:translateX(0)',
    },
    'slide-right': {
      from: 'opacity:0;transform:translateX(-48px)',
      to: 'opacity:1;transform:translateX(0)',
    },
    'zoom-in': {
      from: 'opacity:0;transform:scale(0.85)',
      to: 'opacity:1;transform:scale(1)',
    },
    'bounce-in': {
      from: 'opacity:0;transform:scale(0.7)',
      to: 'opacity:1;transform:scale(1)',
    },
  };

  function injectBaseStyles() {
    if (CSS_INJECTED) return;
    CSS_INJECTED = true;
    var style = document.createElement('style');
    style.id = 'fam-motion-styles';
    style.textContent = [
      '[data-fam-animate]{transition-property:opacity,transform;transition-timing-function:cubic-bezier(0.4,0,0.2,1);}',
      '[data-fam-animate].fam-animated{transition-duration:var(--fam-duration,500ms);}',
      '[data-fam-animate="bounce-in"].fam-animated{animation:famBounce var(--fam-duration,500ms) cubic-bezier(0.34,1.56,0.64,1) both;}',
      '@keyframes famBounce{0%{opacity:0;transform:scale(0.7)}60%{opacity:1;transform:scale(1.05)}100%{transform:scale(1)}}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function applyFromState(el, anim) {
    if (!anim) return;
    anim.from.split(';').forEach(function (rule) {
      var parts = rule.split(':');
      if (parts.length === 2) {
        el.style[parts[0].trim().replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })] = parts[1].trim();
      }
    });
  }

  function applyToState(el, anim, duration, delay) {
    if (!anim) return;
    el.style.setProperty('--fam-duration', duration + 'ms');
    el.classList.add('fam-animated');
    setTimeout(function () {
      anim.to.split(';').forEach(function (rule) {
        var parts = rule.split(':');
        if (parts.length === 2) {
          el.style[parts[0].trim().replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })] = parts[1].trim();
        }
      });
    }, delay || 0);
  }

  function init() {
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: show all animated elements immediately
      document.querySelectorAll('[data-fam-animate]').forEach(function (el) {
        el.classList.add('fam-animated');
      });
      return;
    }

    injectBaseStyles();

    var elements = document.querySelectorAll('[data-fam-animate]');
    if (!elements.length) return;

    elements.forEach(function (el) {
      var animKey = el.getAttribute('data-fam-animate');
      var anim = ANIMATIONS[animKey];
      if (anim) applyFromState(el, anim);
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var animKey = el.getAttribute('data-fam-animate');
        var anim = ANIMATIONS[animKey];
        var delay = parseInt(el.getAttribute('data-fam-delay') || '0', 10);
        var duration = parseInt(el.getAttribute('data-fam-duration') || '500', 10);
        var repeat = el.hasAttribute('data-fam-repeat');

        applyToState(el, anim, duration, delay);

        if (!repeat) {
          observer.unobserve(el);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    });

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for programmatic use
  window.FamMotion = {
    init: init,
    animations: ANIMATIONS,
    version: '1.0.0',
  };
})();
