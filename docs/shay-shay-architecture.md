# Shay-Shay Architecture
## FAMtastic's Persistent AI Orchestrator
### Document date: 2026-04-16

---

## What Shay-Shay Is — and Is Not

**She is not a chatbot.** Every chatbot starts fresh. Shay-Shay accumulates. She is a
persistent, learning orchestrator — the entity that knows *this* site's history, *this*
user's preferences, and *where everything is going* without needing to be told.

**She is not a CLI wrapper.** She does not route commands to Studio. She routes *intent*.
The user describes an outcome; Shay-Shay decides what happens next and which brain handles it.

**She is the one-level-up layer.** Studio handles site building. Shay-Shay handles
*what to build, why, and which system should do it* — including systems that do not
exist yet.

**The FAMtastic test:** Does this architecture feel like Fearless deviation from
established norms? Does it compound? Does it add Lego, not puzzle pieces? Read the
answer at the end of this document.

---

## 1. THE ROUTING PROBLEM — AND THE RIGHT SOLUTION

### What production systems actually do

The bad answer to intent routing is a rules table. If message contains "build", route
to builder. If message contains "research", route to researcher. This is mechanical,
predictable, and wrong within ten edge cases.

The correct answer — confirmed by GuruSup's 800-agent production deployment, by
Perplexity's query classification layer, and by Cursor's context-aware routing — is
**LLM-native intent classification at the orchestrator layer**. The orchestrator does
not pattern-match strings. It understands context. It reads: "what kind of problem is
this, who owns it, what does the user actually want?"

Production routing characteristics that feel natural (not mechanical):
- No explicit commands required. "Check if the Altitude build broke something" routes
  to verification without a `/verify` prefix
