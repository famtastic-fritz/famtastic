---
title: HOT-CONTEXT-POINTERS
type: note
permalink: famtastic/01-shay/hot-context-pointers
---

# WARM — Active Tasks & Current Issues

> **Lifecycle rule:** Every item in this file has a checkbox. When marked done, the next
> maintenance cycle moves it to COLD (basic-memory) and removes it from here. If an item
> is NOT a task/issue, it belongs in HOT (permanent) or COLD (archive), not here.

---

## Active Tasks

- [ ] **Hosting surface audit + production remediation checkpoint (2026-06-19)** — Audit and production-fix plan completed in `~/famtastic/plans/hosting-surface-audit-and-production-remediation-2026-06-19.md`. Verified current truth: `famtasticinc.com`, `famtastichosting.com`, `famtasticthoughts.com`, and `api.mbsh96reunion.com` resolve to `107.180.51.234`; `famtasticdesigns.com` resolves to `132.148.233.159` and still serves Drupal 10; `mbsh96reunion.com` is on Netlify. `famtastichosting.com` is serving live content directly (not an active host-level forward). Current blocker before cutover: no verified authenticated write path yet to the real `132.148.233.159` hosting surface for `famtasticdesigns.com`.
- [ ] **FAMtasticHosting facelift** — 7-page branded marketing site on famtasticHosting.com. store.famtastichosting.com already handles purchases. Products toggled from 404 → live on reseller side. Static HTML → Astro → Node.js only if dashboard needed.
- [ ] **JJ BA Transport** — PERSONAL PRIORITY. Fritz promised a site. Output was embarrassingly basic, never pushed live. Friend probably thinks Fritz forgot. REPUTATION + RELATIONSHIP on the line. Pipeline proof candidate after Hosting validates.
- [ ] **MBSH visual finalization** — mbsh96reunion.com is live but needs design finishing, Hi-Tide Harry, and promotion start.
- [ ] **FAMU cruise June 26** — Brand launch event on the boat. Deadline: simple platform, basic info, business workflows, advertising ready.
- [ ] **GoDaddy product pages** — Continue toggling from 404 → live as needed.
- [ ] **Microsoft Graph API** — Zero Shay access. Hard capability gap for AMA work (Teams + email + calendar). Same tenant covers all.
- [ ] **Stay-current cadence** — Fritz flagged "we need to do a better job with staying up to date." Implement cron/weekly for stack updates: Shay platform, gateway, plugins, skills, Hetzner OS, GoDaddy wholesale rates. Re-verify wholesale rates quarterly.

## Current Issues

- [ ] **Local Ollama vision broken** — mllama-arch models fail locally. ALL design review routes through cloud (Gemini Flash preferred) or read HTML source. Use `design-review` skill workaround.
- [ ] **famtasticthoughts.com transfer** — Renewed through 2027-06-29. Transfer from Wild West Domains to GoDaddy direct deferred — build now, transfer later. 4 client locks still on, didn't block renewal. Transfer takes 5-7 ICANN days.
- [ ] **Thinking-logs capture** — Fritz wants thinking logs preserved as part of platform setup. Mechanism not yet built.

## Recently Completed (move to COLD on next maintenance cycle)

- [x] ~~famtasticthoughts.com renewal~~ — Done, through 2027-06-29
- [x] ~~Bug-279 Ollama vision~~ — Fixed, workaround in place

---

## Five Streams (quick ref — permanent, see HOT for authoritative list)

1. Shay + platform
2. Income (W2 + FAMtastic)
3. Research
4. Metaphysical
5. Fritz (load-bearing, at parity)

---

## Detailed Reference Files

- **Five-stream state dump:** `~/famtastic/plans/five-stream-state-2026-06-09.md`
- **Five-stream plan:** `~/famtastic/plans/five-stream-overview-2026-06-09.md`
- **Hosting build spec:** `~/famtastic/sites/site-famtastic-hosting/BUILD-SPEC.md`
- **GoDaddy API details:** `godaddy-reseller-ops` skill
- **Tier-3 interview notes:** `~/famtastic/obsidian/01-Shay/SHAY-INTERVIEW-2026-06-06.md`
- **FAMtastic DNA:** Obsidian `00-FAMtastic-Core/famtastic-dna`
- **Capability Engine:** `~/famtastic/capability-engine/` (AGENT-REGISTRY.yaml, CAPABILITY-MATRIX.yaml, GAP-TRACKER.yaml). Dispatch Planner skill at `~/.shay/skills/dispatch-planner/`.