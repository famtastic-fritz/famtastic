# Studio Capability Registry

Last updated: 2026-04-08 (media providers updated)
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
5. **Detect `data-slot-status="google-pending"` or `data-slot-status="firefly-pending"`** and auto-trigger `google-media-generate` batch when appropriate.
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
| "generate image" / "AI image" | `google-media-generate` | Google Imagen 4.0 — $0.004/image, GEMINI_API_KEY |
| "replace video" / "hero image" | `google-media-generate --video` | Imagen 4 still → Veo 2 animate, ~33s, ~$0.05 |

## Media Provider Registry (confirmed working 2026-04-08)

### Google Imagen 4.0 + Veo 2.0 — PRIMARY ✅
- **Images:** `imagen-4.0-generate-001` — $0.004/image, ~7s, quality 9/10
- **Video:** `veo-2.0-generate-001` — ~$0.05/video, ~33s, 5s loop, 1.6MB MP4
- **Credentials:** `GEMINI_API_KEY` — active, ~$24.98 of $25 remaining
- **Script:** `scripts/google-media-generate`
- **Usage:** `google-media-generate --batch scripts/google-media-batch-[site].json`

### Adobe Firefly Web — SECONDARY (style reference only, no API) ⚠️
- **Available:** Firefly web app via Playwright browser automation ONLY
- **API:** NOT AVAILABLE — requires $1K+/mo enterprise plan. Do not attempt API calls.
- **Use for:** Style reference matching and custom model generation via Chrome automation
- **Method:** Claude-in-Chrome MCP → firefly.adobe.com shadow DOM traversal

### Leonardo.ai — BACKUP ✅
- **Images:** Phoenix 1.0 and 47 other models
- **Credits:** ~3278 API tokens remaining
- **Script:** To be built when needed
- **Quality:** 7/10 (less photorealistic than Imagen, more CGI look)

### NOT AVAILABLE
- Firefly API (enterprise $1K+/mo — confirmed not on our CC plan)
- Sora, Runway, Pika (not integrated)
