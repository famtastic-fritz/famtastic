# Mythos Foundation Plan — Review Handoff (2026-06-11)

**To:** the next Mythos/web review session
**From:** the local execution session that produced the plan
**Subject:** `mythos-foundation-plan.md` is written, adversarially reviewed, and revised to v2. This doc tells you what changed relative to your original framing, what the review found, and what we need from you.

---

## 1. What happened

Your `mythos-master-prompt-v2.md` was executed locally with full repo access. Output: **`docs/famtastic-designs/mythos-foundation-plan.md`** — all 37 required sections, all §20 subsections, all 20 required agents, all 14 routing task classes, all 13 backend objects with the 6 required attributes.

The plan went through two passes:

- **v1 draft** — written from your prompt + the three canonical source files + a full repo-reality audit.
- **Adversarial review** — an independent reviewer checked v1 against the master prompt requirement-by-requirement and spot-checked every factual claim about the repo. Verdict: structurally complete, repo claims all verified accurate, **11 fixable issues** found.
- **v2 (current file)** — all 11 findings fixed. This is the version now in the repo.

## 2. Changes relative to your original plan/framing

These are the places where execution deviated from (or resolved ambiguity in) the original master-prompt expectations:

1. **Interview compressed to 1 question.** Fritz answered question 1 (Proof Engine architecture) with both a decision and a standing directive: *"make the strongest reasonable assumption, label it clearly, and continue unless the answer would radically change the system design."* The remaining 6 questions were converted to labeled assumptions (A1–A5) and decision points (D1–D7) in §32. Nothing stalled.

2. **Standing assumption A1 (Fritz-confirmed):** Proof Engine v1 builds on the **existing fam-hub site factory** as its execution backend, behind a swappable `generate_proof()` boundary. This is the biggest architectural commitment in the plan and it was made deliberately — the factory already ships FAMtastic-grade multi-page sites on a flat-rate subscription (near-zero marginal proof cost).

3. **Repo-reality grounding changed the build estimate substantially.** Things your prompt treated as to-be-designed already exist and were wired into the plan instead of redesigned:
   - A lead pipeline skeleton at `pipeline/agents/` (scout, outreach, followup, responder, supervisor) with a gated `pipeline/lib/sender.py` send choke point — the plan's 7 send-gates enforce there.
   - A working Resend + MySQL + GoDaddy PHP backend reference at `~/famtastic-sites/mbsh-reunion/backend/` — adopted as the hosted-plane pattern (§13, §23).
   - A SQLite job queue with cost columns at `~/.config/famtastic/studio.db` — extended as the orchestration plane.
   - A Keychain-backed secrets vault (`platform/vault/`), cpanel-mcp deploy tooling, and the plans/closeout discipline — all reused.

4. **Stack recommendation made (you left it open, Fritz leaned "hybrid"):** Next.js + React Three Fiber showroom on Vercel (Option A) with tiered immersion so Tier-1 (GSAP/CSS) ships before the 3D entry scene; static factory output for proof previews; GoDaddy MySQL + PHP API for the hosted plane with a half-day migration seam; orchestration stays on the local machine until auto-send is earned (then a VPS).

