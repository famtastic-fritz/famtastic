# Studio Inspection Suite — Seven New Audit Capabilities

## Context

Studio Visual Intelligence (Tier 1 file / Tier 2 browser) is working. The loop test revealed classifier gaps (fixed) and real site issues (overflow on mobile, empty hero-3, inconsistent slot IDs). Now we expand the inspection suite with seven new capabilities, all routed through the existing `inspectSite()` → `fileInspect()`/`browserInspect()` smart router.

## What Already Exists (don't rebuild)

- `scanBrandHealth()` — already checks: meta description, canonical, schema.org, viewport, title, lang, alt text coverage, OG image, twitter card
- `verifyCrossPageConsistency()` — already compares nav + footer HTML across pages
- `browserInspect()` — already checks `naturalWidth > 0` for broken images
- `fileInspect()` — already lists all images with slot attrs + alt text
- Preview server serves pages by path (`localhost:3333/about.html`)

## Seven New Capabilities

### 1. Accessibility Audit (Tier 1 — file-based)

**Trigger words:** `accessibility`, `a11y`, `aria`, `contrast`, `heading hierarchy`, `labels`

**Checks (added to `fileInspect`):**
- **Heading hierarchy:** h1 → h2 → h3 in order, no skipped levels, exactly one h1 per page
- **Alt text:** every img (except decorative `alt=""`) has meaningful alt text (not just "image" or "photo")
- **Form labels:** every `<input>` (except hidden/submit) has an associated `<label>` with `for=` matching `id=`
- **ARIA landmarks:** page has `<main>`, `<nav>`, `<header>`, `<footer>`
- **Link text:** no `<a>` with text "click here", "read more", or empty text
- **Lang attribute:** `<html lang="en">`

**NOT building** (needs browser): contrast ratios, keyboard navigation, focus indicators. These are Tier 2 and come later.

### 2. Performance Check (Tier 1 file + Tier 2 browser)

**Trigger words:** `performance`, `speed`, `asset sizes`, `page size`, `how heavy`, `load time`

**Tier 1 (fileInspect) checks:**
- Total HTML file size
- Count of external resources: `<script>`, `<link rel="stylesheet">`, `<img>`
- Inline CSS size (sum of all `<style>` blocks)
- Image count and estimated total size (file system stat on assets/)

**Tier 2 (browserInspect) checks:**
- Total network requests (via `page.metrics()` or request interception)
- Render-blocking resources (scripts without `async`/`defer`)
- Largest image dimensions vs displayed dimensions (oversized images)

### 3. Cross-Page Nav Consistency (Tier 1 — already exists, expose to chat)

**Trigger words:** `nav consistency`, `check nav across pages`, `compare navigation`

This already exists in `verifyCrossPageConsistency()`. We just need to:
- Add it as a keyword trigger in `fileInspect`
- Format the result as a readable report
- Run it across ALL pages, not just `currentPage`

### 4. Screenshot Comparison (Tier 2 — browser)

**Trigger words:** `screenshot`, `take a screenshot`, `capture`

Already partially built in `browserInspect`. Extend with:
- Save screenshots to `dist/assets/screenshots/{page}-{viewport}-{timestamp}.png`
- Return the path so Studio chat can display it (or the user can view it)
- Support viewport specification: "screenshot mobile", "screenshot tablet"

Before/after comparison is deferred — requires storing baseline screenshots and a diff algorithm. Log as future enhancement.

### 5. Form Validation Testing (Tier 1 — file-based)

**Trigger words:** `form`, `form validation`, `check the form`, `contact form`

**Checks:**
- Every `<form>` has an `action` attribute (or Netlify `data-netlify="true"`)
- Required fields have `required` attribute
- Email inputs have `type="email"`
- Phone inputs have `type="tel"`
- Every input has a `name` attribute
- Honeypot field exists for spam protection (Netlify pattern)
- Submit button exists inside the form

### 6. Link Checker (Tier 1 — file-based)

**Trigger words:** `check links`, `broken links`, `dead links`, `link checker`

**Checks:**
- Extract all `<a href="...">` from the page
- **Internal links:** check if the target file exists in dist/ (e.g., `about.html` → does `dist/about.html` exist?)
- **Anchor links:** check if `#section-id` matches an element with that `id` in the page
- **External links:** flag but don't check (no HTTP requests in Tier 1) — report count only
- **Empty hrefs:** flag `href=""` or `href="#"` as issues
- **mailto/tel:** validate format

