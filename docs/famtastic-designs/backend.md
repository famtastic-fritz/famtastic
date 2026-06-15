# FAMtastic Designs — Backend Specification

_Created: 2026-06-11 · Child doc #4 of `mythos-foundation-plan.md` (§34) · Objects per plan §13; AgentTaskLog per `agents.md` §0.1; workflows per `workflows.md`_

## Architecture: Two Data Planes

| Plane | Tech | Lives | Holds | Why |
|---|---|---|---|---|
| **Hosted** | MySQL + PHP 8 API (mbsh-reunion pattern: `db.php`, `resend.php`, `rate-limit.php`, `cors.php`, `validate.php`) on existing GoDaddy hosting | Public internet | Lead, Contact, Proof (public lifecycle), PreviewPage, Client, Package, Payment, OnboardingForm, EmailEvent | Forms, proof tracking, payments, webhooks must be reachable 24/7 |
| **Orchestration** | SQLite extending `~/.config/famtastic/studio.db` (`lib/db.js` patterns; approval state machine + cost columns already exist) | Fritz's machine (VPS later, D7) | AgentTaskLog, Workstream, LessonLearned, ReusableSkill, build/job queue, ScanFindings cache, campaign configs | Where the agents run; flat-rate lanes; no public exposure |
| **Sync worker** | Node script, cron every 10 min + on-demand | Orchestration side (pulls/pushes over the PHP API with `SYNC_API_KEY=`) | Pulls: form submissions, email events, payments, proof views/clicks. Pushes: proof status, preview URLs, scores (admin display) | One-way-per-field ownership (below) prevents write conflicts |

**Field ownership rule:** every field has exactly one writing plane; the other only mirrors. Hosted owns: web events, payments, form data. Orchestration owns: scores, statuses driven by agents, costs. No bidirectional merge — eliminates the stale-state bug class.

**Conventions (all objects):** `id` CHAR(36) uuid PK · `created_at`/`updated_at` DATETIME · soft-delete via `archived_at` (nullable) — never hard-delete money or email records · all writes parameterized (PDO prepared statements) · JSON columns for flexible sub-structures (MySQL 5.7+ JSON type; fallback TEXT+json_encode if §23 eval finds older — decision D3).

---

## Objects

### 1. Lead — hosted (mirror on orchestration)

- **Purpose:** a business/org worth a proof.
- **Fields:** `name` VARCHAR(160) NOT NULL · `category` ENUM(church_connect, nonprofits, local_services, professional, other) · `location_city` VARCHAR(80) · `location_county` VARCHAR(80) · `geo_ring` ENUM(primary, secondary, expansion) · `place_id` VARCHAR(120) UNIQUE NULL · `urls` JSON {site, fb, gbp} · `email` VARCHAR(160) NULL · `phone` VARCHAR(32) NULL · `source` ENUM(places, directory, inbound_form, referral, manual) NOT NULL · `utm` JSON · `signals` JSON [] · `score` TINYINT NULL · `score_reasons` JSON · `weights_version` VARCHAR(20) · `status` ENUM (below) · `classification_confidence` DECIMAL(3,2).
- **Indexes:** (status), (category, status), (score DESC), UNIQUE(place_id), (email).
- **Relationships:** →Campaign (category=campaign_key); 1→N Proofs; 1→N Contacts.
- **Status values:** `new → scanned → scored → proofed → contacted → replied → claimed → client` | `dead` | `suppressed`.
- **Events:** created, scanned, scored, status_change (each with workflow_id).
- **Admin actions:** rescore, reassign campaign, suppress, merge dupes, view timeline.
- **Validation:** name required; source required; email RFC + MX-checked before any send (gate 6); no dupe place_id.
- **API:** `POST /api/leads` (sync only) · `GET /api/leads?status=&category=` · `PATCH /api/leads/{id}` (auth) · `POST /api/leads/inbound` (public — the /preview form, rate-limited).
- **Migration notes:** mysqldump-portable; ENUM→CHECK constraints if moved to Postgres (seam D3).

