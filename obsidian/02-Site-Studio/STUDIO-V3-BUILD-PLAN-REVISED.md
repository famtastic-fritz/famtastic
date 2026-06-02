# FAMtastic Site Studio v3 — Revised Build Plan
## Incorporating Codex Adversarial Review + Session Decisions

### What Changed From v3-Draft

The original plan was reviewed by Codex (GPT-5.4) via adversarial review. 
Core critique accepted: **content must be authored during generation, not 
extracted from rendered HTML afterward.** The extraction approach is lossy, 
brittle, and non-deterministic. This revision inverts the data flow.

Additionally, the full component hierarchy model (Page → Section → Component 
→ Field) and dynamic mutation tracking were defined during the session and 
are now incorporated throughout.

---

## Core Principle: Everything Is Dynamic

Components will change. CSS will change. Fields will be added and removed. 
Sections will reorder. JS files will be added to components. Colors, fonts, 
spacing — all mutable. The tracking system must handle **mutation**, not 
just capture.

Every level of the hierarchy carries:
- **Identity** — stable ID that survives rebuilds
- **Version** — increments on any change
- **Dependencies** — what depends on this, what this depends on
- **Mutation log** — what changed, when, by what action

When a component's CSS changes, the system must know: which pages use it, 
which platform conversions reference it, which skill generates it. All 
downstream dependents get flagged as potentially stale.

---

## The Hierarchy: Page → Section → Component → Field

This is the data model that makes everything else possible — content editing, 
component reuse, CMS conversion, and dynamic tracking.

### Level 1: Page
```json
{
  "page_id": "contact",
  "file": "contact.html",
  "title": "Contact",
  "nav_label": "Contact",
  "nav_order": 4,
  "sections": ["contact-hero", "contact-form", "faq", "contact-location"],
  "version": 3,
  "last_modified": "ISO"
}
```

### Level 2: Section
```json
{
  "section_id": "contact-form",
  "page": "contact",
  "section_type": "contact",
  "order": 2,
  "component_ref": "contact-form-standard",
  "component_version": "1.2",
  "version": 2,
  "last_modified": "ISO"
}
```

### Level 3: Component Instance
```json
{
  "instance_id": "contact-form-instance-001",
  "component_ref": "contact-form-standard",
  "component_version": "1.2",
  "overrides": {
    "css_variables": { "--form-accent": "#C9A96E" },
    "fields": {
      "phone": "(555) 867-5309",
      "email": "maria@readingsbymaria.com"
    }
  },
  "version": 3,
  "dependencies": {
    "css": ["contact-form.css"],
    "js": [],
    "images": ["contact-hero-slot"]
  }
}
```

### Level 4: Field
```json
{
  "field_id": "phone",
  "parent_component": "contact-form-instance-001",
  "parent_section": "contact-form",
  "parent_page": "contact",
  "type": "phone",
  "value": "(555) 867-5309",
  "html_selector": "[data-field-id='phone']",
  "editable": true,
  "version": 2,
  "last_modified": "ISO"
}
```

### How This Lives in spec.json

```json
{
  "pages": {
    "contact": {
      "page_id": "contact",
      "file": "contact.html",
      "title": "Contact",
      "nav_order": 4,
      "version": 3,
      "sections": [
        {
          "section_id": "contact-form",
          "order": 2,
          "component": {
            "ref": "contact-form-standard",
            "version": "1.2",
            "css": {
              "file": "contact-form.css",
              "variables": { "--form-accent": "#C9A96E" }
            },
            "js": [],
            "fields": [
              { "id": "phone", "type": "phone", "value": "(555) 867-5309" },
              { "id": "email", "type": "email", "value": "maria@readingsbymaria.com" },
              { "id": "address", "type": "address", "value": { "street": "742 Crescent Moon Lane", "city": "Port Saint Lucie", "state": "FL", "zip": "34952" } },
              { "id": "hours", "type": "hours", "value": { "days": "Tue-Sat", "times": "10am-7pm", "closed": "Sun, Mon" } },
              { "id": "form-heading", "type": "text", "value": "Begin Your Journey" },
              { "id": "form-cta", "type": "link", "value": { "text": "Schedule Your Reading", "href": "#booking" } }
            ]
          }
        }
      ]
    }
  }
}
```

### HTML Output With Identity Markers

When the build pipeline generates HTML, every level gets identity markers:

