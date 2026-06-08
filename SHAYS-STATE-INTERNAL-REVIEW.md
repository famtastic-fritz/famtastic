# Shay's State — Adversarial Internal Review

> Role: adversarial reviewer. Mandate: attack and try to refute
> `SHAYS-CURRENT-STATE-BEFORE.md` against the real code. Every claim was
> re-derived from files, `git`, `grep`, `launchctl`, and `du` — not from the
> assessment's prose. Verification date: 2026-06-08, working dir `~/famtastic`.

---

## 1. Agreement Summary

The assessment is **substantially correct on its load-bearing claims**. I tried
hard to refute the headline findings and could not. Specifically confirmed
true with evidence:

- shay-shay is a gitignored, separate git repo with 0 tracked files in the hub.
- `fam-hub` has 0 shay subcommands (1 incidental comment only).
- The Studio↔Shay seam is a literal stub, verbatim as quoted.
- Three brain implementations exist and never connect — and the code is even
  more emphatic about the disconnect than the assessment claims.
- The lessons bridge runs every 30 min and genuinely misses `.brain/` and `memory/`.
- The 10.5KB always-on memory budget, 2,965 tracked files, 634 node_modules,
  88 junk files, 596MB `.git`, 21GB tree, ~497KB SITE-LEARNINGS, and two
  desktop apps are all accurate.

The verdict "bones exist, spine does not" survives adversarial scrutiny. My
corrections are to specific numbers and characterizations, not to the thesis.

---

## 2. Refutations / Corrections (file:line)

### CORRECTION 1 — "~130 top-level dirs" is wrong by ~2x (line 37)
The prose says "The rest of the repo is ~130 top-level dirs co-located."
Actual: **64** top-level directories (`ls -d */` = 64, including hidden = 64).
This is the single largest factual error. It is in prose, not the metrics
table, so it does not corrupt a frozen baseline number — but it overstates the
sprawl by roughly double.

### CORRECTION 2 — "30-min cron" is launchd, not cron (line 49, table B line 79)
`crontab -l` is **empty** — there is no cron entry. The bridge is scheduled via
**launchd**: `~/Library/LaunchAgents/com.famtastic.shay-lessons-sync.plist`,
`StartInterval = 1800` (30 min), `RunAtLoad = true`, currently loaded
(`launchctl list` shows `com.famtastic.shay-lessons-sync`). So the interval
(30 min) and the one-way mirror direction are CORRECT, but the mechanism label
"cron" is wrong. Minor, but the script's own header (line 96) says "wire to
cron/launchd to prevent drift," which could mislead a reader into thinking it
is unscheduled — it is in fact scheduled.

### CORRECTION 3 — rowboat-base is a broken gitlink, not "neither submodule nor ignored" (table C line 89)
The assessment calls it an "embedded repo, neither submodule nor ignored."
Precise reality: `git ls-files -s shay-agent-os/rowboat-base` returns
`160000 6288f99... 0 shay-agent-os/rowboat-base` — i.e. it **is** tracked as a
gitlink (submodule mode), but there is **no `.gitmodules`** file, and it shows
as ` M` (dirty) in `git status`. So it is a *registered-but-unconfigured
submodule* (a gitlink orphan), which is arguably worse than the assessment's
framing, but the specific phrase "neither submodule nor ignored" is inaccurate —
it is half-a-submodule. Size is **1.3G**, not 1.2G (rounding; minor understatement).

### CORRECTION 4 — "two dueling canonical docs" evidence is softer than stated (line 52, table B line 76)
Both docs do create a single-source-of-truth conflict, but the mechanism differs
from the implication:
- `FAMTASTIC-STATE.md:1` titles itself "Canonical Project Reference."
- `CLAUDE.md` Rule 1 declares **SITE-LEARNINGS.md** "the authoritative technical
  reference … If the code and the documentation disagree, the documentation is wrong."
- `SITE-LEARNINGS.md:45`'s "canonical" actually points at a *third* doc
  (`docs/FAMTASTIC-VISION-CAPTURE-2026-04-24.md`) as the canonical vision doc.

So the "2 canonical docs" claim holds (STATE.md self-claims canonical; CLAUDE.md
anoints SITE-LEARNINGS as authoritative), but it is a governance/role conflict
across CLAUDE.md + two files, not two files literally both printing the word
"canonical" about themselves. Net: claim stands, evidence trail is messier.

