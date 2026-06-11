# FAMtastic Designs Infrastructure Inputs

_Last updated: 2026-06-11_

This file captures available infrastructure and implementation inputs that should be considered by Mythos and future build agents. Do **not** store real credentials, API keys, passwords, tokens, database usernames, or secrets in this repo.

---

## 1. Existing Assets / Inputs

Fritz has or may have access to:

- Existing API credentials for AI/platform integrations.
- Existing GoDaddy account and reseller capabilities.
- Existing database hosted through GoDaddy that may be usable for the FAMtastic Designs build.
- Existing Resend key for automated email sending.
- FAMtastic Hosting already live and collecting payments.
- Existing FAMtastic brand/logo references.

---

## 2. Secrets Policy

Real secrets should never be committed to the repo.

Use placeholders in documentation and environment variables in implementation:

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
GEMINI_API_KEY=
RESEND_API_KEY=
DATABASE_URL=
GODADDY_API_KEY=
GODADDY_API_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Recommended handling:

- Local development: `.env.local` or equivalent ignored file.
- Production: hosting provider secrets manager/environment variables.
- CI/CD: GitHub Actions secrets if workflows are used.
- Agent instructions: never print, log, or commit secrets.

---

## 3. GoDaddy Database Consideration

There is an existing GoDaddy-hosted database that Mythos may consider, but it should not be assumed as the final backend choice until the plan evaluates:

- Database type and version.
- Connection limits.
- Performance limits.
- Backup/restore process.
- Security posture.
- Remote access capability.
- Migration path.
- Whether it supports the proof engine, lead tracking, workstream tracking, email events, and future admin dashboards.
- Whether it creates technical debt compared with alternatives.

Mythos should treat the GoDaddy database as a potential cost-saving starting point, not a mandatory decision.

---

## 4. Architecture Decision Rule

The build should reuse existing paid assets where practical, especially GoDaddy/reseller assets, but not at the cost of trapping the project in a weak architecture.

Decision rule:

> Use what Fritz already pays for when it helps launch faster and cheaper. Avoid it when it limits automation, tracking, scaling, security, or future development.

---

## 5. Detail Collection Strategy

Before final implementation, Mythos or the build agent should request only the minimum technical details needed to make the next decision.

Examples:

- What type of GoDaddy database is available?
- Does it allow external connections?
- What domain/email addresses are active?
- Which APIs already have credentials available?
- Which payment provider is currently preferred?
- Where should environment variables be stored for the selected hosting target?

If details are not available yet, the plan should continue with placeholders and a missing-details checklist.
