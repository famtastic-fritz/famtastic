/**
 * fam-scroll.js — FAMtastic scroll-driven effects engine
 *
 * Lightweight companion to fam-motion.js. Where fam-motion.js animates
 * elements once as they enter the viewport, fam-scroll.js drives effects
 * continuously as the page scrolls: parallax backgrounds, sticky reveals,
 * progress-bar sections, and scroll-linked transforms.
 *
 * Usage:
 *   <div data-fam-scroll="parallax" data-fam-scroll-speed="0.4">...</div>
 *   <img data-fam-scroll="parallax-img" data-fam-scroll-speed="0.25" src="...">
 *   <section data-fam-scroll="pin" data-fam-scroll-duration="400">...</section>
 *   <div data-fam-scroll="reveal" data-fam-scroll-direction="left">...</div>
 *   <div data-fam-scroll="sticky-rotate" data-fam-scroll-deg="15">...</div>
 *
 * Effects (data-fam-scroll value):
 *   parallax        — translateY relative to scroll (speed 0.1–1.0)
 *   parallax-img    — same, optimized for <img>/<picture>
 *   pin             — element stays in place for N pixels of scroll (uses position:sticky)
 *   reveal          — scale/fade in as scroll progresses through viewport
 *   sticky-rotate   — rotate element as it scrolls through viewport
 *   scale-on-scroll — scale from 1→0.9 as leaving viewport
 *
 * Options (data-fam-scroll-* attributes):
 *   data-fam-scroll-speed="0.4"       — parallax speed multiplier (default 0.3)
 *   data-fam-scroll-duration="400"    — pin duration in px (default 300)
 *   data-fam-scroll-direction="left"  — reveal direction: left|right|up|down
 *   data-fam-scroll-deg="15"          — rotation amount for sticky-rotate
 *
 * The engine uses requestAnimationFrame + IntersectionObserver for
 * performance. Elements outside the viewport are not updated. All
 * transforms use GPU-accelerated translate3d/scale/rotate.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var tracked = [];
  var visible = new Set();
  var ticking = false;
  var lastScrollY = 0;

  function num(el, attr, def) {
    var v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? def : v;
  }

  function register(el) {
    var effect = el.getAttribute('data-fam-scroll');
    if (!effect) return;
    var data = {
      el: el,
      effect: effect,
      speed: num(el, 'data-fam-scroll-speed', 0.3),
      duration: num(el, 'data-fam-scroll-duration', 300),
      direction: el.getAttribute('data-fam-scroll-direction') || 'up',
      deg: num(el, 'data-fam-scroll-deg', 10),
    };
    if (effect === 'pin') {
      el.style.position = 'sticky';
      el.style.top = '0';
    }
    tracked.push(data);
  }

  function apply(data) {
    var rect = data.el.getBoundingClientRect();
    var vh = window.innerHeight;
    // progress = 0 when element first enters bottom of viewport,
    //            1 when it fully exits the top
    var progress = (vh - rect.top) / (vh + rect.height);
    progress = Math.max(0, Math.min(1, progress));

    switch (data.effect) {
      case 'parallax':
      case 'parallax-img': {
        var offset = (progress - 0.5) * rect.height * data.speed;
        data.el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
        break;
      }
      case 'reveal': {
        var eased = Math.pow(progress, 0.6);
        var scale = 0.85 + eased * 0.15;
        var dist = (1 - eased) * 40;
        var tx = 0, ty = 0;
        if (data.direction === 'left')  tx = -dist;
        if (data.direction === 'right') tx = dist;
        if (data.direction === 'up')    ty = dist;
        if (data.direction === 'down')  ty = -dist;
        data.el.style.opacity = eased.toFixed(3);
        data.el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ')';
        break;
      }
      case 'sticky-rotate': {
        var rot = (progress - 0.5) * 2 * data.deg;
        data.el.style.transform = 'rotate(' + rot.toFixed(2) + 'deg)';
        break;
      }
      case 'scale-on-scroll': {
        var s = 1 - progress * 0.1;
        data.el.style.transform = 'scale(' + s.toFixed(3) + ')';
        break;
      }
      case 'pin':
      default:
        // pin is handled via CSS position: sticky; nothing to update
        break;
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      for (var i = 0; i < tracked.length; i++) {
        var d = tracked[i];
        if (!visible.has(d.el)) continue;
        apply(d);
      }
      lastScrollY = window.scrollY;
      ticking = false;
    });
  }

  function initVisibility() {
    if (typeof IntersectionObserver !== 'function') {
      // fallback: treat everything as visible
      for (var i = 0; i < tracked.length; i++) visible.add(tracked[i].el);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
    }, { rootMargin: '100px 0px 100px 0px' });
    for (var j = 0; j < tracked.length; j++) io.observe(tracked[j].el);
  }

  function init() {
    var nodes = document.querySelectorAll('[data-fam-scroll]');
    for (var i = 0; i < nodes.length; i++) register(nodes[i]);
    initVisibility();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API for manual registration of dynamically added elements
  window.famScroll = {
    register: function (el) { register(el); if (visible.has(el) || !('IntersectionObserver' in window)) apply(tracked[tracked.length - 1]); },
    refresh: function () { onScroll(); },
  };
})();