### 2. Campaign — orchestration (config), hosted mirror (display)

- **Purpose:** a vertical engine config (full specs in `campaigns.md`).
- **Fields:** `campaign_key` VARCHAR(40) UNIQUE · `config_version` INT · `config` JSON (the whole campaigns.md block: persona, signals_weighting, queries, angles, offer_ladder, forbidden_claims, proof blocks) · `status` ENUM(draft, active, paused, retired).
- **Indexes:** UNIQUE(campaign_key, config_version).
- **Relationships:** 1→N Leads/Proofs (by key+version pin).
- **Status:** draft → active ↔ paused → retired.
- **Events:** launched, paused, config_version_bump, weekly rollup.
- **Admin actions:** edit config (via proposal flow only), pause, compare.
- **Validation:** config schema-validated against campaigns.md shape before activation; version bumps append-only.
- **API:** orchestration-internal; hosted `GET /api/campaigns` (display).
- **Migration:** trivial (JSON config).

### 3. Proof — split: lifecycle on hosted, build internals on orchestration

- **Purpose:** one generated preview + its lifecycle.
- **Fields (hosted):** `lead_id` FK · `campaign_key` + `campaign_config_version` · `level` ENUM(L1,L2,L3) · `slug` CHAR(16) UNIQUE (base62, ~95 bits) · `preview_url` VARCHAR(255) · `status` ENUM (below) · `expires_at` DATETIME · `views` INT · `last_viewed_at`.
  **(orchestration):** `proof_request` JSON (full §10 contract) · `proof_manifest` JSON · `source_facts_used` JSON · `claims_made` JSON · `qa_checklist_result` JSON · `generator_id/version` · `cost_estimate/cost_actual` DECIMAL(8,4) · `screenshot_paths` JSON · `rollback_or_delete_path` · `regeneration_reason` · `failure_reason_enum`.
- **Indexes:** UNIQUE(slug), (lead_id), (status), (expires_at).
- **Relationships:** →Lead; 1→1 PreviewPage; 1→N EmailEvents; 0→1 Payment.
- **Status:** `queued → generating → qa_review → ready → sent → clicked → claimed` | `expired` | `rejected`.
- **Events:** every transition + view + claim_click (workflow-tagged).
- **Admin actions:** approve, reject, regenerate, extend expiry, force-send (gated), open preview.
- **Validation:** slug entropy enforced at creation; status transitions only via defined edges (state machine in code, invalid edge = exception); `claimed` stops expiry.
- **API:** `GET /api/p/{slug}` (public — renders preview page data, increments views, 404 on expired) · `POST /api/proofs/{id}/claim-click` · sync endpoints for status push.
- **Migration:** lifecycle table portable; build internals never need to move (orchestration-local).

### 4. PreviewPage — hosted

- **Purpose:** the /p/<slug> sales wrapper content.
- **Fields:** `proof_id` FK UNIQUE · `blocks` JSON {personal_header, gaps[], flow, value_framing, package_rec, claim_cta, call_cta} · `status` ENUM(live, expired, converted) · `views` INT · `claim_clicks` INT · `call_clicks` INT.
- **Indexes:** UNIQUE(proof_id).
- **Relationships:** 1→1 Proof.
- **Status:** live → expired | converted.
- **Events:** view, claim_click, call_click.
- **Admin actions:** edit blocks, expire, revive (re-extends proof).
- **Validation:** all §11 required blocks present before `live`; gap claims must reference scan facts (validated at assembly).
- **API:** served via `GET /api/p/{slug}` joined with Proof.
- **Migration:** trivial.

### 5. Contact — hosted

