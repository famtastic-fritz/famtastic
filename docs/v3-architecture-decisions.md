# Studio v3 — Architecture Decisions

Resolves 4 architectural gaps identified by Codex adversarial review before Phase 0 begins. Each gap includes scenario analysis, the chosen rule, enforcement mechanism, failure mode, and recovery path.

---

## Gap 1: Identity Lifecycle

### ID Format

All IDs use the pattern: `{scope}-{type}-{counter}`

- **section_id**: `{page}-{section_type}-{n}` — e.g., `index-hero-1`, `contact-form-1`, `services-pricing-2`
- **field_id**: `{page}-{field_type}-{n}` — e.g., `index-phone-1`, `contact-email-1`
- **component_instance_id**: `{site_tag}-{component_ref}-{n}` — e.g., `site-guys-classy-shoes-hero-slider-1`
- **component_ref** (library): `{type}-{variant}` — e.g., `hero-slider`, `pricing-grid-v2`

Counter `{n}` is a sequential integer scoped to the page. Allocation: scan existing IDs on the page, take `max(n) + 1`. If no existing IDs, start at 1.

### Scenario Resolutions

**Scenario A: Two contact forms on the same page.**
- Rule: Sequential counter within page scope. First form: `contact-form-1`, second: `contact-form-2`.
- Mechanism: `extractContentFields()` scans the page top-to-bottom, assigns counters based on DOM order.
- Failure mode: If DOM order changes (sections reordered), IDs shift. But field values are matched by content, not position, so the content layer still finds the right field.
- Recovery: `POST /api/rescan` re-extracts all fields with fresh counters. Existing content values are preserved by matching on value text, not field_id.

**Scenario B: Import a component that collides with an existing one.**
- Rule: **Fork on import.** The imported component gets a new `component_instance_id` with the next available counter. The library ref is preserved as metadata but the site instance is independent.
- Mechanism: `importComponent()` reads the library component, generates a new instance ID, writes to the site's spec.json under `sections[page][section_id].component_instance_id`.
- Failure mode: Two instances with the same library ref on the same page. Allowed — they're separate instances that happen to share an ancestor.
- Recovery: N/A — this is the intended behavior.

**Scenario C: Section duplication ("copy the testimonials section").**
- Rule: New section_id, new field_ids, inherited component_ref.
- Mechanism: `duplicateSection(page, sectionId)` creates a deep clone. The clone gets `{page}-{type}-{max+1}` as section_id. All nested field_ids are re-generated with new counters. The `component_ref` (if any) stays the same — both instances reference the same library component but are independent instances.
- Failure mode: If the user edits one copy, the other is unaffected (correct behavior for instances).
- Recovery: If the user wants linked copies (rare), they'd need to use the same component ref with shared overrides — a future feature.

**Scenario D: Partial rebuild preserves section IDs.**
- Rule: Prompt injection. The build prompt for single-page edits includes the current section structure from `spec.content[page]` and explicitly instructs Claude: "Preserve these section IDs exactly: {list}. Do not rename, reorder, or remove sections unless the user explicitly requested it."
- Mechanism: In `buildPromptContext()`, when `requestType` is `layout_update` or `content_update`, inject the section ID list from `spec.content[page]`.
- Failure mode: Claude ignores the instruction and generates different section IDs. Post-processing detects the mismatch.
- Recovery: Post-processing reconciler (`reconcileContentFields`) compares spec.content section_ids against the generated HTML. If a section_id is missing from the HTML, it's flagged as a warning but the content value is preserved in spec.json for the next rebuild. If a new section_id appears in the HTML that wasn't in spec, it's registered as a new field.

**Scenario E: Site branching (copy site as starting point).**
- Rule: **Regenerate all instance IDs, preserve component refs.** When a site is copied, all `component_instance_id` values get new IDs scoped to the new site tag. Library `component_ref` values are preserved — both sites reference the same library component but with independent instances.
- Mechanism: `copySite(sourceTag, newTag)` deep-copies spec.json, then walks all component_instance_id fields and replaces the site_tag prefix.
- Failure mode: If the copy forgets to update instance IDs, two sites could theoretically conflict if they both write to the same spec path. But since spec.json is per-site-directory, this can't happen.
- Recovery: Run `POST /api/rescan` on the new site to re-extract all IDs.

### ID Allocation Summary

