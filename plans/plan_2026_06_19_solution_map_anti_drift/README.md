Title: Shay solution-map anti-drift system

Purpose: Stop Shay from re-researching solved or partially solved problems by reconnecting commits, docs, gaps, bugs, repo scans, and research artifacts into one canonical truth surface.

Goal: Build and use a Shay-native audit/connection layer that turns fragmented June research into reusable problem -> evidence -> candidate solution -> proof -> closeout context.

Tasks:
- [x] Audit June truth surfaces: commits, CHANGELOG, SITE-LEARNINGS, FAMTASTIC-STATE, `.wolf` files, bug log, gap log, bookmark report, curator note, gap research, repo-intelligence artifacts.
- [x] Identify repeated problem buckets, missed synergies, solved-problem drift, research-quality failures, and temporal disconnect patterns.
- [x] Build the first connection surface with `scripts/intelligence/build_solution_map.py` and publish canonical outputs in `obsidian/01-Shay-Platform/intelligence-audits/`.
- [x] Update shared truth docs so the new audit surface is visible in `CHANGELOG.md`, `SITE-LEARNINGS.md`, and `FAMTASTIC-STATE.md`.
- [x] Normalize recurring gap rows into canonical problem buckets, bootstrap a real promotions ledger, and write bucket IDs back into the live gap ledger.
- [x] Promote candidate repos/solutions back into capability/problem records with proof-backed verdicts.
- [x] Build the first control-plane layer: proof/closeout worker, garbage-gap cleanup, pre-log/pre-research guards, pass history, and autonomous loop stop conditions.

Status: active

Started: 2026-06-19

Ended:

Execution: Multi-surface audit first, then a reusable script, then truth-doc writeback. Keep the first cut read-only and honest; do not fake closed-loop automation until promotion, normalization, and closeout surfaces actually exist.

Research: `obsidian/01-Shay-Platform/intelligence-audits/latest-solution-map-audit.md`; `obsidian/01-Shay-Platform/intelligence-audits/latest-solution-map-audit.json`; `obsidian/Shay-Memory/research/github-bookmarks-report-latest.md`; `obsidian/01-Shay-Platform/internal-curator/latest-curator-note.md`; `obsidian/01-Shay-Platform/gap-research/latest-gap-research.md`; `research/repo-intelligence/completed/`; `research/repo-intelligence/reports/`

Review: First live audit proved the actual failure mode is connection drift, not research scarcity. The next hardening move was canonical problem-bucket normalization, promotions-ledger bootstrap, and gap-ledger bucket writeback; the remaining open seam is proof/closeout automation and repo-to-problem verdicting.

Skills: shay-shay

Proof: `python3 scripts/intelligence/build_solution_map.py`; `obsidian/01-Shay-Platform/intelligence-audits/solution-map-audit-2026-06-19-1240.md`; `obsidian/01-Shay-Platform/intelligence-audits/solution-map-audit-2026-06-19-1240.json`; updated `CHANGELOG.md`; updated `SITE-LEARNINGS.md`; updated `FAMTASTIC-STATE.md`
