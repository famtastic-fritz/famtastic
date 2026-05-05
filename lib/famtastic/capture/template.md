# {{SURFACE}} Capture — {{SESSION_LABEL}}

**Date:** {{DATE}}
**Surface:** {{SURFACE}}
**Operator:** {{OPERATOR}}
**Source:** {{SOURCE_FILE}}
**Status:** PROPOSED CAPTURE — operator reviews before items land in canonical files

---

## How to use this template

Each item below is a single capture candidate. For each one:

1. Fill in the body
2. Set `STATUS:` to one of `pending` / `approved` / `rejected`
3. Confirm `LANDS IN:` points to the right canonical file/section
4. When ready: run `node lib/famtastic/capture/cli.js promote <this-file>` to write all `approved` items to their destinations

Items are separated by `---` lines. Don't remove the separators.

---

### D-{{DATE}}-XX — Decision title here

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Decision Log)

**Decision:** What was decided.
**Rationale:** Why.
**Implication:** What changes going forward.
**Related artifacts:** files / commits / docs.

---

### B-{{DATE}}-XX — Breakthrough title here

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Key Learnings)

What was realized. Why it matters. What it unlocks.

---

### G-{{DATE}}-XX — Gap title here

STATUS: pending
LANDS IN: .wolf/gaps.jsonl

**Symptom:** What's missing or broken.
**Frequency:** How often this has come up.
**Category:** NOT_BUILT / NOT_CONNECTED / BROKEN / INVESTIGATION_NEEDED
**Proposed fix:** What would close this.

---

### L-{{DATE}}-XX — Lesson title here

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Lessons / Do-Not-Repeat)

What we learned. How to apply it going forward.

---

### P-{{DATE}}-XX — Recurring pattern (watch-list)

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Patterns to Watch)

**Pattern:** What's recurring.
**Instances:** Specific examples.
**Promotion threshold:** When this becomes a standing rule (typically 3+ instances).

---

### C-{{DATE}}-XX — Contradiction to prior assumption

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Decision Log — revised entry)

**Prior assumption:** What we used to think.
**New evidence:** What changed our minds.
**Resolution:** What we now believe + which old entries to revise.

---

## Capture metadata

- **Cost to produce:** (manual time)
- **Items proposed:** (count after fill-in)
- **Items approved:** (count after Fritz review)

*Capture document generated: {{DATE}}*
*Status: PROPOSED — awaiting operator review*
