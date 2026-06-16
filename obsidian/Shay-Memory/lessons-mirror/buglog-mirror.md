---
title: Buglog Lessons (mirrored for Shay)
synced: 2026-06-16T12:46:57.330494
source: .wolf/buglog.json
tags: [buglog, lessons, mirror]
---

# Buglog — last 30 lessons (mirrored into Shay's vault)

## #bug-site6-001 ()
**Issue:** ReferenceError: page is not defined at parallelBuild (server.js:7180)
**Root cause:** siteContext template literal in parallelBuild() referenced undefined variable page in an IIFE. Variable only defined per-page inside spawnPage(), not at function scope.
**Fix:** Replaced the IIFE with one that returns empty string since per-page content fields are injected inside spawnPage().
**Tags:** ['parallel-build', 'server-crash', 'template-literal']

## #bug-site6-002 ()
**Issue:** ENOENT: no such file or directory, open .../dist/contact/booking-form.html
**Root cause:** parallelBuild uses spec.design_brief.must_have_sections as page names when spec.pages missing. Strings with slashes produce invalid file paths.
**Fix:** Added sanitization to strip parens/slashes in page filename normalization. Added spec.pages to take precedence.
**Tags:** ['parallel-build', 'file-path', 'page-normalization']

## #bug-site6-003 ()
**Issue:** parallelBuild fails when ANTHROPIC_API_KEY not set
**Root cause:** parallelBuild used getAnthropicClient() SDK with no subprocess fallback, unlike handleChatMessage single-page path.
**Fix:** Added subprocess fallback via spawnClaude() in both template build and per-page builds when hasAnthropicKey() is false.
**Tags:** ['parallel-build', 'subprocess-fallback', 'api-key']

## #bug-autonomous-001 (2026-04-20T12:52:19.226753Z)
**Issue:** spec.state never transitions from briefed to built after autonomous build
**Root cause:** finishParallelBuild() runs post-processing, verification, and DNA updates but never writes spec.state = "built". The only state transitions in the codebase were new/briefed/deployed — built was missing.
**Fix:** Added spec.state = "built" write in finishParallelBuild() after setBuildInProgress(false), using readSpec/writeSpec pattern with try/catch
**Tags:** ['autonomous-build', 'spec-state', 'finishParallelBuild']

## #bug-autonomous-002 (2026-04-20T12:52:19.226839Z)
**Issue:** Third sequential subprocess page (contact.html) silently dropped — returned empty response
**Root cause:** spawnAllPages() subprocess path runs pages sequentially via spawnClaude(). After 2 successful calls, the third claude --print subprocess returned empty output (likely rate limiting or transient failure). The empty response was silently marked rejected and finishParallelBuild was called with only 2/3 pages. No retry logic existed.
**Fix:** Added one retry pass after the initial sequential loop: collects all failed pages (response.length <= 50), re-spawns each once, updates pageResults[i] on success before processing phase.
**Tags:** ['autonomous-build', 'subprocess', 'subprocess-retry', 'spawnAllPages']