- **Purpose:** a human we may email. **The suppression record of truth.**
- **Fields:** `name` VARCHAR(120) · `email` VARCHAR(160) UNIQUE NOT NULL · `phone` NULL · `role` VARCHAR(60) (pastor, owner, ED…) · `lead_id` FK NULL · `opt_out` BOOL DEFAULT 0 · `suppression_reason` ENUM(unsub, bounce, complaint, manual) NULL · `suppressed_at` DATETIME NULL.
- **Indexes:** UNIQUE(email), (lead_id), (opt_out).
- **Status:** active | unsubscribed | bounced | suppressed.
- **Events:** opt_out, bounce, complaint (from webhooks — instant suppression).
- **Admin actions:** suppress, edit; **restore requires written justification logged** (compliance posture).
- **Validation:** email unique + normalized lowercase; suppression is permanent-by-default (restore is the exception path, never automatic).
- **API:** `POST /api/unsubscribe/{token}` (public, one-click, no login) · internal CRUD.
- **Migration:** the one table that must NEVER lose rows — backup before any migration; suppression list exported redundantly.

### 6. Client — hosted

- **Purpose:** a claimed/paying account.
- **Fields:** `lead_id` FK · `package_id` FK · `sites` JSON [{domain, status, deployed_url}] · `hosting_crosssell` BOOL · `mrr` DECIMAL(8,2) · `health` ENUM(green, attention, risk) · `status` ENUM (below).
- **Indexes:** (status), (lead_id).
- **Relationships:** →Lead; →Package; 1→N Payments; 1→1 OnboardingForm; 1→N Workstreams (fulfillment).
- **Status:** `onboarding → active → paused → churned`.
- **Events:** status_change, mrr_change.
- **Admin actions:** edit, add site, pause, record mrr change.
- **Validation:** must originate from a Payment or explicit manual create with note.
- **API:** internal/admin only.

### 7. Package — hosted (catalog), Fritz-owned

- **Purpose:** a sellable offer (ladders in `campaigns.md`).
- **Fields:** `name` · `campaign_key` NULL (null = universal) · `deposit` DECIMAL(8,2) NULL · `monthly` NULL · `flat` NULL · `includes` JSON [] · `fulfillment_complexity` ENUM(low, medium, high) · `payment_link_url` VARCHAR(255) NULL · `status` ENUM(active, retired).
- **Indexes:** (campaign_key, status).
- **Admin actions:** edit, retire, clone. **Only Fritz edits pricing** (agents read-only — agents.md authority matrix).
- **Validation:** at least one of deposit/monthly/flat; includes[] non-empty.
- **API:** `GET /api/packages?campaign=` (public — pricing page + claim pages).

### 8. Payment — hosted

- **Purpose:** money movement, replay-safe.
- **Fields:** `client_id` FK NULL · `proof_id` FK NULL · `provider` ENUM(stripe, cashapp, invoice) · `type` ENUM(deposit, monthly, flat, custom) · `amount` DECIMAL(10,2) · `currency` CHAR(3) DEFAULT 'USD' · `external_id` VARCHAR(120) · `status` ENUM(pending, paid, failed, refunded) · `raw_event` JSON.
- **Indexes:** UNIQUE(provider, external_id) ← **the idempotency key** · (status), (client_id).
- **Events:** webhook events (dedup on the unique index), manual mark-paid (with note).
- **Admin actions:** reconcile, refund note, resend link, daily money digest.
- **Validation:** webhook signature verified (`STRIPE_WEBHOOK_SECRET=`) before any row write; amount > 0; unknown event shapes → `payment_anomalies` park table.
- **API:** `POST /api/webhooks/stripe` (public, signature-gated) · `POST /api/payments/manual` (auth).
- **Migration:** export-critical; reconcile to provider before/after any move.

### 9. OnboardingForm — hosted

