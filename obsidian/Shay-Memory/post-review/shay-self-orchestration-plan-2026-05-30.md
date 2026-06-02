---
title: Shay Self-Orchestration + Companion App — Master Plan (v2, post-R1)
date: 2026-05-30
tags: [shay, orchestration, swarm, companion-app, plan, quality-checks, brain-agnostic]
permalink: shay-memory/post-review/shay-self-orchestration-plan-2026-05-30
type: note
status: v3.1-expanded-scope-reviewed-R1-R2-R3
---

# Shay Self-Orchestration + Companion App — Master Plan (v2)

**Mission.** Make Shay capable of doing — autonomously and more efficiently — the entire arc Claude Code just did by hand: take a goal ("review your last build; write a V2 plan, a phone-app plan, and a swarm-architecture spec; benchmark yourself against a cloud workflow; compile a comparison"), then **decompose → orchestrate a fan-out → adversarially review → synthesize → write artifacts → record proof** without a human babysitting it. And build the **companion phone app** that lets Fritz drive and supervise all of it from his phone — a "Claude-Code-app-on-your-phone" that connects to Shay Desktop, answers build/approval prompts mid-run, and meets Claude-app + Codex-app capability as the *floor*.

**This is v3.** v1 → 6 adversarial Gemini lenses (all `revise-major`) → v2 → R2 (Gemini `ship` + Claude `revise-major` on quality) → v2.1 → **Fritz expanded the scope** (Shay builds her own app; full-time phone interface; idea→completion + interview orchestration; note-taker/diary/pattern-finder; a first-class get-smarter loop; store approval de-blocked) → v3. The full critique trail is at the end. Where earlier versions over-claimed, the plan says so explicitly.

**The bigger mission (v3).** The orchestration capability (Parts A/C/D) is the *engine*. The point of the engine is: (1) Shay **builds and maintains her own companion app** (Part B) — the app is the engine's flagship output, not a side project; (2) that app is Fritz's **full-time Shay interface** — ideas in from the phone, routed to completion, with Shay generating interviews when she needs input (Part B); (3) Shay is a **real personal assistant** — notes, diary, pattern-finder (Part I); and (4) **every run makes the next one smarter** via a measured learning loop that mints new skills/agents and scans how others solve these problems (Part H). Store approval is explicitly *not* a blocker to getting this on Fritz's phone.

---

## 0. Two findings that reshaped this plan

### 0.1 The brain reality: there is no "unlimited workhorse"

v1 assumed Codex `gpt-5.5` on the $100 ChatGPT subscription was a flat-rate, effectively-unlimited workhorse. **That is false.** On 2026-05-30, programmatic Codex calls failed with `You've hit your usage limit … try again Jun 2nd, 2026`. Combined with the Anthropic **weekly** cap that started this whole arc, the actual situation is:

| Brain | Availability today | Cost posture |
|---|---|---|
| Codex `gpt-5.5` (ChatGPT sub) | **Capped until ~Jun 2**, likely recurring | flat sub but hard-capped |
| Anthropic Claude (50 API credits) | metered, small balance | pay-per-token, reserve |
| **Gemini Flash** | **always available** | cheap/free-tier (15 RPM cap) |
| **Ollama local** | **always available** | free, slow, low quality |

**Consequence:** the only two *always-available* brains are **Gemini Flash and local Ollama.** The plan must run on those by default, treat Codex as a *preferred-when-available* upgrade (auto-enabled after its cap resets), and treat Claude as a *metered final-gate* resource. Any design that assumes a single uncapped premium brain is broken. This is the same vendor-cap lesson the whole project keeps re-learning — so v2 bakes in a **live availability check** instead of assuming.

### 0.2 The "reuse Shay's brain" insight is right in spirit, wrong in mechanism

v1 said: route the swarm through Shay's `plugin_llm.py` provider layer (it already does Codex/Claude/Gemini/Ollama with fallback). The *spirit* is correct — don't bolt a second brain onto the swarm. But the *mechanism* (Python import) is broken: a live test importing Shay's `auxiliary_client` from the `shay-agent-os` package fails with `ModuleNotFoundError: No module named yaml` — the two packages are in different envs and `plugin_llm` is a plugin-surface facade, not a standalone router.

**Corrected mechanism:** the swarm reaches Shay's brain via the **already-running Shay gateway** (HTTP) or a **`shay -z --provider X --model Y` subprocess**, *not* an in-process import. This keeps the swarm decoupled from Shay's package env and inherits the fallback chain over the wire.

---

## PART A — Orchestration capability (3 phases, each gated)

Fritz: "all three, phased — because I don't want to assume we got it right the first time." Each phase has a **binary acceptance gate** (Part D). A gate failure **stops the roadmap** — no proceeding on faith.

### Phase 1 — Make the swarm produce J′-quality output

The benchmark proved 3 specific, code-level failures. Each fix below names the exact file/function — because R1 showed v1's "small fixes" hid real integration work.

**1.1 BrainClient seam (corrected mechanism).** Add a `BrainClient` abstraction in `worker_pool.py` with two impls:
- `GatewayBrainClient` — POSTs to the running Shay gateway LLM endpoint (or shells `shay -z --provider … --model …`), so a task can request any provider/model and inherit Shay's fallback chain **over the wire** (no cross-package import). **Startup ordering (R2 minor):** if the gateway is not running at swarm cold-launch, `GatewayBrainClient` falls back to the `shay -z` *subprocess* path (which starts its own resolution) rather than silently dropping to `DirectOllamaClient`; the availability check logs which path is live.
- `DirectOllamaClient` — current `_call_ollama` behavior; the zero-dependency local fallback.
- **Loud failure, not silent degradation:** `SwarmOrchestrator.start()` runs a `BrainAvailabilityCheck` that pings each configured provider and logs which are reachable. If the configured judge/synth brain is unreachable, it logs a WARNING and auto-downgrades down the chain — and records the *effective* brain. The v1 risk (policy says Codex, Codex is capped, swarm silently falls back to hermes3 with no log) is closed.