5. **Routing is subscription-first, not API-first.** Hard-won local lesson (documented in the repo's cerebrum): flat-rate lanes (Claude Code subscription) before metered APIs, with cap-aware explicit fallbacks — silent paid-lane flips are the #1 historical failure class here. Premium API reasoning is reserved for architecture, escalations, and high-value-lead final review.

6. **Anthropic pricing/caching facts were verified against current platform docs** before the capability map was written (Opus 4.8 $5/$25 per MTok, Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5, batch −50%, cache reads ≈0.1×). Flagged in §20.1 for re-pinning in `vendor-capability-matrix.md`.

7. **Managed/hosted agent platforms: DEFER.** The repo already runs a working local orchestration layer; hosted agents add cost and failure surface without removing a current constraint. Revisit when 24/7 cloud execution is needed.

## 3. Adversarial review — full findings and resolutions

Reviewer verdict on v1: **NEEDS FIXES** (structure complete; all repo claims verified; issues were spec compressions and internal contradictions). All 11 fixed in v2:

| # | Finding (severity order) | Resolution in v2 |
|---|---|---|
| 1 | §19 agents carried only 6 of the required 13 attributes; cost risk and failure modes missing per-agent | Added **Cost risk** and **Key failure mode** columns to all three agent tables (21 agents); added an explicit note that remaining detail is deliberately deferred to `agents.md` |
| 2 | §6 declared Lighthouse ≥ 80 mobile "launch-blocking" but §36's launch-blocking column omitted it | Added to §36 launch-blocking column (public marketing pages) |
| 3 | Cost alert ($2/proof) was 4× the stated target ($0.50) with no explanation | Alert aligned to $1.00 = 2× target, rationale documented in both §19 and §20.7 |
| 4 | Roadmap used "D8–9 … D28–30" for days, colliding with decision-point notation D1–D7 | Renamed to "Days 8–9" etc. throughout §30 |
| 5 | Assumption numbering started at A2; A3/A5 missing from the §32 checklist | Standing assumption labeled **A1**; A3 merged into D4, A5 into D6 in §32 |
| 6 | Church proof feature list had 15 of the 16 required features ("mobile-friendly church experience" missing) | Added to the Church Connect feature menu (§9) |
| 7 | Pricing/caching numbers stated as unsourced facts | Source + as-of date added in §20.1, with re-verification routed to `vendor-capability-matrix.md` |
| 8 | §20.1 and §20.8 were pointer stubs to §21/§35 | §20.1 now carries a 9-row capability table + pricing note; §20.8 summarizes all 7 experiments inline |
| 9 | Auto-send gate self-contradictory ("100 consecutive approved" + "<2% rejection") | Reworded: <2% rejection across last 100 reviewed drafts AND zero rejections in the most recent 25 AND 14 clean deliverability days |
| 10 | Interview citations (Q9, Q18/A33) unanchored | Citation key added to the header: they reference `interviews/chatgpt-foundation-interview-2026-06-11.md` |
| 11 | Email Event object had no status values where the prompt requires them | Documented as a deliberate deviation: append-only immutable log; lifecycle state lives on Contact/Proof |

Factual spot-checks that **passed** (no errors found): `pipeline/agents/*`, `pipeline/lib/{sender,store,copywriter}.py`, mbsh-reunion backend modules, `studio.db` cost/approval columns, `platform/vault/vault.sh`, Cash App identity in `platform/config/owner-profile.json`, `sites/site-famtastic-designs` (old Drupal site), `mcp-server/`, `scripts/plans/audit.js`.

## 4. What we need from your review

1. **Challenge the big call:** factory-as-backend (A1) — is the swappable boundary contract (§10) strong enough, or does anything in your strategy require generator independence sooner?
2. **Stack check (A5/D6):** Option A (Next.js + R3F on Vercel) vs Option B (factory-built static showroom, faster) — §28. Pick or confirm.
3. **Pressure-test the 7-Day Cash Sprint (§31)** — is anything missing between proof delivery and deposit collection?
4. **Campaign configs (§9):** sharpen personas/angles/offers per vertical — this becomes `campaigns.md`, the next doc generated.
5. **Resolve what you can from D1–D7 / §32** (domain state, Stripe status, mailbox choice, geography radius).
6. Anything that should move between the launch-blocking and non-blocking columns in §36.

## 5. Repo state notes (important for web review)

- The three canonical source files (`foundation-findings.md`, `infrastructure-inputs.md`, `interviews/chatgpt-foundation-interview-2026-06-11.md`) live on **origin/main**. The local working tree was missing them (local/remote divergence) — local reconciliation is a known pending task and does not affect this review.
- Companion docs worth re-reading alongside the plan: `mythos-master-prompt-v2.md`, `mythos-upgrade-packet-2026-06-11.md`, `vendor-capability-research-intake-2026-06-11.md`.

**After your review:** corrections fold into the plan, then the 10 child docs are generated in §34 dependency order (design → pages → backend → email-system → campaigns → agents → workflows → vendor-capability-matrix → native-feature-experiments → roadmap), then Day 1 of the Cash Sprint.