- Routing decisions are explained when they matter ("Sending this to Gemini because
  it's a research question")
- Routing is transparent when it's complex, invisible when it's obvious
- Delegation happens via structured handoff objects, not full conversation dumps

### Shay-Shay's routing model

**Layer 1 — Fast classifier (Sonnet-tier, ~50ms):** Deterministic intent enum for
known patterns. These never touch Opus:
- `conversational_ack` → canned response, zero API cost
- `hello/greeting` → already fixed in ACK_PATTERNS as of today
- `studio_command` (build, rebuild, preview, deploy) → pass to Studio WS directly
- `simple_question_about_active_site` → answer from cached Studio state

**Layer 2 — Reasoned routing (Sonnet-tier, ~300ms):** For anything that requires
judgment. Shay-Shay classifies intent and routes to the right brain:
- Claude (Sonnet) → code generation, site builds, surgical edits
- Gemini (Flash) → research synthesis, brainstorm, market analysis
- Codex (GPT-5.4) → adversarial review, focused debugging, code critique

**Layer 3 — Orchestrated multi-step (Opus, ~1-3s):** For complex requests that
require planning, parallel delegation, or synthesizing results from multiple brains.
Reserved for high-stakes decisions. A $8/call justified for: "compare three hero
options and tell me which is most conversion-optimized for a rooftop bar."

**Capability declaration via A2A Agent Cards:** Each brain (Claude, Gemini, Codex)
gets an `agent-card.json` declaring exactly what it can do. Shay-Shay reads these on
startup. Adding a new model adapter is a config change, not a code change. This is the
Lego principle applied to model routing.

```json
// .famtastic/agents/claude-sonnet.agent-card.json
{
  "name": "Claude Sonnet Build Agent",
  "model": "claude-sonnet-4-6",
  "capabilities": [
    "build_site", "surgical_edit", "content_update",
    "layout_update", "brainstorm", "conversational"
  ],
  "cost_tier": "medium",
  "latency_target_ms": 3000
}
```

---

## 2. MEMORY ARCHITECTURE

### The three-layer model

Every production assistant that feels like it "knows you" uses a variant of this:

| Layer | What it stores | How it's used | Decay |
|-------|---------------|---------------|-------|
| **Episodic** | Events: builds, edits, corrections, dismissals | "Last time you built this section..." | Time-weighted, recent-heavy |
| **Semantic** | Learned patterns: preferences, vertical rules, brand voice | "Rooftop bars prefer dark backgrounds" | Stable; decays only when contradicted |
| **Procedural** | How-to rules: BEM vocabulary, logo flow, post-processing | "Always route through runPostProcessing()" | Pinned; manual update only |

FAMtastic already has a version of this. `famtastic-dna.md` is procedural memory at
the ecosystem level. `.wolf/cerebrum.md` is semantic memory for build rules.
`.wolf/buglog.json` is episodic memory for bugs. **Shay-Shay is the activation layer
that actually uses these files in real time, not just at session start.**

### The implementation: Mem0 + Kuzu

**Why Mem0 + Kuzu:** Production-ready as of September 2025. Zero external services —
Kuzu is an embedded graph database (like SQLite for graphs). The JavaScript MCP server
shipped June 2025. This is a 3-file addition to FAMtastic's current server structure,
not a rewrite.

**Performance characteristics measured in production:**
- 91% lower p95 latency vs. full-context methods
- 90% token savings on retrieval vs. injecting full history
- Mem0g (graph variant) improves multi-hop question accuracy: 68.4% vs. 66.9% vector-only

**Memory scope:**
- **Global (ecosystem-level):** Stored in `~/.local/share/famtastic/memory/`. Patterns
  that apply across all sites: Fritz's general preferences, universal build rules.
- **Per-site (site-level):** Stored in `sites/<tag>/.memory/`. What happened on THIS
  site: hero rebuilds, color choices, decisions overridden, things to avoid.
- **Per-session (working memory):** The current conversation. Discarded on session end.
  Episodic events are promoted to per-site memory at session close.

**Memory decay and noise prevention:**
```
composite_score = semantic_relevance × recency_weight × user_pref_weight

recency_weight = exp(-days_elapsed / 30)  // 30-day half-life
user_pref_weight = 1.0 for accepted, 0.5 for dismissed, 1.5 for "shipped to production"
```

After 3+ high-scoring episodic events with the same pattern, promote to semantic memory:
> "Altitude hero always rebuilt with dark backgrounds (3 builds, all shipped)"

**Memory conflict resolution:** When two memories contradict, store provenance (timestamp,
confidence, which brain generated it). Surface the conflict to Fritz conversationally;
never silently pick one.

**What Shay-Shay remembers and when:**

| Event | What gets stored | Where |
|-------|-----------------|-------|
| Build completes successfully | intent, pages_built, checklist_score, hero_style | per-site episodic |
| User approves a plan card | original_message, plan_summary, outcome | per-site episodic |
| User edits Claude's output | before/after diff, category | global semantic (correction signal) |
| User dismisses a suggestion | suggestion_text, context | per-site episodic (negative signal) |
| Site passes 13-point checklist | score, which checks, build date | per-site semantic |
| User types same phrase 3+ times | phrase, context, frequency | global procedural |

---

## 3. SKILL DEFINITION

### What Shay-Shay's custom skill looks like

A Claude Code skill is a directory in `.claude/skills/` with a markdown instruction
file and optional metadata. Skills are invoked by name (`/shay-shay`) or triggered by
the orchestrator based on context.

```
.claude/skills/shay-shay/
├── skill.json          ← metadata, requires, triggers
├── instructions.md     ← full orchestrator behavioral contract
├── memory-schema.json  ← what Shay-Shay stores and retrieves
└── agent-cards/        ← capability declarations for each brain
    ├── claude-sonnet.json
    ├── gemini-flash.json
    └── codex.json
```

**`skill.json` (abbreviated):**
```json
{
  "name": "shay-shay",
  "description": "FAMtastic persistent orchestrator — routes, learns, remembers",
  "version": "1.0.0",
  "requires_mcp": ["mem0", "famtastic-studio"],
  "model": "claude-opus-4-7",
  "triggers": {
    "session_start": "load_memory_context",
    "build_complete": "store_build_outcome",
    "user_correction": "update_semantic_memory"
  },
  "capabilities": [
    "intent_routing", "memory_retrieval", "memory_storage",
    "multi_brain_delegation", "learning_loop"
  ]
}
```

**`instructions.md` (core behavioral contract):**

This is where Shay-Shay's identity lives. Not rules — principles. The instructions
define:
1. Routing logic: how she classifies intent and which brain she routes to
2. Memory contract: what she stores after every interaction and when
3. Learning contract: how she detects a pattern worth promoting
4. Escalation contract: when she surfaces uncertainty to Fritz vs. just decides
5. FAMtastic standard: every suggestion must pass the FAMtastic test (Lego, not puzzle)

### What MCP servers Shay-Shay connects to

**Phase 1 (build now):**
- `mcp-famtastic-studio` — the existing Studio server. Shay-Shay reads Studio state,
  triggers builds, reads site specs, reads intelligence findings. This MCP already
  exists as the Studio WebSocket protocol; wrap it in an MCP server definition.
- `mem0` — JavaScript MCP server. Shay-Shay's memory backend. Reads and writes
  episodic, semantic, procedural memories.

**Phase 2 (after 10 sites):**
- `playwright` — Microsoft's official MCP server. Shay-Shay can visually verify a
  built site, capture screenshots, run the accessibility and layout checks that are
  currently manual.
- `github` — already in FAMtastic's MCP config. Shay-Shay reads PR status, commit
  history, and can trigger CI.

**Phase 3 (when rank-and-rent launches):**
- `twilio-sms` — receive and route SMS leads from deployed sites. Shay-Shay handles
  lead notification and routing without Fritz being the bottleneck.

---

## 4. LEARNING WITHOUT EXPLICIT FEEDBACK

### The minimum viable learning loop

The pattern that produces measurable improvement within 10 interactions, confirmed
by production RLHF-lite implementations:

```
1. Log every suggestion + context + user action
2. Score each outcome: shipped=1.5, accepted=1.0, edited=0.7, dismissed=0.3
3. After 3 high-scoring outcomes for the same pattern → promote to semantic memory
4. Semantic memories influence future routing and prompt construction
5. After 10 builds on the same vertical → generate vertical intelligence summary
```

**The four implicit signals FAMtastic already generates (not yet captured):**
1. **Build accepted + shipped:** Plan card approved → build submitted → passes checklist → deployed
2. **Build edited:** User sends a correction message after a build ("change the hero color to...")
3. **Build dismissed:** Plan card cancelled, or user asks for a different approach
4. **Build ignored:** Studio goes idle after a build without user interaction (ambiguous but real)

**Making learning inspectable:**

This is the non-negotiable. An AI that learns invisibly is an AI that users stop
trusting. Shay-Shay's memory must be:

- **Viewable:** A "Memory" tab in Studio's Intelligence pane shows what Shay-Shay
  knows. Organized by site, by vertical, by global patterns.
- **Editable:** Fritz can mark a memory as "outdated" or "wrong". Marked memories
  decay immediately.
- **Attributable:** Every suggestion traces back to the memory that triggered it.
  "I suggested dark background because this site has used dark backgrounds in all
  3 previous builds (all shipped)."
- **Exportable:** Memory files are plain JSON in `.wolf/memory/`. Fritz owns the data.
  Not a black box.

**The promotion log:** A `.wolf/memory/promotions.jsonl` file that records every time
a pattern was promoted from episodic to semantic. Date, what pattern, how many
confirmations. This is the learning audit trail.

---

## 5. FAMTASTIC APPLICATION — THE FULL ARCHITECTURE

### The stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHAY-SHAY ORCHESTRATOR                        │
│              Claude Opus (planning + routing)                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Fast Router  │  │  Mem0/Kuzu   │  │   A2A Agent Cards    │   │
│  │  (Sonnet)     │  │  (memory)    │  │   (brain registry)   │   │
│  └──────┬───────┘  └──────────────┘  └──────────────────────┘   │
└─────────┼───────────────────────────────────────────────────────┘
          │ routes to
    ┌─────┴──────────────────────────────────┐
    │                                        │
    ▼                                        ▼
┌───────────────────────────┐    ┌───────────────────────────────┐
│     STUDIO MCP SERVER      │    │      BRAIN EXECUTORS          │
│  (existing server.js)      │    │                               │
│  - build_site              │    │  Claude Sonnet → builds       │
│  - get_state               │    │  Gemini Flash  → research     │
│  - list_sites              │    │  Codex GPT-5.4 → code review  │
│  - suggest_tech_stack      │    │                               │
└───────────────────────────┘    └───────────────────────────────┘
          │
    ┌─────┴──────────────────────────────────┐
    ▼                                        ▼
┌─────────────────┐                ┌─────────────────────────────┐
│  PLAYWRIGHT MCP  │                │         MEMORY LAYER        │
│  (phase 2)       │                │  .wolf/memory/<site>/       │
│  - visual verify │                │  episodic.jsonl             │
│  - screenshot    │                │  semantic.json              │
│  - audit         │                │  procedural.json            │
└─────────────────┘                │  promotions.jsonl           │
                                   └─────────────────────────────┘
```

### What to build in order

**Seed (build now — 1 session):**

1. `skill.json` + `instructions.md` for Shay-Shay
   - Routing behavioral contract
   - Memory read/write triggers
   - Brain routing rules
   - FAMtastic standard enforcement

2. **Suggestion logging** in `server.js`
   - On every plan card shown: log `{suggestion, context, timestamp}`
   - On plan card approved: update log with `outcome: accepted`
   - On plan card cancelled: update log with `outcome: dismissed`
   - On build shipped to production: retroactively update with `outcome: shipped`
   - File: `.wolf/memory/suggestions.jsonl`

3. **Memory schema** definition
   - Define `episodic`, `semantic`, `procedural` JSON schemas
   - Define promotion threshold (3 high-score events)
   - Files: per-site in `sites/<tag>/.memory/`

This is Shay-Shay's nervous system. Nothing visible to the user yet. Everything needed
to start learning.

**Grow (sessions 2-3 — after 5 sites with the seed layer):**

4. **Mem0 + Kuzu MCP server integration**
   - Install and configure Mem0 JavaScript MCP server
   - Wire per-site memory to `.famtastic/memory/<tag>/`
   - Wire semantic memory to global Mem0 store
   - Test: start a site build and confirm episodic event stored; start second
     build and confirm Shay-Shay's context includes the first build's outcomes

5. **Memory inspector in Studio UI**
   - New "Memory" section in the Intelligence pane
   - Shows: episodic log (last 10 events), semantic patterns, global preferences
   - Edit/dismiss controls for each memory entry
   - Attribution display: "Why did Shay-Shay suggest this?"

6. **Promotion job**
   - Weekly cron via `fam-hub` that scans `suggestions.jsonl`, identifies 3+
     high-score matches, promotes to semantic memory
   - Writes to `promotions.jsonl` as audit log

**Mature (sessions 4-6 — after 25+ sites, memory is producing signal):**

7. **Playwright MCP integration for visual verification**
   - Shay-Shay auto-runs visual checks on every build that passes the 5-check system
   - Screenshots saved to `sites/<tag>/builds/<id>/screenshots/`
   - Visual diff on rebuild: flag if hero layout shifted unexpectedly

8. **Multi-brain synthesis**
   - Shay-Shay delegates research to Gemini, code generation to Claude, adversarial
     review to Codex — then synthesizes the outputs
   - A2A Agent Cards make brain switching a config change

9. **Vertical intelligence summaries**
   - After 10 builds in the same vertical (rooftop bars, HVAC, etc.): generate a
     vertical summary from semantic memory
   - Inject summary into every future build for that vertical automatically
   - This is the compounding advantage: build 50 rooftop bars, the 51st is
     demonstrably better than the first

---

## WHAT NOT TO BUILD YET

**Managed Agents (Anthropic hosted):** In research preview as of April 2026. The
memory and multiagent features are not GA. Use local Mem0 + Kuzu until Q3 2026
when these exit preview. Don't block architecture on a beta service.

**MemRL (reinforcement learning for memory):** January 2026 technology. No production
deployments documented at scale. Useful when FAMtastic has 500+ sites and enough
signal to train a meaningful preference model. Not at 20 sites.

**A2A Protocol over the wire:** A2A's gRPC transport is for multi-organization agent
communication. FAMtastic is a single-operator system. All brains run in the same
process or are called via existing APIs. A2A's Agent Card *format* is worth adopting
for internal capability declaration; the A2A *transport* is unnecessary complexity.

**LangGraph:** More powerful than needed right now. FAMtastic's orchestration is:
classify → route → execute → remember. That is not a stateful graph. It is a function.
LangGraph becomes relevant when approval gates, parallel branches, and human-in-the-loop
checkpointing become bottlenecks. They are not bottlenecks at 20 sites.

**Twilio SMS routing:** Build it when the first rank-and-rent site goes live. Not before.

---

## THE FAMTASTIC ASSESSMENT

Is this architecture bold enough?

**The honest answer: the seed layer is conservative. The mature layer is the right kind of bold.**

The seed is intentionally lean — a skill definition, suggestion logging, memory schema.
This is not timid; it is the difference between building a foundation and building a
facade. Every flashy AI-assistant demo fails within ten interactions because the
foundation wasn't there. Shay-Shay starts with the foundation.

The mature architecture is genuinely differentiated:

**No site builder has a persistent learning orchestrator** that improves as the
portfolio grows. Every competitor rebuilds from zero on every project. FAMtastic's
Shay-Shay compounds. Build 50 rooftop bars and the 51st is better than the first.
That is not a feature. That is a structural competitive advantage that cannot be
purchased or imitated without the history.

**The compounding flywheel is the bold move:**
- Every site build stores episodic memory
- Episodic memory promotes to semantic patterns
- Semantic patterns improve every future build in the same vertical
- The portfolio grows, the quality compounds, the cost per site decreases
- At 1,000 sites, Shay-Shay knows more about building income-generating rooftop bar
  sites than any human or any competing tool

**What would make this bolder:** The moment rank-and-rent launches and Shay-Shay
routes SMS leads without Fritz's involvement — that is when the architecture proves
itself. Not a site builder. A business-building machine.

**FAMtastic verdict: Bold enough. Build the seed immediately. The boldness is in
the compounding, not the features.**

---

## QUICK REFERENCE

| What | Where | When to build |
|------|-------|--------------|
| Shay-Shay skill.json + instructions.md | `.claude/skills/shay-shay/` | Session 1 (seed) |
| Suggestion logging in server.js | `.wolf/memory/suggestions.jsonl` | Session 1 (seed) |
| Memory schema definition | `sites/<tag>/.memory/` | Session 1 (seed) |
| Mem0 + Kuzu MCP integration | server.js + mcp config | Session 2-3 (grow) |
| Memory inspector UI | Studio Intelligence pane | Session 2-3 (grow) |
| Promotion job + promotions.jsonl | `fam-hub` cron | Session 2-3 (grow) |
| Playwright MCP visual verification | server.js + post-processing | Session 4-6 (mature) |
| Multi-brain synthesis (A2A Cards) | `.famtastic/agents/` | Session 4-6 (mature) |
| Vertical intelligence summaries | Intelligence loop extension | Session 4-6 (mature) |
| Twilio SMS lead routing | New classifier intent | When rank-and-rent launches |

---

## 6. CAPABILITY AWARENESS & GAP DETECTION

### The market gap: nobody has built this

Research across Cursor, GitHub Copilot, Perplexity, Linear, and every major AI
assistant confirms: **no production system has an explicit "captured gap" pattern.**
Limitations are communicated through silent failure, hallucination, or terse error
messages. None of them say "You've asked me to do this four times and I couldn't —
want to add it to the backlog?" That UX does not exist anywhere in production.

This is Shay-Shay's opportunity. Every assistant that fails silently teaches the user
to stop asking. Every assistant that fails honestly and captures the gap teaches the
user to trust the system even when it can't help yet.

---

### Three categories of failure — they are not the same

Shay-Shay handles three fundamentally different failure modes, and **treating them the
same is the architectural mistake every other system makes.**

**Category 1 — Feature doesn't exist yet**

The user is asking for something FAMtastic has never built. No code path. No intent
in the classifier. No tool schema. The route dead-ends.

Response contract:
- Name the gap explicitly: "I don't have a way to do that yet."
- Capture it: log intent, context, frequency
- Offer the productive alternative: "I can add this to the capability backlog. Want me to?"
- Never hallucinate a capability path that doesn't exist

**Category 2 — Feature exists but isn't connected to Shay-Shay**

The capability lives somewhere in FAMtastic (server.js, a CLI tool, a manual workflow)
but Shay-Shay has no tool schema or MCP route to reach it. The feature is real but
unreachable from here.

Response contract:
- Distinguish this clearly from Category 1: "That exists in Studio but I don't have
  a direct path to it yet."
- Route to the manual equivalent: "You can do this via the terminal — `fam-hub site build <tag>`"
- Log this as a **wiring gap**, not a capability gap. The fix is a tool schema addition,
  not a feature build.

**Category 3 — Feature exists, Shay-Shay can route to it, but it will fail**

The intent classifies, the brain is selected, the tool exists — but the call will fail
because of a missing API key, quota exhaustion, network unavailability, or a known
broken path (the restyle dead code path is exactly this).

Response contract:
- Fail fast with the specific reason: "Gemini research is available but your
  GEMINI_API_KEY isn't set."
- Distinguish from Categories 1 and 2: this is fixable right now, not a future build item
- For known-broken paths (restyle, etc.): don't route there at all. Shay-Shay's
  capability manifest marks them as `status: broken` until fixed.

---

### The capability manifest

Shay-Shay's self-knowledge lives in a structured manifest, evaluated at session start.
Not a static list — a dynamic capability check that reflects the actual state of the
environment.

```json
// .famtastic/shay-shay-capabilities.json
{
  "version": "1.0",
  "evaluated_at": "2026-04-16T18:21:00Z",
  "capabilities": [
    {
      "id": "build_site",
      "description": "Trigger a full site build via Studio",
      "status": "available",
      "route": "studio_ws",
      "requires": ["ws_connected"]
    },
    {
      "id": "research_vertical",
      "description": "Research a business vertical using Gemini",
      "status": "available",
      "route": "gemini_flash",
      "requires": ["GEMINI_API_KEY"]
    },
    {
      "id": "visual_verify",
      "description": "Run visual verification via Playwright",
      "status": "not_connected",
      "route": "playwright_mcp",
      "requires": ["mcp_playwright"],
      "note": "Playwright MCP not configured — Phase 2 build item"
    },
    {
      "id": "restyle_site",
      "description": "Regenerate visual design tokens without changing content",
      "status": "broken",
      "route": "dead_code",
      "note": "Restyle intent routes to unimplemented handler — known gap, listed in DEEP-DISCOVERY Thread 7"
    },
    {
      "id": "sms_lead_routing",
      "description": "Route inbound SMS leads to rank-and-rent clients",
      "status": "not_built",
      "route": null,
      "note": "Requires Twilio MCP — build when rank-and-rent launches"
    }
  ]
}
```

**At session start**, Shay-Shay evaluates each capability's `requires` conditions:
- `ws_connected` → ping Studio WebSocket
- `GEMINI_API_KEY` → check environment
- `mcp_playwright` → check MCP server registry

Capabilities that fail their checks are marked `degraded` or `unavailable` for the
session. Shay-Shay never routes to a capability marked `broken` or `not_built` without
explicitly naming the gap first.

---

### Where captured gaps live

Three destinations. Each has a distinct role.

**1. Gap log — the raw capture layer**

`~/.local/share/famtastic/gaps.jsonl` — append-only, one JSON object per gap event.

```json
{
  "id": "gap-sms-001",
  "timestamp": "2026-04-16T18:22:00Z",
  "site_tag": "site-altitude",
  "user_intent": "send me an SMS when someone fills out the contact form",
  "attempted_route": null,
  "failure_category": "not_built",
  "capability_id": "sms_lead_routing",
  "frequency": 1,
  "session_id": "sess-abc123"
}
```

Every time the same capability gap fires, the `frequency` counter on the canonical gap
entry increments. The gap log does not create duplicate entries for the same
`capability_id` — it aggregates.

**2. Intelligence findings — the surfaced signal layer**

When a gap reaches frequency ≥ 3 within 30 days, it is promoted to an intelligence
finding in `~/.local/share/famtastic/intelligence-promotions.json` (the same store
the intelligence loop already uses).

The promoted finding reads:
```
[capability_gap] "SMS lead routing" requested 4 times across 2 sites in 14 days.
No implementation exists. Estimated build: 1 session (Twilio MCP + classifier intent).
```

This finding surfaces in Studio's Intelligence pane and in the next intelligence
loop report — the same path as every other intelligence finding. Gaps are treated
as intelligence, not as separate error logs.

**3. Build backlog — the work queue layer**

When Fritz says "yes, add that" (or Shay-Shay surfaces the gap with the
"Add to backlog?" prompt and gets an affirmative), it becomes a backlog entry in
`.wolf/build-backlog.json`.

```json
{
  "id": "backlog-sms-routing",
  "title": "SMS lead routing via Twilio MCP",
  "source": "gap_detection",
  "gap_id": "gap-sms-001",
  "frequency": 4,
  "first_requested": "2026-04-10T10:00:00Z",
  "last_requested": "2026-04-16T18:22:00Z",
  "sites_affected": ["site-altitude", "site-groovetheory"],
  "estimated_sessions": 1,
  "dependencies": ["rank-and-rent launch"],
  "status": "pending",
  "priority_score": null
}
```

The build backlog is Fritz's working list of real feature requests, sourced from real
usage, not speculation. It is reviewed manually — Shay-Shay never auto-promotes to
"in progress." Fritz approves the work.

---

### The promotion lifecycle

```
User attempts X → Shay-Shay cannot route → gap logged (frequency: 1)
                                                    │
                                          same intent again (frequency: 2)
                                                    │
                                          again (frequency: 3)
                                                    │
                                    ┌───────────────▼───────────────────┐
                                    │  INTELLIGENCE FINDING PROMOTED    │
                                    │  "SMS routing requested 3x"       │
                                    └───────────────┬───────────────────┘
                                                    │
                                    Surfaces in Studio Intelligence pane
                                                    │
                              Shay-Shay next time this fires:
                              "You've asked me to do this 3 times.
                               Want me to add it to the build backlog?"
                                                    │
                                           Fritz says yes
                                                    │
                                    ┌───────────────▼───────────────────┐
                                    │       BUILD BACKLOG ENTRY         │
                                    │  Status: pending                  │
                                    │  Priority: Fritz decides          │
                                    └───────────────┬───────────────────┘
                                                    │
                                           Feature gets built
                                                    │
                                    Capability manifest updated:
                                    status: available
                                    Gap log entry: status: resolved
                                    Intelligence finding: closed
```

**What triggers promotion:** Frequency ≥ 3 within 30 days. No other condition required.
The user has demonstrated repeated intent. That is enough signal.

**What triggers backlog entry:** Explicit Fritz approval. Shay-Shay asks; Fritz decides.
The system does not add to the backlog silently.

**What closes the gap:** Capability manifest updated to `available`. Gap log entry
marked `resolved`. Intelligence finding marked `closed`. Shay-Shay now routes to the
working capability instead of naming the gap.

---

### What Shay-Shay actually says

The language matters. These are not error messages. They are honest state reports
from a system that knows itself.

**Category 1 — doesn't exist:**
> "I don't have that yet. You've asked me to route incoming leads via SMS before — this
> is the third time. Want me to add SMS lead routing to the build backlog? It's probably
> a one-session build once rank-and-rent launches."

**Category 2 — exists but not connected:**
> "That capability is in Studio but I can't reach it directly yet. You can do it
> manually: go to the Deploy pane and click Staging. I've noted this as a wiring gap —
> I'll be able to route it directly once the deploy MCP is wired up."

**Category 3 — exists but will fail:**
> "I can see a restyle path in the classifier but it routes to dead code — it won't
> actually change anything. That's a known gap. Until it's fixed, the safe way to
> restyle is to rebuild from scratch with a new visual direction in the brief."

All three responses share the same properties:
- **Honest about what state the system is in** — no false confidence
- **Specific about why** — not just "I can't do that"
- **Actionable** — offers the next step even when the primary path is blocked
- **Learning** — logs the gap, mentions it if it's recurring

---

### The capability manifest update contract

When a feature ships, the capability manifest update is **part of the definition of
done** — as non-negotiable as a passing build verification. The build is not complete
until:

1. Capability manifest entry updated: `status: available`
2. Gap log entries for this `capability_id` marked `resolved`
3. Intelligence findings for this gap marked `closed`
4. Build backlog entry status set to `shipped`

This is a 4-line JSON update per capability shipped. The cost is zero. The benefit
is that Shay-Shay immediately begins routing to the new capability and stops naming
the gap. The system heals itself.

---

### The FAMtastic application: the exact architecture

The scenario: **"I noticed you asked me to do X three times and I couldn't. Want me
to add it to the build backlog?"**

What makes this possible:

1. **`gaps.jsonl`** — append-only event log. Every failed routing attempt logged with
   `capability_id` and `frequency` counter

2. **Frequency check on every gap event** — when a gap fires, before responding,
   Shay-Shay reads the current frequency for that `capability_id`. If ≥ 3:
   - Response includes the frequency: "You've asked me to do this 3 times"
   - Response includes the offer: "Want me to add it to the build backlog?"
   - If yes: create entry in `.wolf/build-backlog.json`

3. **Capability manifest** — Shay-Shay knows the difference between not-built,
   not-connected, and broken. She names the right category.

4. **Intelligence store** — at frequency ≥ 3, the gap becomes an intelligence finding.
   It surfaces in Studio's Intelligence pane independently of whether Fritz is in a
   conversation with Shay-Shay. The gap is visible even between sessions.

5. **Build backlog** — Fritz-approved work queue, sourced from real usage, readable
   by `fam-hub`. The gap becomes a task when Fritz says yes.

The gap flow connects four files that already exist or are defined in the seed layer:
`gaps.jsonl` → `intelligence-promotions.json` → `build-backlog.json` → capability
manifest. The orchestration is Shay-Shay; the storage is flat files; the promotion
is frequency-triggered; the work item is human-approved.

---

### Updated quick reference (additions from Thread 6)

| What | Where | When to build |
|------|-------|--------------|
| Capability manifest | `.famtastic/shay-shay-capabilities.json` | Session 1 (seed) |
| Gap event log | `~/.local/share/famtastic/gaps.jsonl` | Session 1 (seed) |
| Frequency check + "add to backlog?" prompt | server.js classifier + Shay-Shay skill | Session 1 (seed) |
| Gap → intelligence promotion job | intelligence loop extension | Session 2-3 (grow) |
| Build backlog | `.wolf/build-backlog.json` | Session 2-3 (grow) |
| Capability manifest update in definition-of-done | CLAUDE.md rule | Session 1 (seed) |
| Gap viewer in Intelligence pane | Studio UI | Session 2-3 (grow) |

---

*Architecture document: 2026-04-16*  
*Thread 6 research basis: Microsoft Agent Governance Toolkit, Audited Skill-Graph research, Linear Agent, n8n Production AI Playbook, Amazon agentic systems evaluation, Arize AI agent failure analysis*  
*Note: No production AI assistant currently implements the "captured gap → backlog offer" pattern. This is a genuine competitive differentiator.*  
*Next action: Build the seed — skill.json + suggestion logging + memory schema + capability manifest + gap log*
