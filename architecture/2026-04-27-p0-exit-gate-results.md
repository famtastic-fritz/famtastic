# P0 Exit Gate Results — 2026-04-27

**Operator:** Claude (gate execution session)
**Studio commit at start:** `323fece76681a121e68317a1314140b52701ef58` (P0.3)
**Runtime cleanup before run:** stale `npm run studio` wrappers were killed; `launchctl unload && load` performed; `/api/health` confirmed returning `{status:"ok"}` on PID 15422 before gate execution.
**Worktree:** dirty (ephemeral paths only — `.brain/`, `.local/`, `.playwright-mcp/`, `.wolf/`, `.worker-queue.jsonl`, plus tracked-with-changes intelligence/log files; no source modifications by this session)

---

## Summary

| Gate | Status |
|------|--------|
| 1. Smoke suite end-to-end (Prompt A) | **FAIL** at Step 6 (cascades to 7, 8, 9) |
| 2. JJ B&A rebuild + visual distinctiveness | **FAIL** (rebuild blocked by same regression as Gate 1; existing dist has duplicate `data-logo-v` from a pre-P0.2 build) |
| 3. EADDRINUSE 50-cycle | **PASS** (50/50) |
| 4. Restyle test | **FAIL** (silent no-op — same regression as Gate 1) |
| 5. Schema validation | **PASS** (exit 0) |

**One root-cause regression — `design_brief.approved` is never set to `true` after a build — is responsible for Gates 1, 2, and 4 failing.** P0.2's `applyLogoV` dedup fix could not be re-verified on a fresh build because the rebuild path is gated by the same regression.

---

## Headline finding — `design_brief.approved` never flips to `true`

### What broke

`site-studio/server.js:11308` defines:
```js
const hasBrief = spec && spec.design_brief && spec.design_brief.approved;
```

The check at `server.js:11453` falls through to `new_site` when `hasBrief` is falsy:
```js
if (!hasBrief) {
  console.log(`[classifier] intent=new_site confidence=HIGH (no approved brief)`);
  return 'new_site';
}
```

Survey of `design_brief.approved` across recent sites:

| Site | `state` | `interview_completed` | `design_brief.approved` |
|------|---------|------------------------|--------------------------|
| `site-tonys-barber-shop` (built today via Shay confirm) | `built` | `true` | **`false`** |
| `site-jj-ba-transport` (built 2026-04-25) | `built` | `true` | **missing/null** |
| `site-jj-ba-transport2` | `built` | `true` | **missing/null** |
| `site-the-daily-grind-in-atlanta` | `built` | `true` | **missing/null** |

No live site flips `design_brief.approved → true` after a successful build. The result is that **every chat message sent to a fully-built site gets misclassified as `new_site`**:

```
[classifier] intent=new_site confidence=HIGH (no approved brief)
[classify] "Change the hero headline to "Welcome to Tony's"..." → new_site
[classifier] intent=new_site confidence=HIGH (no approved brief)
[classify] "deploy to staging..." → new_site
[classifier] intent=new_site confidence=HIGH (no approved brief)
[classify] "restyle the home page with a darker moody palette..." → new_site
```

Because every UI button (`Rebuild`, `→ Staging`, `→ Production`) sends its action as a chat message, **all post-build interactions in the chat lane are blocked by this single bug**. Only the Shay Desk path (which uses `confirm_build_request`, bypassing `classifyRequest`) still works for builds.

### Failure-cause hypothesis (no fix attempted)

The Shay confirm path (`handleShayBuildConfirmation` → `synthesizeDesignBriefForBuild` → `triggerSiteBuild`) writes `design_brief` to the spec, but neither the synthesis step nor the post-build step sets `design_brief.approved = true`. Pre-P0.3 the autonomous build path may have set it (or there may be a UI "Approve brief" button that operators used to click). Either way, the post-Shay-confirm flow has no path that flips the flag, so the classifier's `hasBrief` permanently reads `false`.

