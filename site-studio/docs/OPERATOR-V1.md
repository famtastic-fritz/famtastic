# Site Studio — Operator V1

Operator V1 is the supported, explicit-site path for building, editing,
verifying, and deploying a site with Site Studio. This doc is operational: it
describes what the code actually does today **on main**, what is deferred, and
how to prove the release from a clean checkout.

## 1. Supported interface

`/studio.html` is the **only** supported Operator V1 interface. The Site
Builder screen (`public/studio/src/screens/site-builder.jsx`) drives the whole
flow: select a site → write a brief → build → poll status over HTTP → open the
preview link. No WebSocket client is required; every step is reachable over
plain authenticated HTTP.

Legacy surfaces — all **unsupported / deferred** for V1:

- `/index.html` — WebSocket-driven chat interface (embedded in the Site
  Builder screen only inside a collapsed, clearly-marked legacy toggle)
- `/operator.html`
- the legacy preview surface (ambient `dist/`)
- the WS deploy path (chat-triggered deploy)
- the legacy `POST /api/vnext-build` + `runtime-vnext/server-bridge.js`
  pipeline — a separate, opt-in legacy surface gated behind
  `FAMTASTIC_USE_RUNTIME_VNEXT=1` that publishes to legacy `dist/`. It is NOT
  the V1 path; the V1 build route is `POST /api/site-studio/build-vnext` and
  publishes to `dist-vnext`.

These remain in the tree for legacy use only and are not part of the V1
operator contract.

## 2. Explicit siteTag is mandatory on every V1 route

Every V1 route resolves the site explicitly from the request (body, query, or
path via `req.ctx`) through `siteTagOr400()` (`lib/request-context.js`). A
request that does not name a site is answered **400** (`site_tag_required`).
The ambient global `TAG` still exists — but only for legacy surfaces. It is
**never authoritative** on the V1 path.

| Route | Method | siteTag source | Notes |
|---|---|---|---|
| `/api/site-studio/build-vnext` | POST | body `siteTag` | body: `siteTag` (required), `brief`, optional `pages`, `siteName`; returns `run_id`, `publish_dir`, `files`; 409 `build_in_progress` when the in-process per-site build guard is held |
| `/api/site-studio/build-vnext/status` | GET | n/a (run-scoped) | `?run_id=<id>` required (400 without, 404 unknown); reads the persisted run row from SQLite |
| `/api/site-studio/preview-url` | GET | query `siteTag` | returns `http://localhost:<PREVIEW_PORT>/vnext/<siteTag>/` |
| `/api/content-fields/:page` | GET | query `siteTag` | reads field list from `spec.content[page].fields` |
| `/api/content-field` | POST | body `siteTag` | body: `page`, `field_id`, `new_value`; edits `dist-vnext` atomically; 409 `no_vnext_build` if no artifact |
| `/api/verify` | GET | query `siteTag` | returns `spec.last_verification` |
| `/api/verify` | POST | query/body `siteTag` | runs verification against `dist-vnext`; 409 `no_vnext_build` if missing; persists result to `spec.last_verification` |
| `/api/deploy` | POST | body `siteTag` | body: `env` (`staging`\|`production`, default `staging`); returns `deployment_id`; 409 `deploy_in_progress` / `no_vnext_build`; 412 if Netlify is not configured or no site id is provisioned |
| `/api/deploy-status` | GET | n/a (deployment-scoped) | `?deployment_id=<id>` required (400 without, 404 unknown); returns the durable deployment record incl. the real proof URL |
| `/api/integrations/famtastic/proof-jobs` | POST | body `campaign_id` | Public HMAC-authenticated machine endpoint; accepts one idempotent proof job, generates exactly three isolated directions through Shay, packages intentional empty-media fallbacks plus screenshots, and returns `202` with a durable `job_id`. |

## 3. `sites/<siteTag>/dist-vnext` is the authoritative V1 artifact

- **Build** — `POST /api/site-studio/build-vnext` runs recipe
  `deterministic-site-build-v1` (publish disabled on main's RecipeRunner,
  which targets legacy `dist/`) and syncs the workspace outputs into
  `sites/<siteTag>/dist-vnext` itself.
