# Studio Capability Registry

Last updated: 2026-04-08
Source: cli-handoff-pattern.json (street-family-reunion session)

---

## What Studio Chat Can Do (HTML + CSS)

- Full page layout with semantic HTML sections, nav, footer
- CSS parallax via `background-attachment: fixed` (static, no JS)
- Card hover lift with `transform: translateY` and `box-shadow` in CSS
- Basic slideshow structure (HTML slides + inline click handler)
- `loading="lazy"` attribute on images (native browser lazy loading)
- `scroll-behavior: smooth` on `html` element via CSS
- CSS Grid and Flexbox layouts, responsive breakpoints via Tailwind
- Color variables, typography system, brand tokens in `:root`
- SVG family tree diagrams
- PayPal form integration (static HTML form)
- Sticky nav, hero video section, testimonials, timeline

## What Requires CLI Handoff (JavaScript)

| Feature | JS Pattern | File |
|---|---|---|
| Parallax per-element speed control | `requestAnimationFrame` + `scrollY` | `parallax.js` |
| Scroll-reveal animations | `IntersectionObserver` | `parallax.js` |
| Slideshow auto-advance + crossfade | Timer + CSS opacity transitions | `slideshow.js` |
| Slideshow touch/swipe | `touchstart`/`touchend` delta | `slideshow.js` |
| Slideshow navigation dots | Dynamic DOM creation | `slideshow.js` |
| Card icon breakout effect | Dynamic `<style>` injection + `overflow:visible` | `card-animations.js` |
| Scroll-triggered count-up | `IntersectionObserver` + `requestAnimationFrame` | `counter-animation.js` |
| Scroll-to-top button visibility | `scroll` event + rAF throttle | `smooth-scroll.js` |
| Anchor scroll with nav offset | `click` delegation + `scrollTo` | `smooth-scroll.js` |
| Image fade-in on load | `IntersectionObserver` + `load` event | `lazy-load.js` |

## What Should Become Components

| Component | Files | Reuse Potential |
|---|---|---|
| `parallax-section` | `parallax.js` | High — any site with scroll animations |
| `animated-counter` | `counter-animation.js` | High — stats sections on every family/org site |
| `photo-slideshow` | `slideshow.js` | High — replaces inline script on any gallery site |
| `smooth-scroll` | `smooth-scroll.js` | High — standard utility, include in all sites |
| `lazy-load` | `lazy-load.js` | High — standard utility, include in all sites |

## What Studio Should Learn To Do (Future)

1. **Emit data-animate attributes** on any section that has staggered content, so `parallax.js` picks them up automatically without CLI adding them manually.
2. **Emit data-slideshow on slideshow containers** instead of inline `changeSlide()` script. Replace all inline slideshow scripts at build time.
3. **Emit data-count-to attributes** on stat number elements when a "stats" or "counter" section type is detected in the brief.
4. **Emit data-lazy on all images** and include `lazy-load.js` in every build automatically.
5. **Detect `data-slot-status="firefly-pending"`** and auto-trigger `firefly-generate` batch when credentials are available.
6. **Include `smooth-scroll.js` in every multi-section site** — this is always needed and has no downside.

## Routing Rules for Playwright

When Playwright encounters these task patterns in a Studio chat session, route accordingly:

| Task Pattern | Route To | Reason |
|---|---|---|
| "add parallax" | CLI | Needs `requestAnimationFrame` per-element scroll |
| "animate on scroll" / "fade in when scrolling" | CLI | Needs `IntersectionObserver` |
| "slideshow" / "auto-advance" / "crossfade" | CLI | Needs JS state (timer, touch tracking) |
| "counter animation" / "count up" | CLI | Needs `IntersectionObserver` + `requestAnimationFrame` |
| "scroll-to-top button" | CLI | Needs scroll listener + DOM creation |
| "smooth scroll" | Studio first, then CLI for scroll-to-top | CSS handles basic, JS needed for button |
| "hover effect" / "card lift" | Studio first | CSS-only possible; CLI if icon breakout or timing |
| "lazy load" | CLI | Fade-in needs `IntersectionObserver` + load event |
| "generate image" / "AI image" | Firefly script | Use `firefly-generate --batch` when credentials set |
| "replace video" / "hero image" | Firefly script | Generate `hero_family_reunion.jpg` via batch |

## Firefly Credential Gate

Adobe Firefly image generation is blocked until credentials are set:

```bash
export FIREFLY_CLIENT_ID=your_client_id
export FIREFLY_CLIENT_SECRET=your_client_secret

# Then generate images for street-family-reunion:
cd ~/famtastic
firefly-generate --batch scripts/firefly-batch-street-reunion.json
```

Pending images (tagged with `data-slot-status="firefly-pending"`):
- `sites/site-street-family-reunion/dist/assets/images/hero_family_reunion.jpg` — hero background
- `sites/site-street-family-reunion/dist/assets/images/firefly_gallery_reunion.jpg` — gallery feature

Setup guide: https://developer.adobe.com/firefly-services/docs/firefly-api/guides/
