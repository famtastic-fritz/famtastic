---
title: Community Gap Discovery — Source Evaluation + Auto-Check Design
date: 2026-05-31
status: research + design (no implementation)
subsystem: shay-shay / skills hub / curator / planning
author: research pass
permalink: shay-memory/research/community-gap-discovery-2026-05-31
---

# Community Gap Discovery for Shay-Shay

**Goal:** Evaluate three external sources, then design "when Shay finds a capability
gap, automatically query community hubs for an existing skill/repo that fills it
*before* building from scratch — and surface candidates with a verdict."

All repo/API facts below were verified against live endpoints on 2026-05-31
(GitHub API, raw README, and direct `curl` against the hosted APIs). Where a claim
could not be verified, it is marked. WebFetch prose summaries were cross-checked
against the GitHub API and the live JSON — any number not confirmed by a second
source is flagged.

---

## 1. hexo-ai/sia — VERDICT: SKIP (for the gap-discovery use case)

**What it is:** A *self-improving AI framework*, not an assistant, not a memory
system, not a skill registry. It autonomously improves the performance of an
arbitrary AI system (model or agent) on a **benchmark task** via a three-agent
loop: a Meta-Agent generates task-specific agents, a Target Agent executes and
logs, a Feedback Agent analyzes results and proposes improvements across
generations. It is benchmark-optimization tooling (GPQA, LawBench, chess,
Titanic, MLE-Bench), published as the PyPI package `sia-agent`.

**Verified facts (GitHub API + raw):**
- Language: Python · License: **MIT** · Homepage: hexolabs.com
- Stars **612**, forks **83**, open issues 2, **not archived**
- Created 2026-03-25, last push **2026-05-29** (actively maintained)
- Backends: Claude Agent SDK + OpenHands (multi-provider)
- No tagged GitHub releases (ships via PyPI instead); main branch is shallow
  (few commits — likely squashed/public-mirror history, not a maturity red flag
  on its own but worth noting)
- Performance claims ("56.6% LawBench gain", "502% scRNA denoising") are the
  project's **own** README claims — **unverified by this pass**; treat as marketing.

**Relevance to the gap-discovery feature:** Essentially none. SIA optimizes an
agent against a *scored benchmark*; it does not discover, fetch, or compose
community skills. It overlaps conceptually with Shay's **Curator** (both are
self-improvement loops) but operates at a different layer (benchmark-driven agent
refinement vs. skill-library hygiene).

**One-line reason:** Solves a different problem (benchmark self-optimization), not
gap-filling skill discovery — interesting prior art for a future "evaluate my own
agent on a task" feature, but **SKIP** for this workstream.

---

## 2. zjunlp/SkillNet — VERDICT: ADOPT (as a discovery source) + MONITOR (the paper/method)

**What it is:** "Create, Evaluate, and Connect AI Skills." It is **both** a
framework *and* a hosted registry — effectively "npm for agent skills." It
search/install/create/evaluate/organize skills and maps relationships between
them (`similar_to`, `belong_to`, `compose_with`, `depend_on`). It is the single
most directly relevant project to Shay's skill system and Curator.

**Verified facts (GitHub API + raw README + live API):**
- Language: Python · License: **MIT** · Homepage: skillnet.openkg.cn
- Stars **956**, forks **105**, open issues 0, **not archived**
- Created 2026-01-10, last push **2026-05-27** (actively maintained)
- arXiv paper **2603.04448** — confirmed resolvable (HTTP 200 on arxiv.org/abs/2603.04448)
- Ships `pip install skillnet-ai` with CLI (`skillnet search|download|create|evaluate|analyze`),
  a `SkillNetClient` Python SDK, and an **MCP server**
- Lists integrations with Claude Code (`~/.claude/skills/`), Codex (`$CODEX_HOME/skills`),
  OpenClaw, JiuwenClaw

**Live hosted API — VERIFIED working (the load-bearing fact for the design):**
- `GET http://api-skillnet.openkg.cn/v1/search?q=<query>&limit=<n>` → **HTTP 200, JSON**
- Response shape (real sample): `{"data":[{ "skill_name", "skill_description",
  "author", "stars", "skill_url" (GitHub blob URL), "category",
  "evaluation": { "safety": {"level","reason"}, ... } }]}`