- **Purpose:** post-claim intake (/start).
- **Fields:** `client_id` FK UNIQUE · `brand_assets` JSON [{type, path, original_name}] · `content_answers` JSON (campaign-specific shape) · `domain_pref` ENUM(have, need, transfer) · `completed_pct` TINYINT · `status` ENUM(sent, partial, complete).
- **Indexes:** UNIQUE(client_id).
- **Events:** submitted, partial_save, nudge_sent.
- **Admin actions:** nudge, edit, mark complete, download assets.
- **Validation:** uploads: 5MB/file, 20 files, MIME-checked, SVG sanitized (reuse Studio's sanitizer), stored outside webroot with hashed names.
- **API:** `POST /api/onboarding/{token}` (public, token-bound to client) · partial saves allowed.

### 10. EmailEvent — hosted, append-only

- **Purpose:** every send + its fate. **No status column — deliberate** (immutable log; lifecycle lives on Contact/Proof).
- **Fields:** `contact_id` FK · `proof_id` FK NULL · `identity` VARCHAR(60) (from-address) · `template` VARCHAR(60) · `resend_id` VARCHAR(120) · `event_type` ENUM(send, delivered, open, click, bounce, complaint, unsub) · `meta` JSON · `occurred_at` DATETIME.
- **Indexes:** UNIQUE(resend_id, event_type) ← webhook idempotency · (contact_id), (proof_id), (event_type, occurred_at).
- **Events:** IS the event log.
- **Admin actions:** inspect, filter; no edit/delete ever.
- **Validation:** insert-only (no UPDATE grants on this table for the API user — enforced at MySQL grant level).
- **API:** `POST /api/webhooks/resend` (public, signature-gated) · `GET /api/email-events?contact=` (auth).

### 11. Workstream — orchestration

- **Purpose:** business-build tracker (plan §17), mirrored into the existing plans-system discipline.
- **Fields:** `name` · `owner` (agent name or 'fritz') · `priority` TINYINT · `revenue_impact` ENUM(direct, enabling, compounding) · `dependency` FK NULL self · `blocker` TEXT NULL · `blocker_set_at` · `next_action` TEXT · `deadline` DATE NULL · `cost_hours` DECIMAL(6,1) · `status` ENUM(planned, active, blocked, done, parked) · `tasks` JSON [] (fulfillment checklists).
- **Indexes:** (status), (owner).
- **Validation:** `active` requires non-null next_action (WF-16 enforces); closeout discipline applies (no zero-task actives).
- **Admin actions:** update, reprioritize, close (with closeout note).

### 12. LessonLearned — orchestration

- **Purpose:** captured improvement (plan §18).
- **Fields:** `context` JSON {agent, workflow_id, proof_id?, lead_id?} · `what_happened` TEXT · `root_cause` TEXT · `fix` TEXT · `why` TEXT · `how_to_apply` TEXT · `reusable` BOOL · `status` ENUM(logged, promoted, retired) · `promoted_skill_id` FK NULL.
- **Indexes:** (status), (context→agent generated col).
- **Validation:** root_cause + how_to_apply required before `promoted`.
- **Admin actions:** promote, edit, retire.

### 13. ReusableSkill — orchestration

- **Purpose:** packaged repeatable workflow.
- **Fields:** `name` · `trigger` TEXT · `steps` JSON [] · `owner_agent` · `source_lessons` JSON [ids] · `artifact_path` VARCHAR(255) (the real `.claude/skills/` or `pipeline/` file) · `version` INT · `usage_count` INT · `status` ENUM(draft, active, deprecated).
- **Validation:** `active` requires artifact_path exists on disk (checked at publish).
- **Admin actions:** publish, version, deprecate.

### 14. AgentTaskLog — orchestration, append-only

- **Purpose:** the universal task record — full schema in `agents.md` §0.1 (canonical; do not fork it here).
- **Fields:** exactly agents.md §0.1; `confidence` DECIMAL(3,2) NULL; enums for `qa_result`.
- **Indexes:** (agent_name, created_at), (parent_workflow_id), (proof_id), (lead_id), (model_or_tool), (lesson_candidate), (skill_candidate).
- **Validation:** insert-only; `completed_at` set exactly once.
- **Admin/queries:** powers the §4 trackability-contract questions and all Cost Auditor rollups.

---

## Hosted Plane Plan (PHP/MySQL on GoDaddy)

- **Layout:** `/api/` front controller routing to handler files; shared `lib/` lifted from the mbsh-reunion modules (`db.php` PDO, `validate.php`, `rate-limit.php`, `cors.php`, `resend.php`); config from env file **outside webroot** + `.htaccess` deny rules.
- **Public endpoints (rate-limited + honeypot/time-trap where forms):** `POST /api/leads/inbound` · `GET /api/p/{slug}` · `POST /api/proofs/{id}/claim-click` · `POST /api/onboarding/{token}` · `POST /api/unsubscribe/{token}` · `POST /api/webhooks/stripe` · `POST /api/webhooks/resend` · `GET /api/packages`.
- **Auth endpoints:** everything else requires `Authorization: Bearer ${SYNC_API_KEY}` (single machine key v1; per-user later). Admin UI auth: basic-auth over HTTPS when hosted (Wave 3); localhost before that.
- **Deploy:** cPanel UAPI overwrite (the proven path); migrations as numbered SQL files applied via a `migrate.php` admin script with version table.

## Orchestration Plane Plan (SQLite)

- New tables alongside the existing studio.db queue (same `lib/db.js` conventions); WAL mode; the existing approval state machine + `cost_estimate/cost_actual` columns are reused for proof jobs, not duplicated.
- Nightly `sqlite3 .backup` to `~/.local/share/famtastic/backups/` (7-day rotation) — backup/restore drill is a Day-28 roadmap item.

## Sync Worker Plan

- Cron every 10 min: pull hosted deltas since last cursor (form leads, email events, payments, views) → upsert mirrors; push proof statuses/preview URLs/scores → hosted display fields. Cursor table per direction; failures alert after 3 consecutive misses (engine keeps running — sync lag is degraded, not down).

## GoDaddy DB Evaluation (gates plane choice — Sprint Day 1, owner: Fritz + engine)

Pass bars per plan §23: MySQL ≥ 5.7/MariaDB ≥ 10.3 · remote access or cPanel API reachable · ≥ 25 connections · < 100ms same-host queries · automated/scriptable backups · per-app user + TLS · dump-portable. **Default: use it** (mbsh-reunion proved the pattern on this exact hosting). **Fail → seam D3:** swap `db.php` DSN to Neon/Supabase Postgres free tier; ENUMs→CHECKs, JSON→JSONB; half-day move; nothing above the API layer changes.

## Auth/Security Model

- Secrets: env files outside webroot + platform vault (Keychain) locally; never in repo (placeholders: `DATABASE_URL=`, `STRIPE_SECRET_KEY=`, `STRIPE_WEBHOOK_SECRET=`, `RESEND_API_KEY=`, `SYNC_API_KEY=`, `GODADDY_API_KEY=`, `GODADDY_API_SECRET=`).
- All public POSTs: rate-limit (IP+route buckets), validation, honeypot/time-trap; webhooks signature-verified before touching the DB; EmailEvent + AgentTaskLog insert-only at the grant level; uploads sanitized + stored outside webroot; admin destructive actions behind a governance confirm (pattern exists in repo).
- Backups: hosted nightly mysqldump (cPanel cron) + orchestration sqlite backup; suppression list double-exported weekly.

## Admin Dashboard Minimum Views (Wave 2; mobile-usable — launch-blocking)

1. **Review queue** — calibration sends + QA flags + parks: approve/reject one-thumb. 2. **Leads** — filter by campaign/status/score. 3. **Proofs** — pipeline board by status with preview links. 4. **Payments** — money digest + anomalies. 5. **Email events** — per-contact timeline + suppression state. 6. **Campaign compare** — weekly scorecard table.

**Open decisions:** D3 (DB eval result — Day 1) · D-B1 admin auth mechanism when hosted (default: basic-auth + IP allowlist; owner: Fritz; next action: Wave 3 start) · D-B2 file-upload storage root path on GoDaddy (owner: engine during Day 8–9 build; default `~/private/famtastic-uploads/`).