**Recommended fix scope** (for the operator to scope as P0.4 or hotfix):
- Set `spec.design_brief.approved = true` either at the end of `synthesizeDesignBriefForBuild` (at the point Shay confirms the brief is acceptable for build) or at successful build completion in `runAutonomousBuild`/`triggerSiteBuild`.
- Add a smoke step or assertion: after a Shay-confirmed build, `spec.design_brief.approved === true` must hold.
- Backfill: a one-shot migration to set `approved = true` for any site with `state === 'built'` and a non-empty `design_brief`. (Aligns with the spec-repair pattern already in `scripts/spec-repair-all`.)

---

## Gate 1 — Smoke suite (Prompt A): **FAIL** at Step 6

### Pass-by-pass (Prompt A only — Prompt B follow-up not run since Prompt A failed before completion)

#### Step 1 — Open Studio: **PASS**
- Navigated to `http://localhost:3334`. Page title `Studio — site-jj-ba-transport2` loaded; sidebar, top bar, all rail items present.
- Console errors: 4, all non-fatal (favicon 404, three preview-side asset 404s for `assets/fam-shapes.css`, `assets/fam-motion.js`, `assets/fam-scroll.js` — these belong to the previously-active site's preview, not Studio itself).

#### Step 2 — Submit Prompt A via Shay Desk: **PASS**
- Clicked Shay-Shay Desk rail; pasted the canonical Prompt A; clicked "Ask Shay".
- Shay returned an explicit confirmation prompt with brief preview:
  ```
  Ready to build "Tony's Barber Shop".
    Tag: site-tonys-barber-shop
    Pages: home, services, contact
    Tier: famtastic
    Extraction: proper_noun
  Reply "yes" / "build it" / "proceed" to start the build, or "cancel" to discard.
  (Pending confirmation expires in 5 minutes.)
  ```
- All four expected fields (tag, pages, tier, extraction method) match the canonical expected values.

#### Step 2b — Confirm the build: **PASS**
- Sent `yes` via `#shay-desk-input`.
- TAG switched automatically (page title changed to `Site Studio — site-tonys-barber-shop`).
- `[createSite] Created and switched to new site: site-tonys-barber-shop` in `/tmp/studio.log`.

#### Step 3 — Site directory: **PASS**
- `sites/site-tonys-barber-shop/` exists; `spec.json`, `dist/`, `.studio.json` present immediately after confirmation.
- `~/.config/famtastic/.last-site` contains `site-tonys-barber-shop`.

#### Step 4 — `spec.json` schema: **PASS**
- `./scripts/smoke-validate-all-specs site-tonys-barber-shop` → `Sites failed: 0`, `Sites with warnings: 0`, exit 0.
- All required fields present and typed correctly: `tag`, `site_name`, `business_type`, `state`, `tier: "famtastic"`, `famtastic_mode: true`, `created_at` (ISO-8601, this run), `interview_completed: true`, `interview_pending: false`, `client_brief` (full), `pages: ["home", "services", "contact"]`, `design_brief` populated.

#### Step 5 — Preview loads: **PASS**
- Build elapsed ~5 minutes (`Site built! 3 pages in 267s`).
- All four expected files present:
  - `dist/index.html`, `dist/services.html`, `dist/contact.html`, `dist/_template.html`
  - `dist/assets/styles.css`
  - `dist/assets/logo-full.svg`, `dist/assets/logo-icon.svg`, `dist/assets/logo-wordmark.svg` (multi-part logo emitted)
- `curl -sI http://localhost:3333/{index,services,contact}.html` → all `HTTP/1.1 200 OK`.
- `grep -c data-logo-v dist/index.html` → `1` (single `data-logo-v` anchor; P0.2 fix holds on this fresh build).
- Nav `href` set in index: `index.html`, `services.html`, `contact.html` (all three present).
- Screenshot: `.playwright-mcp/gate1-step6-misclassify.png` (captured at the Step 6 failure point; preview iframe renders the full Tony's hero, nav, and "Book Your Cut" CTA correctly).

#### Step 6 — Content edit through chat: **FAIL**
- Sent `Change the hero headline to "Welcome to Tony's"` via `#chat-input` (chat panel was correctly switched to via the "Go To Build Chat" button after Step 5).
- Expected: classifier routes to `content_update`, surgical edit applies, `mutations.jsonl` gets a new entry, no `parallelBuild`.
- **Actual:** classifier returned `new_site`. Studio responded with a fresh Design Brief preview asking the user to "✓ Build from this brief / Skip", and even folded the user's edit instruction into the synthesised brief's `Avoid` list (`generic headline copy that doesn't reflect the updated 'Welcome to Tony's' brand voice`).
- `mutations.jsonl` was never created (`tail: …/mutations.jsonl: No such file or directory`).
- `dist/index.html` hero still reads `Bold Cuts.<br>Confident Style.` — the original. No edit applied.
- Trace:
  ```
  [classifier] intent=new_site confidence=HIGH (no approved brief)
  [classify] "Change the hero headline to "Welcome to Tony's"..." → new_site
  ```
- **Root cause:** `spec.design_brief.approved === false` after Shay-confirmed build. See "Headline finding" above.
- **Adjacent issue surfaced during Step 6 wait:** `[fatal] uncaughtException: Error: spawn gh ENOENT` in `/tmp/studio.log`. The post-build push step expected `gh` CLI in PATH but it isn't installed. Studio crashed and was respawned by the `while true` shell loop — the build completed, but the launchd-supervised process took an unscheduled exit. Not blocking smoke completion (other than the symptom of a noisy log), but worth filing.

#### Step 7 — Edit-without-rebuild verification: **FAIL** (cascades from Step 6)
- No surgical path was reached (`tryDeterministicHandler`, `STRUCTURAL_HINTS` — neither shows in log for this turn).

#### Step 8 — Click Deploy: **FAIL** (silent no-op via the same regression)
- Clicked **Deploy** rail → **→ Staging** button.
- `deployToStaging()` (defined in `public/index.html:1724`) sends `"deploy to staging"` as a WebSocket chat message — it does **not** call the deploy API directly.
- Classifier routed `deploy to staging` to `new_site` (same `(no approved brief)` reason). Studio surfaced a Design Brief modal — exactly the same UI it surfaced in Step 6.
- **No structured failure reason, no chat message containing `cli_missing` / `credentials_missing` / `config_unreadable`.** Per the smoke-suite Step 8 rules (Path B requires a structured `reason`), a generic Design Brief modal is **fail**.
- This is independently broken by the deploy button's chat-message dispatch — even if `design_brief.approved` were `true`, the only post-classify deploy path is `lower.match(/\bdeploy\b/) && !lower.match(/\bhow\s+to\s+deploy\b/) → 'deploy'` (server.js:11459). That would route correctly. So fixing `approved` alone is enough to recover Step 8.

#### Step 9 — Deployed URL matches local: **SKIPPED** (Step 8 failed)

#### Prompt B follow-up: **NOT RUN**
- Prompt A failed before Step 6, so Prompt B was not run. With the regression diagnosed, Prompt B's expected outcome on Steps 1–4 is identical to Prompt A's; the type+location synthesis path itself is not in question — only the post-build classifier is.

### Evidence files

- `architecture/2026-04-27-p0-exit-gate-results.md` (this report)
- `gate1-step6-misclassify.png` (full-page screenshot at Step 6 failure)
- `/tmp/studio.log` (live log; relevant `[classify]` and `[classifier]` lines quoted above)
- `sites/site-tonys-barber-shop/spec.json` (`design_brief.approved: false` confirms the gate)

---

## Gate 2 — JJ B&A rebuild + visual distinctiveness: **FAIL** (operator distinctiveness call deferred)

### Sub-conditions on the *existing* JJ B&A dist (last built 2026-04-25, pre-P0.2 fix)

| Sub-check | Result | Detail |
|-----------|--------|--------|
| (a) Header links resolve | ✅ PASS | All three `href`s present: `index.html`, `services.html`, `contact.html` |
| (b) No duplicate `<a data-logo-v>` anchors | ❌ **FAIL** on existing dist | Two anchors present — one clean (`<a href="index.html" class="logo-link" data-logo-v="" aria-label="JJ B&A Transport — Home">`) and one redundant with inline styles (`<a href="index.html" data-logo-v="" class="font-playfair…" style="font-family:var(--font-heading);…">`). This is the original `bug-broken-header-links-2026-04-25` symptom; the build predates the P0.2 dedup/inline-strip fix. |
| (c) CSS variables resolved | ✅ PASS | `:root` block defines all primary/accent/navy/coral/bg/font/shadow/radius vars; no `var(--x, fallback)` lookups in the built CSS. |

### Fresh rebuild attempt: **BLOCKED**

The Rebuild button (`public/index.html:1345 rebuildSite()`) sends `"Rebuild the site"` as a chat WebSocket message. The classifier returns `new_site` for the same `design_brief.approved` reason. A Shay-Desk-driven rebuild *would* work via `confirm_build_request`, but the stated Gate 2 call path is "Rebuild site-jj-ba-transport from current spec.json" (the rebuild affordance, not a fresh build) — that affordance is currently broken.

**Net Gate 2 outcome:** the P0.2 `applyLogoV` `/gi` + dedup + inline-strip fix could not be empirically verified against a JJ B&A rebuild. (It *did* hold on the Tony's fresh build — `grep -c data-logo-v dist/index.html → 1`, which is the strongest evidence available right now that the fix works on a brand-new run.)

### Visual distinctiveness — operator judgment

Per gate rules, presenting the data only:

| Site | Primary palette (read from `dist/assets/styles.css :root`) | Vertical |
|------|------------------------------------------------------------|----------|
| `site-jj-ba-transport` | teal `#00A79D`, gold `#F5B800`, navy `#001F3F`, coral `#FF6B6B`, bg cream `#FDF4E3` | shipping/transport |
| `site-tonys-barber-shop` | (built today; full `:root` not extracted into this report — preview screenshot shows blue/yellow nav with gold CTA on a navy hero) | barber shop |
| `site-the-daily-grind` (most recent church/coffee build before today) | not extracted in this run |
| `site-small-accounting-firm` | not extracted in this run |

I deliberately did not pass/fail this check. **Operator (Fritz) makes the distinctiveness call.** A focused side-by-side palette extraction across all four sites is a 5-minute follow-up if needed; flag it and I'll pull the data.

---

## Gate 3 — EADDRINUSE 50-cycle: **PASS**

### Prerequisite check

| Check | Result |
|-------|--------|
| `launchctl list \| grep famtastic` (post-cleanup) | `15175 0 com.famtastic.studio` (clean exit, normal supervision) |
| Plist `ThrottleInterval` | `<integer>30</integer>` ✅ |
| `/api/health` before run | `{"status":"ok","uptime":7.78,"timestamp":"…"}` ✅ |

### Run

`./scripts/smoke-eaddrinuse-50` (50 cycles, default).

```
[smoke-eaddrinuse-50] target cycles: 50
[smoke-eaddrinuse-50] starting at 2026-04-27 12:31:50
[cycle 1/50] OK (uptime=…)
…
[cycle 50/50] OK (uptime=0.432274834s)
[smoke-eaddrinuse-50] completed at 2026-04-27 12:57:01
[smoke-eaddrinuse-50] PASS — 50 consecutive cycles
```

- **Total runtime:** ~25 minutes (≈30 s/cycle, dominated by ThrottleInterval=30).
- **Cycles passed:** 50/50.
- **Aborts / port-bound errors:** 0.
- **Sample uptime values per cycle:** 0.398–0.567 seconds — all well under the `uptime < 30` threshold (no stale-instance hits).
- **Exit code:** 0.

This is the strongest single piece of evidence in the run. The P0.3 fix to `ThrottleInterval` + clean restart cadence holds under the canonical stress test.

---

## Gate 4 — Restyle test: **FAIL (silent no-op)**

- Sent `restyle the home page with a darker moody palette` via WebSocket chat (`ws.send({type:'chat', content: …})`).
- Trace:
  ```
  [classifier] intent=new_site confidence=HIGH (no approved brief)
  [classify] "restyle the home page with a darker moody palette..." → new_site
  ```
- (a) Did the request classify as `restyle`? — **No**, it classified as `new_site`.
- (b) Did `modeInstruction` switch hit `case 'restyle'` (added in P0.3)? — **No**, never reached; classifier short-circuited at the `hasBrief` gate first.
- (c) Did Claude produce a restyle-shaped edit? — **No.**
- (d) Or did it return a clear "not implemented" message? — **No.** Studio surfaced a generic Design Brief modal (same as Steps 6 and 8) prompting to start a *new* build. By the gate's pass criteria ("either (b)+(c) actually works, OR clear 'not implemented' message — NOT silent no-op"), this is a **fail**.

The P0.3 `modeInstruction` switch case for `restyle` cannot be exercised at all until the `design_brief.approved` regression is closed.

---

## Gate 5 — Schema validation: **PASS**

- `./scripts/smoke-validate-all-specs` → exit 0, "all specs valid" portfolio-wide.
- Warnings (informational, not failures): legacy specs with `state: prototype` / `state: draft`, and several legacy `tech_recommendations` arrays where the schema expects an object.
- Re-confirmed at gate run.

---

## Other issues raised by this gate run

1. **`gh` ENOENT crash during post-build push.** `/tmp/studio.log` shows `[fatal] uncaughtException: Error: spawn gh ENOENT` after the Tony's build completed. The post-build production-repo push expects the GitHub CLI in PATH; on this machine it isn't installed. Studio crashed and was respawned by the shell-loop wrapper. Two options: (a) add a `which gh` preflight that downgrades the push to a no-op with a structured chat message, or (b) document `gh` as a hard prereq.

2. **One Imagen-4 safety-filter rejection** for `service-kids-cut.jpg` — automatic fallback to Unsplash succeeded. Not a gate failure, but worth noting that the prompt template (`kids cut service photograph for A bold and business`) is partially malformed because `business_type` extracted as `"A bold and"` (truncated). The brief-extraction step truncated `business_type` mid-phrase; review `synthesizeDesignBriefForBuild`/the brief-extractor's `business_type` field handling.

3. **All UI buttons that should call deploy/build APIs go through the chat classifier.** `rebuildSite()`, `deployToStaging()`, `deployToProduction()` all post a chat message. This is fragile in two ways:
   - Any classifier change (like today's regression) silently breaks every button.
   - The buttons are not idempotent — clicking Deploy posts a chat *message* rather than calling a structured action.

   Consider giving these buttons direct API endpoints (`POST /api/deploy`, `POST /api/rebuild`) and reserving the classifier strictly for free-form chat input. This would also have cleanly produced the "structured Path B reason" the smoke-suite Step 8 expects.

4. **Stale-process supervision drift (carried from prior report).** Confirmed during runtime cleanup that `launchctl unload && load` does not displace pre-existing `while true; do node server.js` shell wrappers — the operator had to `pkill -f` them manually. This will recur every time the operator changes the plist; either embed the `pkill` in the plist's `RunAtLoad` script or document it next to the plist comments.

---

## Final outcome

- **P0 exit gates: NOT FULLY PASSED.**
- One root-cause regression (`design_brief.approved` never set after a Shay-confirmed build) is responsible for the failures of Gates 1, 2, and 4. P0.3's stated wins (Shay confirmation flow, `restyle` `modeInstruction` switch case, Studio UX restyles, EADDRINUSE crash-loop fix) all individually shipped — but the brief-approval handoff between the new Shay confirm path and the existing classifier was not wired up, and that breaks the entire post-build chat lane.
- **Gate 3 PASS is genuinely good news** — the EADDRINUSE crash loop is closed, robustly, under stress.
- **Gate 5 PASS** is unchanged from the earlier dry run.

**Recommendation:** treat this as a P0.4 hotfix (`design_brief.approved` flip + a smoke-step assertion + a one-shot backfill) rather than reopening P0.3. After the hotfix lands, re-run Gates 1, 2, and 4 only — Gates 3 and 5 do not need to be re-run.

No code changes were made by this session.
