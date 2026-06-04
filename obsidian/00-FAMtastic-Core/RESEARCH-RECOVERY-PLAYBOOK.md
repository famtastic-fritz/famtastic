# Research Recovery & Consolidation Playbook (through Shay)

> **Why this exists:** Fritz spent a full week of Codex subscription usage in one day
> on deep research / gap-analysis, then had to reinstall Shay and restore from a
> backup. This playbook makes sure that paid-for research is **recovered, organized,
> and turned into reproducible skill** — and that Shay re-gathers every lesson/skill
> she needs post-reinstall. Fritz: point Shay here ("read
> `00-FAMtastic-Core/RESEARCH-RECOVERY-PLAYBOOK.md` and run it").

## The shape of it

`RECOVER → ORGANIZE (Claude does the synthesis) → SKILL-IFY → RE-GATHER → VERIFY`

Shay drives; Claude does the heavy organizing via `scripts/ask-claude`. Nothing is
"done" until it's committed to the brain.

---

## Step 1 — RECOVER the Codex research

Codex logs every session to `~/.codex/sessions/` as `rollout-*.jsonl`. Those live in
the home dir (not the app bundle), so they usually **survive a reinstall.** Harvest
them (read-only on the source):

```bash
scripts/recover-codex-research.sh 2026-05-28      # the heavy day (adjust the date)
scripts/recover-codex-research.sh                 # or harvest everything
```

→ stages transcripts + readable markdown into `research-recovery/codex/` (gitignored)
and writes an `INDEX.md`.

**If `~/.codex/sessions` is gone, recover from the fallbacks (in order):**
- `find ~ -type d -name sessions -path '*codex*'` and `~/.config/codex`
- Shell history: `history | grep -iE 'codex|research'` (shows what was investigated)
- **Shay's restore backup** — the snapshot she came back from after the reinstall
- `git reflog` / `git stash list` in any repo Codex was writing to
- Browser history for the day (the sources that were researched)
- Any files Codex wrote (search the repo + `~` for files modified on that date:
  `find ~ -newermt 2026-05-28 ! -newermt 2026-05-29 -type f 2>/dev/null`)

## Step 2 — ORGANIZE it into the brain (Claude synthesizes)

Hand the recovered pile to Claude — it extracts, completes, and files:

```bash
scripts/ask-claude --context research-recovery/codex/INDEX.md \
"Organize this recovered Codex research into clean, structured reports under obsidian/07-Research/. Group by topic; for each, extract the question, findings, any gap analysis, decisions, and what's COMPLETE vs UNFINISHED. Then give me a punch-list of the unfinished threads worth resuming, and flag lessons/skills worth promoting."
```

Filed output → `obsidian/07-Research/` (committed). Raw transcripts stay local
(gitignored) since they can contain secrets.

## Step 3 — SKILL-IFY (make it reproducible)

Fritz wants to *reproduce this kind of investigation*. The method is now a skill:

- **`gap-analysis`** (`.claude/skills/gap-analysis/`) — inventory-what-exists →
  define-what's-needed → diff → coverage table + sequenced fixes. This is the exact
  method behind the brain-wiring audit.
- **`deep-research`** (harness skill) — for external, multi-source, fact-checked
  research.
- **`ask-claude`** (`scripts/ask-claude`) — Shay's line to escalate the hard calls.

To rerun an investigation: `scripts/ask-claude "Run a gap-analysis on <X>: <frame>…"`
(see the gap-analysis SKILL for the full prompt).

## Step 4 — RE-GATHER Shay's lessons/learnings/skills (post-reinstall audit)

The reinstall + backup-restore risks silent loss. Shay must reconcile her own brain:

1. **Skills:** compare `shay-agent-os/skills/` against the capability registry
   (`docs/capability-registry.md`) and the backup. Re-add any missing SKILL.md.
2. **Learnings:** check `obsidian/Shay-Memory/learnings/` and `.wolf/cerebrum.md`
   for gaps vs. the backup; promote anything that only exists in run logs.
3. **The known lost artifact:** `portfolio-revenue-model.md` (~10,565 bytes, task
   `t_25a5a643`, the "1000-site revenue model") is referenced by build records but
   committed to **no branch**. Recover from the 2026-05-28 host output, or mark the
   build/trace node `artifact-lost`. (See
   `obsidian/05-Captures/2026-06-02-shay-48h-and-1000-plan.md`.)

## Step 5 — VERIFY nothing was for nothing

- Every recovered research thread is either filed in `obsidian/07-Research/` or on the
  resume punch-list.
- `git status` clean; the organized research is committed and pushed.
- A capture note links what was recovered → where it landed, tied to the session id.
- Run `node scripts/plans/audit.js` — if recovered research implies new work, task it.

---

### One-shot kickoff for Shay
```bash
# 1. recover
scripts/recover-codex-research.sh 2026-05-28
# 2. organize (Claude)
scripts/ask-claude --context research-recovery/codex/INDEX.md "Organize this into obsidian/07-Research/ … (see Step 2)"
# 3. then work Steps 4–5: re-gather skills/learnings + verify + commit
```
