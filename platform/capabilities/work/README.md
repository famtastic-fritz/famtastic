# work — Shay-managed work communications (draft-only, human-gated)

This capability lets Shay (Fritz's AI orchestrator) help manage Fritz's
**work / contract communications** — Jira tickets and team standups/status
updates across engagements like AMA and NIBS — by **drafting** them so Fritz
does not write from scratch.

## The safety gate (non-negotiable)

This is outbound communication on Fritz's behalf. **Nothing is ever sent
automatically.** Every command here produces a local **draft** in an outbox
and stops. Sending requires:

1. Explicit human approval (`platform work outbox approve <id>`), and
2. A real send capability + credentials that **do not exist in this
   environment yet**.

`outbox send` is intentionally inert: it prints `manual_required` and exits
without transmitting. There are **no external API calls** in any of these
scripts by design. Auto-send is disabled in code (`auto_send: false`,
`approval_required: true` on every draft).

## Commands (proposed invocation surface)

```
platform work draft-ticket-reply <ctx.json> [--check]
platform work draft-standup [<input.json>] [--check]
platform work outbox [list|--check|show <id>|approve <id>|send <id>]
```

- `draft-ticket-reply <ctx.json>` — reads a ticket-context JSON (ticket id,
  summary, latest comment, Fritz's intent note), writes a drafted reply plus a
  suggested status transition to the outbox in state `draft`.
- `draft-standup [<input.json>]` — reads a standup-input JSON and drafts a
  yesterday/today/blockers (or narrative status) message. If no input is given,
  it falls back to deriving activity from the FAMtastic `runs/runs.jsonl` and
  `tasks/tasks.jsonl` ledgers.
- `outbox` — lists drafts and their state, shows a draft, or approves one.
  Approval marks a draft `approved` (queued for a future human/automated send);
  it does **not** send.

All three append an audit line to `platform/invocations/<date>.jsonl`, matching
the rest of the platform.

## Files

```
capabilities/work/
  draft-ticket-reply.sh        # ticket reply + status-transition drafter
  draft-standup.sh             # standup / status-update drafter
  outbox.sh                    # list / show / approve drafts (send is inert)
  schemas/
    ticket-context.schema.json # input contract for draft-ticket-reply
    standup-input.schema.json  # input contract for draft-standup
  examples/
    ticket-context.sample.json # realistic AMA Jira ticket context
    standup-input.sample.json  # realistic NIBS standup activity
  outbox/                      # generated drafts land here (state machine)
  README.md
  registry-additions.json      # records to merge into platform/registry/capabilities.json
```

## What works today

- Reading and validating the shape of the input JSON.
- Genuine drafting: `draft-ticket-reply` turns Fritz's intent note into a
  reader-facing reply (tone-aware greeting, prose body, reference to the latest
  comment) and picks a suggested status transition (explicit field wins, else
  inferred from the intent text).
- `draft-standup` produces a formatted YTB or status message, either from
  explicit `activity` or by reading the runs/tasks ledgers.
- The outbox state machine: `draft -> approved`, plus `list`, `show`, and a
  status summary via `--check`.
- Audit logging to `platform/invocations/`.

## What is stubbed / manual_required

- **Sending to Jira** — `manual_required`. No Jira connection or creds here.
- **Posting team messages** (Slack/Teams/email) — `manual_required`. No
  messaging connection here.
- `outbox send` — intentionally blocked; surfaces `manual_required` and never
  transmits.

## Vault keys still needed (vault-key-pending)

| Key | Purpose | Required? |
|-----|---------|-----------|
| `jira.api_token` | Jira REST auth | required for ticket send |
| `jira.base_url`  | Jira instance URL | required for ticket send |
| `jira.email`     | Jira account email (basic-auth pair with token) | required for ticket send |
| `slack.webhook`  | Post standups to a channel | optional / one send path |

## Decisions still needed (for the parent session / Fritz)

- **Send transport for tickets:** direct Jira REST vs. a future Jira MCP.
- **Send transport for messages:** Slack webhook vs. Slack/Teams app vs. email
  via the existing Studio Resend path. The connected **Gmail MCP** (message/
  thread labeling) and **Drive MCP** are candidates for future ticket/message
  **triage** (e.g. labeling incoming ticket-notification emails), not for
  sending — note them as future backing only.
- **Approval UX:** CLI `outbox approve` only today. Decide whether approval
  should also surface in the Studio UI.
- **Whether to build a separate `work send <id>` capability** once creds exist,
  or keep send permanently human-manual.

## Pattern conformance

These scripts follow the established platform capability pattern:
`set -euo pipefail`; resolve `PLATFORM_ROOT` / `HUB_ROOT` / `VAULT` /
`INVOCATIONS_DIR`; support `--check`; surface `manual_required` explicitly;
append a JSONL audit line per invocation; no destructive or external action
without vaulted credentials.