| ID Type | Scope | Format | Allocation Rule | Collision Handling |
|---------|-------|--------|----------------|-------------------|
| section_id | Per page | `{page}-{type}-{n}` | Sequential, max+1 | Scan existing, skip taken |
| field_id | Per page | `{page}-{fieldtype}-{n}` | Sequential, max+1 | Scan existing, skip taken |
| component_instance_id | Per site | `{tag}-{ref}-{n}` | Sequential, max+1 | Scan existing, skip taken |
| component_ref | Global library | `{type}-{variant}` | User-provided or auto-generated | Reject duplicate, prompt rename |

---

## Gap 2: Concurrency Control

### Chosen Model: Single-Writer Lock with Priority Queue

**Rationale:** Studio is a single-process Node.js server. There is exactly one `readSpec()`/`writeSpec()` cache. The system already uses a module-level `buildInProgress` flag (line 142 of server.js) that prevents concurrent builds. Extending this pattern to all spec writes is natural and low-complexity.

The priority queue ensures that user-initiated edits (content changes through the canvas) always win over background operations (post-processing, auto-save, Codex review writes).

### Implementation

```javascript
// Priority levels
const WRITE_PRIORITY = {
  USER_EDIT: 1,     // Canvas edits, chat content_update
  BUILD_RESULT: 2,  // Post-processing writes after build
  BACKGROUND: 3,    // Codex review, auto-summary, metrics
};

// Write queue
const specWriteQueue = [];
let specWriteActive = false;

function queueSpecWrite(priority, writeFn, label) {
  specWriteQueue.push({ priority, writeFn, label });
  specWriteQueue.sort((a, b) => a.priority - b.priority);
  processSpecWriteQueue();
}

function processSpecWriteQueue() {
  if (specWriteActive || specWriteQueue.length === 0) return;
  specWriteActive = true;
  const { writeFn, label } = specWriteQueue.shift();
  try {
    writeFn();
    console.log(`[spec-write] ${label} completed`);
  } catch (err) {
    console.error(`[spec-write] ${label} failed: ${err.message}`);
  }
  specWriteActive = false;
  // Process next in queue
  if (specWriteQueue.length > 0) {
    setImmediate(processSpecWriteQueue);
  }
}
```

### Scenario Resolutions

