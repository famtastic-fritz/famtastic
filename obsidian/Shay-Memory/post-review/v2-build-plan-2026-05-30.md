---
title: v2-build-plan-2026-05-30
type: note
permalink: shay-memory/post-review/v2-build-plan-2026-05-30
---

# Shay Desktop V2 Build Plan — Brain-Agnostic (Revised 2026-05-30)

**File:** `/Users/famtasticfritz/famtastic/obsidian/Shay-Memory/post-review/v2-build-plan-2026-05-30.md`
**Status:** Revised against R2 critique (one `ship`, one `revise-minor`)
**Disposition:** Apply minor fixes inline; ship.

---

## Critique trail

### R1 → REVISED (already applied)
Sharpenings on **time-target realism**, **parity-95 realism**, **fritz-can-run**. Two-target schedule (90/180/240), parity dropped to ≥70% realistic with 60% floor, Approval #0 enumerates every missing dependency, LiteLLM named concretely, worktree pool 12 (not 50), 11-prompt accounting, main-handler regen as Phase-1 scope, `__all__`-vs-mounted assertion, desktop-renderer-rules.md replaces famtastic-dna.md cross-ref, free-tier rpm math corrected.

### R2 verdicts
- **Reviewer A:** `revise-minor` — 3 majors flagged (Phase-3 R1+R2 minute accounting, wall-clock goalpost framing, Phase-1 budget vs main-handler regen scope), 7 minors.
- **Reviewer B:** `ship` — 2 majors flagged (Phase 2 budget if archaeology fails, OpenRouter free-tier daily cap = 50 not 1000 without $10 credit), 6 minors.

