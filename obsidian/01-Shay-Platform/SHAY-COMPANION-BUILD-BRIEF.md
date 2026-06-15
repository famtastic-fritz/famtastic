---
title: SHAY-COMPANION-BUILD-BRIEF
type: note
permalink: famtastic/01-shay-platform/shay-companion-build-brief
---

# Shay Companion — Mobile Build Brief (2026-06-05)

> Synthesis of a 3-agent research swarm (surface / UX-UI / architecture). Raw reports in
> `obsidian/05-Captures/research/2026-06-05-mobile-companion/`. This is the professional,
> executable brief Fritz asked for — plus a paste-ready Claude Code session prompt at the end.
> Goal: a clickable, good-looking **Shay remote control** on Fritz's phone — like Claude Code's
> mobile "Code" tab + the interview style — cheaply, soon.

## ⚡ UPDATE 2026-06-05 — Fritz is ANDROID + Tailscale done + a PWA ALREADY EXISTS
Three facts change the path (confirmed from session history):
1. **A working Companion PWA already exists** at `~/famtastic/companion-app/` (index.html, app.js,
   sw.js service worker, manifest.webmanifest, icons) with **web-push already wired** (VAPID +
   subscribe/push, commits 66b26ff/d96a3a2). `PART-4-DESIGN.md` already concluded "ship a PWA over
   Tailscale." → **REUSE + POLISH it; do NOT build a new Capacitor app from scratch.**
2. **Fritz is on ANDROID** — where PWAs do reliable installable home-screen + web-push (the iOS
   limitation that pushed us toward Capacitor does NOT apply). So **PWA is the right path for him.**
   Capacitor APK = optional later upgrade (native share-sheet/badge), not needed for MVP.
3. **Tailscale is already configured** → connectivity solved; no relay needed (the relay-default in
   the old plan was only to dodge Apple App Review — irrelevant for Android sideload/PWA).
4. **Run BOTH surfaces** — it's the documented "four-surface family" (Shay Desktop / Web / Workspace
   / Companion), and PART-3 VERIFIED Web + Workspace both reach the SAME Shay brain. Keep **Workspace
   as the rich Mac control surface** + **Web UI as the light base** + **the PWA as the phone**. Same
   sessions/memory underneath. No conflict.

**Revised plan:** polish the existing `companion-app` PWA to the UX/visual spec below → serve over
Tailscale → install on the Android home screen. The Capacitor/iOS material below stays as the
future option. Use the paste-ready prompt at the very bottom (now PWA-reuse).

## The decision (all three agents agree)
- **Surface:** standardize on the **Shay Web UI** (hermes-webui v0.51). It's already a browser app — expose it and the phone gets the full working Shay. (Workspace = richer but Electron + overhead; revisit for swarm-monitoring later. Desktop = can't run on a phone.)
- **App shell:** **Capacitor 6 wrapper** around that web UI → real home-screen icon + reliable push, via **TestFlight in ~1 week, $0 incremental** (Apple dev already paid). PWA rejected (iOS background push unreliable — the "job done" signal would drop). Full native (`shay-phone-app/PLAN.md`) = **Phase 2**, not abandoned.
- **Connect:** **Tailscale** (Mac+phone, P2P, $0) → `https://fritz-mac.tail.ts.net:8787`; **Caddy** local TLS terminator (WKWebView needs HTTPS). Cloudflare Tunnel = no-app fallback.
- **Push:** Capacitor `@capacitor/push-notifications` + a ~50-line **Cloudflare Worker relay** ($0). Gateway POSTs `/notify` on job done/awaiting-approval/failed → APNs/FCM.
- **Auth:** Bearer token (`openssl rand -hex 32`) in gateway; phone stores it in Keychain; pair by QR.