```html
<section data-section-id="contact-form" data-section-type="contact" data-section-order="2">
  <div data-component-ref="contact-form-standard" data-component-version="1.2">
    <h2 data-field-id="form-heading" data-field-type="text">Begin Your Journey</h2>
    <a data-field-id="phone" data-field-type="phone" href="tel:+15558675309">(555) 867-5309</a>
    <a data-field-id="email" data-field-type="email" href="mailto:maria@readingsbymaria.com">maria@readingsbymaria.com</a>
    <div data-field-id="address" data-field-type="address">
      742 Crescent Moon Lane, Suite 3<br>Port Saint Lucie, FL 34952
    </div>
    <div data-field-id="hours" data-field-type="hours">
      Tuesday - Saturday: 10:00 AM - 7:00 PM<br>Closed Sunday & Monday
    </div>
    <a data-field-id="form-cta" data-field-type="link" href="#booking" class="cta-button">
      Schedule Your Reading
    </a>
  </div>
</section>
```

Every `data-field-id`, `data-section-id`, and `data-component-ref` is a 
stable anchor. Surgical edits target these selectors. Rebuilds preserve 
these identities. CMS conversion maps these to platform-native structures.

---

## Content Authored During Generation (Codex Fix)

### The Inverted Flow

**Wrong (original plan):** Build HTML → parse HTML → extract fields
**Right (revised):** Define content in spec → build HTML using spec → 
HTML is a rendering of the spec, not the source of truth

### How Generation Works

The build prompt includes structured content requirements:

```
Generate the contact page. Use these content fields exactly as provided:

CONTENT FIELDS:
- field_id: phone, type: phone, value: "(555) 867-5309"
  → Render as a clickable tel: link with data-field-id="phone"
- field_id: email, type: email, value: "maria@readingsbymaria.com"
  → Render as a mailto: link with data-field-id="email"
...

Every field MUST include its data-field-id and data-field-type attribute
in the rendered HTML. These are stable anchors for editing and CMS conversion.

SECTION STRUCTURE:
- section_id: contact-form, type: contact, order: 2
  → Wrap in <section data-section-id="contact-form">
...
```

### When Content Fields Get Created

**During planning:** The brief/planning phase outputs section structure 
AND initial content fields. Phone number, email, address, hours, pricing — 
all defined before the build starts. These come from:
- The user's brief ("phone number is 555-867-5309")
- Research phase findings ("psychic sites typically offer these services")
- Component defaults ("contact-form-standard always has phone, email, address")

**During build:** Claude generates HTML that renders the spec's content 
fields. If the spec doesn't have a value for a field, Claude generates 
a sensible default AND writes it back to spec. After build, spec is 
always the complete source of truth.

**During edit:** Content edits update spec first, then surgically patch HTML.

---

## Surgical Content Editing (The Gap Fix)

### Classifier Fix

`content_update` intent gets proper triggers and **higher precedence** 
than `layout_update` and `bug_fix`:

Triggers: Any message containing an action verb + a content-type keyword:
- `(change|update|replace|edit|set|fix|correct|modify) + (phone|email|address|name|title|heading|hours|price|number|text|label|button|testimonial)`
- Must handle natural language: "the phone number should be...", 
  "make the email...", "update Maria's hours to..."

### No Plan Approval for Content Edits

Content-only edits bypass the plan gate entirely. The handler:
1. Parses the message to identify which field(s) to change
2. Looks up the field in spec.pages[page].sections[].component.fields[]
3. Updates the value in spec
4. Does a surgical HTML replacement using the data-field-id selector
5. No rebuild. No plan. Sub-second response.

### Cross-Page Content Edits

"Change the booking button text on ALL pages" → system iterates all pages, 
finds all fields matching the criteria, updates each one. Logs every change.

### Collateral Damage Prevention

Before patching, snapshot the HTML. After patching, verify:
- Only the targeted field's text content changed
- No structural changes (element count, nesting depth)
- No CSS changes
- No other field values changed
If verification fails, revert and flag for rebuild instead.

---

## Dynamic Mutation Tracking

### What Gets Tracked

Every change to every level of the hierarchy gets logged:

```json
{
  "mutations": [
    {
      "timestamp": "ISO",
      "level": "field",
      "target": "phone",
      "parent_component": "contact-form-instance-001",
      "parent_section": "contact-form",
      "parent_page": "contact",
      "action": "update",
      "old_value": "(555) 123-4567",
      "new_value": "(555) 867-5309",
      "source": "content_update_chat",
      "triggered_by": "user",
      "cascading_updates": []
    },
    {
      "timestamp": "ISO",
      "level": "component",
      "target": "hero-slider-v2",
      "action": "css_change",
      "old_value": { "--hero-accent": "#C9A96E" },
      "new_value": { "--hero-accent": "#4A1A2C" },
      "source": "template_config",
      "triggered_by": "user",
      "cascading_updates": [
        { "type": "page_stale", "pages": ["index", "about"] },
        { "type": "conversion_stale", "platform": "drupal" }
      ]
    }
  ]
}
```

