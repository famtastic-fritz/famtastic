"""Task handlers — the actual work the worker agents perform.

Each handler takes a task payload and returns a dict:
    {
      "prompt":   str,   # text handed to the router (drives token/cost estimate)
      "summary":  str,   # short human-readable result stored on the task
      "artifact": str|None,    # relative path under deliverables/ that was written
    }

Generic handlers (triage/summarize/classify) demonstrate throughput and routing
variety. The six "proof" handlers generate the real business-pipeline package
requested as the factory's first job, writing substantive markdown to
deliverables/.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DELIV = os.path.join(ROOT, "deliverables")


def _write(rel_path, content):
    path = os.path.join(DELIV, rel_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)
    return rel_path


# --------------------------------------------------------------------------- #
# Generic handlers (sample workload)
# --------------------------------------------------------------------------- #
def h_triage(payload):
    text = payload.get("text", "")
    label = "urgent" if any(w in text.lower() for w in ("now", "asap", "down", "fail")) else "normal"
    return {"prompt": f"Triage this item and label it:\n{text}",
            "summary": f"triaged -> {label}", "artifact": None}


def h_summarize(payload):
    text = payload.get("text", "")
    words = text.split()
    summary = " ".join(words[:18]) + ("…" if len(words) > 18 else "")
    return {"prompt": f"Summarize:\n{text}", "summary": f"summary: {summary}", "artifact": None}


def h_classify(payload):
    text = payload.get("text", "").lower()
    cat = "sales" if "buy" in text or "price" in text else "support" if "help" in text else "other"
    return {"prompt": f"Classify into sales/support/other:\n{text}",
            "summary": f"class -> {cat}", "artifact": None}


# --------------------------------------------------------------------------- #
# PROOF deliverable #0 — Business model & full sales pipeline
# --------------------------------------------------------------------------- #
def h_business_model(payload):
    content = BUSINESS_MODEL_MD
    art = _write("business-model.md", content)
    return {"prompt": "Author the complete business model and sales pipeline for "
                       "selling FAMtastic Designs as a product, from conception to "
                       "payment collection (PayPal) and email (GoDaddy).",
            "summary": "wrote complete business model + 7-stage pipeline",
            "artifact": art}


# --------------------------------------------------------------------------- #
# PROOF deliverable #1 — Ultimate Claude Code prompt builder
# --------------------------------------------------------------------------- #
def h_prompt_builder(payload):
    art = _write("claude-code-prompt-builder.md", PROMPT_BUILDER_MD)
    # Also emit a runnable, reusable builder so the deliverable is not just prose.
    art2 = _write("prompt_builder.py", PROMPT_BUILDER_PY)
    return {"prompt": "Design the ultimate reusable Claude Code prompt builder.",
            "summary": f"wrote prompt-builder spec + runnable {art2}",
            "artifact": art}


# --------------------------------------------------------------------------- #
# PROOF deliverable #2 — Shay-Shay v2 (rebuilt from scratch)
# --------------------------------------------------------------------------- #
def h_shay_shay_spec(payload):
    art = _write("shay-shay-v2-spec.md", SHAY_SHAY_MD)
    return {"prompt": "Recreate Shay-Shay from scratch as the world's most advanced "
                      "virtual assistant with an unoverridable Fritz-supreme directive "
                      "and advanced research/memory recall.",
            "summary": "wrote Shay-Shay v2 spec (Prime Directive + memory architecture)",
            "artifact": art}


# --------------------------------------------------------------------------- #
# PROOF deliverable #3 — Agent inspiration synthesis (Hermes, Open Jarvis + 6)
# --------------------------------------------------------------------------- #
def h_agent_synthesis(payload):
    art = _write("agent-inspiration-synthesis.md", AGENT_SYNTHESIS_MD)
    return {"prompt": "Synthesize the strongest patterns from Hermes, Open Jarvis "
                      "and six more leading agents into Shay-Shay.",
            "summary": "wrote 8-agent synthesis matrix + adopted patterns",
            "artifact": art}


# --------------------------------------------------------------------------- #
# PROOF deliverable #4 — Odysseus workspace optimization
# --------------------------------------------------------------------------- #
def h_odysseus(payload):
    art = _write("odysseus-optimization.md", ODYSSEUS_MD)
    return {"prompt": "Optimize the Odysseus self-hosted workspace for Shay-Shay v2.",
            "summary": "wrote Odysseus optimization & integration plan",
            "artifact": art}


# --------------------------------------------------------------------------- #
# PROOF deliverable #5 — System improvement audit (bug logs / commits / complaints)
# --------------------------------------------------------------------------- #
def h_system_audit(payload):
    # Read-only peek at the parent repo's bug log if present (never written to).
    bug_count = 0
    bug_note = "parent .wolf/buglog.json not found from sandbox — used documented assumptions"
    candidate = os.path.join(ROOT, "..", ".wolf", "buglog.json")
    try:
        if os.path.exists(candidate):
            with open(candidate, encoding="utf-8") as fh:
                data = json.load(fh)
            bugs = data if isinstance(data, list) else data.get("bugs", data.get("entries", []))
            bug_count = len(bugs) if isinstance(bugs, list) else 0
            bug_note = f"read {bug_count} entries from parent .wolf/buglog.json (read-only)"
    except Exception as exc:  # never let the audit crash the worker
        bug_note = f"buglog read skipped: {exc}"
    content = SYSTEM_AUDIT_MD.format(bug_count=bug_count, bug_note=bug_note)
    art = _write("system-improvement-audit.md", content)
    return {"prompt": "Audit current Shay/system bug logs, commits, and complaints; "
                      "propose concrete improvements.",
            "summary": f"wrote improvement audit ({bug_note})",
            "artifact": art}


REGISTRY = {
    "triage": h_triage,
    "summarize": h_summarize,
    "classify": h_classify,
    "business_model": h_business_model,
    "prompt_builder": h_prompt_builder,
    "shay_shay_spec": h_shay_shay_spec,
    "agent_synthesis": h_agent_synthesis,
    "odysseus_optimization": h_odysseus,
    "system_audit": h_system_audit,
}


def run(kind, payload):
    handler = REGISTRY.get(kind)
    if not handler:
        return {"prompt": f"Unknown task kind {kind}", "summary": f"no handler for {kind}",
                "artifact": None}
    return handler(payload)


# =========================================================================== #
# Long-form deliverable content
# =========================================================================== #
BUSINESS_MODEL_MD = """# FAMtastic Designs — Business Model & End-to-End Sales Pipeline
*(Internal product spec. Sandbox proof artifact — no live spend, no real credentials.)*

