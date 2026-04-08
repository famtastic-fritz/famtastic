/**
 * slideshow.js — Auto-advancing crossfade slideshow with navigation dots
 *
 * Data attributes on the container:
 *   data-slideshow              — marks the container
 *   data-slideshow-interval="4000" — auto-advance interval in ms (default: 4000)
 *   data-slideshow-transition="800" — crossfade duration in ms (default: 800)
 *
 * Expected DOM structure:
 *   <div data-slideshow>
 *     <div class="slide"> ... </div>
 *     <div class="slide"> ... </div>
 *     <a class="prev" ...>❮</a>
 *     <a class="next" ...>❯</a>
 *   </div>
 *
 * CSS classes added by this script:
 *   .slide-active               — visible slide
 *   .slide-dots                 — dot nav container appended to parent
 *   .dot                        — individual dot
 *   .dot-active                 — active dot
 *
 * Touch/swipe: 40px horizontal threshold triggers prev/next.
 * Pauses on hover; resumes on mouse leave.
 */

(function () {
  'use strict';

  var containers = document.querySelectorAll('[data-slideshow]');
  if (!containers.length) return;

  // Inject styles once
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '[data-slideshow]{position:relative;overflow:hidden}',
    '[data-slideshow] .slide{display:block !important;position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;transition:opacity var(--ss-dur,0.8s) ease;pointer-events:none}',
    '[data-slideshow] .slide.slide-active{display:block !important;opacity:1;pointer-events:auto;position:relative;height:auto}',
    '.slide-dots{text-align:center;margin-top:16px}',
    '.dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:#ccc;margin:0 5px;cursor:pointer;transition:background 0.3s}',
    '.dot.dot-active{background:var(--color-secondary,#C5963A)}',
  ].join('');
  document.head.appendChild(styleEl);

  containers.forEach(function (container) {
    var slides = Array.from(container.querySelectorAll('.slide'));
    if (slides.length < 2) return;

    var interval = parseInt(container.getAttribute('data-slideshow-interval'), 10) || 4000;
    var duration = parseInt(container.getAttribute('data-slideshow-transition'), 10) || 800;
    container.style.setProperty('--ss-dur', (duration / 1000) + 's');

    var current = 0;
    var timer = null;
    var touchStartX = 0;

    // Build dot nav
    var dotsWrapper = document.createElement('div');
    dotsWrapper.className = 'slide-dots';
    slides.forEach(function (_, i) {
      var dot = document.createElement('span');
      dot.className = 'dot' + (i === 0 ? ' dot-active' : '');
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dot.addEventListener('click', function () { goTo(i); });
      dotsWrapper.appendChild(dot);
    });
    container.parentNode.insertBefore(dotsWrapper, container.nextSibling);

    function getDots() { return dotsWrapper.querySelectorAll('.dot'); }

    function goTo(n) {
      slides[current].classList.remove('slide-active');
      getDots()[current].classList.remove('dot-active');
      current = (n + slides.length) % slides.length;
      slides[current].classList.add('slide-active');
      getDots()[current].classList.add('dot-active');
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function startTimer() {
      clearInterval(timer);
      timer = setInterval(next, interval);
    }

    // Init first slide
    slides[0].classList.add('slide-active');
    startTimer();

    // Arrow buttons (existing or injected)
    var prevBtn = container.querySelector('.prev');
    var nextBtn = container.querySelector('.next');
    if (prevBtn) { prevBtn.addEventListener('click', function (e) { e.preventDefault(); prev(); startTimer(); }); }
    if (nextBtn) { nextBtn.addEventListener('click', function (e) { e.preventDefault(); next(); startTimer(); }); }

    // Hover pause
    container.addEventListener('mouseenter', function () { clearInterval(timer); });
    container.addEventListener('mouseleave', startTimer);

    // Touch swipe
    container.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    container.addEventListener('touchend', function (e) {
      var diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        diff > 0 ? next() : prev();
        startTimer();
      }
    }, { passive: true });
  });

})();