### 7. SEO Audit (Tier 1 — file-based, extends scanBrandHealth)

**Trigger words:** `seo`, `seo audit`, `search engine`, `meta tags`, `check seo`

**Checks (beyond what scanBrandHealth already does):**
- **Title tag:** exists, length 30-60 chars, not generic ("Home" alone is bad)
- **Meta description:** exists, length 120-160 chars
- **Heading hierarchy:** exactly one h1, h2s present
- **Canonical URL:** present and valid
- **OG tags:** og:title, og:description, og:image, og:type all present
- **Schema.org JSON-LD:** present and valid JSON
- **Image alt text:** percentage of images with meaningful alt (not "image 1")
- **Robots meta:** no `noindex` accidentally set
- **Internal links:** all pages are reachable from nav

## Implementation Approach

All seven capabilities are **keyword-triggered extensions to `fileInspect()` and `browserInspect()`** — same pattern as the existing nav/header/hero/footer/color/font inspectors. No new handler needed, no new classifier intent. They all run through `visual_inspect`.

### Changes to `fileInspect()`:

Add seven new keyword blocks after the existing ones:

```javascript
// Accessibility
if (lower.match(/\b(accessib|a11y|aria|heading\s+hierarchy|labels?)\b/)) { ... }

// Performance (file-level)
if (lower.match(/\b(performance|speed|asset\s+sizes?|page\s+size|how\s+heavy)\b/)) { ... }

// Nav consistency (cross-page)
if (lower.match(/\b(nav\s+consistency|compare\s+nav|check\s+nav\s+across)\b/)) { ... }

// Form validation
if (lower.match(/\b(form|form\s+validation|contact\s+form|check\s+(?:the\s+)?form)\b/)) { ... }

// Link checker
if (lower.match(/\b(check\s+links?|broken\s+links?|dead\s+links?|link\s+checker)\b/)) { ... }

// SEO audit
if (lower.match(/\b(seo|search\s+engine|meta\s+tags?|check\s+seo)\b/)) { ... }
```

### Changes to `browserInspect()`:

Add performance network check:
```javascript
if (lower.match(/\b(performance|speed|load\s+time|network)\b/)) {
  // Count requests, check for render-blocking scripts, oversized images
}
```

### Changes to classifier:

Add to `visual_inspect` triggers:
```javascript
if (lower.match(/\b(accessibility|a11y|seo\s+audit|check\s+seo|check\s+links|broken\s+links|form\s+validation|check\s+(?:the\s+)?form|performance\s+check|page\s+size|screenshot)\b/)) return 'visual_inspect';
```

### Changes to report formatter:

Add format blocks in the `visual_inspect` handler for each new report type (same pattern as existing nav/header/images formatters).

## Files to Modify

| File | Changes |
|------|---------|
| `site-studio/server.js` | Extend `fileInspect()` with 6 new keyword blocks (~150 lines). Extend `browserInspect()` with performance check (~30 lines). Extend classifier with new trigger words (~2 lines). Extend report formatter in `visual_inspect` handler (~80 lines). |

## Verification

Test each capability via `studio-chat`:
1. `"accessibility check"` → heading hierarchy, alt text, form labels, ARIA landmarks
2. `"performance check"` → file sizes, resource counts, inline CSS
3. `"check nav across all pages"` → cross-page nav comparison
4. `"screenshot mobile"` → 375px screenshot saved to assets/
5. `"check the contact form"` → form validation report
6. `"check links"` → internal link validation, dead links
7. `"seo audit"` → meta tags, title length, heading hierarchy, OG tags, schema.org

Plus the spacing fix: type `"add more space above the footer"` in Studio chat — this routes through `layout_update` → Claude generates updated HTML with margin/padding above footer. That's existing functionality, not a new inspection.

## What's Deferred

- **Contrast ratio checking** — needs color parsing + WCAG formula, complex
- **Keyboard navigation testing** — needs tab-order tracing in Puppeteer
- **Screenshot diff (before/after)** — needs baseline storage + pixel comparison library
- **External link health** — needs HTTP requests, rate limiting, DNS resolution
- **Warm Puppeteer pool** — performance optimization, keeps browser alive between requests
