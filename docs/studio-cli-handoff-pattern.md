# Studio → CLI Handoff Pattern

Established: 2026-04-08
Validated on: Street Family Reunion site
Evidence log: `tests/automation/logs/cli-handoff-pattern.json`

---

## The Pattern

```
Studio Chat (HTML + CSS)
       │
       │  JS capability detected / needed
       ▼
   Gap logged
       │
       ▼
CLI (Claude Code) writes JavaScript
       │
       │  data-attribute configured, self-contained
       ▼
Script injected into HTML pages
       │
       ▼
Playwright refreshes preview + screenshots
       │
       ▼
High-reuse JS → Component library
       │
       ▼
Next site imports component
```

---

## Step-by-Step Protocol

### Step 1: Studio Chat — HTML + CSS first
Playwright sends the feature request to Studio chat. Studio handles:
- Section structure, semantic HTML
- CSS classes, Tailwind utilities
- Static data attributes (IDs, field types, slot metadata)
- Basic CSS transitions (hover lift, button scale)

Studio **cannot** handle:
- Any JavaScript (Intersection Observer, timers, event listeners)
- Dynamic DOM creation (auto-injected buttons, nav dots)
- State management (slideshow slide index, counter animation frame)

### Step 2: Detect the Gap
Studio's response tells you whether it handled JS:
- If Studio outputs a `<script>` block with `setInterval`, `addEventListener`, or `IntersectionObserver` → check if it's complete
- If Studio outputs only HTML/CSS → log the gap, trigger CLI
- If Studio outputs a partial inline script (basic click handler but no auto-advance) → log as "partial", CLI enhances

### Step 3: Log the Gap
Add entry to `tests/automation/logs/cli-handoff-pattern.json`:
```json
{
  "task_id": "unique-id",
  "studio_chat_message": "exact message sent",
  "studio_result": "what Studio produced",
  "studio_handled": false
}
```

### Step 4: CLI Writes the JavaScript
Rules for all CLI-written JS:
1. **Self-contained** — no external dependencies, no `import`/`require`
2. **IIFE wrapped** — `(function() { 'use strict'; ... })()`
3. **Data-attribute configured** — behavior controlled by HTML attributes, not hardcoded values
4. **Responsive** — check `window.innerWidth` for mobile disabling where appropriate
5. **Reduced motion** — check `prefers-reduced-motion` and skip or instant-show
6. **One file per concern** — parallax.js, slideshow.js, counter-animation.js, etc.
7. **Documented at top** — list all data attributes, CSS classes added, mobile behavior

### Step 5: Add Data Attributes to HTML
After writing the JS file, CLI adds the required data attributes to the HTML elements:
- `data-parallax-speed="0.3"` on sections
- `data-animate="fade-up"` on elements to reveal
- `data-slideshow` on slideshow containers
- `data-count-to="150"` on counter elements
- `data-lazy` on images
- `data-card-enhanced` on interactive cards

### Step 6: Inject Script Tags
Add `<script src="assets/js/filename.js"></script>` before `</body>` on all pages that need it.

### Step 7: Playwright Refresh + Verify
```javascript
await page.reload();
await page.waitForLoadState('networkidle');
await page.screenshot({ path: 'screenshots/after-js-enhancement.png' });

// Test scroll-triggered features
await page.evaluate(() => window.scrollBy(0, 500));
await page.waitForTimeout(800); // allow animations
await page.screenshot({ path: 'screenshots/scrolled.png' });
```

### Step 8: Evaluate Component Potential
After the JS is verified working, ask:
- **Is it reusable?** Would this work on the next 5 sites without modification?
- **Is it configurable?** Does it use data attributes instead of hardcoded values?
- **Is it portable?** Could it drop into Drupal, WordPress, Webflow with just HTML changes?

If yes to all three → create `components/[name]/component.json` + README.

### Step 9: Update Capability Registry
Add to `docs/capability-registry.md`:
- What Studio handled vs what CLI handled
- The routing rule for this task pattern
- Whether a component was created

---

## Component Library Location

```
~/famtastic/components/
  parallax-section/
    component.json      — schema, data attributes, platform notes
    parallax.js         — copy of the JS file
    README.md           — usage examples
  animated-counter/
    component.json
    counter-animation.js
    README.md
  photo-slideshow/
    component.json
    slideshow.js
    README.md
```

To use a component in a new site:
```bash
cp ~/famtastic/components/animated-counter/counter-animation.js \
   ~/famtastic/sites/site-[name]/dist/assets/js/counter-animation.js
```
Then add `<script src="assets/js/counter-animation.js"></script>` to the page.

---

## Firefly Image Generation

Firefly generates hero and gallery images when credentials are set.
The CLI pattern is:

```bash
# 1. Set credentials (once, in shell profile)
export FIREFLY_CLIENT_ID=your_client_id
export FIREFLY_CLIENT_SECRET=your_client_secret

# 2. Generate batch for a site
cd ~/famtastic
firefly-generate --batch scripts/firefly-batch-[site-name].json

# 3. Images saved to sites/[site]/dist/assets/images/
# 4. Playwright injects them into the site (update src attributes + remove data-slot-status="firefly-pending")
```

Slots awaiting Firefly generation are tagged with:
- `data-slot-status="firefly-pending"`
- `data-firefly-prompt="..."` — the exact prompt to use

---

## What This Means for Future Sites

Every site build now follows this sequence:
1. Studio generates HTML + CSS from the brief
2. Playwright runs the JS enhancement checklist (all 6 feature types)
3. CLI writes all JS features not handled by Studio
4. Firefly generates hero + gallery images when credentials available
5. Components reused from library — no JS rewritten from scratch after this session
6. Capability registry updated with any new gaps found
