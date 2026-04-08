/**
 * card-animations.js — Enhanced card hover with icon breakout effect
 *
 * Data attributes:
 *   data-card-enhanced          — opt-in card. Gets lift shadow + enhanced hover.
 *   data-card-icon              — icon element inside the card that breaks past
 *                                  the top border on hover (floats 20px above card edge).
 *
 * CSS classes added by this script:
 *   .card-enhanced-hover        — base enhanced card styles
 *   .card-icon-breakout         — icon breakout animation class
 *
 * Falls back to CSS-only transitions if script fails.
 * Respects prefers-reduced-motion.
 */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cards = document.querySelectorAll('[data-card-enhanced]');
  if (!cards.length) return;

  var styleEl = document.createElement('style');
  styleEl.textContent = [
    // Card base
    '[data-card-enhanced]{position:relative;transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.35s ease;overflow:visible !important}',
    '[data-card-enhanced]:hover{transform:translateY(-10px);box-shadow:0 20px 40px rgba(123,45,59,0.2)}',
    // Icon breakout
    '[data-card-icon]{transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1),filter 0.35s ease;display:inline-block}',
    '[data-card-enhanced]:hover [data-card-icon]{transform:translateY(-24px) scale(1.15);filter:drop-shadow(0 8px 16px rgba(123,45,59,0.3))}',
    // Image scale
    '[data-card-enhanced] img{transition:transform 0.5s ease;overflow:hidden}',
    '[data-card-enhanced]:hover img{transform:scale(1.06)}',
  ].join('');

  if (!prefersReducedMotion) {
    document.head.appendChild(styleEl);
  }

  // Keyboard accessibility: trigger on focus for icon breakout
  cards.forEach(function (card) {
    card.addEventListener('focusin', function () {
      card.classList.add('card-focused');
    });
    card.addEventListener('focusout', function () {
      card.classList.remove('card-focused');
    });
  });

})();
