# FAMtastic Site Studio v3 — Build Plan
## The Next Milestone

This is not a future capabilities document. This is the next build.

Everything in this plan was validated by real test data from autonomous site 
builds (Guy's Classy Shoes, Readings by Maria), content editing gap tests 
(0/10 routed to content_update, 9/10 triggered full rebuilds), and model 
comparison testing (Claude vs Codex). The gaps are proven. The solutions 
are informed by what broke.

---

## Part 1: The Content Data Layer

### Why This Is First

The content editing test proved it: Studio treats every edit as a layout 
operation because there is no concept of "content" separate from "structure." 
Changing a phone number triggers a full page rebuild because the phone number 
only exists as text inside raw HTML.

This is also the foundation for everything else — the component library, 
CMS conversion, cross-build content persistence, and the editable canvas 
all depend on structured content.

### Content Field Schema

Every piece of editable content on every page gets captured as a structured 
field. This lives in `spec.json` under a new `content` key.

```json
{
  "content": {
    "index.html": {
      "sections": [
        {
          "section_id": "hero",
          "section_type": "hero",
          "order": 1,
          "fields": [
            {
              "field_id": "hero-heading",
              "type": "text",
              "value": "Distinguished from the Sole Up",
              "element": "h1",
              "editable": true
            },
            {
              "field_id": "hero-subheading",
              "type": "text",
              "value": "Luxury leather footwear, crafted for the discerning gentleman",
              "element": "p",
              "editable": true
            },
            {
              "field_id": "hero-cta",
              "type": "link",
              "value": { "text": "View Collection", "href": "/collections.html" },
              "editable": true
            },
            {
              "field_id": "hero-image",
              "type": "image",
              "slot_id": "hero-main",
              "slot_role": "hero",
              "dimensions": { "width": 1920, "height": 800 },
              "editable": true
            }
          ]
        },
        {
          "section_id": "contact-info",
          "section_type": "contact",
          "order": 3,
          "fields": [
            {
              "field_id": "phone",
              "type": "phone",
              "value": "(555) 867-5309",
              "editable": true
            },
            {
              "field_id": "email",
              "type": "email",
              "value": "maria@readingsbymaria.com",
              "editable": true
            },
            {
              "field_id": "address",
              "type": "address",
              "value": {
                "street": "742 Crescent Moon Lane, Suite 3",
                "city": "Port Saint Lucie",
                "state": "FL",
                "zip": "34952"
              },
              "editable": true
            },
            {
              "field_id": "hours",
              "type": "hours",
              "value": {
                "days": "Tuesday - Saturday",
                "times": "10:00 AM - 7:00 PM",
                "closed": "Sunday, Monday"
              },
              "editable": true
            }
          ]
        }
      ]
    }
  }
}
```

### Field Types

| Type | Value Format | CMS Mapping |
|------|-------------|-------------|
| `text` | string | Text field / Plain text |
| `richtext` | HTML string | Body / Formatted text |
| `phone` | string | Phone field |
| `email` | string | Email field |
| `address` | { street, city, state, zip } | Address field / composite |
| `hours` | { days, times, closed } | Hours field / composite |
| `link` | { text, href } | Link field |
| `image` | slot reference | Media/Image field |
| `price` | { label, amount, currency, duration? } | Number + text fields |
| `testimonial` | { author, text, rating? } | Paragraph type / content type |
| `list` | array of strings or objects | Multi-value field |

### How Content Fields Get Populated

1. **On build:** After HTML is generated, `extractContentFields(page, html)` 
   parses the rendered HTML and extracts structured content into spec.json.
   This mirrors how `extractAndRegisterSlots()` already works for images.

2. **On edit through chat:** When the classifier detects a `content_update` 
   intent, it identifies which field(s) to change, updates `spec.content`, 
   and does a **surgical HTML replacement** — not a full rebuild.

3. **On edit through canvas:** Direct editing in the workspace UI updates 
   `spec.content`, then the HTML is patched to match.

4. **On rebuild:** The build pipeline reads `spec.content` and injects field 
   values into the generated HTML. Content persists across rebuilds. 
   No more drifting copy, reverting link colors, or changing overlay text.

### Classifier Fix

Add proper routing for content edits:

- `content_update` intent needs stronger triggers and HIGHER precedence 
  than `layout_update`
- Phone, email, price, hours, name, address, testimonial changes should 
  NEVER route to `layout_update`
- `content_update` handler does field lookup + surgical replacement
- No plan approval required for content edits
- No full rebuild for content edits

---

## Part 2: Studio v3 UI Architecture

### Layout Model (VS Code-Inspired)

```
┌─────────────────────────────────────────────────────────────┐
│  Header Bar (site name, project picker, status indicators)  │
├────────┬──────────────────────────────────────┬─────────────┤
│        │                                      │             │
│  Left  │         Canvas / Workspace           │   Right     │
│  Side  │         (tabbed, multi-screen)        │   Side      │
│  bar   │                                      │   bar       │
│        │  ┌──────┬──────┬──────┬──────┐       │             │
│ Site   │  │Preview│Edit │Images│Compare│      │  Admin      │
│ Context│  └──────┴──────┴──────┴──────┘       │  Config     │
│        │                                      │  Settings   │
│ Pages  │    [active workspace screen]         │  Template   │
│ Struct │                                      │  Deploy     │
│ Nav    │                                      │  Component  │
│ Assets │                                      │  Library    │
│        │                                      │             │
│        ├──────────────────────────────────────┤             │
│        │  Chat / CLI Bar (adjustable height)  │             │
│        │  ┌──────┬───────┬──────┬─────┐       │             │
│        │  │Studio│Terminal│Codex │ ... │       │             │
│        │  └──────┴───────┴──────┴─────┘       │             │
│        │                                      │             │
│        │  [active CLI / chat interface]        │             │
└────────┴──────────────────────────────────────┴─────────────┘
```

### Left Sidebar — Site Context

The left sidebar is about the SITE — what exists, what's on each page, 
how it's structured.

- **Pages list** — Click a page name → opens it in the canvas as an 
  editable view. Shows page count, current page indicator.
- **Section tree** — Expandable per page. Shows sections in order. 
  Drag to reorder (future). Click to scroll preview to that section.
- **Navigation editor** — View and edit nav links, ordering, labels.
- **Assets panel** — Uploaded images, logo, stock photos. 
  Quick view of what's been filled vs empty.
- **Blueprint view** — Current blueprint.json visualization. 
  What sections exist, what components are in each.

Interaction: Clicking items in the left sidebar drives the canvas. 
Click a page → canvas opens editable view. Click an asset → canvas 
opens image browser focused on that slot.

### Right Sidebar — Admin & Config

The right sidebar is about STUDIO SETTINGS and CONFIGURATION — things 
that apply to the whole project, not a specific page.

- **Settings** — Model selection, deploy target, API keys (existing)
- **Template config** — Template-level CSS variables, fonts, color palette 
  editor. Edit the design tokens that apply across all pages.
- **Deploy panel** — Deploy status, environment selector, deploy history
- **Component Library browser** — Browse, search, import components. 
  See what's available, preview, add to current site.
- **Verification results** — Current verification status, check details, 
  run verification.

### Center Top — Canvas / Workspace

The canvas is a **tabbed workspace** that can hold multiple types of screens 
simultaneously. Tabs can be opened, closed, and rearranged.

**Built-in workspace screens:**

1. **Preview** (what exists today)
   - Live preview of the site in an iframe
   - Responsive toggle (mobile/tablet/desktop)
   - Page tabs for switching between pages

2. **Editable Page View** (NEW — the content editing solution)
   - Renders the page with editable content fields highlighted
   - Click on text → edit inline
   - Changes update `spec.content` → surgical HTML patch
   - Shows field type indicators (text, phone, email, price, etc.)
   - Preserves visual fidelity — you're editing the real rendered page, 
     not a form
   - Section boundaries visible for structural awareness

3. **Image Browser** (NEW — replaces the tiny QSF modal)
   - Full-workspace image search and selection
   - Multi-provider search (Unsplash, Pexels, Pixabay)
   - Preview grid with multiple results side by side
   - Compare, select, re-run search, import
   - AI image prompt generation (existing feature, better UI)
   - Adobe Creative Suite integration panel (future)

4. **Model Comparison View** (NEW)
   - Side-by-side or tabbed rendering of the same page built by 
     different models
   - Claude version vs Codex version vs [future model] version
   - Diff view showing structural differences
   - Quality metrics comparison (slots, sizes, accessibility scores)
   - "Pick winner" or "merge" actions

5. **Component Library Manager** (NEW)
   - Browse all saved components
   - Preview component with current site's CSS variables applied
   - Edit component fields/content
   - Version history per component
   - Platform conversion status (static ✓, Drupal ✓, WordPress ✗)
   - Import component into current site
   - Export component from current site to library

6. **Research View** (NEW — for the research-first pipeline)
   - Display research findings during the pre-brief phase
   - Competitive analysis results
   - Domain knowledge summary
   - Visual direction mood board
   - Feeds directly into brief creation

### Center Bottom — Chat / CLI Bar

The bottom section holds interactive CLI interfaces in tabs. Height is 
adjustable — drag the divider up for more chat, down for more canvas.

**CLI Tabs:**

1. **Studio Chat** (existing, enhanced)
   - Same chat interface, but now aware of the content data layer
   - Content edits route to `content_update` → surgical replacement
   - Structural edits route to `layout_update` or `restructure` → rebuild
   - Context-aware: knows which page and section are active in the canvas

2. **Terminal** (Phase 1.5, already planned)
   - Embedded terminal for direct CLI access
   - Runs Claude Code commands
   - Build logs, deploy output

3. **Codex** (NEW — uses the just-installed integration)
   - Codex review commands
   - Task delegation
   - Review results display
   - Adversarial review output

4. **Future CLI tools** — buttons for known tools, extensible for new ones

**Key principle:** All CLI tabs can interact with whatever is in the canvas. 
"Review what's in the preview" / "Edit the field I'm looking at" / 
"Compare these two versions" — the CLI always has context from the workspace.

---

## Part 3: Component Library System

### What a Component Is

A component is a reusable, portable, versionable building block with:

```json
{
  "component_id": "hero-slider-v2",
  "name": "Hero Image Slider",
  "type": "hero",
  "version": "2.1",
  "created_from": "guys-classy-shoes",
  "created_at": "2026-04-07T...",
  
  "html_template": "<section data-component='hero-slider'> ... </section>",
  
  "css": {
    "file": "hero-slider.css",
    "variables": {
      "--hero-bg": "#1A1A1A",
      "--hero-text": "#FFFFFF",
      "--hero-accent": "#C9A96E",
      "--hero-height": "80vh",
      "--hero-overlay-opacity": "0.4"
    }
  },
  
  "content_fields": [
    { "field_id": "heading", "type": "text", "default": "Your Heading Here" },
    { "field_id": "subheading", "type": "text", "default": "Supporting text" },
    { "field_id": "cta", "type": "link", "default": { "text": "Learn More", "href": "#" } },
    { "field_id": "slides", "type": "list", "item_type": "image", "min": 1, "max": 6 },
    { "field_id": "video_capable", "type": "boolean", "default": false }
  ],
  
  "slots": [
    { "slot_id": "hero-slide-1", "role": "hero", "dimensions": { "w": 1920, "h": 800 } },
    { "slot_id": "hero-slide-2", "role": "hero", "dimensions": { "w": 1920, "h": 800 } }
  ],
  
  "responsive": {
    "breakpoints": ["1024px", "768px", "480px"],
    "notes": "Slides stack to single image on mobile, CTA becomes full-width"
  },
  
  "platform_conversions": {
    "static": { "status": "complete", "files": ["hero-slider.html", "hero-slider.css"] },
    "drupal": { "status": "complete", "files": ["hero_slider.html.twig", "hero_slider.module"], "paragraph_type": "hero_slider" },
    "wordpress": { "status": "pending" },
    "nextjs": { "status": "pending" }
  },
  
  "usage_count": 4,
  "last_used": "2026-04-07T...",
  "tags": ["hero", "slider", "images", "video", "cta"],
  "variants": ["hero-slider-v1", "hero-slider-minimal"]
}
```

### Component Lifecycle

1. **Capture / Export:** Working on a site, see a section you like → 
   "Export this as a component." System extracts the HTML, isolates the CSS 
   into variables, identifies content fields and image slots, saves to library.

2. **Browse / Import:** Starting a new site, need a hero → open Component 
   Library Manager in the canvas. Search "hero." Preview with current site's 
   color palette applied. Import → component HTML injected with site's CSS 
   variables, content fields populated with defaults.

3. **Edit / Customize:** Component imported but needs tweaks. Edit content 
   fields through the editable canvas. Change CSS variables through the 
   template config panel. Component instance on the site diverges from 
   library original — that's fine.

4. **Update Library Entry:** Made the component better on this site? 
   Export the updated version back to library. Version increments. 
   Old version preserved.

5. **Convert:** Need Drupal version? The Drupal expert skill takes the 
   component definition and produces twig templates, paragraph types, 
   module code. Conversion status updates in the component record.

### Storage

Components live in `~/famtastic/components/` with one directory per component:

```
components/
  hero-slider-v2/
    component.json          (the schema above)
    hero-slider.html        (static template)
    hero-slider.css         (variables + styles)
    preview.png             (auto-generated thumbnail)
    conversions/
      drupal/
        hero_slider.html.twig
        hero_slider.module
      wordpress/
        (pending)
```

The component library index lives in `~/famtastic/components/library.json` — 
a searchable index of all components with metadata for quick lookup.

### Persistence Across Builds

When a site uses a component, `spec.json` references it:

```json
{
  "sections": {
    "hero": {
      "component_ref": "hero-slider-v2",
      "component_version": "2.1",
      "overrides": {
        "css_variables": { "--hero-accent": "#4A1A2C" },
        "content_fields": { "heading": "Distinguished from the Sole Up" }
      }
    }
  }
}
```

On rebuild, the build pipeline sees the component reference, loads the 
template, applies overrides, and generates the HTML. Content doesn't drift 
because it's in the structured data, not in Claude's generated output.

---

## Part 4: Multi-Agent Pipeline

### Validated by Test Data

The Codex vs Claude comparison on Readings by Maria showed:
- Codex: 94KB total, 17 image slots, 7 Sanskrit chakra names, all 6 prices
- Claude/Studio: 52KB total, 2 image slots, 0 Sanskrit names
- Claude/Studio: 8/10 content edits successful, full deploy pipeline

### Optimal Flow

```
Research (Gemini CLI) → Brief (Claude) → First Pass Build (Codex) 
  → Import to Studio → Edit/Refine (Claude) → Verify → Deploy
```

### Agent Roles

| Agent | Best At | Use For |
|-------|---------|---------|
| Claude/Studio | Iteration, editing, deployment, conversation | Brief creation, content edits, structural changes, deploy |
| Codex | First-pass generation, volume, detail | Initial HTML build, component generation, bulk content |
| Gemini CLI | Research, web search, information gathering | Domain research, competitive analysis, intelligence loop |
| Future models | TBD — model comparison view lets you test | A/B testing any new model's output |

### Cost Optimization

Claude is significantly more expensive per token than Codex. Route accordingly:
- Research tasks → Gemini (free tier)
- First-pass HTML generation → Codex (ChatGPT subscription)
- Content editing, iteration, deploy → Claude/Studio
- Reviews → Codex adversarial review (second opinion, different model)
- Rate limit fallbacks: if Claude is rate-limited, queue task for Codex

### Model Comparison Workspace

The canvas screen for model comparison enables ongoing evaluation:
- Run the same build prompt through multiple models
- Side-by-side visual comparison
- Automated scoring (slot count, accessibility, file size, content accuracy)
- Human judgment: "which would you ship?"
- Data feeds back into routing decisions

---

## Part 5: Research-First Pipeline

### Validated by Readings by Maria

The research phase produced measurably different brief quality:
- Color palette informed by competitive analysis
- Content structure informed by domain knowledge
- Stock photo queries informed by visual research
- Codex build included Sanskrit chakra names because the research 
  provided that domain knowledge

### Pipeline Step (Permanent)

The build pipeline is now:

```
Interview → Research → Brief → Build → Edit → Verify → Deploy
```

Research runs automatically when the interview identifies a domain the 
system doesn't have strong knowledge of. The `analyzeTechStack()` classifier 
can be extended to also trigger research for unfamiliar verticals.

### Research Output Structure

```
sites/{tag}/research/
  competitive-analysis.md
  domain-knowledge.md
  visual-direction.md
  brief-inputs.md          (synthesis → feeds directly into brief)
```

### Intelligence Integration

The weekly Gemini CLI research script (Tier 5 in FAMTASTIC-STATE.md) 
should also monitor:
- High-usage components (higher weight = higher research priority)
- Platform-specific updates (Drupal security, WordPress updates)
- New stock photo sources or AI image tools
- New CSS capabilities that could improve components
- Competitor moves in the site builder space

---

## Part 6: Playwright Automation (Level 3)

### What We Proved

Two autonomous builds ran successfully. The execution logs identified:
- Classifier gaps (restructure intent missing — fixed)
- Spec data flow gaps (pages not populated from brief — fixed)
- Plan handler gaps (silent drop — fixed)
- Pre-existing bugs (brainContext not passed — fixed)
- Content editing gaps (0/10 content_update, 9/10 full rebuilds)

### The Automation Architecture

```
Playwright (browser driver)
  ↓
Studio GUI (chat, buttons, canvas)
  ↓
AI Decision Layer (what to do next based on output evaluation)
  ↓
Execution Log (every step recorded, screenshots, timing, pass/fail)
  ↓
Gap Analysis (what failed, what needed manual intervention)
  ↓
Intelligence Loop (findings feed into next build)
```

### Per-Site Test Script Scope

Each autonomous build should exercise:
- Brief / interview (test planning flow)
- Research phase (if unfamiliar domain)
- Build from brief (test build pipeline)
- Stock photo fill (test image system)
- Brainstorm mode (test brainstorm flow)
- Content edits — phone, email, price, hours, names (test content layer)
- Structural edits — add section, remove section, reorder (test layout)
- Cross-page edits — change CTA on all pages (test cross-page capability)
- Admin functions — version history, brand health, rollback
- Component export (test component library)
- Verification (test quality pipeline)
- Deploy (test deploy pipeline)
- Codex review (test multi-agent review)

### Progressive Complexity

- Sites 1-5: Validate core pipeline + content editing
- Sites 6-10: Test research-first flow + component reuse
- Sites 11-20: Test platform conversion (first Drupal/WordPress builds)
- Sites 21-40: Scale, component library growing, routing optimization
- Sites 41-60: Advanced archetypes, edge cases, polish

---

## Build Sequence (What Gets Built When)

### Phase 0: Content Data Layer (Build First)
- [ ] Define field type schema
- [ ] Build `extractContentFields(page, html)` post-processor
- [ ] Add `content` key to spec.json
- [ ] Fix `content_update` classifier — higher precedence than `layout_update`
- [ ] Build surgical content replacement handler (no rebuild)
- [ ] Bypass plan approval for content-only edits
- [ ] Content injection into build prompts (rebuild pulls from spec.content)
- [ ] Tests for all field types
- **Verify by:** Re-run the 10-edit content test through Studio chat. 
  Target: 10/10 route to `content_update`, 0/10 trigger full rebuild.

### Phase 1: UI Shell — Layout + Canvas
- [ ] VS Code-inspired layout (left sidebar, right sidebar, center canvas, bottom CLI)
- [ ] Tabbed canvas system (open, close, rearrange tabs)
- [ ] Preview tab (migrate existing preview into canvas tab)
- [ ] Adjustable chat/canvas height divider
- [ ] Left sidebar: pages list, section tree (click page → opens in canvas)
- [ ] Right sidebar: settings, deploy, verification
- [ ] CLI bar with tab system (Studio Chat as first tab)
- **Verify by:** All existing functionality works in new layout. 
  No regressions in chat, preview, build, deploy.

### Phase 2: Editable Page View
- [ ] Canvas screen that renders page with editable field highlights
- [ ] Click-to-edit on text fields
- [ ] Field type indicators (visual cues for phone, email, price, etc.)
- [ ] Edit → updates spec.content → surgical HTML patch
- [ ] Section boundaries visible
- [ ] Works alongside preview tab (edit in one, see result in other)
- **Verify by:** Change phone number by clicking on it in editable view. 
  Change propagates to HTML without rebuild.

### Phase 3: Component Library Foundation
- [ ] Component schema definition
- [ ] `~/famtastic/components/` directory structure
- [ ] Export component from site (extract HTML, CSS variables, content fields, slots)
- [ ] Component Library Manager workspace screen
- [ ] Import component into site
- [ ] CSS variable portability (site palette applied to imported component)
- [ ] Component reference in spec.json
- [ ] Content persistence through component references on rebuild
- **Verify by:** Export hero from Guy's Classy Shoes, import into 
  Readings by Maria with different colors. Rebuild preserves content.

### Phase 4: Multi-Agent Integration
- [ ] Codex tab in CLI bar
- [ ] Model comparison workspace screen
- [ ] Side-by-side rendering
- [ ] Automated scoring (slots, size, accessibility)
- [ ] Route first-pass generation to Codex
- [ ] Import Codex output into Studio for editing
- [ ] Cost tracking per model
- **Verify by:** Build same page with Claude and Codex, compare in 
  workspace, pick winner, continue editing.

### Phase 5: Image Browser Workspace
- [ ] Full-canvas image search (replaces QSF modal)
- [ ] Multi-provider grid
- [ ] Compare, select, re-run, import workflow
- [ ] AI image prompt generation panel
- [ ] Adobe Creative Suite integration placeholder
- **Verify by:** Search for hero images, preview 12+ results, 
  compare, select — all without leaving the canvas.

### Phase 6: Research Integration
- [ ] Research workspace screen
- [ ] Auto-trigger research for unfamiliar verticals
- [ ] Research → brief pipeline (synthesis feeds into brief)
- [ ] Intelligence loop integration (Gemini CLI weekly research)
- **Verify by:** New site in unfamiliar vertical auto-triggers research, 
  research findings appear in workspace, brief quality is measurably better.

---

## Success Criteria for This Milestone

Before moving to the 60-site factory run at scale:

1. Content editing: 10/10 test edits route correctly, no full rebuilds
2. Component library: Export, import, version, and rebuild persistence work
3. Canvas workspace: At least 3 screen types functional (preview, edit, images)
4. Multi-agent: Codex build + Claude edit pipeline works end-to-end
5. Playwright automation: Site built autonomously with content edits included
6. UI: New layout doesn't regress any existing functionality

These are verified by running the test suite AND building a site autonomously 
through the Playwright automation with the content edit sequence included.