### NOT REFUTED — every other checked claim
- `.gitignore` 79–81 = `/shay-shay/`, `/shay-desktop/`, `/shay-desktop-electron/`. Exact.
- `git ls-files shay-shay | wc -l` = 0. `shay-shay/.git` exists. Confirmed.
- `fam-hub`: only hit is line 1011 comment ("Shay-Shay proposed via the"). 0 subcommands. Confirmed.
- Stub header text matches the assessment quote verbatim (lines 1–11 of the file).
- Memory caps: `config.yaml:371 memory_char_limit: 8000`, `:372 user_char_limit: 2500` → 10.5KB. Exact.

---

## 3. Things the Assessment MISSED (and that strengthen it)

The "three brains" claim is **under-stated** — the code actively forbids the
bridge the owner wants:

1. **`shay-agent-os/components/swarm/brain_client.py:4`** opens with a comment:
   *"NO imports from shay-shay / shay_cli — cross-package imports fail."* The
   swarm brain re-implements `_call_anthropic / _call_openrouter / _call_gemini /
   _call_ollama` directly against vendor HTTP endpoints. It never calls Shay's
   gateway `/chat`.
2. **`shay-phone/server.py`** independently re-implements `call_anthropic /
   call_glm / call_openrouter / call_codex_cli / call_gemini` and posts straight
   to `openrouter.ai`/`z.ai` — again, never the gateway.
3. The ONLY shared thread between swarm and shay-shay is a *best-effort import of
   cost telemetry* (`brain_client.py:215` `_import_cost_telemetry`), which adds
   the sibling checkout to `sys.path` purely for **pricing math** — not routing,
   not memory, not a brain bridge. I looked specifically for a gateway bridge the
   assessment might have missed; there is none. The disconnection is by design.

Also missed/under-weighted:
- There are **6 Shay-related launchd agents**, not just the lessons-sync job:
  `ai.shay.gateway`, `ai.shay.memory-reflect`, `com.famtastic.shay-codex-switch`,
  `com.famtastic.shay-phone`, `com.shay.dailybrief`, `com.famtastic.shay-lessons-sync`.
  Note `com.famtastic.shay-codex-switch` last-exited **127** (command-not-found) —
  a dead agent. This is real "spine sprawl" evidence the assessment omitted.
- The sync script's `sync_buglog(recent: int = 30)` default (30 *entries*) is a
  likely source of the "30" confusion — distinct from the 1800s launchd interval.

---

## 4. Independent Verdict on the 5 Target Points

1. **FAMtastic is the base** — PARTIALLY TRUE. A real but narrow spine exists
   (`lib/famtastic/` + `fam-hub`), consumed by Site Studio. Shay sits *beside* it
   (gitignored), not *on* it. ~10% there.
2. **Shay is her own integrated component** — FALSE. She is a sealed, separately-
   versioned island; the one intended in-process seam (`shay-shay-sessions.js`) is
   a stub that does not even persist across restarts. ~5% there.
3. **Shay acts across all of FAMtastic via first-class interfaces** — FALSE. Her
   only reach is `terminal.cwd` pointed at the repo (raw shell, human-equivalent).
   0 capability bridges. ~0% there.
4. **Aware of everything (unified memory)** — FALSE. Two worlds; a one-way 30-min
   launchd mirror covers `.wolf` + repo-docs only; `.brain/`, `memory/`,
   `second-brain/`, `captures/`, `data-center/` are not fed to her brain. No
   unifying index. ~20% there (the vault is a partial convergence point).
5. **Memory-optimized / many systems as one** — FALSE. Always-on budget is 10.5KB
   and the MEMORY.md notes it is at cap; the rest is scattered across ~26 stores
   with no tiering and no single index. ~10% there.

**Single biggest architectural problem:** Shay is a *separate repo with its own
runtime home* (`~/.shay/`) and *three independent model-call layers*. Every other
defect (no fam-hub subcommands, stub seam, memory islands, triplicate docs) is
downstream of "Shay was built as a neighbor, not a component, and the swarm/phone
forked the brain rather than calling it."

**Smallest highest-leverage first move:** Stand up **one canonical brain entry
point** — make the shay-shay gateway the single `/chat` that phone and swarm
call instead of re-implementing vendor HTTP. It is the lowest-LOC change that
collapses 3→1 and is the precondition for both "Shay as component" (she becomes
addressable) and "one memory fabric" (one place to attach memory). It does not
require de-gitignoring or git-history surgery to begin.

---

## 5. Metrics Check Table