## #bug-gap1-palette-default (2026-04-24T00:00:00.000Z)
**Issue:** Sites built with no client-specified hex colors received generic industry palette instead of FAMtastic defaults
**Root cause:** visualRequirements block only injected colors found in decisions[], visual_direction, or userMessage. When all three sources were empty, visualRequirements stayed '' and no palette guidance reached Claude. Claude defaulted to vertical-inference colors (e.g. accounting blue/gray instead of FAMtastic aquamarine/gold).
**Fix:** Added else branch: when colorHexes is empty, inject FAMTASTIC_DEFAULT_PALETTE from famtastic-skeletons.js as 'FAMTASTIC DEFAULT PALETTE — you MUST use these exact hex values' block. All five defaults (#00A79D, #F5B800, #001F3F, #FF6B6B, #FDF4E3) appear as CSS custom properties. Verified live: accounting firm built with zero brief colors, all five --color-* properties in output.
**Tags:** ['build-layer', 'palette', 'gap-1', 'r-new-audit', '2026-04-24']

## #bug-gap2-hero-skeleton-dead-variable (2026-04-24T00:00:00.000Z)
**Issue:** heroSkeleton returned by buildPromptContext() was silently discarded — never injected into single-page build prompt
**Root cause:** buildPromptContext() returned heroSkeleton in its return object (L11332). handleChatMessage() destructured the return but did not include heroSkeleton in the destructure list. The variable was never referenced. Single-page build and layout_update prompts received no MANDATORY HERO STRUCTURE block with BEM double-dash layer names. Parallel build path was unaffected (injected heroSkeleton directly via famSkeletonBlock).
**Fix:** Added heroSkeleton and navSkeleton to handleChatMessage() destructure. Injected heroSkeleton conditionally (build/layout_update only) and navSkeleton unconditionally into the prompt string between _slotStabilityInstruction and briefContext. Verified live: hero headline edit preserved all four fam-hero-layer--* double-dash class names with zero single-dash regressions.
**Tags:** ['build-layer', 'hero-skeleton', 'gap-2', 'dead-variable', 'r-new-audit', '2026-04-24']

## #bug-gap3-nav-skeleton-dead-variable (2026-04-24T00:00:00.000Z)
**Issue:** navSkeleton returned by buildPromptContext() was silently discarded — never injected into single-page build prompt
**Root cause:** Same root cause as GAP-2: navSkeleton was in buildPromptContext() return but not in handleChatMessage() destructure. Single-page prompts received no MANDATORY NAV CLASS NAMES block, so nav edits could produce arbitrary class names (desktop-nav, mobile-nav-toggle, hamburger) instead of mandated vocabulary (.nav-links, .nav-toggle-label, .nav-mobile-menu, #nav-toggle, .nav-cta). Parallel build path was unaffected.
**Fix:** Covered by same fix as GAP-2. navSkeleton now injected unconditionally (all request types) into single-page prompt. Verified live: nav 'add Team page link' request on site built after fix preserved all five mandated class names with zero drift.
**Tags:** ['build-layer', 'nav-skeleton', 'gap-3', 'dead-variable', 'r-new-audit', '2026-04-24']

## #bug-jjba-rnew-audit-2026-04-24 (2026-04-24T20:00:00.000Z)
**Issue:** JJ Barbershop B&A site failed FAMtastic visual standard — generic industry palette, no FAMtastic default, missing nav skeleton + multi-part logo
**Root cause:** Four R-NEW build-layer gaps stacked. GAP-1: buildPromptContext() did not inject the FAMtastic default palette when no client colors were specified, so Claude fell back to vertical-generic colors. GAP-2/3: heroSkeleton and navSkeleton were dead variables on the single-page path — destructured but never included in the prompt string. GAP-4: spec.famtastic_mode was a tacit toggle never set by code, gating the multi-part logo emission and LOGO_SKELETON_TEMPLATE off for every new site by default.
**Fix:** GAP-1/2/3 closed in commit 8536a4a (2026-04-24): visualRequirements injects FAMTASTIC_DEFAULT_PALETTE; heroSkeleton/navSkeleton inserted into the single-page prompt with appropriate gating. GAP-4 closed in commit 2c5e358 (2026-04-24) by promoting spec.tier to canonical and deriving famtastic_mode from it via normalizeTierAndMode() on every readSpec. Lib modules: site-studio/lib/tier.js, site-studio/lib/tier-gates.js. 28 new tests in tests/gap4-tier-canonicality.test.js.
**Tags:** ['build-layer', 'r-new-audit', 'famtastic-default-palette', 'hero-skeleton', 'nav-skeleton', 'famtastic-mode', 'tier-canonical', '2026-04-24']

## #bug-baseline-2026-04-25 (2026-04-25T01:00:00.000Z)
**Issue:** Baseline test FAILED: Shay Desk church prompt did not create a new site. Studio Chat appeared to update site-small-accounting-firm and triggered an index.html rewrite (179s). Browser console errors observed.
**Root cause:** Six stacked sub-gaps. (1) Shay Desk's classifyShayShayTier0 matched 'build_request' but routed via 'route_to_chat' which forwards the message to Studio Chat as a plain user input — there is no new-site flag in the payload. (2) Studio Chat's classifyRequest had a hijack at L10788 — '\bdeploy\b' matched the prompt's trailing 'deploy it so I can see it live' and returned 'deploy' before the !hasBrief fallback at L10802 could fire. (3) Studio Chat's strong-build-signals regex required exact 'build [a/the] [full] website for' word order and missed 'build me a 3-page website for' — Shay Desk's equivalent regex had the .{0,30} flexibility and matched, so the same prompt classified differently between the two layers. (4) handlePlanning was a brief-editor-only function — it could not create a new site directory and would have written a church brief into site-small-accounting-firm/spec.json had it run. (5) extractBriefFromMessage silently fell back to business_name='New Business' / tag='site-new-site' for any input it could not parse, hiding the real problem. (6) runAutonomousBuild dispatched the build via routeToHandler BEFORE checking if any WS clients were connected — orphaned builds with no observer.
**Fix:** Three workstream commits implemented the V9 closure plan. WS2 (a690ce4): canonical createSite(brief, options) helper with caller-owned auth, helper-owned TAG switch, three on_collision modes gated by same-business identity comparison; classifier reorder — new_site_create above strong-build-signals, !hasBrief above deploy keyword; extractBriefFromMessage hardened to return insufficient_identity instead of silent fallback; type+location synthesis (e.g. site-church-atlanta-ga); /api/new-site and runAutonomousBuild refactored onto the helper; Studio Chat new_site_create case added. WS1 (8ef7411): handleShayBuildRequest async chain (auth → extract → createSite → synthesize → triggerSiteBuild) with shay_response replacing route_to_chat. WS3 (35d73b9): triggerSiteBuild gates on WS clients before dispatch. New test file: tests/baseline-closure.test.js (23 tests). Verification: 28/28 scenarios PASS in architecture/2026-04-25-baseline-closure-verification.md.
**Tags:** ['baseline', 'shay-desk', 'classifier', 'deploy-keyword-hijack', 'createsite', 'site-creation-contract', 'v9-closure', '2026-04-25']

## #bug-shay-auto-build-no-confirmation-2026-04-25 (2026-04-25T02:00:00.000Z)
**Issue:** Shay Desk auto-fires the build immediately after createSite succeeds — user has no opportunity to confirm the extracted brief, the suggested tag, or the synthesized design_brief before parallelBuild runs.
**Root cause:** handleShayBuildRequest implemented the V9 spec literally: auth → extract → createSite → synthesizeDesignBriefForBuild → triggerSiteBuild, with triggerSiteBuild calling routeToHandler synchronously inside the same chain. There is no human-in-the-loop checkpoint between extraction and build dispatch. The V9 spec did not require one; it became visible only after live testing against the corrected baseline.
**Fix:** CLOSED 2026-04-27 in P0.3. Approach (a) implemented: introduced 'confirm_build_request' / 'cancel_build_request' Shay tier-0 intents. handleShayBuildRequest now extracts brief and stores in pendingBuildConfirmations Map (5-min TTL, single 'shay-default' key for single-user system). User sees a preview of the extracted brief + pages + tier and must reply yes/build it/proceed (or cancel) to trigger the deferred build. New handleShayBuildConfirmation function runs createSite → synthesize → triggerSiteBuild only on confirm. Re-checks auth at confirmation time (defence-in-depth). hasPendingBuildConfirmation gates the tier-0 yes/cancel patterns so a bare 'yes' outside the build flow doesn't get hijacked.
**Tags:** ['ux', 'shay-desk', 'build-trigger', 'post-baseline-finding', '2026-04-25', 'closed-p0.3']

## #bug-eaddrinuse-crash-loop-2026-04-27 (2026-04-27T11:35:00.000Z)
**Issue:** Studio in continuous launchd-driven crash loop. /tmp/studio.log shows recurring [fatal] uncaughtException: Error: listen EADDRINUSE on ports 3333 and 3334. Studio fully unavailable during the loop window (~60 cycles before TIME_WAIT clears).
**Root cause:** P0.1 diagnostic Thread 7. Plist ThrottleInterval=2 (seconds) was far too short for macOS TCP TIME_WAIT period (typically 30-60s). When Studio crashed for any reason, launchd auto-restarted after 2s, the new bind failed because the previous instance's port was still in TIME_WAIT, the new process crashed, launchd waited 2s, restarted, etc. Self-perpetuating loop.
**Fix:** CLOSED 2026-04-27 in P0.3 (subject to operator reload). Three changes: (1) Plist ThrottleInterval raised from 2 to 30 seconds (live ~/Library/LaunchAgents/ copy and tracked template at site-studio/launchd/com.famtastic.studio.plist). (2) server.on('error') and previewServer.on('error') handlers added to convert raw EADDRINUSE uncaughtException into a single-line operator-actionable message and clean exit(1) so launchd restart cycle is deterministic. (3) NEW scripts/smoke-eaddrinuse-50 wrapper implements the smoke-suite contract: stops studio, probes ports, restarts via launchd, polls /api/health, verifies fresh uptime, repeats N cycles. P0 exit gate #3 verification. Operator MUST reload launchd to pick up new plist: launchctl unload ~/Library/LaunchAgents/com.famtastic.studio.plist && launchctl load ~/Library/LaunchAgents/com.famtastic.studio.plist.
**Tags:** ['studio-uptime', 'launchd', 'eaddrinuse', 'throttle-interval', 'p0-exit-gate-3', '2026-04-27', 'closed-p0.3']

## #bug-preview-stale-on-site-switch-2026-04-27 (2026-04-27T11:35:00.000Z)
**Issue:** Preview iframe shows 'Not found' or stale content after switching sites via the site picker, even though new site dist/ exists.
**Root cause:** P0.1 diagnostic Thread 5. Server side correctly re-evaluates DIST_DIR() per request (live TAG mutation propagates). The bug was browser-side: iframe.src = sameUrl is a no-op in many browser engines. Session 17 stripped query strings to fix preview server lookups; that fix removed the cache-busting effect that previously forced reload.
**Fix:** CLOSED 2026-04-27 in P0.3. handleSiteSwitch in public/index.html now sets preview-frame.src to buildPreviewUrl(currentPage) + '?_switch=' + Date.now() — preview server's existing query-string strip (server.js:18040 urlPath = req.url.split('?')[0]) handles the buster cleanly so no 404. Site switches now force a fresh fetch of the new TAG's dist content.
**Tags:** ['preview', 'site-switch', 'iframe', 'cache-buster', '2026-04-27', 'closed-p0.3']

## #bug-design-brief-approved-never-set-2026-04-27 (2026-04-27T13:00:00.000Z)
**Issue:** After a successful Shay-confirmed build, spec.design_brief.approved stays false (or undefined). Every subsequent chat message hits the classifier's hasBrief gate at server.js:11308 and falls through to new_site, blocking content edits, deploys, and restyle. Caused P0 exit gates 1, 2, and 4 to fail.
**Root cause:** P0 exit gate diagnostic at architecture/2026-04-27-p0-exit-gate-results.md. P0.3 introduced the Shay confirm flow (handleShayBuildRequest → pending → handleShayBuildConfirmation → synthesizeDesignBriefForBuild → triggerSiteBuild). synthesizeDesignBriefForBuild constructed the design_brief object but never set approved=true. The pre-P0.3 autonomous-build path also never set it. So every site ever built ended up with approved=false (or undefined), and the chat classifier's hasBrief gate became permanently false post-build.
**Fix:** CLOSED 2026-04-27 in P0.4 hotfix. Three changes: (1) synthesizeDesignBriefForBuild now sets approved=true at synthesis time (Path A: new brief gets approved=true in the synthesised object; Path B: existing brief gets approved=true via flip if not already set). Confirmation IS the approval. (2) NEW scripts/smoke-assert-built-spec asserts the post-build invariants (state in {built, deployed, client_approved}, design_brief.approved===true, interview_completed===true, non-empty pages). (3) Migration: scripts/spec-repair-all extended to backfill design_brief.approved=true for built/deployed/client_approved sites with interview_completed=true. Migration ran: 7 sites backfilled.
**Tags:** ['classifier', 'design-brief', 'approved-flag', 'post-build-regression', 'p0-exit-gate-blocker', '2026-04-27', 'closed-p0.4']

## #bug-gh-enoent-post-build-2026-04-27 (2026-04-27T13:00:00.000Z)
**Issue:** [fatal] uncaughtException: Error: spawn gh ENOENT after successful build. Studio crashes (respawned by while-true wrapper); build itself completes but the launchd-supervised process takes an unscheduled exit and the post-build push step is silently dropped.
**Root cause:** P0 exit gate run surfaced this. The post-build production-repo push expects the GitHub CLI (gh) in PATH. On the current machine gh is not installed. The spawn call has no preflight check or graceful fallback — the ENOENT bubbles to uncaughtException.
**Fix:** DEFERRED — log only per P0.4 scope. Two candidate approaches: (a) preflight check at startup (which gh) that downgrades the post-build push to a no-op with a structured chat message when gh is missing, (b) document gh as a hard prereq in setup. Option (a) preferred — keeps Studio operable on machines without gh. Severity: medium (Studio recovers via respawn but post-build push is silently dropped).
**Tags:** ['post-build', 'git-cli', 'spawn-enoent', 'deferred', 'medium-severity', '2026-04-27']

## #bug-business-type-truncation-2026-04-27 (2026-04-27T13:00:00.000Z)
**Issue:** business_type extracted from the brief gets truncated mid-phrase, e.g. 'A bold and' instead of 'A bold and confident barber shop'. Surfaced via image-prompt template that read 'kids cut service photograph for A bold and business' which Imagen-4 safety-filtered.
**Root cause:** P0 exit gate run surfaced this. The brief extractor or synthesisDesignBriefForBuild truncates business_type to the first three space-separated words (or similar). When the business description starts with a leading adjective phrase ('A bold and confident barber shop'), the truncation lops off the actual business noun, leaving a fragment that's syntactically incomplete.
**Fix:** DEFERRED — log only per P0.4 scope. Likely lives in createSite at server.js (when business_type is derived from business_description.split(' ').slice(0, 3).join(' ')). Fix would either: (a) skip leading articles/adjectives before slicing, or (b) require the noun phrase to include a recognisable business-type word from GENERIC_BUSINESS_TYPES. Severity: low (safety filter recovers via Unsplash fallback; image still produced).
**Tags:** ['brief-extraction', 'business-type', 'truncation', 'imagen-safety', 'deferred', 'low-severity', '2026-04-27']

## #bug-restyle-dead-mode-instruction-2026-04-27 (2026-04-27T11:35:00.000Z)
**Issue:** Restyle classification fires correctly (classifier returns 'restyle', routing sends to handleChatMessage) but the resulting Claude prompt has no restyle-specific instruction. Output is generic, indistinguishable from a vague edit.
**Root cause:** P0.1 diagnostic Thread 8. Session 13 partially fixed restyle: added htmlContext branch (correct HTML to Claude) and routing fix (case 'restyle' in routeToHandler dispatches to handleChatMessage). But Session 13 never added a corresponding case 'restyle' to the modeInstruction switch in handleChatMessage. So Claude saw the right HTML but a generic 'Process the user request and update the site accordingly' default instruction.
**Fix:** CLOSED 2026-04-27 in P0.3. Added case 'restyle' to the modeInstruction switch with explicit instruction: 'Change visual design (colors, fonts, layout, motion, decorative shapes) while preserving all content (headings, body copy, links, images, structure). Do NOT rewrite copy. Do NOT add or remove sections. Do NOT change navigation or CTAs. Honor FAMtastic Tier B identity unless brief says otherwise. Return COMPLETE updated page as HTML_UPDATE: — not a diff.'
**Tags:** ['classifier', 'restyle', 'mode-instruction', 'session-13-incomplete-fix', '2026-04-27', 'closed-p0.3']

## #bug-broken-header-links-2026-04-25 (2026-04-25T02:30:00.000Z)
**Issue:** Generated site has 'broken' header — duplicate logo region (image anchor + redundant text anchor) with inline styles. Visually broken, two clickable brand links.
**Root cause:** P0.1 diagnostic Thread 3 confirmed: applyLogoV used regex /i (case-insensitive, single match). When Claude emitted two <a data-logo-v> elements (image-form and text-form, despite prompt instruction otherwise), only the first was normalised. The second kept Claude's original text content and inline styles. Result: image logo + redundant brand-name text anchor on every Tier-B build using FAMtastic logo mode.
**Fix:** CLOSED 2026-04-27 in P0.2 (commit pending). Rewrote applyLogoV with normalizeLogoMarkup() helper: (A) regex /gi swaps content of every data-logo-v anchor to canonical newContent, (B) dedup pass keeps only the first data-logo-v anchor and removes the rest, (C) strips inline style="..." attribute from any surviving data-logo-v anchor. Applied to both _partials/_nav.html and per-page HTML.
**Tags:** ['build-output', 'nav', 'broken-links', 'applylogov', 'post-baseline-finding', '2026-04-25', 'closed-p0.2']

## #bug-css-vars-dual-default-2026-04-27 (2026-04-27T11:00:00.000Z)
**Issue:** Two different default palettes coexist; sites built minutes apart can render with #00A79D (FAMtastic teal) OR #1a5c2e (legacy dark green) depending on which template path executes.
**Root cause:** P0.1 diagnostic Thread 4. GAP-1 fix on 2026-04-24 added FAMTASTIC_DEFAULT_PALETTE injection at the brief level but did not update the literal :root block embedded in the template prompts. Those blocks hardcoded #1a5c2e/#d4a843/#f0f4f0 from a pre-GAP-1 era. Claude sometimes followed the brief-level palette, sometimes followed the literal :root, producing visible inconsistency.
**Fix:** CLOSED 2026-04-27 in P0.2 (commit pending). Replaced hardcoded fallbacks at L3524 and L12413 with famSkeletons.FAMTASTIC_DEFAULT_PALETTE.{primary,accent,background} references — single source of truth.
**Tags:** ['build-output', 'css-variables', 'palette', 'single-source-of-truth', '2026-04-27', 'closed-p0.2']

## #bug-spec-schema-drift-2026-04-27 (2026-04-27T11:00:00.000Z)
**Issue:** Site spec.json files have drifting key sets across the portfolio. Some sites missing tier (pre-GAP-4), some missing famtastic_mode, some missing created_at, one with tag: null. Implicit schema; no validator at write or read time.
**Root cause:** P0.1 diagnostic Thread 6. No formal schema. Each writer (api/new-site, runAutonomousBuild, build verifier, brand tracker, logo extraction, etc.) added the fields it cared about. Older sites accumulated fields slowly; newer sites got the post-baseline-closure superset. The audit followup at architecture/2026-04-24-schema-audit-followup.md identified colors/pages required-but-not-written; P0.1 diagnostic Thread 6 confirmed and broadened the issue.
**Fix:** CLOSED 2026-04-27 in P0.2 (commit pending). Three changes: (1) NEW lib/spec-schema.js with REQUIRED_FIELDS, DEFAULT_FIELDS, validateSpec(), normalizeRequiredFields(). colors/pages decided as OPTIONAL per the audit followup. (2) Wired normalizeRequiredFields into readSpec next to normalizeTierAndMode (repair-on-read). (3) Two scripts: smoke-validate-all-specs (validator, P0 exit gate #5), spec-repair-all (one-shot migration, idempotent, optional --dry-run). Migration ran across 25 sites; 22 repaired, 3 already valid (post-fix). Validator now exits 0 on full portfolio.
**Tags:** ['schema-drift', 'spec-schema', 'validator', 'migration', 'p0-exit-gate-5', '2026-04-27', 'closed-p0.2']

## #bug-template-sameness-2026-04-27 (2026-04-27T11:00:00.000Z)
**Issue:** Sentinel: every Tier-B site without explicit spec.colors converges to the FAMtastic default palette (#00A79D primary). Two unrelated businesses (e.g. JJ B&A Transport vs Small Accounting Firm) render with identical primaries.
**Root cause:** P0.1 diagnostic Thread 1. GAP-1 fix on 2026-04-24 made FAMTASTIC_DEFAULT_PALETTE a strong default. The fix solved the prior failure mode (sites used a generic industry palette) but introduced its inverse: every Tier-B site without explicit colors converges to the same five colors. The font-registry produces narrow variation. Visual sameness is the structural cost of the FAMtastic identity strong-default approach.
**Fix:** P0.2 sentinel-only. Added scripts/smoke-distinct-palette which exits 1 when two sites' --color-primary match each other AND match the FAMtastic default. Added documentation block at top of FAMTASTIC_DEFAULT_PALETTE pointing to the P1.2 work. Real fix is P1.2 (Visual Distinctiveness): per-site style fingerprint, Global Style Object, design tokens.
**Tags:** ['visual-quality', 'template-sameness', 'sentinel-only', 'p1.2-deferred', '2026-04-27']

## #206 (2026-05-29)
**Issue:** Shay interactive brain 'keeps switching' to Gemini; HTTP 400: You're out of extra usage. Add more at claude.ai/settings/usage
**Root cause:** Claude Max subscription (OAuth via CLAUDE_CODE_OAUTH_TOKEN, the only Anthropic credential present) ran out of usage allowance + extra-usage overflow, so every claude-sonnet/opus call returned 400 'out of extra usage' and Shay's fallback chain (gemini-2.5-flash -> ollama hermes3) activated every turn. NOT an API-vs-subscription switch: same OAuth token worked yesterday with 200s, zero 401 auth errors today. Drain caused by (1) switching default brain to Opus 4 which burns the Max allowance several times faster, and (2) bulk/swarm/batch drivers shelling out `shay -z <prompt>` with no --provider/--model, inheriting config default claude-sonnet-4-6 onto the interactive Max brain. The 'out of extra usage / claude.ai/settings/usage' wording is the subscription overflow message, NOT the console API-credits message (which points to console.anthropic.com/billing).
**Fix:** Routed bulk off the Max brain: research/synthesis/orchestrator/cron -> Gemini (--provider gemini -m gemini-2.5-flash) in overnight_ops.py:313, rerun-cited.py:46, mbsh-swarm-launch.py:45, and 3 no_agent:false cron jobs; raw swarm spawner -> local Ollama (--provider ollama -m hermes3:latest) in launch-agent.py:80; cognee MCP LLM repointed anthropic/claude-sonnet-4-5 -> ollama/hermes3:latest in config.yaml. Hard-gated resolve_anthropic_token() step-4 ANTHROPIC_API_KEY fallback behind SHAY_ALLOW_ANTHROPIC_API_KEY opt-in (legacy OAuth-shaped tokens still allowed via _is_oauth_token) so subscription->API billing can never fire silently. To restore Claude: top up at claude.ai/settings/usage, wait for the Max rolling-window reset, or keep using Gemini. Standing rule: Claude plans+judges only, never bulk.
**Tags:** ['shay', 'brain-routing', 'billing', 'subscription', 'oauth', 'fallback', 'cost', 'anthropic', 'gemini', 'ollama']

## #207 (2026-05-29)
**Issue:** basic-memory mutates hand-authored Obsidian notes when its project points at the live vault — even with ensure_frontmatter_on_sync=false
**Root cause:** Pointed a basic-memory project at the whole vault (~/famtastic/obsidian) to give Shay whole-vault semantic recall. On reindex/init-sync basic-memory rewrote 2 notes: injected a 'permalink: <project>/...' line into frontmatter, stripped the trailing newline, and stripped some trailing whitespace — DESPITE ensure_frontmatter_on_sync:false (that flag does not fully prevent file rewrites). Also: basic-memory hard-refuses nested projects (cannot have a whole-vault project AND a Shay-Memory subfolder project), and its `project default` CLI is buggy (config.json default_project vs an internal DB default desync).
**Fix:** Reverted to a basic-memory project SCOPED to ~/famtastic/obsidian/Shay-Memory ONLY (never touches hand-authored notes). Repaired the 2 mutated files: CAPTURE-2026-05-19-platform-intel.md restored byte-exact (removed permalink line + restored trailing newline); MEDIA-COMPONENT-STUDIO-STATUS-2026-05-29.md restored content-complete (cosmetic trailing-whitespace on a few lines unrecoverable — files are untracked in git, no backup). DO-NOT-REPEAT: never point basic-memory at a vault of notes you don't want rewritten. Whole-vault semantic recall for the agent must come from Smart Connections (Obsidian, on-device) via smart-connections-mcp, NOT basic-memory. Safety protocol that caught it: hash-baseline all *.md before, diff after, revert.
**Tags:** ['basic-memory', 'shay', 'obsidian', 'data-safety', 'mutation', 'do-not-repeat', 'brain']

## #208 (2026-05-29)
**Issue:** Adding a fastembed/onnxruntime-backed stdio MCP server (vault-search) to the Shay gateway intermittently dropped basic-memory with CancelledError on restart
**Root cause:** Built a read-only whole-vault semantic-search MCP server (local FastEmbed bge-small-en-v1.5, 521 chunks, works standalone). When wired as a gateway stdio child, onnxruntime's teardown is slow (~30s; 'Process group termination failed ... Operation not permitted, falling back to simple terminate'), making total gateway teardown ~40s. Rapid restarts during that window caused MCP connect contention → basic-memory connect cancelled (CancelledError), leaving the gateway with '8 tools from 2 servers (1 failed)' and a stale gateway_state.json. Even lazy-importing fastembed didn't fully fix the teardown-time instability.
**Fix:** Removed vault-search from live gateway mcp_servers (commented out, preserved). Gateway restored to stable obsidian + basic-memory (29 tools, no failures, state=running). vault-search remains available standalone (CLI: ~/.shay/tools/vault-semantic-mcp/.venv/bin/python server.py; or import + search_vault). DO-NOT-REPEAT: do not add heavy-ML (onnxruntime/torch) stdio MCP servers directly to the gateway — their slow teardown destabilizes the restart cycle. Re-integrate as a PERSISTENT service the gateway proxies (HTTP), not a per-restart stdio child. Always wait for full ~40s teardown before re-restarting.
**Tags:** ['shay', 'gateway', 'mcp', 'onnxruntime', 'fastembed', 'vault-search', 'do-not-repeat', 'stability']

## #209 (2026-05-29)
**Issue:** RESOLUTION of #208: how to integrate the fastembed/onnxruntime vault-search MCP into the Shay gateway WITHOUT restart instability
**Root cause:** Per #208, spawning vault-search as a gateway stdio child caused ~30s onnxruntime teardown → MCP connect contention on restart. Shay's MCP loader (tools/mcp_tool.py) supports HTTP/StreamableHTTP + SSE transports via a `url:` config field, not only stdio command/args.
**Fix:** Added HTTP transport mode to server.py (VSM_TRANSPORT=http -> mcp.run(transport='http', host, port=8766)). Run it as a SEPARATE background HTTP service; wire the gateway by URL: `vault-search: {url: 'http://127.0.0.1:8766/mcp'}`. The gateway now connects over HTTP and never spawns/kills onnxruntime on restart. Result: stable restart (~6s to running), 35 tools from 3 servers (obsidian 2 + basic-memory 27 + vault-search 6), ZERO failures. CAVEAT: the background process is NOT persistent (dies on reboot/logout) — a launchd plist template is saved at ~/.shay/tools/vault-semantic-mcp/com.famtastic.vault-search.plist.template, but auto-start persistence was blocked by the security classifier (user must install the plist to make it survive reboots). Pattern: heavy-ML MCP servers -> persistent/background HTTP service + url config, never gateway stdio child.
**Tags:** ['shay', 'gateway', 'mcp', 'http', 'vault-search', 'resolution', 'stability', 'fastembed']

## #210 (2026-05-29)
**Issue:** Shay terminal kept defaulting to Gemini fallback even after the bulk-routing fix; root cause was the Claude Code WEEKLY usage cap (not the account being depleted) burned by per-call context bloat + a model=default 404 bug
**Root cause:** Anthropic added rolling WEEKLY usage limits for Claude Code / OAuth-API access in 2025, SEPARATE from claude.ai consumer chat. Shay (spoofing Claude Code via anthropic-beta: claude-code-20250219,oauth-2025-04-20 + Claude Code system-prompt + claude-cli user-agent) draws from the Claude Code bucket. Claude Desktop/web on the same account still worked, proving the account itself is fine. Two causes burned the Claude Code weekly cap: (1) overnight batch+swarm on Claude (fixed earlier — see buglog #206), (2) per-call context bloat avg 55,548 input tokens/call, dominated by a 22,600-token skills snapshot injecting ALL 160 skills' names+descriptions with no cap (agent/prompt_builder.py:988-1219 build_skills_system_prompt) and 35 MCP tool schemas (basic-memory's 27 + vault-search 6 + obsidian 2). Plus a secondary bug at agent/plugin_llm.py:586 where `_read_main_model() or 'default'` sent the literal string 'default' to Anthropic → HTTP 404, triggering Gemini fallback even before the usage cap mattered. 'Extra usage' (pay-as-you-go overflow) was off at claude.ai, so cap-hits hard-fail rather than overflow-bill.
**Fix:** Three changes: (1) Added skills.max_count: 40 + skills.always_include config in ~/.shay/config.yaml; implemented _read_skills_cap_config() and _apply_skill_count_cap() helpers in agent/prompt_builder.py and wired into build_skills_system_prompt's cache_key + render. Skills prompt verified: 22,600 → 1,274 tokens (~21.3k saved/call). (2) Added tools.include allowlist to mcp_servers.basic-memory in ~/.shay/config.yaml — registers 7 useful tools instead of 27. Tool roster verified: 35 → 19 tools (~3.2k tokens saved/call). (3) Replaced the literal 'default' fallback at agent/plugin_llm.py:586 with a multi-step resolution (_read_main_model → load_config().model.default → 'claude-sonnet-4-6' final fallback) — model=default 404 can never recur. Total per-call savings ~24.5k tokens. DO-NOT-REPEAT: Claude Code OAuth subscription has WEEKLY caps separate from chat — when 'out of extra usage' hits Shay but Claude Desktop works, it's the Claude-Code-bucket cap; permanent prevention is cutting per-call context + keeping bulk off the Max brain.
**Tags:** ['shay', 'claude-code', 'subscription', 'quota', 'weekly-cap', 'skills', 'mcp', 'context-bloat', 'do-not-repeat', 'permanent-fix']

## #bug-185 (2026-06-02T00:00:00.000Z)
**Issue:** Qualification form name validation always failed: 'Please enter your name.' even when filled
**Root cause:** Read the name input as form.name, but HTMLFormElement.name resolves to the form element's own name IDL attribute (empty string), not the child control named 'name'. So form.name.value was undefined and validation rejected every submission.
**Fix:** Read all controls via a val() helper using form.elements[field] (form.elements.namedItem), which returns the named control regardless of collisions with built-in form properties.
**Tags:** ['javascript', 'forms', 'dom', 'html']

## #bug-186 (2026-06-02T00:00:00.000Z)
**Issue:** monitor-agent reported status 'critical' even after an escalated invoice was paid
**Root cause:** The escalated-invoice alert counted any invoice with escalated===true, including ones whose status had since become 'paid'. The historical escalated flag persisted on the invoice, so a fully collected deal kept the dashboard in critical.
**Fix:** Count escalated alerts only among non-paid invoices: invoices.filter(i => i.escalated && i.status !== 'paid'). Alerts must reflect currently-actionable state, not historical flags.
**Tags:** ['agents', 'monitoring', 'kpi', 'state']

## #bug-187 (2026-06-02T00:00:00.000Z)
**Issue:** ABOS_AUTO_CLOSE had no effect when set after the module was required (test asserted auto-close but deal stayed open)
**Root cause:** AUTO_CLOSE was read into a module-level const at require time, so env set later (per-run, in tests or between runs) was ignored. Same class as the monitor CASH_TARGET / lead-function patterns: env captured at load instead of at call.
**Fix:** Read process.env.ABOS_AUTO_CLOSE inside run() at call time rather than as a module-level const. Rule: per-run/toggleable env must be read at call time, not module load.
**Tags:** ['agents', 'env', 'config', 'node']

## #bug-188 (2026-06-02T00:00:00.000Z)
**Issue:** growth-agent ignored ABOS_OUTREACH_CAP when set per-run (same module-load env trap as bug-187)
**Root cause:** DAILY_CAP was a module-level const read at require time, so a cap set later (tests/per-run) had no effect — the recurring 'read env at load not at call' pattern.
**Fix:** Replaced the const with a dailyCap() helper read inside run(). STANDING RULE for these agents: any env that can change per run must be read at call time, never as a module-level const.
**Tags:** ['agents', 'env', 'config', 'node', 'recurring']