- This is **verdict-bearing metadata out of the box**: each result carries a
  5-D evaluation (Safety, Completeness, Executability, Maintainability,
  Cost-Awareness) with human-readable reasons. That is exactly the "candidate +
  verdict" payload Shay needs to surface.
- API note: endpoint is **plain HTTP** (no TLS) and on a `.cn` host — treat as
  untrusted transport; the skill content itself still lands as a GitHub URL that
  must pass Shay's existing `skills_guard` security scan before install.
- README also claims "500,000+ community skills" on the site vs. "500+ curated"
  in the feature list — these two numbers disagree; the WebFetch "956 stars"
  matched the API, but the skill-count figures are **unverified marketing**.

**How it relates to Shay's existing system:**
- Shay's `skill_manage` tool (`tools/skill_manager_tool.py`) has actions
  create/patch/edit/delete/write_file/remove_file — **no discover/search/install
  action**. SkillNet fills exactly that missing "find an existing skill" half.
- Shay's Curator (`agent/curator.py`) consolidates `compose_with`-style overlaps
  *manually* via an LLM pass. SkillNet's **Skill Graph** computes those relations
  programmatically — it could feed the Curator's consolidation decisions.
- Shay's hub (`tools/skills_hub.py`) already fetches from GitHub repos; SkillNet
  results *are* GitHub blob URLs, so they slot straight into the existing fetch +
  `skills_guard` quarantine pipeline.

**Verdict reason:** **ADOPT** SkillNet's `/v1/search` as a first-class discovery
source (best signal-to-noise of the three; ships evaluations for free). **MONITOR**
the arXiv method + Skill Graph as a possible future input to the Curator's
consolidation pass. Do **not** adopt SkillNet as a *runtime dependency* (no `pip
install skillnet-ai` into Shay) — call the HTTP API as one source adapter.

---

## 3. clawhub.ai — VERDICT: ADOPT (as a second discovery source, with caveats)

**What it is:** A community marketplace for **OpenClaw-ecosystem** tooling —
"Tools built by thousands, ready in one search." Three content types: **Skills**,
**Plugins** (gateway plugins), and **Publishers**. It is the closest analog to
agentskills.io that Shay already uses, but tuned to the OpenClaw / Claude-Code
plugin world rather than Anthropic's first-party skills.

**Verified facts (live HTTP probing):**
- Site: HTTP 200, deployed on Vercel, backend "Powered by Convex"
- `robots.txt`: `User-agent: * / Disallow:` → **crawling/programmatic access
  is permitted** (nothing disallowed)
- Self-reported stats (homepage, **unverified**): 52.7k tools, 180k users, 12M
  downloads, 4.8 avg rating

**Live API — VERIFIED (the load-bearing fact):**
- `GET https://clawhub.ai/api/v1/skills` → **HTTP 200, application/json**
- List shape: `{"items":[ { "slug", "displayName", "summary",
  "tags": {"latest": "<version>"}, "stats": {"downloads","stars","installsAllTime",
  "installsCurrent","versions","comments"}, "createdAt", "updatedAt",
  "latestVersion": {"version","createdAt","changelog"} } ], "nextCursor": <...>}`
- Detail endpoint: `GET https://clawhub.ai/api/v1/skills/<slug>` → 200 JSON with
  richer keys: `skill`, `latestVersion`, `metadata`, `owner`, `moderation`.
- Pagination: `?limit=<n>` works (cursor-based via `nextCursor`).
- **IMPORTANT honest caveat:** server-side text search does **NOT** appear wired —
  `?q=pdf`, `?search=pdf`, and `?q=zzzqxnonsense` all returned the **same 25
  items**. So discovery against clawhub is **list + paginate + client-side filter
  / embed-and-rank locally**, not a server query. (`/feed` exists but returns
  HTML — an SPA route, not a machine feed; treat as nonexistent for our purposes.)
- Content skew: the live sample is heavily OpenClaw-specific and substantially
  **Chinese-language** (e.g. a "free-model-router" token-pool skill). Relevance
  filtering and language handling matter for ranking.

