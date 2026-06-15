# Red-Team: Holes in the Greenfield Plan

> **Task:** poke holes in `SHAYS-STATE-PEER-REVIEWED-PLAN.md`. What is the plan — and the AI that wrote it — *not seeing*? Done first-hand (no delegation), with internet research and a read of the ChatGPT "from-scratch" suggestion (`~/.shay/pastes/paste_3_130219.txt`).
> **Author:** Claude (Opus), parallel to Shay's own review. **Date:** 2026-06-08.

---

## The headline hole: the plan solved the wrong problem

The peer-reviewed plan is a good **consolidation** architecture — it takes today's mess (3 brains, 26 memory stores, no spine) and folds it into one clean system. But your new framing makes clear that **consolidation is not the product. Ingestion is.**

You said it plainly: the rewrite *"focuses on ingesting the current Hermes agent as an agent, and the Hermes desktop app as an ingestion… tomorrow maybe let's ingest the new Jarvis agent and its capabilities."* That means Shay's real job is to be an **assimilation engine** — a system that absorbs *other* agent systems and their skills/capabilities, on an ongoing basis, in a structured and verifiable way, and stays current as those upstreams evolve.

My plan does not have an ingestion engine. It has a **static Capability Registry** where you hand-write a manifest per internal capability, and it treats "ingestion" as a *one-time migration of old memory files*. That is exactly backwards. **The ingestion pipeline should be the spine of the architecture, and "consolidate today's mess" should be its first run** — Hermes is just the first thing we ingest. The ChatGPT paste says the same thing in product language: *"Hermes is the seed."*

This single reframe exposes ~10 concrete gaps. Here they are, ranked.

---

## The holes, ranked

### 1. No ingestion pipeline, and no definition of "ingest" (CRITICAL)
"Ingest the Hermes desktop app" — *ingest what, exactly?* Its UI? Its tools? Its skills? Its memory? Its model routing? The plan never decomposes an external system into ingestible parts. We need an **Ingestion Contract**: a target system is decomposed into a fixed set of facets —
- **capabilities/tools** (what it can do),
- **skills** (its repeatable procedures),
- **knowledge** (its docs, lessons, patterns, prompts),
- **memory/state** (what it remembers),
- **surfaces** (its UI/entry points),
- **routing/model config** —
and each facet has a defined adapter that maps it into Shay's internal representation. Without this, "ingestion" is a vibe, not a process.

### 2. No ingestion *verification* — you explicitly asked for this and the plan has nothing (CRITICAL)
*"We need a structured way to ingest and to confirm it ingested properly."* My plan's DoD gate verifies *features we build*, not *systems we absorb*. Ingestion needs its own gate: after ingesting system X, prove each claimed capability is actually invocable, each skill actually runs end-to-end, each knowledge item is actually queryable from the memory fabric, and nothing silently failed to map. An **Ingestion Manifest + post-ingestion conformance test** ("X advertised 14 capabilities; 14 invoked successfully; 2 skills failed tool-mapping — flagged"). This is the ingestion analog of REQ-06.

### 3. Skill-format heterogeneity is unsolved — your Claude-skill / Codex-skill question (HIGH)
*"What if we have a new Codex skill we like — how does Shay ingest a Claude skill?"* The plan says "skills" generically and waves. Reality (researched):
- **SKILL.md is the cross-agent lingua franca** — it works across Claude Code, Codex, Cursor, OpenClaw. Good news: a real interchange format exists.
- **But Claude skills ≠ Codex skills out of the box** — different tool references, stricter frontmatter, `CLAUDE.md` vs `AGENTS.md`. The hard part isn't the markdown, it's **tool-reference remapping**: a Claude skill that calls a tool Shay doesn't have is dead on arrival.
So Shay needs a **Skill Ingestion + Normalization layer**: accept Claude / Codex / raw-SKILL.md / MCP-server skills → normalize to one internal skill schema → **remap tool references to Shay's tool registry** (the actual work) → verify the skill runs. Converters like `codex-export` (.claude → .agents) prove this is tractable; we just have to own it.