- **Preview** — the preview server (`PREVIEW_PORT`, default **3333**) serves
  the artifact at `/vnext/<siteTag>/` (`server.js` preview handler; a site
  with no artifact is an explicit 409, not a silent fallback). Legacy preview
  continues to serve the ambient `dist/`.
- **Edit** — `POST /api/content-field` reads and writes `dist-vnext`
  atomically; a site with no vNext build gets 409, never a silent fallback to
  legacy `dist/`.
- **Verify** — `POST /api/verify` checks `dist-vnext` only.
- **Deploy** — ships `dist-vnext` (see §7).

Legacy `dist/` is untouched by the V1 path and is used only by legacy
surfaces.

**Rollback limitation.** Versioning on main is the inline `.versions` system
on the legacy `dist/` tree (`VERSIONS_DIR()` under `DIST_DIR()` in
`server.js`, capped at 50 entries; `POST /api/rollback` restores pages of the
ambient site under legacy `dist/`). It does **not** version `dist-vnext`.
V1 "rollback" = re-run the vNext build.

## 4. Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `STUDIO_REQUIRE_AUTH` | enforced (`!== '0'`) | Auth gate on all `/api` routes and both WS upgrades. `STUDIO_REQUIRE_AUTH=0` is an explicit, loudly-logged opt-out. |
| `STUDIO_TOKEN_PATH` | `~/.config/famtastic/studio-token` | Root token file location (tests redirect it). |
| `RUNTIME_VNEXT_DB_PATH` | `$RUNTIME_VNEXT_DB_DIR/runtime-vnext.db` | SQLite file holding runtime-vnext projects/runs. |
| `RUNTIME_VNEXT_DB_DIR` | `~/.config/famtastic` | Directory fallback for the DB path. |
| `PREVIEW_PORT` | `3333` | Preview server port. |
| `STUDIO_SITES_ROOT` | repo `sites/` | Sites root (spec, `dist-vnext`, previews) — tests boot against a temp tree. |
| `STUDIO_VNEXT_HUB_ROOT` | site-studio dir | Hub root for recipe fixture resolution and run workspaces. |
| `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` | — | Netlify credentials; either satisfies the capability probe (`lib/capability-manifest.js checkNetlify`). |
| — | `~/.netlify/config.json` | Alternative: `netlify login` CLI credentials (config with ≥1 user). |
| `SITE_DEPLOY_SOURCE_DIR` | `dist` in the script; `dist-vnext` on the V1 path | Artifact selector for `scripts/site-deploy`. The HTTP deploy path injects `dist-vnext`; direct CLI use defaults to legacy `dist`. |
| `FAMTASTIC_USE_RUNTIME_VNEXT` | unset (off) | Opt-in gate for the legacy `POST /api/vnext-build` + server-bridge pipeline (see §1). Not required for any V1 route. |
| `FAMTASTIC_PROOF_DISPATCH_SECRET` | — | HMAC secret used to authenticate FAMtastic Designs proof-job requests. |
| `FAMTASTIC_PROOF_CALLBACK_SECRET` | — | HMAC secret used to sign callbacks to FAMtastic Designs. |
| `FAMTASTIC_PROOF_JOBS_DIR` | `~/.config/famtastic/proof-jobs` | Durable proof-job records used for idempotency and restart recovery. |
| `FAMTASTIC_PROOF_OUTPUT_ROOT` | `~/.config/famtastic/proof-output` | Isolated generated artifacts for proof campaigns. |
| `FAMTASTIC_PROOF_PROVIDER` | `shay` | Proof-generation provider. The supported integration path calls `shay -z`; it does not require Claude or a direct OpenAI API key. |

## 5. Authentication

**Setup.** The root token is generated at first boot and stored with mode
`0600` at `STUDIO_TOKEN_PATH` (default `~/.config/famtastic/studio-token`).
It is held in memory only by the server; read the file to obtain it.