### Dependency Graph

When a component changes, the system walks its dependency graph:
- **CSS change** → flag all pages using this component + flag platform conversions
- **JS added/removed** → flag pages + flag platform conversions + update component schema
- **Field added/removed** → flag pages + update editable canvas + update conversion schema
- **Section reordered** → update page manifest + update blueprint

### Collect Everything

Per Fritz: "we don't know what's important yet." The mutation log captures 
everything. The intelligence loop will eventually identify patterns:
- "Every time a hero component's CSS changes post-build, the Drupal 
  conversion breaks" → auto-flag
- "Price field edits cause card height changes 40% of the time" → 
  suggest layout review after price edits
- "Codex-generated components need field cleanup 60% of the time" → 
  add post-Codex validation step

---

## Component Skills System

### One Skill Per Component Type

Each component type gets a Claude Code skill in `.claude/skills/components/`:

```
.claude/skills/components/
  hero-slider/SKILL.md
  contact-form/SKILL.md
  pricing-table/SKILL.md
  testimonial-grid/SKILL.md
  ...
```

### What a Component Skill Contains

```markdown
# Contact Form Component Skill

## Identity
- Component type: contact-form
- Current version: 1.2
- Usage count: 7 (across all sites)

## Required Fields
- phone (type: phone) — always present
- email (type: email) — always present
- address (type: address) — optional
- hours (type: hours) — optional
- form-heading (type: text) — always present
- form-cta (type: link) — always present

## HTML Template
[the canonical HTML structure with data attributes]

## CSS Variables
--form-accent, --form-bg, --form-text, --form-border-radius, 
--form-input-bg, --form-button-style

## Platform Conversions

### Static (HTML + Tailwind)
[generation instructions]

### Drupal
- Paragraph type: contact_form
- Fields: field_phone (telephone), field_email (email), 
  field_address (address), field_hours (office_hours)
- Twig template: contact-form.html.twig
- Module: custom module if JS required

### WordPress
- Block: famtastic/contact-form
- Fields: phone (text), email (email), address (group), hours (group)
- Render: PHP template

### Next.js
- Component: ContactForm.tsx
- Props: { phone, email, address?, hours? }

## Lessons Learned
- v1.0: Address field lacked suite/unit line — added in v1.1
- v1.1: Hours format inconsistent — standardized to { days, times, closed }
- v1.2: Added data-field-type attributes for surgical editing support

## Known Issues
- Long addresses break card layout on mobile below 375px
- Hours display doesn't handle holiday exceptions
```

### Skills Grow Automatically

Every time a site uses a component:
1. If the skill doesn't exist, create it from the first build
2. If the skill exists, check for deviations from the template
3. Log any customizations as potential variant candidates
4. If the same customization happens 3+ times, propose a variant

Skills are the **living documentation** for each component. They capture 
what works, what breaks, and how to build for each platform. New sites 
benefit from everything previous sites taught the skill.

---

## Multi-Agent Pipeline + Cost Optimization

### Agent Routing

| Task | Default Agent | Fallback | Why |
|------|--------------|----------|-----|
| Domain research | Gemini CLI | Claude | Free tier, good at search |
| First-pass HTML generation | Codex | Claude | Cheaper, higher detail output |
| Content editing / iteration | Claude/Studio | — | Better at surgical edits |
| Component skill execution | Claude Code | Codex | Needs skill system access |
| Adversarial review | Codex | — | Different model perspective |
| Deploy + infrastructure | Claude/Studio | — | Integrated pipeline |

### Session Limit Fallbacks

When Codex hits a session limit:
1. Log the limit event (timestamp, task type, tokens used, limit hit)
2. Queue the task for Claude with a flag: `{ original_agent: "codex", fallback_reason: "session_limit" }`
3. Track cost delta (what this task cost on Claude vs what it would have cost on Codex)
4. Intelligence loop aggregates: "Codex hit limits on Tuesdays between 2-4pm" → 
   schedule heavy generation outside those windows

### Silent Failure Detection

Every agent call must have:
- Timeout with logging
- Output validation (did it produce valid HTML? Did it include data attributes?)
- Comparison against expected output structure
- If validation fails: log failure, retry once, then flag for review
- Never silently proceed with garbage output