### 4. The plan ignores the 2026 interop standards that exist precisely for this (HIGH)
I name-dropped MCP as a "surface" and never used it as what it is: **the de-facto tool-ingestion substrate** (Linux-Foundation-governed, 18k+ servers). And I never mentioned **A2A** (Google's agent-to-agent coordination standard, 150+ orgs) at all — which is *exactly* the protocol for "Shay coordinates with / ingests another agent like Hermes or Jarvis." The correct two-layer spine:
- **MCP for vertical tool/capability ingestion** (absorb a system's tools),
- **A2A for horizontal agent ingestion/coordination** (absorb/route to another agent).
Building our own bespoke ingestion glue while these are standardizing under the Linux Foundation is the same mistake that created today's three-brains mess. **Ingest *through* the standards, don't reinvent them.**

### 5. Zero release-tracking — a whole missing subsystem you explicitly named (HIGH)
*"How do we stay up to date with releases that could benefit our own codebase… some form of tracking releases for everything we use that has a release schedule, or at least the release news of the company whose products we use."* The plan has **nothing** here. This is a first-class subsystem — call it the **Release Radar**:
- watches upstreams (Nous/Hermes, Claude Code, Codex, the MCP/A2A specs, the models, Netlify, GoDaddy, muapi, …) via GitHub Releases API / RSS / changelogs / vendor blogs,
- classifies each release (security / new capability / breaking / deprecation),
- **links releases to ingested systems**: when an upstream we *ingested* ships a release, it fires a "re-ingestion needed" signal,
- surfaces a digest so you (and Shay) decide what to adopt.
This is the natural partner to the `LOCKED.json` idea in my plan: a release that changes an ingested system → divergence alert → re-ingest + re-verify.

### 6. Ingestion is modeled as one-time; upstreams evolve (HIGH)
We ingest Hermes at version X. Hermes ships X+1 with new tools. The plan has no **versioned, idempotent, diff-based re-ingestion** — pin the ingested version, diff capabilities on the next ingest, adopt the delta without clobbering what we changed. Without this, every upstream update is a manual re-do, and we drift right back into staleness.

### 7. Orchestration conflates two different things (HIGH)
You said "think about your orchestration." My plan has *model routing* (which LLM — the Brain Router) but **not capability/agent orchestration** (which agent/skill/capability handles a task, and how they're sequenced). Once we've ingested Hermes *and* Jarvis, something must decide "this task → Jarvis's capability, that task → Hermes's, combine these two." That is an **Orchestrator/Router over the capability catalog** — distinct from model routing, and aligned with A2A and with the ChatGPT paste's "agents that own responsibilities." The plan is missing this entire layer.

### 8. No capability *discovery* or *composition* — "knowledge of what's available" (MEDIUM-HIGH)
*"How do we combine capabilities, or at least knowledge of what's available."* The registry lists capabilities but there's no **catalog Shay can query at reasoning time** ("what can I do right now, across all ingested systems?") and no **composition** ("chain capability A→B into a workflow"). MCP gives tool discovery and A2A gives agent-card discovery — use them so the catalog is *live*, not a hand-maintained list that rots (the exact failure mode of today's dead `studio-config.json` settings).

### 9. Ingesting external code = ingesting external risk; no security/authority model (MEDIUM-HIGH)
A Claude skill, an MCP server, or a whole agent we ingest can do whatever its tools permit. My plan hardens *our* outbound calls but says nothing about **sandboxing/permissioning ingested capabilities**. The ChatGPT paste's **Authority Levels (0–4: observe → suggest → draft → execute-with-confirm → auto)** and per-skill permission are the right primitive — every ingested capability enters at a default authority tier and is promoted explicitly. Skill security is a live concern in the 2026 SKILL.md guidance. This must be designed in, not bolted on.

### 10. Knowledge and capability are ingested separately and never linked (MEDIUM)
When we ingest a system we get *both* executable capabilities *and* knowledge (its docs, lessons, prompts, the "why"). My plan deposits capabilities in the registry and knowledge in the memory fabric as if they're unrelated. They must be **linked**: an ingested capability should carry a pointer to the knowledge that explains it, so Shay knows not just *that* she can do X but *how/when* — and so re-ingestion updates both together.

---

## On the ChatGPT paste — what it adds, where it's also blind

**What it gets right that my plan under-weighted:**
- **Doctrine-first** ("Observe → Understand → Anticipate → Confirm → Act → Remember → Improve") — a stated operating loop my plan lacks.
- **Anticipation Engine** — proactive need-prediction. My plan is purely reactive (Shay acts when asked). If your doctrine is "observe, anticipate, act," this is a real missing subsystem.
- **Authority Levels (0–4)** — exactly the permission primitive ingestion needs (hole #9).
- **System "Doctor"** (`shay doctor memory/agents/connectors`) — an active health/diagnostic surface. My plan only has passive logging. For an ingestion platform, a **`shay doctor ingestion`** ("is every ingested system still healthy, current, verified?") is essential.
- **"Hermes is the seed"** — confirms the clean-core-that-ingests-Hermes framing over my "keep the Hermes gateway and wrap it."

**Where the paste is *also* blind (it shares your AI's blind spots):**
- It has a **skill format but no skill *ingestion/conversion*** from other ecosystems — same gap as my plan on the Claude/Codex question.
- **No release tracking, no interop standards (MCP/A2A), no ingestion verification, no cross-system discovery.** So the paste, like my plan, misses the actual centerpiece. It just dresses the gap in better product doctrine.
- **Assumes a clean TS monorepo** (`workflow.ts`, `prompts.ts`) — ignores that Hermes is Python; the two-language reality (a real risk in my plan too) is unaddressed.
- **No verification/contract rigor** — the paste's biggest weakness and my plan's biggest strength. The Anticipation Engine reading email/calendar/location is a large privacy/permission surface it hand-waves.

**Net:** my plan brings engineering rigor (contracts, verification, hardening, memory fabric); the paste brings product doctrine (anticipation, authority, doctor, clean-core). **Both miss the ingestion+release engine.** The right answer is the union of all three.

---

## The decision this surfaces (the real fork)

My plan assumed **Extend-Hermes**: keep the working Hermes gateway as Shay's core and build around it. Your framing + the paste point to **Clean-core-ingests-Hermes**: build a small clean core whose *first job* is to ingest Hermes (agent) and Hermes-desktop (surface) as its inaugural ingestion — so the ingestion machinery is exercised from day one and Hermes has no privileged status. **I now think Clean-core-ingestion is correct**, because it makes "ingest Jarvis tomorrow" the same code path as "ingest Hermes today," instead of Hermes being a hardcoded special case we'd have to generalize later (which never happens — see today's mess).

---

## What the plan MUST add (concrete)

1. **Ingestion Pipeline as the spine** — `ingest(system) → decompose into facets → adapt each facet → normalize → register → verify → version-pin`. Hermes + Hermes-desktop = ingestion run #1.
2. **Ingestion Contract + facet adapters** (capabilities / skills / knowledge / memory / surfaces / routing).
3. **Skill Normalization layer** — Claude/Codex/SKILL.md/MCP → one internal skill schema, with tool-reference remapping + run-verification.
4. **Interop substrate** — MCP for tool ingestion, A2A for agent ingestion/coordination. Don't hand-roll.
5. **Release Radar** — upstream release tracking → classify → link-to-ingested-system → "re-ingest" signal → digest.
6. **Capability Catalog + Orchestrator** — live discovery ("what can I do?") + composition + task→capability routing (distinct from model routing).
7. **Authority/Permission tiers (0–4)** for every ingested capability; sandbox by default.
8. **`shay doctor ingestion`** — verify every ingested system is healthy, current, and conformant.
9. **Versioned, idempotent, diff-based re-ingestion.**
10. **Link knowledge↔capability** on every ingestion.
11. *(From the paste, scope TBD)* Anticipation Engine + operating doctrine, gated behind authority tiers.
12. **REQ-14 — Long-running orchestration *to completion* (learned the hard way 2026-06-08; framing corrected per Fritz).** Shay's role is **orchestration**: she is a brain that holds plans and drives them to done, not a worker that does one-shot tasks. Long context and long runtime are her *normal* state. Therefore **completion must never depend on a single streaming call finishing in one shot, and switching to a smaller/other model because a task is "long" is explicitly NOT the mechanism.** The mechanism is *resume-and-continue on the same brain*:
    - **Decompose + checkpoint:** long work is broken into bounded, idempotent steps the orchestrator loop drives to done; each step writes durable run-state.
    - **Resumable, never restart:** a dropped connection resumes from the last checkpoint — zero lost progress.
    - **Heartbeat stall detection:** distinguish "still reasoning" (keep waiting) from "dead socket" (reconnect + resume on the *same* brain). A flat read timeout can't tell these apart — that's the 2026-06-08 bug.
    - **Generous per-provider idle budgets** (now 900s) so reasoning gaps never kill a step. Note: read timeout is the *inter-token gap*, not total length — so this already supports multi-hour tasks.
    - **Long-context optimization:** preserve the active plan in working memory via **plan-aware compaction + on-demand retrieval from the memory fabric** — never naive truncation that drops the plan Shay is executing.
    - **Model-switching is an *availability* fallback only** (provider down/unauth), never a response to a task being long. Pair with REQ-05: validate model-id-vs-provider (the auxiliary path sent `glm-5.1` to the Gemini endpoint → 404).

---

## Honest verdict
My peer-reviewed plan is a solid **foundation layer** (kernel, memory fabric, brain router, contracts, verification) and almost all of it survives. But it was scoped as "clean up what we have," and the actual mission is "**build the machine that absorbs other agents and their abilities, forever, and stays current.**" The foundation is necessary but not the point. The ingestion engine + release radar + skill-normalization + interop-standards spine is the missing ~40% — and it's the 40% that *is the product*. The plan needs a v2 that puts ingestion at the center and demotes "consolidate Hermes" to "ingestion run #1."

---

*Saved root + vault. Companion to `SHAYS-STATE-PEER-REVIEWED-PLAN.md`. Research sources in the chat thread (MCP/A2A/ACP interop; SKILL.md cross-agent portability; codex-export skill conversion).*