**1.2 Fix the dead-code judge + decomposer (this is the real fix).** R1 found `self.judge_model` is stored but never read — `_judge()` (goal_loop.py ~line 312) and `_decompose()` (~line 185) both route through `model_tier='complex'` → hermes3 via `MODEL_MAP`. So changing `JUDGE_MODEL` does nothing today. The fix: rewrite `_judge()` and `_decompose()` to call the `BrainClient` directly with the policy's `judge`/`decompose` brain (default Gemini Flash), **bypassing the WorkerPool/Ollama path entirely for cloud-brain tiers.** Without this, every other Phase-1 fix is a no-op and the neuroscience drift survives.

**1.3 Anti-drift anchor check (concrete wiring).** Add `_anchor_check(session, proposed_subgoals) -> filtered`. Call site is explicit: in `goal_loop.py` ~lines 150–159, where the judge's `else` branch appends `new_goals`, filter through `_anchor_check` *before* appending. The check uses a **versioned prompt artifact** `prompts/anchor_check.txt` templated with the original goal + a forbidden-domain blocklist (seeded from the benchmark failure: "neuroscience", "working memory", "Docker swarm", etc.). Scores 0/1 per sub-goal; off-topic ones are dropped/rewritten. Gate threshold: 0 off-topic dispatched.

