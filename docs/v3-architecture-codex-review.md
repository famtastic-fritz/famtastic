# Codex Review: v3 Architecture Decisions

Reviewed [v3-architecture-decisions.md](v3-architecture-decisions.md).

## Findings

### 1. High: ID stability is not sound under rescan, reorder, or duplicate-value cases

The document says IDs are page-scoped sequential counters, may shift when DOM order changes, and recovery matches existing values by content text. That is not sufficient.

Why this breaks:
- Two fields can have the same value: two CTAs both saying "Learn More", repeated phone numbers, repeated addresses, duplicated testimonials.
- A field may be empty, partially edited, or AI-regenerated. Text matching then stops being a stable key.
- Rescan after reorder turns IDs into derived metadata instead of durable identity. That undermines any long-lived reference from `spec.content`, render targets, overrides, or imported component metadata.

Assessment for question 1:
- No, the current collision rules are not sufficient for durable identity.

What is missing:
- A stable origin anchor that survives reorder and rebuilds.
- The simplest form is persistent `data-*` markers in HTML for `section_id` and `field_id`.
- If generated HTML cannot reliably preserve markers, then store a stronger fingerprint per node: section ancestry, tag path, semantic role, surrounding text hash, and an extraction version.
- `max+1` is fine as an allocator, but not as the basis for identity recovery.

Recommended change:
- Treat IDs as write-once opaque identifiers.
- Preserve them in markup wherever possible.
- Use rescan only to discover new nodes, not to reassign existing IDs from DOM order.

### 2. High: The single-writer priority queue serializes writes, but does not solve real concurrent state conflicts

The queue is directionally right, but the implementation and guarantees are overstated.

Problems:
- `writeFn()` is treated as synchronous. If any write becomes async, `specWriteActive` is cleared too early and the lock is false.
- The queue only serializes execution order. It does not prevent stale-read problems when a build computes a patch from an old snapshot and applies it later.
- Priority reordering does not equal correctness. A late user edit may need to invalidate an older build result, not merely run before it.
- The examples talk about spec writes, but the system also edits HTML files. If `spec.json` and HTML are not under the same mutation protocol, you can still get split-brain state.
- Pure priority can starve lower-priority work if the user is actively editing.

Assessment for question 2:
- Not yet. It will handle simple single-process bursts, but it is not enough for real concurrent scenarios involving rebuilds, stale snapshots, async work, or coordinated `spec + HTML` updates.

Recommended change:
- Queue mutation objects, not arbitrary functions.
- Each mutation should read the latest committed state inside the critical section.
- Add a monotonic `spec_version` or revision token and reject/rebase stale build results.
- Make the queue `async` and `await` each mutation.
- Treat multi-file edits as one logical transaction: `spec.json`, page HTML, and any derived metadata should commit together or fail together.
- Coalesce or cancel obsolete build-result writes when a newer user edit supersedes them.

### 3. High: Render bindings are too selector-based and too US-specific for the stated edge cases

The model is good in spirit: canonical value plus multiple render targets. The current details are not enough for phone/address edge cases.

Phone issues:
- `tel:+1{digits_only}` hardcodes North America.
- Extensions, vanity numbers, international prefixes, and locale-specific display formats are not modeled.
- Matching by selectors like `a[href^='tel:']` is too broad when a page has multiple phone numbers.

Address issues:
- The canonical object is US-shaped: `street/city/state/zip`.
- It does not support country, province, postal code variants, multi-line street addresses, suite/unit, or structured schema.org fields.
- A one-line formatter is not enough for contact cards, footer snippets, maps, or JSON-LD.

Assessment for question 3:
- No. The render binding model is a solid base, but it does not yet handle the edge cases you named.

Recommended change:
- Keep canonical structured values, but make them type-appropriate:
  - `phone`: `{ raw_input, country_code, national_number, extension, preferred_display, e164 }`
  - `address`: `{ lines[], locality, region, postal_code, country_code, formatted, schema_org }`
- Make transforms locale-aware and data-driven, not hardcoded string templates.
- Bind targets to stable element identities or field markers, not broad selectors alone.
- Support non-text targets explicitly: JSON-LD property paths, `meta` tags, ARIA labels, alt text, and split-address fragments.

### 4. Medium: Instance-on-import is the right default for v1, but the document overstates how complete it is

For a solo-developer tool, instance-on-import is the correct default. It avoids dependency management and surprise propagation. That part of the decision is sound.

Caveats:
- "Fork-on-edit" is not really a separate behavior here. Imported instances are already forked at import time.
- Re-import says content fields are preserved "if field_ids match", but the earlier rules frequently regenerate field IDs. That makes refresh brittle.
- If the library component evolves structurally, there is no stable slot-mapping model for merging preserved content into the refreshed instance.

Assessment for question 4:
- Yes, the decision is correct for v1.
- No, the current re-import story is not robust enough to rely on without stronger slot identity.

Recommended change:
- Keep instance-on-import as the default ownership model.
- Add explicit slot IDs inside components so re-import can map content by semantic slot, not by regenerated field IDs.
- Define user actions clearly: `detach`, `refresh from library`, `compare against library`, `export as new version`.

## Direct Answers

### 1. Are the ID collision rules sufficient?
No. `max+1` allocation is acceptable, but identity recovery by DOM order and value matching is not durable enough. Stable per-node IDs or fingerprints are required.

### 2. Will the single-writer priority queue handle real concurrent scenarios?
Partially. It handles simple single-process serialization, but not stale build outputs, async writes, coordinated HTML/spec commits, or obsolete write cancellation. It needs revision-aware mutations.

### 3. Does the render binding model handle edge cases?
Not yet. The canonical-value-plus-render-target approach is right, but the current phone and address representations are too narrow and the selectors are too ambiguous.

### 4. Is the instance-on-import decision correct for a solo-developer tool?
Yes. It is the right v1 tradeoff. The missing piece is a robust refresh/re-import mechanism based on stable slot identity.

## Recommended Decision Adjustments

1. Preserve `section_id` and `field_id` in generated HTML via `data-section-id` and `data-field-id`.
2. Introduce `spec_version` and make all writes revision-checked, async, and transactional across `spec.json` plus HTML.
3. Replace broad selector-only render targets with stable target IDs plus optional selector fallback.
4. Normalize canonical phone/address values into structured, locale-aware schemas.
5. Add stable component slot IDs so import, duplicate, and re-import can preserve content without relying on regenerated field IDs.

## Overall Assessment

The document is moving in the right direction and the ownership decision is appropriate for v1. The two architectural weak points are identity durability and write conflict handling. If those are corrected, the render-target model becomes viable and the rest of the document becomes much more defensible.