### Cost Tracking

Every agent call logs:
```json
{
  "agent": "codex",
  "task": "first_pass_generation",
  "site": "readings-by-maria",
  "tokens_in": 4500,
  "tokens_out": 9990,
  "duration_seconds": 45,
  "cost_estimate": 0.00,
  "success": true,
  "fallback_used": false
}
```

Intelligence loop question: "Is the Codex-first pipeline actually cheaper 
when you account for the Claude editing pass that always follows?"

### Research: Always Looking for Cheaper/Faster

Permanent track in the weekly Gemini research script:
- New models with better price/performance for HTML generation
- API pricing changes across providers
- New tools or services that could replace parts of the pipeline
- Build time benchmarks across model versions
- Token efficiency patterns (which prompts waste tokens?)

---

## UI Architecture (Unchanged from v3-Draft)

### Layout: VS Code-Inspired

```
Left Sidebar (240px)     Center Canvas (flex)           Right Sidebar (280px)
├── Pages list           ├── Tab: Preview               ├── Settings
├── Section tree         ├── Tab: Editable View          ├── Template config
├── Nav editor           ├── Tab: Image Browser          ├── Deploy
├── Assets               ├── Tab: Model Comparison       ├── Component Library
└── Blueprint            ├── Tab: Component Manager      ├── Verification
                         └── Tab: Research View          └── Review
                         
                         Bottom CLI Bar (adjustable)
                         ├── Studio Chat
                         ├── Terminal
                         ├── Codex
                         └── [Future CLIs]
```

### CLI Routing Guide (Bottom Bar)

The system needs to know when to use which CLI:

| User Action | Route To | Why |
|-------------|----------|-----|
| Content edit (phone, email, price) | Studio Chat → content_update | Surgical, no rebuild |
| Structural edit (add section) | Studio Chat → layout_update or restructure | Needs rebuild |
| First-pass build | Codex (via API) | Cheaper, higher detail |
| Component generation | Claude Code (via skill) | Needs skill system |
| Code review | Codex adversarial review | Different perspective |
| Research | Gemini CLI | Free, good at search |
| Deploy | Studio Chat → deploy | Integrated pipeline |
| Bug investigation | Codex rescue | Task delegation |

### Canvas Workspace Screens

1. **Preview** — existing live preview (migrated to canvas tab)
2. **Editable Page View** — rendered page with click-to-edit on data-field-id elements
3. **Image Browser** — full-canvas search, compare, select (replaces QSF modal)
4. **Model Comparison** — side-by-side renders from different models
5. **Component Library Manager** — browse, preview, import, export, version
6. **Research View** — display research findings during pre-brief phase

---

## Build Sequence (Revised After Codex Review)

Codex was right: build the foundation before the furniture. Phase 0 is 
the content model and it must be rock solid before anything else.

### Phase 0: Content Data Layer + Hierarchy (Build First, Build Right)
- [ ] Define the Page → Section → Component → Field schema in spec.json
- [ ] Update build prompts to output content fields WITH identity markers
  - data-section-id, data-component-ref, data-field-id, data-field-type
- [ ] Content fields authored during planning (brief outputs field structure)
- [ ] Content fields populated during build (Claude fills values, writes to spec)
- [ ] Surgical content replacement via data-field-id selectors
- [ ] Fix content_update classifier (higher precedence, wider triggers)
- [ ] Bypass plan approval for content-only edits
- [ ] Content injection into rebuild prompts (spec.content is source of truth)
- [ ] Mutation tracking log (every change at every level)
- [ ] Dependency graph (component CSS change → flag pages + conversions)
- [ ] Tests: content field population, surgical edit, classifier routing, 
  cross-page edit, collateral damage detection
- **Verify by:** Re-run 10-edit content test. Target: 10/10 content_update, 
  0/10 full rebuilds, 0/10 plan approvals.

### Phase 1: Component Skills Foundation
- [ ] `.claude/skills/components/` directory structure
- [ ] Component schema (HTML template, CSS variables, fields, slots, 
  responsive, conversion status, lessons learned)
- [ ] Skill auto-creation on first use of a component type
- [ ] Skill update on subsequent uses (log deviations, propose variants)
- [ ] Component export (site → library with full hierarchy preserved)
- [ ] Component import (library → site with CSS variable portability)
- [ ] Component reference in spec.json (rebuild uses component, not raw HTML)
- [ ] Version tracking per component with dependency awareness
- **Verify by:** Export hero from Guy's Classy Shoes, import into new site 
  with different palette. Rebuild preserves component identity + content.