## The product (UX)
**5-tab bottom nav:** `Brief ☀ · Tasks ⚡ · Chat ✦ · Dispatch ▷ · You ○`
- **Brief** — 7:30 morning digest: ranked priorities + Shay's overnight completions + 1 pending CTA.
- **Tasks** — the "Code-tab": filter (All/Working/Needs Input/Done); session cards w/ status dot (cyan/amber/rose/gray); detail = live activity log + diff viewer + inline approval.
- **Chat** — conversation + the **Interview Card** (Fritz's favorite).
- **Dispatch** — approvals queue + voice/text/photo task composer.
- **You** — autonomy (Suggest/Copilot/Autopilot), notification budget, Mac health, quiet hours.

**Interview Card** (renders `AskUserQuestion` — the thing Claude's mobile fails at): bottom-attached card, pill "SHAY IS ASKING", header+question, tappable option rows w/ descriptions, "type your own", Submit, progress dots for multi-Q; ends in a read-only plan card → [Approve & Start]/[Let's adjust]. Remote push "Shay has a question" → [Answer]/[Later].

**Notifications:** 4 types only (input/approval/complete/brief), daily budget (default 5 → then batch), quiet hours, **lock-screen approve/deny**, grouped under one thread.

## Visual direction (FAMtastic-grade, not generic)
Dark layered surfaces (#08090B→#2A2C2F); single accent **electric indigo #5B4FE8** (distinct from Claude teal); status cyan/amber/rose. Type: **Space Grotesk** (display) + **Inter** (body). "Thinking" = 3 breathing cyan dots, not a spinner. Shay = a geometric glyph mark, no avatar photo.

## Phased plan
- **MVP (1 wk, 1 Claude Code session):** Mac gateway bind `0.0.0.0` + Caddy TLS; Tailscale; Capacitor scaffold → WKWebView on the web UI; QR pair (Keychain); iOS icon/splash; TestFlight build. → remote control + clickable icon.
- **Wk 2:** Cloudflare Worker push relay; token registration; gateway job hooks → push; morning-brief push; tap → deep-link.
- **Wk 3:** offline capture queue; iOS share extension (URLs→Shay inbox); badge.
- **Phase 2 (mo 2–4):** promote to full native (PLAN.md Rev 3) with real usage data; push/auth/Tailscale layers carry forward.

## Decisions Fritz should confirm
1. Accent = electric indigo (#5B4FE8) — keep, or match a FAMtastic brand color?
2. Surface = **Web UI** confirmed (vs Workspace)?
3. iOS-first (TestFlight) — Android APK as fast-follow, or both in MVP?

---

## PASTE-READY — Claude Code build session prompt (Android PWA · salvage plumbing · REBUILD the experience)
```
Rebuild the Shay phone companion for Android. SALVAGE only the working PLUMBING from the existing
~/famtastic/companion-app/ PWA — the service worker (sw.js), web-push (VAPID + subscribe/push),
manifest, and gateway/auth wiring. THROW OUT its UI/UX ENTIRELY. Fritz HATED the old look, feel,
and experience — do NOT preserve any of it. Build the experience fresh to the spec in
obsidian/01-Shay/SHAY-COMPANION-BUILD-BRIEF.md (raw research:
obsidian/05-Captures/research/2026-06-05-mobile-companion/). Read both first.

Context: Fritz is on ANDROID and already runs Tailscale (connectivity solved, no relay needed).
Shay gateway over HTTP+SSE: gateway :8642 (API_SERVER_KEY), dashboard :9119 (SHAY_DASHBOARD_TOKEN),
web UI :8787. command-center/state.json feeds the morning brief.

Build to spec:
1. BRAND-NEW UI (the old one is rejected): dark layered surfaces, electric-indigo (#5B4FE8) accent,
   Space Grotesk + Inter, 5-tab IA (Brief / Tasks / Chat / Dispatch / You), breathing-dot "thinking"
   indicator (never a spinner). Target feel = Claude Code's "Code" remote-control tab — NOT the old companion-app.
2. Interview Card: render AskUserQuestion (1-4 Qs, 2-4 options, single/multi-select, "type your own",
   progress dots) → ends in a read-only plan card (Approve & Start / Let's adjust).
3. Wire the 5 jobs to the gateway: live session list (Tasks), morning Brief (command-center/state.json),
   interview Chat (SSE), Dispatch/approve, web-push notifications (4 types + daily budget cap).
4. Serve over Tailscale (Caddy TLS in front if the browser needs HTTPS); confirm it installs to the
   Android home screen (manifest + icons) with working web-push.
5. Keep Shay Web UI + Workspace both functional (four-surface family, same brain).
6. COMMIT companion-app changes — never leave it uncommitted (it got nuked once).

Capacitor APK is a later optional upgrade for native share-sheet/badge — not needed for this MVP.
```