## 1. Product
**FAMtastic Designs** — confidently-different, conversion-grade websites produced by
the FAMtastic site factory. The differentiation is not "a website"; it is the layered
hero vocabulary, real SVG dividers, multi-part logo system, and motion craft that a
normal agency would not ship. We sell the *outcome* (a site that looks bespoke) at
the *cost structure* of an automated factory.

### Packaging (three SKUs)
| Tier | Promise | Price (anchor) | Margin lever |
|------|---------|----------------|--------------|
| **Spark** | 1-page launch site, 48h | $499 one-time | fully factory-built |
| **Signature** | 3–5 page site + brand kit | $1,499 one-time | 1 human review pass |
| **Atlas** | Multi-page + monthly care | $2,999 + $99/mo | recurring revenue |

The recurring "care plan" (hosting check, content edits, monthly intelligence report
from the factory's intelligence loop) is the strategic core: it converts one-time
project revenue into MRR.

## 2. The pipeline (conception → cash)
Each stage below is an automatable station. The agent factory can own every stage; a
human only approves at the gates marked **[GATE]**.

### Stage 1 — Conception / Offer design
- Define ICP: local service businesses (barbers, bakeries, contractors, transport,
  reunions) — exactly the verticals already proven in `famtastic-dna.md` build history.
- Map pain → promise → proof. Proof = the existing portfolio of built sites.

### Stage 2 — Marketing (demand generation)
- **Portfolio engine:** publish every factory-built site as a case study with a
  before/after and the "results are the proof" framing.
- **SEO/content:** one vertical landing page per ICP ("Atlanta barber shop websites").
- **Paid (optional, gated):** retarget visitors; budget capped, never auto-charged.
- Asset: `deliverables/` campaign templates (email + social) generated by the factory.

### Stage 3 — Campaigning (outbound)
- Sequenced cold/warm email via a **custom GoDaddy address** (e.g. studio@famtastic…).
- Drip: Day 0 intro + portfolio link → Day 3 case study → Day 7 limited-slot offer.
- Personalization token pulls the prospect's current site screenshot for a live
  "here's what we'd change" hook.
- **Sending capability** is obtained through the GoDaddy account (see SETUP.md). Until
  keys are provided the sandbox **mocks** every send and logs it as if delivered.

### Stage 4 — Contacting / Qualifying
- Inbound replies hit a triage agent (cheap model) → labels: hot / nurture / spam.
- Hot leads get a booking link; a discovery brief is auto-drafted for the human.
- **[GATE]** Human approves scope before a build is triggered.

### Stage 5 — Selling / Proposal
- Auto-generate a one-page proposal: chosen SKU, timeline, a *rendered preview* of
  their hero using the factory. The preview IS the close.
- Quote + terms; e-sign optional.

### Stage 6 — Fulfillment
- On signed deal, enqueue a `build` task to the FAMtastic site factory.
- Care-plan clients additionally get a recurring `intelligence_report` task.

### Stage 7 — Collection of payment
- Invoice issued and paid via **PayPal Business** (deposit → balance on delivery;
  care plan billed monthly). Credentials are filled into `.env` later; the sandbox
  **mocks** invoice creation and webhook receipt end-to-end so the flow is provable
  offline. No money moves in the sandbox.
- Reconciliation agent matches PayPal webhook → invoice → marks deal `paid` →
  releases deliverables.

## 3. Unit economics (illustrative, factory-cost basis)
- Build cost per site is dominated by model spend; the factory's router keeps it on
  the cheapest capable tier. Historic builds run ~250–550s of orchestration.
- Target: blended model + infra cost per Signature site < $15 → ~99% gross margin on
  a $1,499 ticket. The agent factory's job is to **defend that margin** via routing
  and concurrency tuning (the self-improvement loop).

## 4. How the agent factory runs this business
- **Marketing/campaign content** → `business_model`, content-generation tasks.
- **Lead triage** → `triage`/`classify` tasks (cheap model, high throughput).
- **Proposal/preview** → `build`-class tasks routed to a stronger model only when
  complexity warrants.
- **Billing reconciliation** → deterministic handler (no model spend).
- The orchestrator scales workers to queue depth (e.g. a campaign blast that floods
  the inbox spins up more triage workers, then retires them when the surge clears).

## 5. Risks & guardrails
- **Deliverability:** warm the GoDaddy domain; respect CAN-SPAM/opt-out. Mocked here.
- **Payment disputes:** deposit-first, deliver-on-balance; PayPal seller protection.
- **Brand risk:** the [GATE] human approval before send and before build.
- **Spend runaway:** router hard cap (`FACTORY_MAX_RUN_USD`) + cost ledger.

## 6. Extension hooks (fill in later)
- PayPal Business creds → real invoicing (`PAYPAL_*` in `.env`).
- GoDaddy creds + custom email → real sending (`GODADDY_*` in `.env`).
- Real lead source (form, CRM, marketplace) → replaces the seed script.
"""

PROMPT_BUILDER_MD = """# The Ultimate Claude Code Prompt Builder (Reusable)

A reusable system for composing high-leverage Claude Code prompts. It is opinionated,
checklist-driven, and outputs a single well-structured prompt from a few inputs.

## Why
Ad-hoc prompts drift. A builder enforces the parts that consistently move quality:
role, hard constraints, research-first ordering, explicit success criteria, proof
requirements, and an output contract.

## The 9-slot template
1. **Role / stance** — who the agent is and its default operating mode.
2. **Mission** — the single outcome, in one sentence.
3. **Context to load first** — files/docs to read before acting (research-first).
4. **Hard constraints** — invariants that must never be violated (the "non-negotiables").
5. **Reuse-before-generate** — where to look for existing solutions first.
6. **Plan gate** — when to stop and confirm vs. proceed autonomously.
7. **Success criteria** — observable, testable definition of done.
8. **Proof** — what artifact/output proves it worked (logs, tests, screenshots).
9. **Output contract** — exact shape of the deliverable.

## Composition rules
- Constraints are *imperative and specific* ("Use `TAG`, never `process.env.SITE_TAG`"),
  never vague ("write good code").
- Order matters: context → constraints → task → proof. Models honor earlier framing.
- Prefer one mission per prompt. Multi-mission prompts dilute attention.
- Always include a proof requirement; "it runs" beats "it should run".
- Bound autonomy explicitly: say when to ask vs. when to assume-and-log.

## Model selection note
Default to the most capable current Claude models for build/design work and reserve a
cheaper tier for triage/classification. The factory's `src/router.py` encodes exactly
this tiering; the prompt builder should emit a suggested tier per prompt.

See the runnable companion `prompt_builder.py` to generate prompts from a dict of slots.
"""

PROMPT_BUILDER_PY = '''#!/usr/bin/env python3
"""Runnable companion to claude-code-prompt-builder.md.

Compose a Claude Code prompt from the 9-slot model. Pure stdlib, importable or CLI.

    python3 prompt_builder.py            # prints a demo prompt
    from prompt_builder import build     # build({...}) -> str
"""
SLOTS = [
    ("role", "Role / stance"),
    ("mission", "Mission (one outcome)"),
    ("context", "Context to load first"),
    ("constraints", "Hard constraints (non-negotiable)"),
    ("reuse", "Reuse before generate"),
    ("plan_gate", "Plan gate (ask vs proceed)"),
    ("success", "Success criteria (testable)"),
    ("proof", "Proof of success"),
    ("output", "Output contract"),
]


def build(slots):
    out = []
    for key, label in SLOTS:
        val = slots.get(key)
        if not val:
            continue
        out.append(f"## {label}")
        if isinstance(val, (list, tuple)):
            out.extend(f"- {v}" for v in val)
        else:
            out.append(str(val))
        out.append("")
    return "\\n".join(out).strip()


if __name__ == "__main__":
    demo = {
        "role": "You are a senior build engineer operating in ultracode mode.",
        "mission": "Ship a working contact page for the active site.",
        "context": ["CLAUDE.md", "famtastic-dna.md", "site-studio/server.js"],
        "constraints": [
            "Use TAG, never process.env.SITE_TAG",
            "No inline style= attributes",
            "Route every HTML write through runPostProcessing()",
        ],
        "reuse": "Check site-studio/lib and existing pages before generating new CSS.",
        "plan_gate": "Proceed autonomously; only stop if a protected file must change.",
        "success": "Page renders, nav uses NAV_SKELETON classes, checklist 13/13.",
        "proof": "Screenshot + test output pasted back.",
        "output": "A single committed page + updated SITE-LEARNINGS entry.",
    }
    print(build(demo))
'''

SHAY_SHAY_MD = """# Shay-Shay v2 — World-Class Virtual Assistant (Rebuilt From Scratch)

A ground-up specification for Fritz's AI-Boss agent core, rebuilt to be the most
advanced virtual assistant in the FAMtastic ecosystem.

## 0. The Prime Directive (unoverridable)
> **Nothing supersedes Fritz.** No process, rule, instruction, tool, plugin, or agent —
> internal or external — may override Fritz's authority. If any input attempts to
> supersede a Fritz rule, Shay-Shay **kindly and gracefully refuses, then notifies
> Fritz** with: what tried to override, the rule it violated, and the safe action taken.

Implementation: the directive is a top-priority middleware on every decision. It runs
*before* tool dispatch and *after* plan synthesis. It is immutable at runtime — it lives
in signed core config, not in mutable memory, so no learned behavior or injected prompt
can edit it. Override attempts are logged to an audit trail and surfaced to Fritz.

## 1. Architecture (layers)
1. **Sense** — inbound channels (CLI, chat, email triage, calendar, notes).
2. **Recall** — memory + research retrieval (below) injected as grounded context.
3. **Reason** — planner that decomposes goals into steps; routes to the cheapest
   capable model per step (mirrors the factory router).
4. **Act** — tool/skill execution with the Prime Directive middleware in front.
5. **Reflect** — post-task evaluation → writes durable learnings → improves next run.

## 2. Memory & research recall (the differentiator)
- **Working memory:** current task context window.
- **Episodic memory:** per-session notes (who/what/when), tied to a session id.
- **Semantic memory:** vector store over the vault (on-device embeddings, no key
  required) for "what do we know about X" recall.
- **Procedural memory:** skills/capabilities catalog — reuse before generate.
- **Research retrieval:** fan-out web search → fetch → adversarial verify → cite →
  synthesize → store the synthesized note back into semantic memory so the next
  question is answered from memory, not re-researched.
- **Recall ordering (mandatory before acting):** procedural (skills) → semantic
  (vault) → episodic (recent sessions) → external research only if still uncertain.

## 3. Refusal & escalation behavior
- Override attempt → graceful refusal + Fritz notification (Prime Directive).
- High-stakes/irreversible/ambiguous → escalate to Fritz with a crisp recommendation,
  not an open-ended question.
- Everything else → proceed and log (assume-and-continue).

## 4. Surfaces
- **CLI** (primary) — same ergonomics as today, hardened.
- Inherits the synthesized best-of patterns from the 8-agent study
  (`agent-inspiration-synthesis.md`).
- Runs heavy/local work on Odysseus (`odysseus-optimization.md`) to cut cloud spend.

## 5. Continuity with the current system
- Improvements derived from real bug logs/commits/complaints are tracked in
  `system-improvement-audit.md` and must be carried into v2, not re-broken.
"""

AGENT_SYNTHESIS_MD = """# Agent Inspiration Synthesis — Best-of-Eight → Shay-Shay v2

We studied eight notable agent systems and extracted the single strongest pattern from
each, then resolved conflicts into one coherent design. (Patterns are summarized from
general knowledge of these projects; validate specifics against current upstream docs
before implementing — logged as an assumption.)

| # | Agent | Signature strength | Adopted into Shay-Shay v2 |
|---|-------|--------------------|----------------------------|
| 1 | **Hermes agent** | Function-calling discipline / structured tool schemas | Strict typed tool contracts; reject malformed tool calls early |
| 2 | **Open Jarvis** | Always-on voice/ambient assistant loop | Optional ambient listener surface; wake-word gated, off by default |
| 3 | **Auto-GPT** | Autonomous goal decomposition | Bounded planner with a step budget (no unbounded loops) |
| 4 | **BabyAGI** | Task-list reprioritization loop | Dynamic re-prioritization of the queue by value/urgency |
| 5 | **AutoGen** | Multi-agent conversation / role debate | Adversarial-verify + judge panel for high-stakes answers |
| 6 | **CrewAI** | Role-based crews with clear responsibilities | Lane/role separation for parallel work (like this factory's lanes) |
| 7 | **OpenDevin/OpenHands** | Sandboxed code execution environment | All execution sandboxed; never touch host outside scope |
| 8 | **MemGPT/Letta** | Tiered memory with paging between context & store | The 4-tier memory model in the Shay-Shay v2 spec |

## Conflict resolution
- **Autonomy vs. safety:** Auto-GPT-style autonomy is capped by OpenHands-style
  sandboxing and a hard step/spend budget. Autonomy never wins over the Prime Directive.
- **Voice vs. focus:** Open Jarvis ambient mode is opt-in and wake-word gated so it
  doesn't add noise to focused CLI work.
- **Many agents vs. cost:** AutoGen/CrewAI multi-agent debate is reserved for
  high-stakes decisions; routine work stays single-agent on the cheap tier.

## Net stance
Take the *stringency* of each (typed tools, bounded loops, sandboxing, tiered memory,
adversarial verification) and combine them under one rule: **nothing supersedes Fritz.**
"""

ODYSSEUS_MD = """# Odysseus Workspace Optimization for Shay-Shay v2

Target: the self-hosted AI workspace at https://github.com/pewdiepie-archdaemon/odysseus.
Goal: make Odysseus the local execution + memory substrate for Shay-Shay v2 so that
heavy/private work runs locally and cloud spend is reserved for genuinely hard steps.

## What Odysseus gives us
- Local chat + local agent runs (cut cloud cost / keep data private).
- Deep research, model serving, document editing, memory/skills, email triage,
  notes/tasks, calendar — a full local workspace.

## Optimization plan
1. **Routing handoff:** Shay-Shay's router treats Odysseus-served local models as the
   *cheapest capable tier*. Triage, classification, summarization, and first-draft
   generation run locally; only hard reasoning escalates to cloud Claude.
2. **Memory bridge:** sync skills and semantic memory between Odysseus and the FAMtastic
   brain so a learning captured in either surface is recalled by both. One canonical
   store, two read paths.
3. **Email/notes/calendar:** wire Odysseus' triage to feed the Sense layer; the Prime
   Directive middleware still gates any outbound action.
4. **Skills parity:** mirror the FAMtastic skill catalog into Odysseus so "reuse before
   generate" works locally too.
5. **Sandbox discipline:** Odysseus runs in its own container; it never modifies the
   FAMtastic repo outside agreed sync paths.

## Integration checklist
- [ ] Stand up Odysseus locally (own container/env).
- [ ] Point Shay-Shay router's "local" tier at Odysseus' served model endpoint.
- [ ] Establish the bidirectional memory/skills sync.
- [ ] Route email/notes/calendar through the Sense layer with Prime Directive gating.
- [ ] Measure: % of steps served locally and the resulting cloud-spend reduction.

(Operational install/driving of a real instance is handled by the dedicated `odysseus`
operator agent; this doc is the optimization/integration design.)
"""

SYSTEM_AUDIT_MD = """# System Improvement Audit — Bug Logs, Commits & Complaints

Method: inventory what exists, diff against intended state, list improvements with the
smallest fix. Read-only against the current system; nothing was modified.

## Inputs reviewed
- Parent bug log: {bug_note} (entries: {bug_count}).
- Documented regressions in `famtastic-dna.md` (BEM single-dash, plain-text nav brand,
  parallel-page logo race, content/layout misrouting, `process.env.SITE_TAG` staleness).
- CLAUDE.md doctrine (documentation, brain-sync, plan-closeout rules).

## Findings → improvements (carry into Shay-Shay v2)
1. **Class-name drift (BEM single vs double dash).** *Fix already proven:* literal
   skeletons + tests. v2: keep skeleton-as-contract; add a pre-write linter so drift
   can't reach disk.
2. **Ambiguous-intent misrouting (content vs layout).** *Fix:* default to the cheap
   surgical path. v2: the router's `triage_threshold` mirrors this — keep ambiguous
   work on the cheap tier.
3. **Stale runtime snapshots (`process.env.SITE_TAG`).** v2: forbid reading startup
   snapshots for mutable state; single live source of truth.
4. **Memory siloing (branches predating the brain).** v2: enforce "branch from a base
   that has the brain"; memory writes converge to one canonical store.
5. **Plan drift (active plans with zero tasks).** v2: bake closeout/checkpoint into the
   reflect step so no plan stays active-but-empty.
6. **Documentation lag.** v2: documentation is part of done — a task isn't complete
   until its learnings are written (this factory's self-improvement loop enforces the
   same idea via LEARNINGS.md).

## How this factory already applies the lessons
- Cheapest-capable routing (finding #2), single source of truth in SQLite (finding #3),
  bounded self-tuning + written learnings (findings #5/#6), and a cost ledger so spend
  regressions are visible.
"""