**Comparison to agentskills.io (which Shay already uses):**
- agentskills.io is wired into Shay via `tools/skills_hub.py` / the curator doc's
  "hub-installed skills (from agentskills.io)" + `~/.shay/skills/.hub/lock.json`.
  It is a *trusted, first-party-adjacent* hub.
- clawhub is **broader and noisier** (OpenClaw plugins + community skills, mixed
  quality and language) and has **no server-side search** — so it is a
  *supplementary* discovery surface, not a replacement. Its win is breadth +
  download/install/star stats for ranking; its risk is trust (community uploads).

**Verdict reason:** **ADOPT** as a second adapter behind the same security gate as
agentskills.io, but **rank it below SkillNet** (no server search, noisier corpus,
no built-in evaluations). All clawhub installs must pass `skills_guard` and land
in quarantine like any community source.

---

## Verdict summary table

| Source | What it is | License | Stars | Last push | Live API? | Verdict |
|---|---|---|---|---|---|---|
| hexo-ai/sia | Self-improving agent **benchmark** optimizer | MIT | 612 | 2026-05-29 | n/a (PyPI lib) | **SKIP** — different problem |
| zjunlp/SkillNet | Skill registry + create/eval/connect framework | MIT | 956 | 2026-05-27 | **Yes** `api-skillnet.openkg.cn/v1/search` (JSON, ships evaluations) | **ADOPT** (source) + **MONITOR** (graph/paper) |
| clawhub.ai | OpenClaw community skill/plugin marketplace | (site) | — | live | **Yes** `clawhub.ai/api/v1/skills` (JSON, **no server search**) | **ADOPT** (secondary source) |

---

# DESIGN — Auto-Check-the-Community-When-We-Find-a-Gap

> Design only. No implementation. Every integration point below maps to a file
> that exists in the repo today.

## Why this fits Shay cleanly (grounded in real code)

The single most important finding: **Shay's hub is already architected for this.**
`tools/skills_hub.py` defines a `SkillSource` ABC whose own docstring uses
`'clawhub'` as the example `source_id()`:

```python
class SkillSource(ABC):
    def search(self, query: str, limit: int = 10) -> List[SkillMeta]: ...
    def fetch(self, identifier: str) -> Optional[SkillBundle]: ...
    def inspect(self, identifier: str) -> Optional[SkillMeta]: ...
    def source_id(self) -> str: ...  # "e.g. 'github', 'clawhub'"
    def trust_level_for(self, identifier) -> str: return "community"
```

There is already a `GitHubSource` (with `DEFAULT_TAPS` for openai/anthropics/etc.)
and a `.well-known/skills/index.json` source adapter. Adding clawhub and SkillNet
is **"write two new `SkillSource` subclasses,"** not new infrastructure. The
quarantine dir, audit log, `HubLockFile` provenance, `skills_guard` security scan,
`is_safe_url` / `check_website_access` gating, and index cache (`INDEX_CACHE_TTL`)
all already exist and are reused unchanged.

## New components (4)

### A. Two new source adapters — `tools/skills_hub.py`
- `class SkillNetSource(SkillSource)`
  - `search(query, limit)` → `GET api-skillnet.openkg.cn/v1/search?q={query}&limit={limit}`,
    map each `data[]` entry → `SkillMeta` (id = `skill_url` GitHub blob; carry the
    `evaluation` 5-D block into `SkillMeta.notes` so the verdict is preserved).
  - `fetch(identifier)` → delegates to the existing `GitHubSource` fetch path
    (results are GitHub URLs), so security scan + quarantine are unchanged.
  - `source_id()` → `"skillnet"`; `trust_level_for()` → `"community"`.
  - Transport caveat baked in: plain-HTTP `.cn` endpoint is metadata-only and
    never trusted for content; only the downstream GitHub fetch matters.
- `class ClawHubSource(SkillSource)`
  - `search(query, limit)` → because clawhub has **no server search**, the adapter
    pulls pages via `?limit=&` + `nextCursor`, caches the index
    (reuse `INDEX_CACHE_DIR` / `INDEX_CACHE_TTL`), then ranks locally
    (embedding or keyword match over `displayName`+`summary`+`changelog`).
  - `fetch(slug)` → `GET /api/v1/skills/{slug}` for the bundle/version.
  - `source_id()` → `"clawhub"`; rank-penalize vs. SkillNet (no eval data, noisier).
