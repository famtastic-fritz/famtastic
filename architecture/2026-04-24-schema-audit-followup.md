# Schema Audit Follow-up — colors/pages Required-Field Mismatch
**Date:** 2026-04-24  
**Status:** ready to scope  
**Session scope:** DEFERRED — not actioned in GAP-4 session  
**Identified by:** Codex Round 1 audit of spec schema vs creation paths

---

## The Mismatch

The spec schema (wherever it is implicitly enforced) treats `colors` and `pages`
as required fields. The two site-creation paths write neither or only one:

| Location | Line | Fields written |
|----------|------|----------------|
| `/api/new-site` handler | L4264 | `tag`, `site_name`, `business_type`, `state`, `tier`, `created_at`, `interview_pending`, `interview_completed`, optionally `client_brief` |
| `runAutonomousBuild` new-site branch | L7570 | adds `pages`, `client_brief` |
| `runAutonomousBuild` existing-site branch | L7542 | updates `client_brief`, `interview_*`, `pages` |
| `runAutonomousBuild` design_brief synthesis | L7781 | adds `design_brief`, sets `state: 'briefed'` |

`colors` is never written at creation time by any path.  
`pages` is written by autonomous paths but not by `/api/new-site`.

---

## Why It Was Deferred

This is a **pre-existing schema coherence problem** that predates GAP-4. Fixing it
requires a decision across three options, each with implications beyond tier:

### Option 1 — Relax the schema
Mark `colors` and `pages` as optional with `?` or remove them from required list.
- Simplest. Honest about what the system actually writes.
- Risk: downstream code that assumes these fields exist and doesn't guard.

### Option 2 — Split into creation-time vs built-time schemas
Create two schema variants: `SpecCreation` (minimal fields) and `SpecBuilt`
(full fields including colors, pages). Validate against the appropriate schema
at each lifecycle stage.
- Most correct. Higher implementation cost.
- Requires identifying all validation call sites.

### Option 3 — Normalize site creation to populate missing fields
Make every creation path write sensible defaults for `colors` (empty object `{}`)
and `pages` (empty array `[]` or vertical-inferred defaults).
- Pragmatic. Keeps a single schema.
- Risk: normalizing colors at creation time may conflict with client-supplied
  palette from the brief.

---

## Action Required

Before scoping, answer:
1. Does any code crash when `spec.colors` is absent? (Search for `spec.colors`
   accesses without optional chaining.)
2. Does any code crash when `spec.pages` is absent? (Same search.)
3. Is there a formal schema validator in use, or is this a documentation schema
   with no runtime enforcement?

If the answer to 1 and 2 is "no crashes" (guarded with `|| []` / `|| {}`), then
Option 1 (relax) is the right first step. Document the actual contract, then
decide if enforcement is needed.