**Session bootstrap.** `POST /api/auth/bootstrap` with the root token
(`Authorization: Bearer <token>` or body `{"token": ...}`) sets an HttpOnly
session cookie and returns a CSRF token. Cookie-authenticated **mutations
must echo the CSRF token** in the `x-studio-csrf` header (bearer callers are
exempt). `POST /api/auth/elevate` (root token again) opens the short
privileged window on the session. `GET /api/auth/status` reports
enforcement/authentication state and re-issues the CSRF token to an already
authenticated session (recovery path).

**Auth matrix** (enforcement on by default):

- **Anonymous** → 401 on everything under `/api` except `/api/auth/*`.
- **Session (not elevated)** → reads OK (GETs, incl. `build-vnext/status`,
  `deploy-status`, `content-fields/*`, `verify`, `preview-url`); mutations
  (`POST build-vnext`, `deploy`, `content-field`, `verify`) → **403
  `reauth_required`**.
- **Elevated session or bearer token** → all routes.

WebSocket upgrades (both the Studio WS and the PTY WS) are authenticated
**during the upgrade**: browser path is the session cookie (same-origin Origin
required); programmatic callers can use `Sec-WebSocket-Protocol:
studio.bearer, <token>`. A socket that fails auth is destroyed before
`handleUpgrade`.

## 6. Operator procedures

1. **Build** — `POST /api/site-studio/build-vnext` with `{siteTag, brief,
   pages?, siteName?}`. The brief is persisted to the spec
   (`vnext_build_request`) before the build runs. Response carries `run_id`.
2. **Poll status** — `GET /api/site-studio/build-vnext/status?run_id=<id>`
   until `status` is `published`/`failed`. The run row in SQLite is the
   source of truth.
3. **Preview** — `GET /api/site-studio/preview-url?siteTag=<tag>` → open
   `http://localhost:3333/vnext/<tag>/`.
4. **Edit** — `GET /api/content-fields/:page?siteTag=<tag>` to list fields;
   `POST /api/content-field` with `{siteTag, page, field_id, new_value}`.
   Reload the preview to see the edit.
5. **Verify** — `POST /api/verify?siteTag=<tag>`; result persisted to
   `spec.last_verification`, readable via `GET /api/verify`.
6. **Deploy to Netlify staging** — `POST /api/deploy` with `{siteTag,
   env: "staging"}` → `deployment_id`.
7. **Poll deploy status** — `GET /api/deploy-status?deployment_id=<id>` until
   `status` is `succeeded`/`failed`; the `url` on success is the **real proof
   URL**.
8. **Restart recovery** — build runs live in SQLite
   (`RUNTIME_VNEXT_DB_PATH`) and deployments in `spec.deployments`, so state
   survives a restart. At boot the server reconciles interrupted deployments
   (`reconcileInterruptedDeployments` in `lib/deploy-jobs.js` — stale
   `running`/`dispatched` records are closed out). Build concurrency is an
   **in-process per-site guard** (`buildsInProgress` in
   `server/runtime-vnext-build-route.js`), so a restart simply clears it —
   there is no lock table to reclaim. After a restart, re-poll
   `deploy-status`/`build-vnext/status` to resume.

## 7. Deploy details

- Runner: `lib/deploy-runner.js` spawns **`scripts/site-deploy <tag> --prod
  --env <env>`** with `SITE_DEPLOY_SOURCE_DIR=dist-vnext` injected.
- The script's own default is `dist` (legacy CLI behavior preserved);
  traversal-shaped `SITE_DEPLOY_SOURCE_DIR` values are refused.
- **The deployment target is captured immutably at dispatch.** `POST
  /api/deploy` captures the provider (resolved the same way the legacy flow
  would: `spec.deploy_provider` → settings `deploy_target` → `netlify`) AND
  the provider-specific site id (`spec.environments[env].site_id`, falling
  back to `spec.netlify_site_id`) BEFORE dispatch, and hands both verbatim to
  the subprocess (`SITE_DEPLOY_PROVIDER`, `SITE_DEPLOY_SITE_ID` +
  `SITE_DEPLOY_IMMUTABLE_TARGET=1`). On that path the script uses EXACTLY the
  captured values — it never re-reads `spec.json`, config defaults, or CLI
  autodetect to pick its target, so a spec change after dispatch cannot
  redirect the deploy.