**Scenario A: User edits phone while rebuild is running.**
- What happens: The user edit is queued at PRIORITY 1 (USER_EDIT). The rebuild's post-processing writes are queued at PRIORITY 2 (BUILD_RESULT). The user edit executes first.
- User edit survival: **Guaranteed.** The user edit writes to spec.content immediately. When the rebuild finishes and post-processing runs `extractContentFields`, it reads the HTML (which still has the old phone number because the rebuild didn't include the edit). The reconciler detects that `spec.content` has a value that differs from the HTML — it preserves the spec.content value and patches the HTML to match.
- What the user sees: Phone number changes instantly in the editable canvas. After rebuild completes, the preview refreshes and shows the updated phone number (because post-processing patched it).

**Scenario B: Two rapid-fire content edits.**
- What happens: Both queue at PRIORITY 1. First edit executes, writes spec.content + patches HTML. Second edit executes next, reads the updated spec.content, writes its change. Both succeed sequentially.
- Conflict possible? No — single-process Node.js event loop ensures sequential execution within the same priority level. The `setImmediate` between writes yields to allow other I/O but the writes themselves are atomic (synchronous `fs.writeFileSync`).
- What the user sees: Both edits apply, in order. No visible delay.

**Scenario C: Codex writes review while build is running.**
- What happens: Codex review result queues at PRIORITY 3 (BACKGROUND). Build queues at PRIORITY 2. Build writes first. Codex writes after build completes.
- Corruption possible? No — writes are sequential. Codex writes to a separate key (`spec.codex_review` or `sites/{tag}/codex-review.json`). Even if both wrote to the same key, the queue ensures they don't interleave.
- What the user sees: Build completes, then Codex review results appear.

### Key Rule: Content Edits Always Win

If post-processing extracts a field value that differs from what's in `spec.content`, the `spec.content` value is authoritative. Post-processing patches the HTML to match spec.content, not the other way around.

This ensures that user edits made between builds are never overwritten.

---

## Gap 3: Multi-Target Field Rendering

### Render Binding Model

Each content field has a `value` (the canonical data) and one or more `render_targets` that describe where and how the value appears in HTML.

```json
{
  "field_id": "contact-phone-1",
  "type": "phone",
  "value": "(555) 867-5309",
  "scope": "global",
  "render_targets": [
    {
      "page": "contact.html",
      "selector": "a[href^='tel:']",
      "attribute": "textContent",
      "transform": "display"
    },
    {
      "page": "contact.html",
      "selector": "a[href^='tel:']",
      "attribute": "href",
      "transform": "tel_href"
    },
    {
      "page": "*",
      "selector": "footer a[href^='tel:']",
      "attribute": "textContent",
      "transform": "display"
    },
    {
      "page": "*",
      "selector": "footer a[href^='tel:']",
      "attribute": "href",
      "transform": "tel_href"
    }
  ],
  "transforms": {
    "display": "{value}",
    "tel_href": "tel:+1{digits_only}",
    "e164": "+1{digits_only}"
  }
}
```

### How Render Targets Are Discovered

**Phase 1 (automatic, during extractContentFields):**
- When a phone number is found, scan the entire page for ALL elements containing that number or its variants (digits-only, formatted, tel: link).
- Register each occurrence as a render target with the appropriate transform.
- For global fields (phone, email, business name), also scan other pages and register cross-page targets with `page: "*"`.

**Phase 2 (manual override):**
- The editable page view shows discovered render targets. Users can add/remove targets if the auto-discovery missed one or caught a false positive.

### Transform System

Transforms are per-type, not per-field. Defined once, applied everywhere.

```javascript
const FIELD_TRANSFORMS = {
  phone: {
    display: (value) => value, // "(555) 867-5309"
    tel_href: (value) => `tel:+1${value.replace(/\D/g, '')}`, // "tel:+15558675309"
    e164: (value) => `+1${value.replace(/\D/g, '')}`, // "+15558675309"
  },
  email: {
    display: (value) => value,
    mailto_href: (value) => `mailto:${value}`,
  },
  price: {
    display: (value) => `$${value.amount}`,
    raw: (value) => value.amount,
  },
  address: {
    display: (value) => `${value.street}, ${value.city}, ${value.state} ${value.zip}`,
    one_line: (value) => `${value.street}, ${value.city}, ${value.state} ${value.zip}`,
    structured: (value) => value, // returns the object
  },
};
```

### Surgical Edit with Multi-Target Update

When a user says "change the phone number to (555) 867-5309":

1. **Identify field:** Look up field by type "phone" in `spec.content`.
2. **Compute old transforms:** For the old value, compute all transforms (display, tel_href, e164).
3. **Compute new transforms:** For the new value, compute all transforms.
4. **For each render target:**
   - Read the page HTML.
   - Find the old transform at the target selector.
   - Replace with the new transform.
   - If `page: "*"`, iterate all pages.
5. **Write all modified pages.**
6. **Update spec.content with new value.**

This ensures the tel: href, display text, footer repeat, and any schema.org JSON-LD all update atomically.

### Global vs Local Fields

| Field Type | Scope | Discovery Rule |
|------------|-------|---------------|
| phone | global | Appears in footer, contact, possibly header. Search all pages. |
| email | global | Same as phone. |
| business_name | global | Logo alt, title tags, copyright, nav brand. Search all pages. |
| address | global | Contact page + footer. Search all pages. |
| hours | local-ish | Usually contact page only, but may appear in footer. Search all pages to be safe. |
| heading | local | Page-specific. Only search current page. |
| price | local | Services/pricing page only. |
| testimonial | local | Home or testimonials page. |
| cta_text | global | Appears on every page. Search all pages. |

### Missing Target Handling

If a render target points to a page that doesn't have the element (e.g., phone number is global but the about page has no phone in the footer):
- **Skip silently.** Don't create the element — that's a structural change, not a content edit.
- **Log a warning:** `[content] Render target footer a[href^='tel:'] not found on about.html — skipping`.
- The field value is still updated in spec.content. Next time the page is rebuilt, the build prompt includes the phone number from spec.content, and Claude may include it.

---

## Gap 4: Component Ownership Model

### Chosen Model: Instance-on-Import, Fork-on-Edit

Components exist in three states, but only two are actively used:

| State | When | Library Link | Auto-Update |
|-------|------|-------------|------------|
| **Inline** | First build, no library | None | N/A |
| **Instance** | After import from library | `component_ref` preserved as metadata | No — instance is independent |
| **Reference** | Reserved for future | Active link to library | Yes — library changes propagate |

**v1 uses Inline and Instance only.** Reference mode is deferred — it requires a dependency resolver and conflict detection system that adds complexity without immediate value for a solo-practitioner tool.

### Decision Matrix

| Action | Site Component Becomes | Library Updated? | Notes |
|--------|----------------------|-----------------|-------|
| First build, no library | **Inline** | No | Sections are pure HTML, no component metadata. `spec.content` tracks fields. |
| Export to library | Inline → **Instance** (component_ref added) | Yes — new entry | Site keeps its HTML unchanged. A `component_ref` is added to spec pointing to the new library entry. |
| Import from library | **Instance** (new instance_id) | No | Deep copy of component template. New field_ids generated. CSS variables applied from current site palette. |
| Edit instance on site | Stays **Instance** | No | Instance diverges from library original. `diverged_at` timestamp set. Library entry unchanged. |
| Library component updated | No effect on existing instances | N/A | Instances are independent. Only new imports get the updated version. |
| Re-import (update instance from library) | Instance overwritten | No | User explicitly pulls latest library version. Content fields preserved if field_ids match. |

### Schema for Component Tracking in spec.json

```json
{
  "sections": {
    "index.html": {
      "hero": {
        "section_id": "index-hero-1",
        "section_type": "hero",
        "order": 1,
        "component_ref": "hero-slider",
        "component_version": "2.1",
        "component_instance_id": "site-guys-classy-shoes-hero-slider-1",
        "imported_at": "2026-04-07T...",
        "diverged_at": null,
        "overrides": {
          "css_variables": { "--hero-accent": "#C9A96E" },
          "content_fields": { "heading": "Distinguished from the Sole Up" }
        }
      }
    }
  }
}
```

### Why Not Reference Mode in v1?

Reference mode (library changes auto-propagate to sites) requires:
1. A dependency graph (which sites use which components)
2. Conflict detection (library update changes a field that the site overrode)
3. A merge strategy (how to reconcile library updates with site customizations)
4. Notification system (alert site owner that a library component was updated)

For a solo developer building sites for clients, the overhead outweighs the benefit. Instance mode gives portability (import a hero from Site A into Site B) without the complexity of live linking.

Reference mode can be added later by:
- Adding a `"mode": "reference"` flag to the section's component metadata
- Running a nightly reconciler that checks referenced components against library versions
- Prompting the user to accept/reject updates

---

## Updated Schema Additions

These fields are added to `schemas/site-spec.schema.json`:

```json
{
  "slot_queries": {
    "type": "object",
    "description": "Per-slot preferred stock photo search queries",
    "additionalProperties": { "type": "string" }
  },
  "content": {
    "type": "object",
    "description": "Structured content fields per page, extracted from HTML",
    "additionalProperties": {
      "type": "object",
      "properties": {
        "fields": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "field_id": { "type": "string" },
              "type": { "type": "string", "enum": ["text","richtext","phone","email","address","hours","link","image","price","testimonial","list"] },
              "value": {},
              "element": { "type": "string" },
              "scope": { "type": "string", "enum": ["local","global"] },
              "editable": { "type": "boolean" },
              "render_targets": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "page": { "type": "string" },
                    "selector": { "type": "string" },
                    "attribute": { "type": "string" },
                    "transform": { "type": "string" }
                  }
                }
              }
            },
            "required": ["field_id","type","value"]
          }
        }
      }
    }
  },
  "sections": {
    "type": "object",
    "description": "Section-level metadata per page, including component references",
    "additionalProperties": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "section_id": { "type": "string" },
          "section_type": { "type": "string" },
          "order": { "type": "integer" },
          "component_ref": { "type": "string" },
          "component_version": { "type": "string" },
          "component_instance_id": { "type": "string" },
          "imported_at": { "type": "string" },
          "diverged_at": { "type": "string" },
          "overrides": { "type": "object" }
        }
      }
    }
  }
}
```

---

## Summary of Architectural Rules

1. **IDs are page-scoped sequential counters.** Format: `{page}-{type}-{n}`. Collisions resolved by max+1. Rescanning re-derives from DOM order.

2. **Single-writer priority queue for spec.json.** User edits (priority 1) always execute before build results (priority 2) and background tasks (priority 3). Content edits survive rebuilds because spec.content is authoritative over HTML extraction.

3. **Multi-target render bindings with type-based transforms.** A phone number field updates its display text, tel: href, and footer repeat atomically. Transforms are per-type (phone, email, address), not per-field. Missing targets are skipped with a warning.

4. **Instance-on-import, inline-by-default.** First builds produce inline sections. Library imports create independent instances. Editing an instance doesn't update the library. Reference mode (auto-propagation) is deferred to v2.
