# Capture-Packet Promotion Checklist

## Goal

Turn reviewed capture packets into canonical memory updates with a preview-first, approval-safe flow.

## Action Items

1. Add capture packet states: `review`, `approved`, `promoted`, `rejected`.
2. Add a dry-run command that shows proposed writes without mutating canonical files.
3. Map destinations: `SITE-LEARNINGS.md`, `FAMTASTIC-STATE.md`, `.wolf/cerebrum.md`, `.wolf/buglog.json`, gap ledgers, and task ledgers.
4. Detect duplicate decisions/gaps before proposing writes.
5. Require explicit packet id and destination list for apply mode.
6. Record proof entries for every promotion.
7. Keep canonical writes append-only or tightly scoped unless a correction is explicitly marked.

## Acceptance

- `fam-hub capture promote --dry-run <packet-id>` previews exact destinations.
- Apply mode creates a proof record and preserves rollback context.
- No capture packet can silently edit canonical memory.

## Hard Stops

- Do not promote from raw chat without a review packet.
- Do not update `.wolf/buglog.json` without structured bug fields.
