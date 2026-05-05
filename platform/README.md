# FAMtastic Platform Capabilities

The operational primitives. Each FAMtastic site is an *invocation* of these capabilities, not a bespoke setup.

## The thought process this encodes

Stop thinking site-by-site. Think platform-by-capability. FAMtastic isn't a series of bespoke sites — it's a platform with paid-for assets (GoDaddy, Resend, eventually Netlify) where each new site is an *invocation* of platform capabilities. The site builds itself when the platform's capability set is complete enough.

## Capabilities (V1 surface)

| Invocation | Backing service | V1 implementation status |
|---|---|---|
| `platform site add <tag>` | local fs + git | ✓ orchestrates the others below |
| `platform db add <site> <env>` | GoDaddy MariaDB via cpanel-mcp | ✓ wraps cpanel-mcp + helper script |
| `platform db apply-schema <site> <env>` | SSH → mysql CLI on GoDaddy | ✓ skips phpMyAdmin entirely |
| `platform dns register-subdomain <site> <subdomain>` | GoDaddy Zone Editor | ⚠ stub — manual step printed (cpanel-mcp coverage gap) |
| `platform email verify-resend-domain <site>` | Resend API | ⚠ stub — manual DKIM dance until Resend domain create+verify auto-loops |
| `platform deploy connect-netlify <site>` | Netlify | ⚠ stub — manual UI flow today (Netlify connect step has no clean API) |
| `platform deploy backend <site>` | rsync + SSH | ✓ rsync to public_html + verify endpoint reachable |
| `platform cron register <site>` | cPanel cron | ⚠ stub — manual UI today (cpanel-mcp coverage gap) |
| `platform cors lockdown <site> <env>` | edits production secrets file via SSH | ✓ replaces allowed_origin_patterns |
| `platform smoke test <site>` | curl synthetic POSTs | ✓ tests every endpoint, returns structured pass/fail |
| `platform studio bootstrap-services` | Site Studio service auth + vault | ✓ checks/migrates provider auth into Studio-owned service refs |
| `platform studio provision-site <site>` | Studio service layer → generated site | ✓ verifies a site consumes Studio-owned DB/email/deploy services |
| `platform vault read <secret-id>` | macOS keychain | ✓ standing-approval store for credentials |
| `platform vault write <secret-id> <value>` | macOS keychain | ✓ |

## Standing-approval model (the bottleneck-killer)

Every capability that needs credentials reads them from the vault. The vault uses macOS Keychain by default (1Password integration is a future capability). Once a secret is stored, agents can read it without re-prompting Fritz — the stored standing approval is the keychain entry itself.

Fritz only sees decision points (which committee password to use, which DB tier, "proceed with prod schema apply yes/no"), never credential capture, never hostname typing, never copy-pasting paths.

## Site Studio service ownership

Provider relationships belong to Site Studio/platform, not to generated sites.
Netlify, Resend, cPanel/GoDaddy, DNS, SSH, and DB administrator credentials are
stored as Studio-owned service refs such as `studio.resend.api_key`,
`studio.cpanel.api_token`, `studio.netlify.auth_token`, and
`studio.godaddy.api_key`. A site receives only logical references and generated
runtime config, for example `sites/<tag>/db_password.production` and
`sites/<tag>/netlify_site_id`.

Use:

```bash
platform studio bootstrap-services
platform studio provision-site mbsh-reunion-v2 --check --proof
```

`bootstrap-services` migrates discoverable local values into the vault without
printing them and writes non-secret service references into
`~/.config/famtastic/studio-config.json`. `provision-site` verifies the generated
site consumes those services and emits proof; it does not make the site the owner
of Resend, Netlify, DNS, or database provider accounts.

## Invocation log

Every capability invocation appends to `~/famtastic/platform/invocations/<YYYY-MM-DD>.jsonl`. Schema:
```
{ "ts": ISO8601, "capability": "db.add", "site": "mbsh-reunion-v2", "args": {...}, "result": "ok"|"failed"|"manual_required", "duration_ms": N, "log_path": "..." }
```

Read by Cowork/Shay to answer "what did the platform do for this site, when, with what outcome." The audit log Fritz anticipated.

## CLI entry point

```bash
~/famtastic/platform/famtastic-platform <capability> <subcommand> [args...]
```

Or via `fam-hub platform <capability> <subcommand>` once wired into the unified CLI.

## What's NOT here yet (the admin audit will surface more)

- 1Password integration (today: macOS keychain)
- Netlify connect via API (today: manual UI flow)
- cPanel cron registration via API (today: manual UI flow)
- DNS Zone Editor record CRUD via API (today: manual + cpanel-mcp partial)
- Resend domain create+verify auto-loop with DKIM record auto-add (today: manual DKIM dance)
- Per-site quotas and budget enforcement (today: trust-based)
- Capability authorization model — who/what can invoke which capability against which site
- Per-account introspection (what subdomains exist on apex, what other domains we own, what's the Resend send volume across sites)
- `platform site remove <tag>` — every `add` needs a counterpart `remove` for clean deprovisioning