### Phase 2: UI Shell + Editable Canvas
- [ ] VS Code layout (sidebars, canvas, CLI bar)
- [ ] Tabbed canvas system
- [ ] Preview tab (migrate existing)
- [ ] Editable Page View tab (click data-field-id → inline edit → spec update → HTML patch)
- [ ] Left sidebar: pages list (click → open editable view), section tree
- [ ] Right sidebar: settings, deploy, verification, component library
- [ ] CLI bar with tabs (Studio Chat, Terminal, future Codex)
- [ ] Adjustable canvas/CLI height divider
- **Verify by:** Change phone number by clicking in editable view. All existing 
  features work in new layout. No regressions.

### Phase 3: Multi-Agent Integration
- [ ] Codex as default first-pass generator
- [ ] Codex output import into Studio (with component/field/section parsing)
- [ ] Session limit fallback (Codex → Claude with logging)
- [ ] Silent failure detection + validation on every agent call
- [ ] Cost tracking per agent call
- [ ] Model comparison canvas screen
- [ ] Codex tab in CLI bar
- [ ] Agent routing guide in UI
- **Verify by:** Build same site with Codex and Claude. Compare in canvas. 
  Import Codex version, edit with Claude, deploy.

### Phase 4: Image Browser + Research View
- [ ] Full-canvas image search (replaces QSF modal)
- [ ] Multi-provider grid with compare/select
- [ ] Research workspace screen
- [ ] Auto-trigger research for unfamiliar verticals
- [ ] Research → brief pipeline
- **Verify by:** Search hero images in full canvas. New vertical triggers 
  research before brief.

### Phase 5: Intelligence Loop Integration
- [ ] Weekly Gemini research script (existing, needs activation)
- [ ] Cost optimization track (permanent research category)
- [ ] Mutation pattern analysis (what changes cause cascading problems?)
- [ ] Component usage tracking (high-usage = high research priority)
- [ ] Agent performance tracking (which model is better for which task?)
- **Verify by:** Intelligence report shows actionable findings. At least one 
  finding gets promoted into the build pipeline.

### Ongoing: Playwright Automation
- Each phase gets a Playwright test that exercises the new functionality
- Content editing test: "click phone field, change value, verify surgical edit"
- Component test: "export hero, import to new site, verify identity preserved"
- Multi-agent test: "build with Codex, import, edit with Claude, deploy"
- Every test produces an execution log with gap analysis

---

## Success Criteria for This Milestone

Before scaling to the 60-site factory run:

1. **Content editing:** 10/10 test edits route to content_update, surgical 
   replacement, no rebuilds, no plan approvals
2. **Component hierarchy:** Page → Section → Component → Field tracked at 
   every level with version and dependency awareness
3. **Component reuse:** Export, import, version, and rebuild persistence 
   work with CSS variable portability
4. **Dynamic tracking:** Mutation log captures changes, dependency graph 
   flags stale downstream artifacts
5. **Multi-agent:** Codex builds, Claude edits, fallbacks work, costs tracked
6. **UI:** Canvas workspace with at least preview + editable view functional
7. **Skills:** At least 3 component skills created and growing from usage
8. **Playwright:** Autonomous site build exercises content editing + component 
   reuse in the same run

---

## Files Produced This Session

| File | Purpose |
|------|---------|
| FAMTASTIC-FUTURE-CAPABILITIES-PLAN.md | Long-term vision (template factory, conversion engine, platform skills) |
| STUDIO-V3-BUILD-PLAN.md (this file) | The next milestone build plan |
| guys-classy-shoes-logo.svg | Logo for Site #2 |
| CLAUDE-CODE-PROMPT-guys-classy-shoes-playwright.md | Playwright automation for Site #2 |
| CLAUDE-CODE-PROMPT-readings-by-maria-playwright.md | Research-first Playwright automation for Site #3 |

## Key Decisions Made This Session

1. Content model is authored during generation, not extracted afterward (Codex fix)
2. Page → Section → Component → Field hierarchy with identity at every level
3. Everything is dynamic — mutation tracking + dependency graph
4. Component skills in Claude Code grow with usage
5. Codex handles first-pass generation, Claude handles editing (cost optimization)
6. Collect everything for intelligence — we don't know what's important yet
7. CLI routing: Studio Chat for content/structural edits, Codex for generation/review, 
   Gemini for research
8. VS Code-inspired layout with tabbed canvas workspace
9. Editable page view solves content editing gap through the UI, not just chat
10. Session limit fallbacks with cost tracking, never silent failures