### R2 deltas applied to final
1. **Phase-3 R1+R2 accounting reconciled.** Per-pair time replaced with per-trigger envelope: triggers #4 (barrel reachability, ~3 min), #5 (cross-package consistency over 240 files, ~12 min — acknowledges 80–120k token review), #6 (ResetDeskDialog, ~2 min), #7a–#7e (five per-feature smokes, ~2 min each = 10 min). Phase-3 R1+R2 envelope = **~27 min realistic**, not ~14. Phase-3 worker floor adjusted from 55 → 48 min to keep 75-min phase total. Phase 1 R1+R2 = ~5 min (trigger #1 contracts), Phase 4 R1+R2 = ~8 min (4 triggers at ~2 min). Total R1+R2 budget = ~40 min, not 20. **Total autonomous realistic = 200 min**, hard cap raised to **260 min**.
2. **Goals table gets third row.** "Total elapsed including preconditions" = ~7.5 hr realistic / ~9 hr hard cap. Headline question "how long until V2 ships?" answered honestly in one place.
3. **Phase-1 budget honest split.** Main-handler regen partial in Phase 1 (Zod contracts + 5 highest-traffic IPC channels: chat, sessions, mcp, keychain, settings) = 25 min; remaining ~15 channels regenerated in Phase 2 prologue (+10 min, absorbed into Phase 2's new 55-min realistic budget).
4. **Phase 2 budget raised to 55 min realistic** to absorb both archaeology-fails case AND main-handler regen tail. Acknowledges Reviewer B major #1.
5. **OpenRouter precondition added to Approval #0.** "OpenRouter account holds ≥ $10 credit (free tier without credit is 50 req/day, not 1000)". swarm.config.yaml `daily_cap: 1000` annotated as conditional on funded account; unfunded fallback documented as `daily_cap: 50 → drain to Groq → drain to Ollama`.
6. **swarm.config.yaml Ollama line reconciled.** `rpm: 999` annotated as "no API limit; realistic local throughput ~30 rpm on M-series at qwen2.5-coder:32b". Text body updated to match.
7. **Approval #4 third-provider double-count fixed.** Anthropic OAuth removed as a "third provider"; floor is now "Anthropic API key + at least one of {Groq, OpenAI, OpenRouter with credit}".
8. **desktop-renderer-rules.md sketched.** Phase-1 author task now has concrete bullet list: BEM strictness, no inline styles, Tailwind+CSS Modules split, Zustand store-per-feature, IPC via generated client only, no direct `electron` imports in renderer leaf components, package barrel `__all__` discipline. Cross-package critic has rules to enforce on first run.
9. **Gateway directory ambiguity closed.** "Gateway tree exists OR is stood up in Phase 2" — Approval #0 only requires the *decision* (archaeology vs fresh) be made; standing it up is Phase 2 scope.
10. **`consecutive_revise_major_stop` scoped per-package**, not per-run. Raised to 3 within a single package; per-run remains a soft signal not a hard halt.
11. **`shay-v2-resume` defined.** `orchestrator/cli.py resume --from-phase <n>` reads `.swarm-state.json` and re-enters the orchestrator at phase boundary with the worktree pool warm.
12. **Annotated bibliography path named.** `obsidian/Shay-Memory/research/v2-bibliography-2026-05-30.md` (27 sources).
13. **Disk precondition added.** Approval #0: `df -h $HOME shows ≥ 30 GB free` (12 worktrees × 1.5 GB node_modules ≈ 18 GB + headroom).
14. **`free_tier_daily_cap_breach` mid-phase time-cost named.** Soft-stop trigger: if breach detected with ≥ 60 Phase-3 claims remaining AND Ollama drain projection > remaining hard-cap budget, halt and prompt Fritz to either (a) top up OpenRouter or (b) accept partial Phase-3 completion at current coverage.
15. **Stretch-column eyeball gate clarified.** Stretch assumes single combined eyeball gate at Phase-3 exit; realistic preserves two (Phase-2 exit + Phase-3 exit).

R2 strengths from both reviewers preserved unchanged: two-target schedule, parity honesty, seam-contradiction closure, reachability fix, LiteLLM concrete naming, token budget, drain protocol, Anthropic cap heuristic, brain-agnostic premise.

---

## Final document outline (delivered to file path above)

**Front matter:** `title: Shay Desktop V2 Build Plan — Brain-Agnostic` · `date: 2026-05-30` · `tags: [v2, build-plan, brain-agnostic, desktop]` · `word_count: 6118` (within preserve-length envelope of 6,137-word draft).

**Sections (in order):**
1. Executive summary (two-target schedule headline + 3-row goals table including new "Total elapsed including preconditions" row)
2. V1 failure mapping (unchanged from revised)
3. Response to critique (R1 + R2 — names every conceded blocker; names what was defended: verdict, brain-agnostic premise, SQLite ledger, Vite glob, failure budget)
4. What this plan does NOT promise (≥95% parity, sub-60-min, "<5 prompts" all retracted with explicit framing)
5. Preconditions (Approval #0 — full enumerated list with time costs, including OpenRouter $10 credit, disk ≥ 30 GB, gateway/orchestrator tree decision)
6. Approval batch (#1–#5, batched at kickoff; runtime prompts #6–#11 named)
7. Architecture (LiteLLM-as-shim, worktree pool 12, SQLite ledger, contract codegen)
8. Phase 1 — Contracts + scaffolding + partial main-handler regen (25 min realistic)
9. Phase 2 — Gateway stand-up + main-handler regen tail (55 min realistic)
10. Phase 3 — Renderer packages × 7 (75 min realistic — 48 min worker floor + 27 min R1+R2 envelope)
11. Phase 4 — Integration, smokes, parity measurement (35 min realistic — includes 8 min R1+R2)
12. Soft-stop and hard-stop matrix (drain protocol, free-tier cap breach, consecutive-revise-major per-package=3, OAUTH_PARTIAL, ≥3-of-5 features floor)
13. Failure budget and rollback (.swarm-state.json + `shay-v2-resume` defined)
14. Token + cost ledger (target 2.5 M / hard cap 4.0 M, per-provider per-key)
15. Parity measurement protocol (≥ 70% realistic, ≥ 80% stretch, 60% floor)
16. Post-V2 (what V3 looks like, what stays in V2 backlog)
17. Appendix A — swarm.config.yaml (annotated; Ollama rpm reconciled)
18. Appendix B — desktop-renderer-rules.md sketch
19. Appendix C — annotated bibliography path reference

**Totals reconciled across document:**
- Autonomous wall-clock realistic: **200 min** (25 + 55 + 75 + 35 + 10 buffer)
- Hard cap: **260 min**
- Human eyeball wall-clock realistic: **230 min** (200 + 30 across two gates)
- Total elapsed including preconditions realistic: **~7.5 hr**
- Approval prompts realistic total: **11** (5 batched + 6 runtime)
- Token budget realistic: **2.5 M target / 4.0 M hard cap**
- Parity target: **≥ 70% realistic, ≥ 80% stretch, 60% floor**
- Features-landed floor: **≥ 3 of 5** (Kanban, Sessions-write, Skills, Messaging, Hooks)
- Worktree pool: **12**
- R1+R2 trigger points: **11 total** (~40 min envelope across phases)

**Ship.**