- **Fail closed, verified on completion.** The script reports the actual
  target back on stderr (`[deploy] provider-used:` / `[deploy]
  site-id-used:`); the runner requires captured == actual for BOTH provider
  and site id — a missing marker or any mismatch fails the deployment with
  `provider_mismatch` / `site_id_mismatch` and drift is never persisted as
  success. Both pairs are returned by `GET /api/deploy-status`
  (`captured_provider`, `actual_provider_used`, `captured_site_id`,
  `actual_site_id_used`) and stored in the durable record.
- **Provider: `netlify` is the only supported V1 provider**, and a
  provisioned Netlify site id is required — `POST /api/deploy` refuses with
  412 `unsupported_deploy_provider` for any other resolved provider, and 412
  `no_netlify_site_id` when no site id is configured (auto-create stays
  available only on the legacy direct-CLI path).
- Per-site Netlify config: `spec.environments[env].site_id`, falling back to
  `spec.netlify_site_id`.
- Env naming: `staging` and `production` are the only accepted values; the
  script maps them to `<base>-staging` / `<base>-prod` Netlify sites.
- On success the runner writes `spec.environments[env] = { provider, site_id,
  url, deployed_at, state: 'deployed' }`, `spec.deployed_url`, and updates the
  durable record in `spec.deployments[deployment_id]`
  (`dispatched → running → succeeded/failed`). Completion persistence never
  depends on a WebSocket client.

## 8. Deferred architecture work (known, out of V1 scope)

- additional interfaces beyond `/studio.html`
- new runtime families
- standalone-repo extraction
- full provider-neutral completion
- Mission Control
- intelligence features
- Media Studio
- multi-agent features
- broad UI redesign
- `server.js` reduction
- legacy feature removal
- `dist-vnext` versioning / rollback (see §3)
- persisted/cross-process build locking (V1 uses an in-process per-site
  guard; see §6 step 8)

## 9. Clean-checkout validation

```bash
cd site-studio
npm ci
npm test                      # full vitest suite
npm run test:operator-v1      # boots the REAL server over HTTP, temp world
npm run test:immutable-target # immutable deploy target binding proof
```

`npm run test:operator-v1` (`tests/operator-v1-release.test.js`) boots the
real `server.js` against a fully temporary world (`STUDIO_SITES_ROOT`,
`STUDIO_VNEXT_HUB_ROOT`, `RUNTIME_VNEXT_DB_PATH`, `STUDIO_TOKEN_PATH`, temp
`HOME`) with auth enforced; only the Netlify dispatch is faked.

Manual start:

```bash
STUDIO_REQUIRE_AUTH=1 RUNTIME_VNEXT_DB_PATH=~/.config/famtastic/runtime-vnext.db \
  node server.js
```

Walkthrough checklist:

- [ ] create/select a site in `/studio.html`
- [ ] write a brief, run the vNext build
- [ ] poll `build-vnext/status` to `published`
- [ ] open the preview URL (`/vnext/<siteTag>/`)
- [ ] edit a field via content-fields / content-field; see it in preview
- [ ] run verify; read `spec.last_verification`
- [ ] deploy to Netlify staging; poll `deploy-status`
- [ ] confirm the real proof URL loads
- [ ] restart the server; confirm run/deployment state recovered from SQLite +
      spec and boot reconciliation logged

## 10. Netlify staging proof procedure

1. Ensure Netlify credentials are resolvable (`NETLIFY_AUTH_TOKEN` /
   `NETLIFY_SITE_ID`, or `netlify login`).
2. Ensure `spec.netlify_site_id` or `spec.environments.staging.site_id` names
   the target Netlify site.
3. `POST /api/deploy` `{ "siteTag": "<tag>", "env": "staging" }` → keep the
   `deployment_id`.
4. Poll `GET /api/deploy-status?deployment_id=<id>` until `succeeded`.
5. The proof URL is persisted in three places, all readable without a WS
   client: `spec.deployments[deployment_id].url`,
   `spec.environments.staging.url`, and the `GET /api/deploy-status` response.
6. Open the proof URL in a browser — that is the staging deploy proof.