- Register both as **taps** (`HUB_DIR/taps.json`), opt-in/orderable like GitHub taps.

### B. A read-only discovery action on `skill_manage` — `tools/skill_manager_tool.py`
Add a **non-mutating** `action="discover"` to the existing tool (current actions:
create/patch/edit/delete/write_file/remove_file). Signature:
`skill_manage(action="discover", query="<capability gap>", sources=["skillnet","clawhub","github"], limit=5)`.
It fans out across the registered `SkillSource` adapters, dedupes by content hash
(reuse `skills_guard.content_hash`), and returns a ranked **candidate list with a
verdict per candidate** — it does **not** install. (The local skill catalog +
`agentskills.io` hub are searched first, since "reuse before generate" means
checking what's *already installed* before hitting the network.)

### C. A `GapResolver` — new `tools/gap_resolver.py`
Pure orchestration over B. Given a gap descriptor `{capability, context, why}`:
1. Search local + hub catalog (already-installed) → if hit, return "already have it."
2. Else call `skill_manage(action="discover")` across community sources.
3. Score each candidate into a **verdict**: `ADOPT` (install candidate now),
   `REVIEW` (surface to user, needs approval), `BUILD` (no good match → fall back
   to `skill_manage(action="create")`). Scoring inputs: source trust level,
   SkillNet 5-D evaluation, clawhub install/star stats, name/desc similarity to the
   gap, and the existing `skills_guard` scan result.
4. Record the decision to the hub **audit log** (`AUDIT_LOG`) so it is auditable
   and de-duplicated (don't re-query the same gap every session).

### D. Config block — `config.yaml`
```yaml
gap_discovery:
  enabled: true
  sources: [skillnet, clawhub, github, agentskills]   # search order
  search_before_build: true        # the core behavior Fritz asked for
  auto_install_threshold: 0.85      # >= → ADOPT without asking; below → REVIEW
  max_candidates: 5
  cache_ttl_hours: 6
auxiliary:
  gap_discovery:                    # which model ranks/judges candidates
    provider: auto
```
Mirrors the existing `curator:` and `auxiliary.curator:` config patterns exactly.

## Integration points (where the trigger fires)

1. **Planning / gap-detection pipeline (primary).** When the planner identifies a
   capability it cannot satisfy with installed skills/tools, it calls
   `GapResolver.resolve(gap)` **before** authoring a new skill. If a candidate
   scores `ADOPT`, it installs via the existing hub fetch+quarantine path and
   proceeds; otherwise it surfaces `REVIEW` candidates or falls through to
   `skill_manage(action="create")` (BUILD). This is the literal implementation of
   "reuse before generate."

2. **`skill_manage(action="create")` pre-flight guard.** Before the agent writes a
   brand-new skill, intercept and run a `discover` pass on the proposed skill's
   name/description. If a high-confidence community match exists, return it as a
   "did you mean to install this instead?" candidate. This catches the
   self-improvement loop reinventing an existing skill.

3. **Curator anti-drift pass — `agent/curator.py` (secondary, periodic).** The
   Curator already runs a background LLM review that consolidates/archives
   agent-created skills. Extend that pass with a **"community supersedes local"**
   check: for each thin/stale agent-created skill, run a `discover` query; if a
   maintained community skill clearly covers it, propose REVIEW (recommend
   archiving the local one in favor of the hub install). This ties gap discovery
   to the existing anti-drift loop without a new daemon — it rides the same
   `cron/scheduler.py` tick and `interval_hours`/`min_idle_hours` gating. It writes
   findings into the existing per-run `REPORT.md`. Provenance rules are preserved:
   the Curator still **never** mutates bundled or hub-installed skills.

## Data flow (one diagram, in words)

```
gap detected (planner | skill_manage create guard | curator review)
        │
        ▼
GapResolver.resolve({capability, context})
        │  1. search LOCAL catalog + agentskills hub  (reuse-first)
        │  2. if miss → skill_manage(action="discover")
        ▼
SkillSource fan-out  ── SkillNetSource ──▶ api-skillnet.openkg.cn/v1/search  (carries 5-D eval)
                     ── ClawHubSource  ──▶ clawhub.ai/api/v1/skills (list+cache+local rank)
                     ── GitHubSource   ──▶ api.github.com (existing taps + topics)
        │
        ▼
dedupe (content_hash) → score → VERDICT per candidate {ADOPT|REVIEW|BUILD}
        │
        ├─ ADOPT  → existing hub fetch → skills_guard scan → quarantine → install → lock.json
        ├─ REVIEW → surface candidates+verdict to user / planner (no install)
        └─ BUILD  → fall through to skill_manage(action="create")
        │
        ▼
append decision to HUB AUDIT_LOG  (auditable, de-dupes repeat gap queries)
```

## Trust, safety, and honesty constraints (non-negotiable in the design)

- Every community install — SkillNet or clawhub — flows through the **existing**
  `skills_guard` security scan + `QUARANTINE_DIR` + `HubLockFile`. No new code may
  bypass it. clawhub and SkillNet content is `trust_level = "community"`, never
  "trusted," regardless of stars/downloads.
- `skill_manage(action="discover")` is **read-only** and never auto-installs;
  only `GapResolver` with a score ≥ `auto_install_threshold` installs, and even
  then only when `search_before_build` is on and the gap arose in an autonomous
  flow. Interactive sessions default to REVIEW (surface, ask).
- SkillNet's hosted API is plain HTTP on a `.cn` host → metadata only; content is
  always re-fetched from the underlying GitHub URL over HTTPS and re-scanned.
- clawhub has **no server-side search** (verified) → the adapter must implement
  local ranking; do not pretend `?q=` filters. Cache the index to avoid hammering
  the list endpoint.
- The Curator's existing guarantees hold: never auto-deletes, never touches
  bundled/hub skills, always snapshots before a mutating pass.

## What this design deliberately does NOT do
- Does not add `pip install skillnet-ai` or `sia-agent` as runtime deps — both are
  called as remote APIs / left out entirely.
- Does not adopt SIA at all (SKIP).
- Does not build a new background daemon — it reuses the planner, the
  `skill_manage` tool, and the Curator's existing cron tick.
- Does not implement SkillNet's Skill Graph; that is filed as MONITOR for a future
  Curator-consolidation enhancement.

## Open questions / unverified items to confirm before building
- SkillNet site skill count ("500+" vs "500,000+") and SIA's benchmark gains are
  **unverified marketing** — do not cite as fact.
- clawhub auth: install/download may require a token or signed URL beyond the
  public list/detail endpoints — not verified (only read endpoints were probed).
- Whether clawhub bundles are Claude/Shay-skill-compatible (`SKILL.md` shape) or
  OpenClaw-specific — needs a format-compat check in `ClawHubSource.fetch`.

---

## Appendix — verification log (2026-05-31)
- `gh api repos/hexo-ai/sia` → MIT, Python, 612★/83 forks, pushed 2026-05-29, not archived.
- `gh api repos/zjunlp/SkillNet` → MIT, Python, 956★/105 forks, pushed 2026-05-27, not archived.
- `arxiv.org/abs/2603.04448` → HTTP 200.
- `api-skillnet.openkg.cn/v1/search?q=pdf&limit=2` → HTTP 200 JSON; `{data:[{skill_name,skill_description,author,stars,skill_url,category,evaluation{...}}]}`.
- `clawhub.ai/api/v1/skills` → HTTP 200 JSON `{items:[...],nextCursor}`; `?limit=3` honored; `?q=`/`?search=` did NOT filter (same 25 results incl. nonsense query).
- `clawhub.ai/api/v1/skills/<slug>` → HTTP 200 JSON `{skill,latestVersion,metadata,owner,moderation}`.
- `clawhub.ai/feed` → HTTP 200 but text/html (SPA route, not a machine feed).
- `clawhub.ai/robots.txt` → `Disallow:` empty (all allowed).
- Shay code grounding: `tools/skills_hub.py` (`SkillSource` ABC w/ `clawhub` example, `GitHubSource`, `.well-known` adapter, taps/quarantine/audit/index-cache, `skills_guard`), `tools/skill_manager_tool.py` (`skill_manage` actions, no discover), `agent/curator.py` + `cron/scheduler.py` (curator + cron tick).