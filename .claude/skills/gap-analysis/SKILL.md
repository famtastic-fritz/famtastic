---
name: gap-analysis
description: |
  Repeatable deep-investigation + gap-analysis method: inventory what EXISTS, define
  what's NEEDED, diff the two, and report the gaps with severity + smallest fix +
  owner. Use when the user wants to "do a gap analysis", "audit X", "investigate
  what's missing", "find what's not wired", "what's left to build", "coverage
  check", or to reproduce the kind of investigation that produced the brain-wiring
  audit. Pairs with the deep-research skill (external facts) — this one is for
  auditing an existing system against its intended state.
metadata:
  author: famtastic
  version: "1.0"
  installed: 2026-06-04
---

# gap-analysis — investigate, diff, report

A disciplined, reproducible method for "what exists vs. what should exist." This is
the same shape as the brain-wiring audit: it produces a coverage table and a
sequenced fix list, not a vibe.

## The method (run it in this order)

1. **Frame precisely.** One sentence: *what gap, in what domain, for what goal.*
   Vague framing = vague findings. Write it down before searching.
2. **Inventory what EXISTS.** Exhaustively search the codebase/brain for everything
   relevant. Read excerpts, not whole files. Record real paths/symbols/line numbers.
   (Fan out — for breadth, dispatch parallel read-only investigators with strict
   file scopes; see `memory/recipe/spawn-n-parallel-research-subagents...`.)
3. **Define what's NEEDED.** The ideal/spec/contract. What *should* be true if this
   were complete? Pull from the stated goal, the docs, or first principles.
4. **Diff exists vs. needed → the gaps.** Each gap is a concrete delta, not "could be
   better." If it's already covered, say so and move on.
5. **Grade each gap:** severity (blocker / high / medium / low), the *smallest* fix
   that closes it, and the owner (Claude lane / Shay / Fritz-only decision-or-cred).
6. **Output a coverage table** (`area | covered? | gap | smallest fix`) + a
   **sequenced** recommendation list (highest-leverage first).
7. **Persist to the brain.** File the report under `obsidian/07-Research/` or
   `obsidian/05-Captures/`, tied to the session id. An uncommitted audit didn't happen.

## Honesty rules

- Distinguish **real bug** from **fresh-clone/environment artifact** (e.g. a missing
  generated file that exists on the host). Don't fabricate a fix for a non-bug.
- If a gap needs a human decision or a credential, label it **[Fritz]** — that's not
  an engineering gap, and saying so is the finding.
- Don't recommend a rewrite when a one-line wire closes the gap.

## Reproduce it via Shay

```bash
scripts/ask-claude "Run a gap-analysis on <X>. Frame: <one sentence>. Inventory what exists in <paths>, define what 'complete' means, diff them, and give me a coverage table + sequenced fixes with severity/owner. File the result under obsidian/07-Research/."
```