**1.4 Synthesis / reduce step (concrete).** Add `GoalLoop.synthesize(subgoals) -> str`: concatenate sub-goal results (with a hard max-context truncation so the prompt stays bounded — R1's token-blowup concern), call the **synth brain** (Gemini Flash default), return the consolidated artifact. Wire into `step()` Phase-4 *before* `final_result` assignment: `session.final_result = self.synthesize(session.subgoals)`. The benchmark's `final_result_chars: 0` was a *missing reduce step*, not an inability to synthesize. This is the single highest-leverage fix — do it first.

**1.5 Tier hygiene.** Drop `simple: qwen2.5:1.5b` (R1 agreed it's only fit for string transforms — but keep a `tiny` tier mapped to it for genuine one-shot transforms so we don't lose a fast path). Default unspecified tasks to `medium`; remap `medium` to `qwen2.5:7b` if quality demands.

**1.6 Built-in adversarial verify (opt-in).** After synthesis, optionally spawn N skeptic sub-goals (configurable lenses) → if majors remain, one revise pass. Bakes the J′ R1/R2 pattern into Shay. **Circularity fix (from R1):** the verify/blind-review brain MUST differ from the synth brain — if Gemini synthesizes, the verify uses Claude (metered, one call) or Ollama-ensemble; reviewer ≠ author.

**1.7 Durability disclosure (honesty fix).** Phase-1 runs are **non-durable** — an OOM/crash/Mac-sleep loses in-progress results (in-memory state). This is acceptable for benchmark runs but **not** production. Durability arrives in Phase 2 (checkpoints). The Phase-1 gate explicitly does **not** test durability, and Phase 1 is not "production-ready."

**Phase 1 gate (D-1).** Re-run `swarm-benchmark.py`: status `completed`; `final_result` passes the **structural** quality assertions in D-5 (not a char count); anchor log shows 0 off-topic; output survives a blind verify by a *different* model with only-minor complaints; effective-brain logged. Plus a **concurrency-measurement task**: a 20-task synthetic fan-out records actual judge-brain RPM consumption + Ollama queue saturation, to validate the token/wall-clock estimates *with evidence* before Phase 2.

### Phase 2 — Dispatcher protocol + admin-tunable policy + real durability

**2.1 `Dispatcher` protocol.** `fan_out(tasks)`, `export_checkpoint() -> jsonl`, `import_checkpoint(jsonl)`. `SwarmOrchestrator`/`TrustMode`/`ErrorRecovery`/`GoalLoop` depend only on this. Two impls: `LocalSwarmDispatcher` (Phase-1 pool) and `AsyncioDispatcher` (semaphore-bounded; stub → grow).

**2.2 Honest LangGraph stance (R1 fix).** v1 deferred LangGraph while specifying a checkpointer — contradictory. v2 states it plainly: **Phase 2 hand-rolls a JSONL checkpoint/resume layer, which is a partial reinvention of LangGraph's checkpointer.** This is justified only by avoiding LangGraph's dependency + breaking-change surface for our scale. **If the custom layer proves fragile under concurrency or crash before Phase 3, adopt LangGraph's checkpointer as a drop-in** (the `Dispatcher` protocol makes it a swap, not a rewrite). This decision is **not deferred indefinitely** — it is re-evaluated at the Phase 2 gate against a defined trigger: "checkpoint round-trip fails any crash-recovery test."

**2.3 Admin-tunable policies (rebuilt around brain reality).** Ship two runnable today + one gated:
- `free-maximal.yaml` — all Ollama. Lowest ceiling; always runs.
- `balanced.yaml` (**default**) — workers=Ollama, decompose/judge/synth=**Gemini Flash**, blind-verify=Claude (1 metered call). Runnable today.
- `speed-first.yaml` — Codex everywhere. **Excluded from the Phase 2 gate** until a precondition check ("Codex programmatic call succeeds") passes; re-introduced as Phase 2.5 after the cap resets. Includes a `codex_available_after` key so judge/synth auto-upgrade to Codex without a manual edit.
- Selected via `shay swarm --policy <name>` (CLI plumbing is net-new in Phase 2 — v1 wrongly implied it existed).

**2.4 Concurrency honesty (propagated everywhere).** Real single-node ceiling: Ollama on Apple Silicon serializes — **effective ~1–2 simultaneous local inferences, ~4–8 useful concurrent agents** counting cloud tiers, **not** 500 simultaneous. "500 agents" = 500 tasks *pipelined* through a bounded pool over wall-clock. This reframe is propagated into **Part B P2** too (v1 left "watch 500 tasks pipeline" misleading there).

**Phase 2 gate (D-2).** `free-maximal` + `balanced` run the benchmark identically; `balanced` matches Phase-1 quality. Checkpoint export/import round-trips on a 50-task smoke test **AND a crash-recovery test** (kill mid-run, resume from checkpoint, verify no lost results). No Phase-1 quality regression.

### Phase 3 — Programmable pipeline (split into 3a/3b per R1)

**3a — Primitives + job authoring, proven on a synthetic job.** `agent()`, `parallel()`, `pipeline()`, `adversarial_verify()`, `judge_panel()`, `loop_until_dry()`. A job = declarative spec (phases + per-phase brain + gates). Shay generates the spec from NL (brain authors, runtime executes deterministically). **Gate 3a:** Shay runs a synthetic 5-task multi-phase job end-to-end with proof + memory wiring. This is a real checkpoint where the system can be declared "done-enough" if 3b proves too costly.

**3b — The full meta-test (Part E).** Only after 3a. **Gate 3b** = the worked example below (Shay reproduces the doc-arc autonomously).

**3c — The capstone: Shay builds her own companion app.** Only after 3b. The orchestrator takes the Part-B app spec as a goal, routes codegen to a capable brain (B.0), builds, tests, and ships a working build to Fritz's phone via the personal-install path (B.1). **Gate 3c** = a real, installable build on the phone, with a D-6 strong-model/human spot-check on the generated code. This is the ultimate proof the engine works: it produces its own interface. Also the first heavy exercise of the learning loop (Part H) — each rebuild should get cheaper.

**Codex rate-limit fallback chain (R1 fix — makes "zero approvals" honest).** On any cloud-brain 429/timeout mid-job: (1) downgrade judge/synth to Gemini Flash; (2) Claude for the final quality gate only (metered); (3) if all cloud brains exhausted, **job pauses and emits an approval-request event** — which P0 surfaces to the phone. So the guarantee is precisely: **"zero approvals unless rate-limited,"** not an absolute.

---

## PART B — Shay companion app: the full-time Shay interface, **built by Shay**

**Reframed (Fritz, 2026-05-30).** Two things change the center of gravity:

1. **Shay builds her own app.** The app is not a separately hand-built workstream — it is the **first real production run of the Phase-3 programmable pipeline**. "Take this app spec → ship it to my phone" is a goal Shay's orchestrator decomposes, codes (routing codegen to a capable brain — see B.0), tests, and iterates. The app is therefore the **Phase-3 capstone** (Gate 3c, below), a bigger test than the doc-reproduction meta-test.
2. **It is the full-time Shay interface.** Everything from the phone: drop an idea → Shay routes it to completion; when a step needs Fritz, Shay **generates an interview and delivers it to the phone**; plus note-taker, diary, pattern-finder (Part I). Animating use case still holds: answer a build/approval prompt mid-run, job resumes.

### B.0 — Honest constraint: who actually writes the code

Local Ollama cannot write a production app. Self-build means Shay's orchestrator **routes codegen to a capable coding brain via API**: the orchestrator authors structured, multi-turn prompts and manages file read/write/exec through the existing filesystem + shell tools, calling **Codex (after cap reset) or the Claude API (metered) with tool-use**. (R3 fix: v2 said "drive Claude Code as a sub-agent" — that's inaccurate; Claude Code is an interactive CLI with no stable programmatic surface. The honest, achievable mechanism is **calling the model's API with tool-use**, not puppeteering the CLI.) Stated plainly so "Shay builds it" is not magical thinking — Shay *orchestrates, writes files, runs tests, and verifies*; a strong brain writes the Swift/JS. This is exactly why Phase 3's pipeline + the learning loop (Part H) matter: each build run should make the next one cheaper and more autonomous.

### B.1 — Store approval is NOT on the critical path (Fritz)

Getting on the App/Play Store is **nice-to-have, not a blocker to getting this on Fritz's phone.** This removes the heaviest R1 phone-app risks from the critical path:
- **Install path = personal-first.** Options (decision in Part G): (a) **PWA** — installable to home screen today, zero signing, push supported on iOS 16.4+; fastest to "on my phone." **Killer-feature caveat (R3):** iOS Web Push delivers the approval notification, but Fritz must *open the PWA* to submit the answer — no silent/background submit. The job waits correctly, but a dismissed notification delays approval until he returns. This is the **primary motivation for a later native shell** (APNs + background refresh removes the friction). PWA does not *kill* the feature, it adds friction. (b) **Sideload / personal dev build** (Xcode free = 7-day re-sign; $99/yr Apple Developer = 1-yr + TestFlight). (c) **TestFlight internal** — no full App Store review.
- **Relay no longer needs a NetworkExtension entitlement.** Fritz installs the **normal Tailscale app**; Shay's app just makes **HTTPS calls to the Mac's MagicDNS name over the existing tailnet** — our app builds no VPN, so the entitlement R1 flagged as a blocker is gone. Cloudflare Tunnel remains the no-Tailscale fallback.
- Store-policy hardening (the old 5-point checklist) moves to an **optional later "public release" track**, not a precondition for personal use.

### Phase P0 — Relay + remote-approval spine + idea→completion + interview orchestration
- **Job suspension/resume contract (makes the killer feature real):** before any approval/interview gate fires, the Desk job **checkpoints full state to disk** (JSONL/SQLite at a named path), emits the push, then exits or blocks. On answer receipt, a **resident Shay daemon (launchd-managed)** reloads the checkpoint and resumes — correct whether or not the Mac slept or the process was killed.
- **Idea → completion routing.** A phone capture (text/voice/share) drops into the existing **`fam-hub idea`** pipeline (capture → triage → blueprint → validate → build). Shay drives it to completion, surfacing progress on the phone.
- **Interview orchestration (min-bar Fritz named).** When a step needs Fritz's input, Shay **generates a structured interview** (the same pattern as the 7-section Desk spec interview) and pushes it to the phone as async Q&A; Fritz answers from the phone; Shay folds answers in and continues. This is the `AskUserQuestion` pattern, *authored by Shay*, delivered over the relay.
- **Relay:** Tailscale-app HTTPS over tailnet (no entitlement) primary; Cloudflare Tunnel fallback; cert pinning.
- **Push:** APNs requires a **Mac-side APNs sender** (local HTTP/2 sender or tiny cloud relay) — named as real infra. (PWA path uses Web Push instead.)
- **Live monitoring:** agent tree, phase progress, token/cost meter, artifact list.

### Phase P1 — Full-time-interface feature floor (Claude+Codex apps as the floor; honestly multi-month)
Sub-phased with estimates; **P2 gates on P1a, not full P1**:
- **P1a (~3–4wk):** chat + streaming + history/search + the **idea-capture + interview-answer** surfaces (the parts that make it a *full-time interface*, prioritized first).
- **P1b (~4wk):** voice mode (streaming STT/TTS, background audio) + attachments.
- **P1c (~3wk):** share-extension capture + projects/spaces + **diary/notes** surface (Part I).
- **P1d (~2wk):** Watch glance + widgets + **pattern-finder** digest.
Brain-agnostic model switcher (Codex/Claude/Gemini/local) is first-class throughout.

### Phase P2 — Beyond the floor (gated on P1a)
Drive the swarm from the phone (dispatch, pick policy, watch the **500-task queue drain through a 4–8 worker pool** — realistic wall-clock, not "500 live agents"); on-device tier per phone-app-plan §7; Desk companion panel reusing the redesign.

**Platform pick (Part G decision).** PWA-first gets it on the phone fastest with one shared codebase and de-risks everything (no signing, no store, no entitlement) at the cost of native depth (Live Activities, Watch, true background). Native Swift/SwiftUI iOS gives the differentiators but is the multi-month arc. **Recommendation: PWA-first to reach "full-time interface on my phone" quickly, then a native shell for the native-only features once the relay + orchestration are proven.** Confirm at review.

**Part B gates.** P0-a (parallel with Phase 2) = relay + push round-trip smoke test + an idea captured from phone enters `fam-hub idea`. P0-b (after Phase 2.1) = full job suspension/resume + an interview generated by Shay answered from the phone, job resumes. Relay security check (ACLs, keychain-only secrets, tunnel auth). P1a: chat/stream/history + idea/interview surfaces working. **Gate 3c (capstone):** Shay's orchestrator builds + ships a working build of this app to Fritz's phone, with a human spot-check (D-6) on the generated code.

---

## PART C — Brain / cost policy + efficiency scorecard (rebuilt)

**Default policy = `balanced`, reflecting brain reality:**

| Step | Brain (today) | Brain (after Codex cap resets) | Cost |
|---|---|---|---|
| Worker grunt (high-volume, transform-class) | Ollama local | Ollama local | $0 |
| Decompose / judge / synth | **Gemini Flash** | Codex `gpt-5.5` (auto-upgrade) | cheap → flat-sub |
| Built-in adversarial verify / blind review | **Claude (1 metered call) or different-model** | Codex or Claude | metered — *mindful* |
| Fallback when a brain caps mid-run | next in chain → pause+phone-approval | same | — |

**Efficiency targets (Shay must beat the human-orchestrated baseline) — now with a derivation requirement:**
- **Tokens < 500k** (vs J′'s 2.1M) — but **must be derived bottom-up before commitment**: `decompose(1) + judge(N_turns) + synth(N_docs) + verify(2·N_lenses) + blind(1)`, each × avg tokens, using the failed 19-sub-goal benchmark as worst case. If the derivation on Gemini Flash exceeds 500k, **revise the target, not the truth.** (R1 majors: the number was asserted, not derived, and adversarial-verify token volume was unmodeled.)
- **Wall-clock:** faster than 41 min *where quality allows* — and only meaningful **after** Phase-1 quality fixes (6× faster to garbage is not a win).
- **Approvals:** zero mid-run **unless rate-limited** (then pause + phone-approval).
- **Quality:** hard floor — must pass D-5 assertions. A cheaper/faster run that fails quality **fails the gate.**
- **Improvement over time (Fritz's core ask):** the efficiency ledger (Part H.4) must show tokens/job or wall-clock/job *trending down* for the same task across runs, and new skills minted (Part H.2). "Getting smarter" is a measured trend, not a one-shot target.

**Scorecard row:** `{phase, policy, brain_policy_effective, tokens_estimated, tokens_actual, wall-clock, approvals, quality-verdict(enum)}`. `brain_policy_effective` (R1 fix) records which brain *actually* ran, exposing silent policy drift. `tokens_estimated` vs `tokens_actual` (R2 minor fix) carries the bottom-up derivation forward so the <500k claim is validated against reality at every run, starting at the Phase-1 gate. `quality-verdict` is an enum (`pass`/`fail`/`pass-with-minors`), not free text, so D-4 regression diffs are programmatic. **D-4 tolerance (R2 minor):** numeric regressions are judged against a ±15% band — only regressions beyond the band reject a phase, so noise doesn't cause false rejections.

---

## PART D — Quality-check framework (rebuilt to be executable, not gameable)

Three levels: per-phase binary gates, the benchmark as regression test, and self-critique baked into Shay. **Every gate is a function that returns true/false — not a vibe.**

### D-1/D-2/D-3 — Per-phase gates
Defined inline above. Binary. A failure stops the roadmap.

### D-4 — The benchmark harness IS the regression test
`swarm-benchmark.py` runs the same task after every phase; results diff against prior scorecard rows by the **enum** `quality-verdict` + numeric metrics. Any regression on a prior-passing metric rejects the phase.

### D-5 — Quality assertions (hardened against R2: deterministic where possible, honest where not)

R2 (Claude) flagged that v2's D-5 still leaned on LLM judgment dressed as functions, and that **the only always-available reviewers (Gemini/Ollama) reviewing each other is "weak-reviews-weak" theater.** v2.1 splits D-5 into three tiers by how trustworthy each check actually is.

**Tier 1 — Truly deterministic (no LLM in the loop; cannot be gamed by a model):**
1. **Structural completeness against a *frozen* clause list.** At **job-submission time** (not evaluation time), extract the goal's clauses into a stored, **user-editable** `job.clauses[]` JSON artifact. The check then fuzzy-matches output section headers against that fixed ground truth. (R2 fix: clause list is frozen up front, not re-parsed from free text at eval time.) Coverage ≥ M-of-N.
2. **Hallucination classes, not just instances.** Beyond the benchmark-seeded `hallucination_blocklist` + `known_tools.json` allowlist, add **domain-agnostic regex classes**: invented version numbers adjacent to a tool not in the allowlist; invented `Nms` / `Nx faster` figures not present in any source artifact; `/api/...` endpoint strings not found in the codebase. (R2 fix: catches *classes* of hallucination, reducing overfit to the one past failure.)
3. **Provenance by content-fingerprint, not HTTP-200.** At citation time store a fingerprint (title + first 200 chars for URLs; content hash for files). At validation, re-fetch and diff. (R2 fix: a real domain + fabricated path returning 200 no longer counts as valid.)
4. **Proof non-empty** — Data Center events.jsonl is non-zero-byte, memory note written, post-evaluation returned non-null. (R2 minor fix: presence ≠ meaningful; require non-empty.)

**Tier 2 — Deterministic anti-drift (embedding math, not a prompt):**
5. **On-topic by embedding similarity + string blocklist.** Replace the prompted 0/1 anchor score with: cosine similarity of each sub-goal to the goal embedding (configurable threshold) **plus** a string-matched forbidden-domain blocklist. (R2 fix: the gate can no longer be gamed by a model scoring its own output; accepts some false-negatives on subtle drift, documented.)

**Tier 3 — LLM-judgment checks, with a capability floor + honesty about their limits:**
6. **Reviewer ≠ author AND reviewer ≥ capability floor.** The blind-review verdict must come from a *different model* than the synth brain **and** from a model at or above a configured minimum tier. **Ollama is disqualified as a sole reviewer.** If no qualified reviewer is available (e.g., Gemini synthesized and only Ollama is free), the gate **fails with "no qualified reviewer available"** rather than rubber-stamping. (R2 fix: surfaces weak-reviews-weak as a visible failure, not a false pass. This is why the Claude metered credits exist — the blind review is the one place we spend them.)
7. **Claim-grounding (the form-vs-correctness fix).** The synth brain must emit, per output section, a citation to the sub-goal result(s) that support it. A validator asserts each cited sub-goal exists and is non-empty, and that no section makes a substantive claim with **zero** grounding. A second cheap pass runs an **internal-contradiction check** (does any section contradict another?). This raises the bar from "looks complete" to "claims trace to source + no self-contradiction."

### D-6 — The honest limit: form + grounding ≠ certified correctness

R2's single biggest finding, stated plainly so it is never forgotten: **no automated gate here can certify that a structurally-complete, well-grounded-looking synthesis is substantively *correct*.** A swarm that copies goal keywords into headers, cites real-but-unrelated sources, and produces a plausible-but-wrong comparison can pass every Tier-1/2/3 check. Closing this fully requires either ground truth or a strong reviewer. Therefore:

- **High-stakes artifacts** (anything Fritz will act on or ship) get a **mandatory spot-check sample** reviewed by the strongest *available* brain (Claude metered, or Codex after reset) — not the whole doc, just a sampled claim set, to bound cost. This is the one place a human-or-strong-model is in the loop by design.
- The plan does **not** claim the swarm produces certified-correct output autonomously. It claims the swarm produces output that **passes form + grounding gates and a strong-model spot-check** — which is the honest, achievable bar. Fritz decides per-artifact whether the spot-check suffices or he reads it himself.

### D-7 — Self-critique is the goal, with an independent qualified arbiter
End-state: Shay's own pipeline (1.6 + 3a `adversarial_verify`) catches Tier-1/2 failures pre-ship. Gate 3b passes only when the **qualified blind review (D-5.6) + strong-model spot-check (D-6)** rate Shay's output equivalent to the human-orchestrated J′ docs.

### D-8 — Negative-test corpus (operationalized, not prose)
Create `tests/swarm/negative_corpus.py` with `@pytest.mark.parametrize` entries encoding each benchmark failure as a `(input_condition, forbidden_output_pattern)` pair (drift SG-13→19, hallucinations SG-1/SG-9, missing synthesis). Wired into the harness/CI. Referenced by path so it is **executable**, not aspirational. Any future swarm change must keep these green. **Known limit (R2):** string-pattern negatives cannot catch *semantic* drift that uses correct surface vocabulary — that is what D-5.5 (embedding similarity) and D-6 (spot-check) are for.

---

## PART E — Worked example (Gate 3b, spelled out)

```
$ shay swarm run --policy balanced \
    --goal "Review my last Desktop build. Produce: (1) a V2 build plan,
            (2) a phone-app plan, (3) a swarm-architecture spec.
            Then benchmark yourself against the cloud-workflow baseline
            and compile a comparison report. Self-review adversarially
            until complaints are minor. Write everything to the vault
            and record proof."
```

Expected: Gemini decomposes → local workers draft in parallel → anchor-check keeps them on-topic → Gemini judges + synthesizes each doc → built-in adversarial verify (blind review by a different model) → artifacts to vault + Data Center proof + memory note → scorecard row. **No human input unless a brain rate-limits** (then pause + phone-approval). Token budget per the derived target. A blind review by a non-synth model rates output equivalent to this session's J′ docs.

When this works, Shay does what took Claude Code a multi-day, 2.1M-token, human-in-the-loop arc — by itself, more efficiently. That is the mission.

---

## PART H — The get-smarter loop (first-class, per Fritz: "each run we get smarter, find more efficiencies")

This is not a nice-to-have appended to the orchestrator — it is the reason the orchestrator is worth building. Fritz: *"I need to know that each time we run something we are getting smarter, we are finding more efficiencies … at the very least we are learning how to create research skills and agents and subagents … we should always be looking for repos and skills and updated ways to see how others are doing similar things. What issues were they running into? How do we make better."* Four mechanisms, each producing a durable artifact:

**H.1 — Post-run reflection (after every meaningful job).** A reflection stage runs at job end: *what was slow, what was redundant, what drifted, what would have been a reusable skill?* Output → an append to `.wolf/cerebrum.md` (learnings / do-not-repeat) + a memory note. This is wired into the Agent Startup Contract's "post-evaluation after meaningful jobs" — we make it concrete and mandatory, not optional.

**H.2 — Skill / agent / sub-agent generation (the "learn to make research skills" min-bar).** Concrete detection (R3 fix — v2's "detects a recurring pattern" was hand-wavy): a **pattern** = the same abstract operation type (e.g. web-search-then-verify) appears in ≥ K reflection entries within a rolling W-day window (K, W configurable). On trigger, Shay drafts a skill/agent definition **against a documented skill-schema** (interface contract the orchestrator can call — a schema stub ships in Phase 3a), validates it on the next matching job, and promotes it only if it passes a Part-D smoke gate. **Honest dependency:** auto-minting requires a capable brain available at mint time (Codex/Claude) — it does **not** run autonomously on Ollama-only, and is a genuine research-flavored task, not free infrastructure. It switches on at Phase 3a, not Phase 1.

**H.3 — Ecosystem / competitive scan (scheduled, not on-demand).** A recurring routine (cron) searches **GitHub repos, skill/agent marketplaces, and write-ups** for how others solve the same problems (multi-agent orchestration, brain-agnostic routing, local-LLM swarms, phone-relay agents). For each find it records: the approach, **what issues they hit**, and a concrete "how we could adopt/beat this" note → a dated `research/ecosystem-scan-<date>.md` + memory notes. This is the "always be looking for repos and skills and updated ways" requirement, operationalized as a schedule with an artifact, so it can't silently lapse. Routed to the always-available brains (Gemini for synthesis, local for triage) so it costs ~nothing.

**H.4 — Longitudinal efficiency ledger (proves we're actually getting smarter).** The Part-C scorecard rows accumulate into `research/efficiency-ledger.md` (or a small SQLite). A periodic digest computes trends: tokens/job, wall-clock/job, % autonomous (no-approval) runs, # new skills minted, # ecosystem findings adopted — **over time.** If the trend isn't improving, that itself is a flagged finding. This is how Fritz *knows* (his word) we're getting smarter, rather than being told we are. The pattern-finder (Part I.3) surfaces the digest to the phone.

**Gate (H) — de-confounded (R3 fix):** the trend must be measured **on the identical `swarm-benchmark.py` task** (not arbitrary jobs — different tasks aren't comparable), over **N ≥ 5 runs**, and **quality-constant** — only runs that *pass D-5* count toward the trend, so Shay can't fake "efficiency" by doing less or dropping verify passes (a token drop with a quality fail is excluded, not counted as a gain). Gate passes when: that quality-constant trend is downward on tokens/job or wall-clock/job, AND ≥1 skill was auto-minted + promoted, AND the ecosystem scan ran on schedule with non-empty findings. "Getting smarter" is thus a *measured, gaming-resistant* claim, not a vibe.

---

## PART I — Personal-assistant layer (note-taker, diary, pattern-finder)

Fritz: *"she needs to be my note taker, my diary, pattern finder. A real assistant."* Built on the already-wired vault brain ([[basic-memory]] + Smart Connections + vault-search), so this is mostly *surfaces + routines* over existing storage, not new infrastructure.

- **I.1 Note-taker.** Capture from anywhere (phone share-sheet / voice / quick-add) → structured notes in the vault via basic-memory, auto-tagged + auto-linked (Smart Connections). Frictionless inbox; Shay files and cross-links.
- **I.2 Diary.** A daily journal surface (phone + Desk). Shay can prompt ("anything to capture today?"), accept free-form or voice, and store dated entries. Private, local-first, never leaves the vault unless Fritz exports.
- **I.3 Pattern-finder.** A scheduled routine over notes + diary + job ledger (H.4) surfaces recurring themes, stalled ideas worth reviving, recurring inefficiencies, "you keep mentioning X" connections — delivered as a phone digest. Built on embeddings (vault-search / Smart Connections), so it's cheap. **Honesty (R3 minor):** similarity-lookup is existing infra, but the *clustering/summarization pass* that turns "find similar notes" into "here's a pattern" is **one net-new module** — not free, though small.
- **I.4 Idea pipeline tie-in.** Notes/diary entries flagged as ideas flow into `fam-hub idea` (Part B P0), closing the loop from "thought on my phone" → "thing Shay builds."

**Privacy posture:** all of I.1–I.4 is local-first in the vault; the relay only moves data to Fritz's own devices over the tailnet. No third-party storage.

---

## PART F — Sequencing, risk, scope boundaries

**Milestone Zero — "something useful on my phone soon" (R3 fix, stated up front so it isn't buried).** The path to phone-in-hand is **NOT** the self-build capstone (Gate 3c, months out). It is **P0-a**: Tailscale HTTPS relay running + a Web Push round-trip confirmed + one idea captured from the phone landing in `fam-hub idea`. This runs in parallel with Phase 2 and targets **~2–3 weeks after the Phase-1 gate passes**. Everything bigger (full interface, self-build, learning loop maturity) layers on after — but Fritz has a working, useful phone surface at Milestone Zero.


**Sequence (hard rule):** Phase 1 → Phase 1 gate → **P0-a relay in parallel with Phase 2** (low cognitive overlap) → Phase 2 gate → Phase 3a → 3a gate → Phase 3b → 3b gate → **Phase 3c (Shay builds the app)** → 3c gate → P1a…P1d / P2 (the app's feature build-out, now itself orchestrated by Shay). **Part H (learning loop) is wired in from Phase 1** — reflection (H.1) + ledger (H.4) attach to the very first gated run so the "getting smarter" trend has data from day one; H.2 skill-minting and H.3 ecosystem-scan switch on at Phase 3a (when the pipeline can author/run them). **Part I (assistant layer)** rides the phone P1c/P1d surfaces but its storage (vault notes/diary) can start being populated immediately — it's mostly existing infra.

**Top risks + mitigations:**
- *No uncapped premium brain* → default to Gemini+Ollama; `BrainAvailabilityCheck` + auto-downgrade + effective-brain logging; Codex auto-upgrades after cap reset.
- *Cloud brain caps mid-run under zero-approvals* → explicit fallback chain ending in pause + phone-approval ("zero approvals unless rate-limited").
- *BrainClient coupling* → gateway-HTTP/subprocess, not import; `DirectOllamaClient` fallback; loud availability check.
- *Non-durable Phase-1 runs* → disclosed; durability is Phase-2's job; gate doesn't pretend otherwise.
- *Hand-rolled checkpointer fragility* → LangGraph drop-in via Dispatcher protocol if the crash-recovery test fails at Phase-2 gate.
- *Phone background-execution / job death* → suspension/resume checkpoint + resident launchd daemon.
- *App Store rejection* → **de-risked: store is off the critical path (Fritz).** Personal install (PWA / sideload / TestFlight) + Tailscale-app relay (no NetworkExtension entitlement in our app). Store-policy hardening becomes an optional later "public release" track.
- *"Shay builds her own app" = magical thinking* → B.0 names it honestly: a capable brain (Codex/Claude/Claude-Code-as-subagent) writes the code; Shay orchestrates + verifies + spot-checks (D-6). Local models cannot do production codegen.
- *Get-smarter loop becomes unfalsifiable hand-waving* → Part H is gated on a **measured downward trend** in the efficiency ledger + ≥1 auto-minted skill + scheduled non-empty ecosystem scans. If the trend isn't there, that's a flagged failure, not a silent pass.
- *Scope creep (now larger with H/I/self-build)* → every phase ships standalone value + gate; Phase 3 split 3a/3b/3c for partial-credit stops; learning loop attaches incrementally (telemetry first, skill-minting later); assistant layer reuses existing vault infra.

**Out of scope:** adopting LangGraph now (only on Phase-2 crash-test failure); Anthropic pay-as-you-go billing (declined); changes to protected `lib/` files; `speed-first` policy until Codex cap confirmed reset; **public App/Play Store submission (explicitly deferred — nice-to-have, not a blocker).**

---

## PART G — Decisions needed from Fritz (surface, don't assume)

1. **Install path (the key v3 fork).** PWA-first (on the phone today, one codebase, no signing/store/entitlement — but limited native), vs native Swift/SwiftUI (Live Activities, Watch, true background — but multi-month + signing), vs hybrid (PWA now → native shell later). Plan recommends **hybrid: PWA-first**. Confirm.
2. **`balanced` as default policy?** (Gemini judge/synth today, Codex auto-upgrade after reset.) Confirm.
3. **Codegen brain for self-build (B.0).** Route codegen to the **Claude API with tool-use** (metered) or **Codex** (after reset)? (Not "Claude Code the CLI" — that's not programmatically drivable; R3 fix.) Plan leans Claude-API-with-tool-use. Confirm.
4. **Claude credit budget** for the D-6 blind-review / spot-check gate — bound it (e.g. "≤ X credits per run") or reserve entirely?
5. **Codex dependency** — treat as optional-upgrade-only (plan assumes this), or buy a pay-per-token OpenAI API key (uncapped) to make `speed-first` real and de-risk the Jun-2 cap?
6. **Build trigger** — this remains plan-only for now, or green-light Phase 1 (the swarm fix) to start? Phase 1 is self-contained, low-risk, and the prerequisite for everything else.

---

## Critique trail

### R1 — 6 adversarial Gemini lenses (Codex unavailable; ~115k Gemini tokens; 0 Claude credits)
All six returned **revise-major**. Majors folded into v2:
- **Feasibility:** BrainClient-via-import is vaporware (live `ModuleNotFoundError: yaml`) → corrected to gateway/subprocess. `self.judge_model` + `_decompose()` are dead code routing to hermes3 → Phase 1.2 now rewrites `_judge()`/`_decompose()`. `synthesize()`/`_anchor_check()` given concrete signatures + call sites. Silent-degradation closed via `BrainAvailabilityCheck`.
- **Cost:** Codex-unlimited premise false → brain policy rebuilt (Gemini primary, Codex auto-upgrade, Claude metered). `<500k` now requires bottom-up derivation. `speed-first` pulled from Phase-2 gate. `brain_policy_effective` added to scorecard.
- **Quality:** char-count gate → structural assertions + hallucination blocklist. Circular reviewer=author → reviewer≠author rule. D-7 → real `tests/swarm/negative_corpus.py`. On-topic → versioned prompt + forbidden-domain list.
- **Scope:** Phase 3 split 3a/3b with partial-credit stop. Orchestration/phone serialized after Phase 1. Codex 429 fallback → pause+phone-approval ("zero approvals unless rate-limited"). Phase-1 concurrency-measurement task added before Phase 2.
- **Phone-app:** job suspension/resume contract added. Store-policy 5-point checklist. P1 sub-phased with multi-month estimates; P2 gates on P1a. Tailscale NetworkExtension entitlement + Cloudflare first-class fallback + Mac-side APNs sender named.
- **Tech honesty:** 6×-faster conditioned on Phase-1 quality. Durability gap disclosed (1.7). 4–8-concurrent reframe propagated to Part B. Honest LangGraph acknowledgment (reinventing a subset; drop-in if crash-test fails).

### R2 — two reviewers (reviewer-diverse), → v2.1
- **Gemini R2 (verification): `ship`.** Confirmed all 7 R1 majors genuinely landed (not cosmetic). Raised 3 *minors*, all now fixed in v2.1: token-derivation carried into the scorecard (`tokens_estimated` vs `tokens_actual` from the Phase-1 gate); gateway cold-start falls back to `shay -z` subprocess not silent Ollama; P0 gate split into P0-a (relay smoke, parallel) and P0-b (checkpoint-resume, after Phase 2.1).
- **Claude Sonnet R2 (Part D deep-dive): `revise-major` → addressed in v2.1.** The crux finding: **Part D checked *form*, not *correctness*** — a structurally-complete, blocklist-passing, weak-reviewer-approved, URLs-resolve output with *wrong or self-contradictory claims* passed every gate; and "Gemini+Ollama reviewing each other" is weak-reviews-weak theater. v2.1 fixes:
  - D-5 re-tiered: Tier-1 truly deterministic (frozen clause list extracted at submission; hallucination *classes* via regex; provenance by content-fingerprint not HTTP-200; proof non-empty), Tier-2 deterministic anti-drift (embedding similarity, not a prompted 0/1), Tier-3 LLM-judgment **with a capability floor** (Ollama disqualified as sole reviewer; gate fails "no qualified reviewer available" rather than rubber-stamping).
  - **New D-5.7 claim-grounding** — synth must cite the supporting sub-goal per section; validator checks grounding + an internal-contradiction pass. Raises the bar from "looks complete" to "claims trace to source."
  - **New D-6 honest limit** — automated form+grounding gates *cannot* certify substantive correctness; high-stakes artifacts get a mandatory strong-model (Claude/Codex) spot-check sample. The plan no longer claims autonomous certified-correct output — it claims form+grounding+spot-check, the honest achievable bar.

**Net after R2:** Gemini ships; the Sonnet quality-majors resolved; residuals are *acknowledged honest limits*. → v2.1.

### R3 — Fritz expanded the scope → v3 → Gemini reviewed the new material → v3.1
After v2.1, Fritz added: Shay builds her own app; full-time phone interface; idea→completion + interview orchestration; note-taker/diary/pattern-finder; a first-class get-smarter loop; store approval de-blocked. Folded into **v3**, then Gemini reviewed only the new material (`revise-major`, 4 majors, plus two confirmations). v3.1 fixes:
- **Self-build honesty (M1):** "drive Claude Code as a sub-agent" was inaccurate (it's an interactive CLI, not API-drivable) → reframed to **Claude/Codex API with tool-use** authoring files + running tests. Part G option 3 corrected.
- **Skill-minting concreteness (M2):** H.2 given a real detection rule (≥K occurrences in a W-day window), a skill-schema-stub requirement, and an honest "needs a capable brain, switches on at Phase 3a" dependency.
- **Get-smarter gate de-confounded (M3):** Gate(H) now requires identical-benchmark-task, N≥5 runs, **quality-constant** (only D-5-passing runs count) — so "efficiency" can't be gamed by doing less.
- **PWA caveat (M4):** disclosed that iOS Web Push needs Fritz to open the PWA to answer (no silent submit) — the job waits, but this is the primary reason a native shell follows. PWA degrades, doesn't kill, the killer feature.
- **Milestone Zero (R3 fix):** named explicitly — P0-a relay + PWA + one captured idea, ~2–3 weeks after Phase-1 gate — as the real "phone in hand soon," NOT the months-away Gate 3c.
- **Confirmations:** Gemini verified the **Tailscale-app-relay = no NetworkExtension entitlement** claim is correct, and that **PWA does not kill the killer feature** (`pwa_kills_killer_feature: false`). Pattern-finder honesty minor (one net-new clustering module) folded in.

**Net after R3:** new-scope majors resolved; the leanest-first path is now explicit; the over-promises (self-build mechanism, get-smarter measurability) are honest. Complaints are minor. Ready to present.

*v3.1 authored 2026-05-30 on Opus 4.8. Claude credits used this session: ~37k tokens (one Sonnet Part-D review). R1 + R2-Gemini + R3 all ran free on Gemini. Codex unavailable (capped till Jun 2) — finding 0.1.*
