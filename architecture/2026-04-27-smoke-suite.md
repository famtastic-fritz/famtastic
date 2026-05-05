# FAMtastic Studio — Smoke Suite (P0.0)
**Date:** 2026-04-27
**Phase:** P0 — Baseline Reliability
**Session:** P0.0 — Smoke Suite Definition
**Status:** definition only; first execution happens at the P0 exit gate
**Reference plan:** V3-final operating plan (chat record, 2026-04-27)

---

## Purpose

This document defines the canonical smoke suite that must pass before P0 is considered complete. The suite is the single source of truth for "the baseline works end-to-end." Every subsequent P0 fix session (P0.1 diagnostic, P0.2 site-output fixes, P0.3 Studio UX fixes) is judged against whether the smoke suite passes after the fix.

The suite is documentation-only at definition time. Running it requires Studio up, a browser, and (optionally) Netlify configured. Each step has an exact GUI click path, expected on-disk artifacts, and an evidence template that can be filled in during execution.

This document also defines the EADDRINUSE 50-cycle wrapper test (P0 exit gate #3) and the schema validator script (P0 exit gate #5), since both are smoke-adjacent and need to live next to the click-path specifications they support.

---

## Prerequisites (run-time)

Before executing the smoke suite, verify:

| Item | How to verify | Pass condition |
|------|---------------|----------------|
| Studio process is up | `launchctl list \| grep famtastic` | Returns line with non-negative PID |
| Studio HTTP healthy | `curl -s http://localhost:3334/api/health` | Returns `{"status":"ok","uptime":<num>,"timestamp":"<iso>"}` |
| Preview HTTP up | `curl -sI http://localhost:3333/index.html \| head -1` | `HTTP/1.1 200` (or 404 if no active site has built — acceptable; preview returns 404 cleanly only if smoke step 5 says so) |
| Browser available | Open Chrome/Firefox to `http://localhost:3334` | Studio UI loads without console errors |
| No prior smoke artifacts | `ls sites/site-smoke-*` | Either no result, or the directory is intentionally being reused (delete first if so) |
| Worktree clean before start | `git status --short` | Empty output OR only files in `.playwright-mcp/`, `.brain/`, `.local/`, `intelligence/` (ephemeral) |

If any prerequisite fails, **abort the smoke run and log the failure** rather than starting partial — partial smoke runs are not evidence of anything.

---

## Canonical Test Prompts

The suite uses two canonical prompts, both via Shay Desk, that exercise different brief-extraction paths shipped in the 2026-04-25 baseline closure:

### Prompt A — Proper-noun cluster (primary smoke path)

> Build me a website for Tony's Barber Shop in Atlanta. The pages should be Home, Services, and Contact. Bold, confident, FAMtastic style.

- **Expected extraction method:** `proper_noun`
- **Expected tag:** `site-tonys-barber-shop`
- **Expected pages:** `['home', 'services', 'contact']`
- **Expected tier:** `famtastic`

### Prompt B — Type+location synthesis (validates the gate that closed the baseline)

> Build me a website for a barber shop in Brooklyn. Three pages: home, services, contact.

- **Expected extraction method:** `type_location_synthesis`
- **Expected tag:** `site-barber-brooklyn` (matches the regex; trailing state code `, NY` would extend it)
- **Expected pages:** `['home', 'services', 'contact']`
- **Expected tier:** `famtastic`

Prompt A is the primary smoke path (steps 1–9 below). Prompt B is run as a follow-up to verify that the type+location gate still fires; only steps 1–4 are required for Prompt B since it's confirming extraction, not deploy.

**No "deploy" word in either prompt** — this is intentional. The 2026-04-25 baseline failure was caused by an incidental "deploy" keyword hijacking the classifier. Smoke prompts must not contain the deploy keyword in the build phase. Deploy is exercised separately in step 8.

---

## Smoke Steps

Each step has four blocks: (a) **Click path** (exact UI actions), (b) **Expected artifacts** (files/state changes), (c) **Pass condition** (decision rule), (d) **Evidence to capture** (for the run report).

### Step 1 — Open Studio at localhost:3334

**Click path:** open browser → navigate to `http://localhost:3334`

**Expected artifacts:**
- Studio shell renders with sidebar, top bar, chat panel, canvas tabs
- WebSocket connects within 5s (browser console: `[ws] connected`)
- Active site name visible in top bar `#top-bar-site-btn` and sidebar `#site-tag`
- Chat panel `#chat-messages` renders an opening session-break divider via `addChatSessionBreak` (the divider added in the 2026-04-25 baseline closure)

**Pass condition:** UI renders, WS connects, no red errors in browser console, no fatal lines in `/tmp/studio.log` for the past 60s.

**Evidence to capture:**
- [ ] Screenshot of Studio top bar showing active site
- [ ] Browser DevTools Console screenshot (clean, no errors)
- [ ] Last 30 lines of `/tmp/studio.log` filtered for `[fatal]` or `Error:` (expected: none)

### Step 2 — Submit Prompt A via Shay Desk

**Click path:**
1. Click the **Shay** rail item in the sidebar (or the Shay tab in the tab bar)
2. Focus textarea `#shay-desk-input`
3. Paste Prompt A verbatim
4. Press the send button (or Enter, depending on UI affordance — confirm in P0.1 diagnostic if ambiguous)

**Expected behaviour during dispatch:**
- Shay Desk shows the user message immediately
- Shay Desk responds with `shay_response` text (e.g. "Building Tony's Barber Shop. Watch progress in Studio Chat.")
- Studio Chat panel begins receiving build progress (status messages, page builds completing)
- Active TAG switches to `site-tonys-barber-shop` (top bar updates, chat session-break divider appears)

**Pass condition (post-P0.3):** Shay returns a `shay_response` (not `route_to_chat`) containing a preview of the extracted brief: business name, tag, pages, tier, extraction method. The response asks the user to reply "yes" / "build it" / "proceed" to start, or "cancel" to abort. **No build dispatch yet — that happens in step 2b.** Pending entry expires in 5 minutes.

### Step 2b — Confirm the build

**Click path:** focus textarea `#shay-desk-input`, type `yes` (or `build it` / `proceed`), press send.

**Expected behaviour during dispatch:**
- Shay tier-0 detects pending confirmation + affirmative pattern → `confirm_build_request` intent
- `handleShayBuildConfirmation` runs: takes pending → `createSite` (with `on_collision: 'return_collision'`) → `synthesizeDesignBriefForBuild` → `triggerSiteBuild`
- TAG switches automatically (helper-owned)
- Studio Chat panel begins receiving build progress (status messages, page builds completing)

**Pass condition:** confirmation is detected, build dispatches. A bare "yes" outside any pending build flow should NOT trigger anything (verifying `hasPendingBuildConfirmation` gating).

**Evidence to capture:**
- [ ] Screenshot of Shay Desk showing the user message and `shay_response` reply
- [ ] Screenshot of top bar after TAG switch
- [ ] `/tmp/studio.log` lines containing `[shay-shay]`, `[createSite]`, `[auto-build]` for this dispatch

### Step 3 — Verify site directory created at `sites/<tag>/`

**Click path:** none — this is a filesystem check.

**Expected artifacts:**
- `sites/site-tonys-barber-shop/` exists
- `sites/site-tonys-barber-shop/spec.json` exists
- `sites/site-tonys-barber-shop/dist/` exists (initially empty until build completes)
- `~/.config/famtastic/.last-site` contains `site-tonys-barber-shop`

**Pass condition:**
```bash
test -d sites/site-tonys-barber-shop && \
test -f sites/site-tonys-barber-shop/spec.json && \
test -d sites/site-tonys-barber-shop/dist && \
grep -q 'site-tonys-barber-shop' ~/.config/famtastic/.last-site
```
Exit code 0 = pass.

**Evidence to capture:**
- [ ] `ls -la sites/site-tonys-barber-shop/` output
- [ ] `cat ~/.config/famtastic/.last-site` output

### Step 4 — Verify `spec.json` matches schema

**Click path:** none — filesystem inspection.

**Expected fields in `spec.json`:**

| Field | Type | Expected value |
|-------|------|----------------|
| `tag` | string | `"site-tonys-barber-shop"` |
| `site_name` | string | `"Tony's Barber Shop"` |
| `business_type` | string | non-empty (extracted) |
| `state` | string | one of `'new'`, `'briefed'`, `'building'`, `'built'` (depends on smoke timing) |
| `tier` | string | `"famtastic"` (canonical, post-GAP-4) |
| `famtastic_mode` | boolean | `true` (derived from tier) |
| `created_at` | string | ISO-8601 timestamp within last 5 minutes |
| `interview_completed` | boolean | `true` (Shay path pre-loads brief) |
| `interview_pending` | boolean | `false` |
| `client_brief` | object | present, with `business_description`, `revenue_model`, `ideal_customer`, `differentiator`, `primary_cta`, `style_notes` |
| `pages` | array | `["home", "services", "contact"]` (or includes those) |
| `design_brief` | object | present after synthesis (step 2b in `runAutonomousBuild`/`handleShayBuildRequest`) |

**Validator script:** `scripts/smoke-validate-all-specs` *(shipped 2026-04-27 in P0.2)*. Run `./scripts/smoke-validate-all-specs <tag>` for a single site or no-arg for full sweep. Exits 0 when valid, 1 with a structured failure report when not. Backed by `site-studio/lib/spec-schema.js`.

**Migration script (one-shot):** `scripts/spec-repair-all` *(shipped 2026-04-27 in P0.2)*. Brings legacy site specs into compliance by running `normalizeTierAndMode` + `normalizeRequiredFields` + tag-from-directory derivation. Idempotent. Use `--dry-run` to preview.

**Pass condition:** All required fields present and types correct. `tier_normalization_warning` may appear and is informational, not a failure.

**Evidence to capture:**
- [ ] `cat sites/site-tonys-barber-shop/spec.json` (full content)
- [ ] Manual annotation of any missing or unexpected fields

### Step 5 — Click Preview, verify site loads at localhost:3333

**Wait condition:** the build that auto-dispatched in step 2 must complete first. Wait for Studio Chat to show the `${currentPage} updated! (${buildElapsed}s)` message OR for `BUILD_COMPLETED` event in `/tmp/studio.log`. Reasonable timeout: 10 minutes (Tier-B builds with 3 pages typically take 4–7 minutes).

**Click path:**
1. Locate the **Preview** view toggle button `#view-toggle-preview` in the canvas toolbar
2. Click it (or confirm the canvas is already showing the preview iframe)

**Expected artifacts:**
- `sites/site-tonys-barber-shop/dist/index.html` exists
- `sites/site-tonys-barber-shop/dist/services.html` exists
- `sites/site-tonys-barber-shop/dist/contact.html` exists
- `sites/site-tonys-barber-shop/dist/_template.html` exists
- `sites/site-tonys-barber-shop/dist/assets/styles.css` exists
- `sites/site-tonys-barber-shop/dist/assets/logo-full.svg` exists (FAMtastic logo mode emitted multi-part SVG)
- Preview iframe at `http://localhost:3333/index.html` loads the page without 404

**Pass condition:** All four HTML pages exist; iframe shows rendered hero, nav, content, footer; nav links navigate between pages without 404.

**Known issue (closed 2026-04-27 in P0.2):** `bug-broken-header-links-2026-04-25` was rooted in `applyLogoV` using regex `/i` which only swapped the first `data-logo-v` anchor when Claude emitted two. Fix: `/gi` global swap + dedup pass + inline-style strip. After P0.2 ships, step 5's nav-link evidence should show a single, clean logo anchor and no inline `style=""` on it. If duplication or inline styles return on a fresh build, that's a **regression** of the P0.2 fix, not the original bug.

**Evidence to capture:**
- [ ] `ls -la sites/site-tonys-barber-shop/dist/` output
- [ ] Screenshot of preview iframe at `index.html`
- [ ] Screenshot after clicking each nav link (3 screenshots: services, contact, home)
- [ ] Browser DevTools Network panel screenshot showing 200/404 for each nav-link click

### Step 5b — Post-build spec invariants (added P0.4)

**Click path:** none — terminal command.

```bash
./scripts/smoke-assert-built-spec site-tonys-barber-shop
```

**Pass condition:** exit 0 with:
- `state` ∈ `{built, deployed, client_approved}`
- `design_brief.approved === true`
- `interview_completed === true`
- `pages` is a non-empty array

**Why this matters:** without `design_brief.approved === true`, the classifier's `hasBrief` gate falls through to `new_site` on every subsequent chat message. That's the regression P0.4 closed. If this assertion fails on a fresh build, **stop the smoke run** — Steps 6, 7, and 8 will all silently misclassify and produce useless evidence.

**Evidence to capture:**
- [ ] Output of `./scripts/smoke-assert-built-spec site-tonys-barber-shop`

### Step 6 — Make a content edit through chat

**Click path:**
1. Confirm active page in the canvas is `index.html` (otherwise click `index.html` page tab)
2. Focus textarea `#chat-input`
3. Type: `Change the hero headline to "Welcome to Tony's"`
4. Press Enter or click the send button

**Expected behaviour:**
- Studio Chat shows the user message
- Status pill: `Classifying request...` then `Surgical edit: hero / headline`
- A new entry appears in `sites/<tag>/mutations.jsonl`
- The hero headline in `dist/index.html` is replaced
- Preview auto-reloads (preview server detects file change)
- **No `parallelBuild` logs** in `/tmp/studio.log` — the edit went through `tryDeterministicHandler` / `surgicalEditor`, not a full rebuild

**Pass condition:** Edit visible in `dist/index.html` and preview iframe; no rebuild fired.

**Evidence to capture:**
- [ ] `tail -20 sites/site-tonys-barber-shop/mutations.jsonl` showing the new entry with field path and before/after values
- [ ] Screenshot of preview after edit (hero shows new headline)
- [ ] `grep -c 'parallelBuild' /tmp/studio.log` for the 60s window covering this step — expected: 0 new entries
- [ ] `git diff sites/site-tonys-barber-shop/dist/index.html` showing the headline change is the only change (or near-only — one DOM node)

### Step 7 — Verify edit applied without rebuild

**Click path:** none — this is verification of step 6.

**Pass condition:** `mutations.jsonl` shows surgical edit; `/tmp/studio.log` shows no `parallelBuild` calls during the edit window; preview reflects the change. No `BUILD_COMPLETED` event for the edit.

**Why this is a separate step:** isolating "did the edit apply" from "did it apply via the surgical path" makes it clear which sub-component failed if there's a regression. If the edit shows up but rebuild also fired, that's a different bug than if the edit didn't show up at all.

**Evidence to capture:**
- [ ] Confirmation note linking step 6 evidence to step 7 pass criteria
- [ ] Surgical hint trace: search log for `STRUCTURAL_HINTS` or `tryDeterministicHandler` for the request

### Step 8 — Click Deploy

**Click path:**
1. Click the **Deploy** rail item in the sidebar (`data-tab="deploy"`)
2. The deploy panel appears
3. Click **→ Staging** button (`onclick="deployToStaging()"`) — staging is preferred for smoke; production deploy is reserved for the actual reunion launch

**Expected behaviour — two valid pass paths:**

**Path A (Netlify available):**
- Status pill: `Deploying to staging...`
- `runDeploy` preflight (`checkNetlify()`) returns `{ ok: true }`
- Child process `scripts/site-deploy site-tonys-barber-shop --prod --env staging` runs
- On success: chat shows `Staging deploy complete!\n\nURL: https://...`
- `spec.json` updates with `environments.staging.url` and `deploy_history` entry

**Path B (Netlify unavailable, expected today):**
- Status pill: `Deploying to staging...`
- `runDeploy` preflight (`checkNetlify()`) returns `{ ok: false, reason: 'cli_missing' | 'credentials_missing' | 'config_unreadable', details: '...' }`
- Chat shows `Staging deploy failed: <details>` with a specific reason
- `deployInProgress` flag never gets set (preflight runs before flag mutation)
- A second deploy attempt immediately afterwards succeeds (gated by Path A only)

**Pass condition for P0:** EITHER Path A succeeds AND step 9 is run, OR Path B surfaces a specific structured reason (one of the four documented `reason` values). A generic "deploy failed" message with no `reason` is a **fail**.

**Live deploy verification (Path A) is required before P2** per the V3-final plan; for P0 exit, error-surfacing (Path B) is sufficient.

**Evidence to capture:**
- [ ] Screenshot of deploy chat output (URL or specific error reason)
- [ ] `/tmp/studio.log` lines containing `[deploy]` for this attempt
- [ ] `grep -A3 'reason' /tmp/studio.log | tail` showing the structured reason if Path B
- [ ] If Path A: `cat sites/<tag>/spec.json | jq .environments.staging`

### Step 9 — Verify deployed URL matches local (Path A only)

**Skip this step if step 8 was Path B.**

**Click path:**
1. Open new browser tab
2. Navigate to the URL from step 8
3. Compare hero, nav, content, footer to the local preview

**Pass condition:** Deployed URL renders identical hero headline (the edit from step 6 — "Welcome to Tony's"), identical nav links, identical layout. Identical = visual diff acceptable; HTML byte-equality not required (Netlify may add a trailing newline).

**Evidence to capture:**
- [ ] Side-by-side screenshot of deployed vs. local preview
- [ ] `curl -s <deployed-url> | grep -o '"Welcome to Tony.s"' | head -1` returns the headline

### Follow-up — Run Prompt B (extraction-only smoke)

After Prompt A's full run completes, run Prompt B to verify the type+location synthesis path (the path that closed the 2026-04-25 baseline failure).

Run smoke steps **1–4 only** with Prompt B. Skip steps 5–9. Pass conditions same as Prompt A but with the type+location synthesis–expected values listed in the Canonical Test Prompts section above.

---

## Pass/Fail Evidence Template

Copy this template per smoke run and fill in. One report = one run = one full or partial pass.

```
# Smoke Run Report — <YYYY-MM-DD HH:MM>

Operator: <name>
Studio commit: <git rev-parse HEAD>
Studio log path: /tmp/studio.log
Studio uptime at start: <process.uptime() value from /api/health>

## Step 1 — Open Studio
Status: PASS | FAIL | PARTIAL
Evidence:
- Screenshot: <path-or-attached>
- Console clean: yes | no — note: ...
- Log clean: yes | no — note: ...

## Step 2 — Submit Prompt A
Status: PASS | FAIL | PARTIAL
Shay response text: "..."
TAG before: <tag>
TAG after: site-tonys-barber-shop (yes | no)
Evidence: <as listed above>

## Step 3 — Site directory
Status: PASS | FAIL
Command output: <test exit code 0 | 1>
Evidence: <as listed above>

## Step 4 — spec.json schema
Status: PASS | FAIL | PARTIAL
Missing fields: <list or none>
Unexpected fields: <list or none>
tier_normalization_warning: <value or absent>
Evidence: <as listed above>

## Step 5 — Preview loads
Status: PASS | FAIL | PARTIAL
Pages present in dist/: <list>
Nav links functional: yes | no — bug ref: bug-broken-header-links-2026-04-25
Evidence: <as listed above>

## Step 6 — Content edit
Status: PASS | FAIL | PARTIAL
mutations.jsonl entry: <yes | no>
Preview reflects edit: <yes | no>
parallelBuild fired: <yes | no — should be no>
Evidence: <as listed above>

## Step 7 — Edit-without-rebuild verification
Status: PASS | FAIL
Surgical path confirmed: <yes | no>

## Step 8 — Deploy
Status: PASS (Path A) | PASS (Path B) | FAIL
Path: A | B
Reason (Path B only): cli_missing | credentials_missing | config_unreadable | other
Deploy URL (Path A only): <url>
Evidence: <as listed above>

## Step 9 — Deployed URL matches local
Status: PASS | SKIPPED (Path B) | FAIL
Evidence: <as listed above>

## Prompt B follow-up (steps 1–4)
Status: PASS | FAIL | PARTIAL
Tag created: site-barber-brooklyn (yes | no)
extraction_method: type_location_synthesis (yes | no)
Evidence: <as listed above>

## Overall
Outcome: PASS | FAIL | PARTIAL-PASS
P0 exit gate impact:
  - Gate 1 (smoke passes): <PASS | FAIL>
  - Gate 2 (JJ B&A header links + visual distinctiveness): N/A here, separate verification
Open issues from this run: <list>
Next action: <stop / re-run / file bug / proceed to P0.1>
```

---

## EADDRINUSE 50-Cycle Wrapper (P0 exit gate #3)

The plan requires 50 consecutive Studio start/stop cycles without an EADDRINUSE crash. This wrapper is the canonical implementation of that test. It will be added as `scripts/smoke-eaddrinuse-50` during P0.3 (the session that fixes the crash loop). For P0.0 we define the wrapper's contract precisely so the implementation isn't ambiguous.

### Contract

Per cycle:

1. **Stop:** issue `launchctl stop com.famtastic.studio`. Wait up to 10s for the process to exit cleanly.
2. **Verify port released:** TCP probe `localhost:3334` and `localhost:3333` until both return `connection refused` or until 5s timeout. Failure to release within 5s = log "port still bound after stop" and abort.
3. **Start:** issue `launchctl start com.famtastic.studio`. Wait for `/api/health` to return HTTP 200 within 30s (the timeout in the V3-final plan).
4. **Health check:** parse `/api/health` body, confirm `status === 'ok'` and `uptime < 30` (a higher value means we caught a stale instance).
5. **Stop again:** repeat step 1.
6. **Cycle counter:** increment, log `[cycle <n>] OK` to the wrapper log.

On any failure: log cycle number, exit code, last 30 lines of `/tmp/studio.log`, last `/api/health` response (if any), then **abort the gate** — do not auto-recover.

### Pass condition

50 consecutive cycles each producing `[cycle <n>] OK`. No aborts.

### Why we need this

Today's `/tmp/studio.log` shows recurring `[fatal] uncaughtException: Error: listen EADDRINUSE: address already in use :::3333` and `:::3334`. The launchd `KeepAlive` directive restarts Studio on crash, but if the previous instance hasn't released its ports, the restart fails immediately and the cycle repeats. The 50-cycle test is the operational signal that this loop has been broken.

---

## Schema Validator Script (P0 exit gate #5)

The plan requires every site spec to validate against the runtime schema. This script is the canonical implementation of that gate. It will be added as `scripts/smoke-validate-all-specs` during P0.2 (the session that reconciles schema drift). For P0.0 we define its contract.

### Contract

```bash
# Pseudocode — actual implementation in P0.2
for spec in sites/*/spec.json; do
  validate_required_fields(spec)   # tag, site_name, state, created_at
  validate_tier_canonicality(spec)  # tier exists; famtastic_mode === (tier === 'famtastic')
  validate_array_fields(spec)       # media_specs, design_decisions, deploy_history, pages
  validate_environments_shape(spec) # if environments present, conforms to {staging?, production?}
  validate_no_legacy_flat_fields(spec) # deployed_url should be absent if environments exists
  emit RESULT: pass | fail with reason for spec
done
exit 0 if all pass else 1
```

### Pass condition

Exit code 0; every spec emits `pass`. The script must enumerate each failure with the spec path and the failing rule, not stop at the first failure.

### Cross-reference

Pre-existing schema coherence issue (`colors`/`pages` required-but-not-written) is tracked in `architecture/2026-04-24-schema-audit-followup.md` and is in scope for P0.2. The validator needs to either enforce the corrected schema or document which fields are intentionally optional after P0.2.

---

## Reproducibility Instructions

### To run the smoke suite from a clean state

1. `git status` — confirm clean (or only ephemeral paths dirty)
2. `git rev-parse HEAD` — record commit
3. `launchctl list | grep famtastic` — confirm Studio running
4. Delete prior smoke artifacts if present: `rm -rf sites/site-tonys-barber-shop sites/site-barber-brooklyn`
5. Open browser to `http://localhost:3334`
6. Open `/tmp/studio.log` in a separate terminal: `tail -f /tmp/studio.log`
7. Open this document side-by-side with the browser
8. Begin Step 1; copy the evidence template; fill in as you go
9. Save the completed report as `architecture/smoke-runs/<YYYY-MM-DD>-<short-tag>.md`

### To re-run the suite after a fix

1. Confirm the fix is committed
2. Note the new `git rev-parse HEAD`
3. Repeat steps above, comparing the new run's pass/fail to the prior run's pass/fail step-by-step

---

## What This Document Does NOT Cover (out of P0.0 scope)

These are explicitly out of scope for the smoke suite as defined here. They belong to later phases per the V3-final plan:

- **Edge case suite** (Tier signaling, brief malformation, build path stress) — P1.1
- **Visual distinctiveness scoring** (per-site style fingerprint, archetype variation) — P1.2
- **Concurrent build / spec corruption tests** — P3
- **Multi-vertical pilot smoke** — P2.5 has its own per-site checks
- **Promotion kit verification** — P2.4
- **Lighthouse / axe-core / Linkinator automated checks** — P3.3 wires them to suggestion outcome scoring; smoke does not gate on them
- **FAM score automation** — P3 explicitly excludes this; observable proxies only

If the smoke suite expands during P0.1–P0.3 (e.g. step 2 changes when the auto-build confirmation step lands in P0.3), the change is appended to this document with a dated revision note rather than rewritten in place — the prior version stays readable so historical run reports remain interpretable.

---

## Revision Log

| Date | Author | Change |
|------|--------|--------|
| 2026-04-27 | P0.0 session | Initial definition. `/api/health` endpoint added (single allowed code change). Two canonical prompts. 9 smoke steps + Prompt B follow-up. EADDRINUSE 50-cycle contract. Schema validator contract. Evidence template. |