| # | Baseline metric | Stated | Verdict | Real value / note |
|---|---|---|---|---|
| A1 | Shay→FAMtastic capability bridges | 0 | CONFIRMED | only `terminal.cwd` |
| A2 | `fam-hub` shay subcommands | 0 | CONFIRMED | 1 comment at line 1011 |
| A3 | Brain implementations | 3 | CONFIRMED | gateway + phone + swarm; swarm forbids importing shay-shay |
| A4 | Desktop apps | 2 | CONFIRMED | `shay-desktop`, `shay-desktop-electron` |
| A5 | Studio↔Shay seam | stub | CONFIRMED | header verbatim |
| A6 | shay-shay integrated | No (gitignored separate repo) | CONFIRMED | `.gitignore` L79; 0 tracked; own `.git` |
| B1 | Distinct memory stores | ~26 | UNVERIFIABLE (plausible) | 7 top-level mem dirs + ~18 obsidian subdirs + ~/.shay stores; aggregate is fuzzy but in range |
| B2 | Stores Shay can read | 4 channels | CONFIRMED (reasonable) | MEMORY.md, USER.md, state.db, vault-MCP |
| B3 | Orphaned stores Shay can't read | ≥3 | CONFIRMED | `.brain/`, `memory/`, `second-brain/` not in sync targets |
| B4 | Unifying index | 0 | CONFIRMED | sync only mirrors `.wolf`+repo-docs into vault |
| B5 | Always-on memory budget | ~10.5KB | CONFIRMED | 8000+2500 chars in config.yaml |
| B6 | Docs claiming canonical | 2 (conflict) | CONFIRMED (softer evidence) | STATE.md title vs CLAUDE.md anointing SITE-LEARNINGS; see Correction 4 |
| B7 | Copies of core docs | 3 | UNVERIFIABLE | repo confirmed; vault repo-docs confirmed (sync_repo_docs); Google Drive copy not checked here |
| B8 | Bridge coverage | partial (.wolf only) | CONFIRMED | misses `.brain/`, `memory/` |
| B9 | Bridge direction | one-way, cron 30 min | CORRECTED | one-way + 30 min CONFIRMED; mechanism is **launchd (StartInterval 1800)**, not cron |
| C1 | Working tree size | 21 GB | CONFIRMED | `du -sh .` = 21G |
| C2 | `.git` size | 596 MB | CONFIRMED | `du -sh .git` = 596M |
| C3 | Tracked files | 2,965 | CONFIRMED | `git ls-files \| wc -l` = 2965 |
| C4 | Tracked node_modules | 634 | CONFIRMED | exact |
| C5 | Tracked pyc/log/DS_Store | 88 | CONFIRMED | exact |
| C6 | rowboat-base limbo | 1.2 GB, "neither submodule nor ignored" | CORRECTED | **1.3G**; it IS a gitlink (mode 160000) with **no .gitmodules**, status dirty — a broken submodule, not un-tracked |
| — | top-level dirs (prose, L37) | ~130 | CORRECTED | **64** |
| — | SITE-LEARNINGS size (prose, L52) | 497KB | CONFIRMED | 496,610 bytes |

---

## 6. Recommended First Move

**Make Shay's gateway the one brain that phone and swarm call.** Replace the
forked `call_*` / `_call_*` vendor implementations in `shay-phone/server.py` and
`shay-agent-os/components/swarm/brain_client.py` with HTTP calls to the running
`ai.shay.gateway` (already loaded, pid present in `launchctl list`). This is the
smallest change that moves metric A3 from 3→1 and unblocks everything else.

**Alignment with the assessment's three moves (A / B / C):**
- This is exactly the assessment's **move B — "One brain. Phone and swarm call
  Shay's gateway instead of re-implementing it."** I independently arrived at the
  same first move.
- I agree it should precede **A (Shay-as-component)** and **C (one memory
  fabric)**: a single addressable brain is the precondition for attaching one
  capability bridge and one memory index. The assessment's ordering instinct is
  correct; I would only add that A3's "3→1" is more tractable than de-gitignoring
  the repo (A6) and should be sequenced first because the gateway already runs.

Net adversarial conclusion: the BEFORE baseline is **trustworthy as a frozen
reference**. Its metrics table is accurate on every number I could verify except
rowboat-base's size/characterization (C6) and the cron-vs-launchd label (B9); its
worst error ("~130 dirs") lives only in prose. The thesis is not refuted.

INTERNAL REVIEW COMPLETE.
