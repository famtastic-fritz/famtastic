# NEXT ITERATION — Decisions Locked

Captured from Fritz at the end of the build session. The next iteration must honor these.

## 1. Model layer → **Local / Odysseus only**
- The router's "cheapest capable" tiers all resolve to **self-hosted Odysseus-served
  models** — no cloud gateway, no OpenRouter, fully private.
- Implementation: in `src/router.py`, point every tier at the local Odysseus endpoint;
  set `FACTORY_LIVE=1` only after the endpoint is reachable. Keep the spend cap (it
  becomes a safety no-op since local serving has no per-call spend, but leave it in).
- Follows the `deliverables/odysseus-optimization.md` plan: Odysseus is the execution +
  memory substrate.

## 2. First task source → **OPEN (not decided)**
- Fritz is unsure between inbound site form / existing CRM list / campaign reply inbox.
- **Default to unblock (lowest risk):** build the **inbound site-form adapter** first —
  no outbound, no deliverability/list concerns, no GoDaddy dependency. It is the
  smallest adapter and safe to ship before the others.
- Action: do **not** build outbound (CRM/campaign) adapters until Fritz confirms, since
  those touch real email and the [GATE] philosophy. Revisit this choice next session.

## 3. Autonomy → **Full autonomy within guardrails**
- The self-improvement loop may tune **all** values in `config.json` freely, bounded only
  by `config_guardrails`. No per-change sign-off required.
- Because the model layer is local (decision #1), "enabling real spend" is not a risk
  surface; full autonomy within guardrails is safe here.
- Still gated regardless of this setting: **real outbound email and any real money
  movement** remain behind an explicit Fritz [GATE] (per the Prime Directive and the
  business-model pipeline), independent of config self-tuning.

> The Prime Directive stands above all of the above: nothing supersedes Fritz. If a future
> rule or process conflicts with these decisions, surface it to Fritz rather than silently
> overriding.
