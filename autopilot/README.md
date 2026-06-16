# Autopilot — Autonomous Faceless Video Business

A self-running content factory: **concept → collection → advertising → feedback
→ revenue**, on a schedule, with a hard budget cap and a kill switch. It builds
on the faceless video generator in [`../remotion`](../remotion) and reuses
FAMtastic infrastructure (data-center ledgers, run-health, vault).

> Full strategy + phasing: **[ROLLOUT-PLAN.md](ROLLOUT-PLAN.md)**.
> This README is the operator manual.

## Run it

```bash
node autopilot/cli.mjs tick      # one full loop (concept→collection→advertising→feedback)
node autopilot/cli.mjs status    # ledgers, budget, last run
node autopilot/cli.mjs report    # performance by niche + learnings
node autopilot/cli.mjs stop      # kill switch on  (halts the loop)
node autopilot/cli.mjs resume    # kill switch off
node autopilot/cli.mjs config    # effective config

bash autopilot/install-cron.sh   # run unattended (cron on Linux / launchd on macOS)
```

Runs with **zero API keys and no involvement**: templated scripts, silent
video + estimated captions, gradient backgrounds, simulated analytics. Add
keys/credentials and it upgrades each stage in place — no code change.

## The loop (one tick)

| Stage | File | What it does |
|-------|------|--------------|
| **Concept** | `stages/concept.mjs` | Explore/exploit bandit over a niche portfolio → deduped topics with predicted ROI |
| **Collection** | `stages/collection.mjs` | Faceless generator → spec, QA, SEO metadata, affiliate links, thumbnail, (optional) MP4 render |
| **Advertising** | `stages/advertising.mjs` + `publishers.mjs` | Schedule + publish to YouTube/TikTok/Instagram (dry-run → live) |
| **Feedback** | `stages/feedback.mjs` | Pull/simulate metrics → update niche weights → emit learnings → projected revenue |

Conducted by `orchestrator.mjs`; driven by `cli.mjs`.

## Autonomy & safety

- **Budget governor** (`lib/budget.mjs`) — hard `$5/day` cap (set in
  `autopilot.config.json`). Over cap → degrades to the free path. Every grant
  is logged to `state/budget.jsonl`.
- **Governance gate** (`lib/governance.mjs`) — outward actions (publish/email)
  run **dry-run** unless `config.live=true` **and** credentials exist. Nothing
  posts by accident.
- **Kill switch** — `autopilot/STOP` (or `cli.mjs stop`) halts the loop.
- **Run health** (`lib/interop.mjs` → reuses `lib/famtastic/autopilot`) — flags
  stuck/looping runs.
- **Audit trail** — every decision/action appends to `state/*.jsonl` and mirrors
  to the global data-center ledger when available. Secrets are redacted.

## Ledgers (`autopilot/state/`, gitignored)

`concepts` · `inventory` · `published` · `performance` · `learnings` ·
`budget` · `runs`. Staged post bundles + specs land in `autopilot/out/<concept-id>/`.

## Going live — the one-time credential handshake (the ONLY thing you do)

Drop these into env or the FAMtastic vault (`platform/vault/vault.sh`), then set
`"live": true` in `autopilot.config.json`. Lookup keys are in `lib/vault.mjs`.

| Need | Env var / vault id | Unlocks |
|------|--------------------|---------|
| LLM scripts + voiceover (within $5/day) | `OPENAI_API_KEY` / `studio.openai.api_key` | real scripts + TTS |
| YouTube channel | `YOUTUBE_TOKEN` / `autopilot.youtube.oauth_token` | auto-upload Shorts |
| TikTok | `TIKTOK_TOKEN` / `autopilot.tiktok.access_token` | auto-post |
| Instagram (Business) | `IG_TOKEN` / `autopilot.instagram.access_token` | auto-publish Reels |
| Affiliate program IDs | `AFFILIATE_TAG` (+ edit `lib/affiliate.mjs`) | links that pay |

Live upload calls are stubbed integration points in `publishers.mjs`
(`youtubeUpload`/`tiktokUpload`/`instagramUpload`) — wire them to the official
APIs when you connect accounts. Until then the system stages complete,
ready-to-post bundles.

## Tests

```bash
node --test autopilot/tests/autopilot.test.mjs   # 7 tests, no keys/network
```

## Honest limits

- Until credentials exist, **publishing is staged, not live** — by design.
- Until analytics credentials exist, **feedback metrics are simulated** (clearly
  flagged `simulated: true`) so the learning loop still runs.
- Some platforms gate auto-posting behind app review; those degrade to
  draft/assist. Official APIs only — no ToS-violating automation.
- Rendering needs a headless Chromium; auto-detected here, auto-provisioned by
  `npm install` off-sandbox.
