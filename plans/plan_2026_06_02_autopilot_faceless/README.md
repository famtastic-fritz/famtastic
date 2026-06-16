# Autopilot — autonomous faceless-video business

Self-running content factory on top of the Remotion faceless video generator.
Full strategy and phasing: [`../../autopilot/ROLLOUT-PLAN.md`](../../autopilot/ROLLOUT-PLAN.md).
Operator manual: [`../../autopilot/README.md`](../../autopilot/README.md).

**Operator inputs (locked 2026-06-02):** YouTube Shorts + TikTok + Instagram
Reels · affiliate + ad/creator + client-service + build-and-flip · **$5/day**
hard cap · auto-discover niches by ROI.

## Status

| Phase | Workstream | Status |
|-------|-----------|--------|
| 0 | Foundation (ledgers, budget governor, governance, orchestrator, CLI, tests) | ✅ done |
| 1 | Concept engine (ROI bandit + dedupe) | ✅ done |
| 2 | Collection engine (faceless gen + QA + SEO + affiliate + render) | ✅ done |
| 3 | Advertising (scheduler + publisher adapters, dry-run) | ✅ done |
| 4 | Feedback loop (metrics → niche weights → learnings) | ✅ done |
| 5a | **Client-upsell agent** (branded promos + draft offer emails) | ✅ done |
| 3.5 | **Live platform uploads** (official APIs) | ⬜ todo — needs account creds |
| 4.5 | **Real analytics ingestion** (replace simulated) | ⬜ todo — needs API creds |
| 5a.1 | Live client email send (Resend/SMTP) | ⬜ todo — needs sender creds |
| 2.5 | AI b-roll + thumbnails via `buildMuapiPlan` | ⬜ todo |
| 5b | build-and-flip channel-growth tracker | ⬜ todo |
| 6 | Hardening (prod cron, breakers, dashboard) | ⬜ todo |

## Verified (2026-06-02)
`node autopilot/cli.mjs tick` runs the full loop; 7 tests pass; one real 4.1MB
MP4 rendered through the autopilot. Open tasks tracked in `plan.json`
(`open_task_ids`).
