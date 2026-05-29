## 2026-05-29 — Shay brain "keeps switching": subscription drain diagnosed + bulk-routing leak closed

Diagnosed why Shay's interactive brain kept falling back to Gemini: the Claude Max subscription (OAuth via `CLAUDE_CODE_OAUTH_TOKEN` — the only Anthropic credential present; no `ANTHROPIC_API_KEY` exists) was depleted, returning HTTP 400 "out of extra usage" on every call. Confirmed it never switched to API billing — same token worked yesterday with 200s, zero 401s today. Proximate cause: switching the default to Opus 4 plus overnight batch/swarm work all running on the Max brain. Closed the bulk-routing leak: every bulk driver shelled out `shay -z` with no `--provider`/`--model`, inheriting the Claude default. Routed research/synthesis/orchestrator/cron jobs to Gemini (`overnight_ops.py`, `rerun-cited.py`, `mbsh-swarm-launch.py`, 3 agent cron jobs in `~/.shay/cron/jobs.json`), the raw swarm spawner (`shay-agent-os/launch-agent.py`) to local Ollama hermes3, and repointed cognee MCP off Claude. Hard-gated the `ANTHROPIC_API_KEY` fallback in `shay-shay/agent/anthropic_adapter.py` behind `SHAY_ALLOW_ANTHROPIC_API_KEY` so subscription→API billing can never happen silently. Deferred/unverified: cognee still needs a local embedding model + gateway restart to actually function (pre-existing gap); local-Ollama oneshot rendering not smoke-tested.

### 2026-05-29 - NCS Redesign Opportunity & Business Plan

**Context:** Following the successful `muapi url-to-design` generation for the National CAD Standard V7 site, demonstrating high-quality, rapid mockups.

**Decisions Made:**
*   **Business Model:** Productized service targeting standards orgs, associations, gov agencies, nonprofits.
*   **Pricing:** Tiered model (Mockup Pitch, Full Redesign & Build Package, Maintenance Retainer).
*   **Branding:** Standalone brand under the FAMtastic umbrella.
*   **Go-to-Market:** "Mockup-first, sell-the-vision" approach. Identify prospects, generate `muapi` mockups for their sites, lead with visual pitch in outreach, secure deposit, then build.

**Exact Next Steps:**

1.  **Fritz Action:** Provide GoDaddy domain inventory (domain, status, expiry) for evaluation against new business concept.
    *   **Owner:** Fritz
    *   **Deadline:** EOD Today (2026-05-29)
2.  **Claude Code Action:** Upon receiving domain inventory, identify suitable domains for the standalone redesign brand.
    *   **Owner:** Claude Code
    *   **Deadline:** Immediate upon receipt of #1.
3.  **Claude Code Action:** Research and compile a list of 5-10 initial prospects (standards orgs, associations, gov agencies, nonprofits with dated sites).
    *   **Owner:** Claude Code
    *   **Deadline:** EOD Tomorrow (2026-05-30)
4.  **Claude Code Action:** (Once #3 is complete) Generate `muapi` mockups for 2-3 top prospects' key pages.
    *   **Owner:** Claude Code
    *   **Deadline:** End of Week (2026-05-31)

**New Ideas Surfaced:**
*   `muapi` as an "AI-powered sales engineer" for pre-sales.
*   The potential for a "nominal fee" for the initial mockup to qualify leads.

**What to Build or Validate First:**
*   **Validate:** The effectiveness of the "mockup-first" cold outreach. This is the critical sales hypothesis.
*   **Build:** The internal workflow for taking an approved mockup from `muapi` to a full-fledged design system and code implementation. This will be needed post-sale.

---
