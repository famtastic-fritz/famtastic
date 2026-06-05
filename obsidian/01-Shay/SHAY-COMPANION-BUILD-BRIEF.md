# Shay Companion — Mobile Build Brief (2026-06-05)

> Synthesis of a 3-agent research swarm (surface / UX-UI / architecture). Raw reports in
> `obsidian/05-Captures/research/2026-06-05-mobile-companion/`. This is the professional,
> executable brief Fritz asked for — plus a paste-ready Claude Code session prompt at the end.
> Goal: a clickable, good-looking **Shay remote control** on Fritz's phone — like Claude Code's
> mobile "Code" tab + the interview style — cheaply, soon.

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

## PASTE-READY — Claude Code build session prompt
```
Build "Shay Companion" — a Capacitor 6 iOS app that wraps the existing Shay web UI
(hermes-webui v0.51) into a home-screen remote control for Shay, my Mac-resident AI agent.
Full design + architecture brief: obsidian/01-Shay/SHAY-COMPANION-BUILD-BRIEF.md
(raw research: obsidian/05-Captures/research/2026-06-05-mobile-companion/). Read it first.

Context:
- Shay runs on my Mac via the hermes/shay gateway (FastAPI, web UI at 127.0.0.1:8787).
- Apple Developer Program is paid. Tailscale available. Goal: TestFlight build, MVP scope.

MVP (this session):
1. Mac gateway prep: set host 127.0.0.1 -> 0.0.0.0; install Caddy; Caddyfile reverse_proxy
   localhost:8787 under the Tailscale MagicDNS host; caddy start.
2. Add Bearer-token auth to the gateway (openssl rand -hex 32 in ~/.shay/config.yaml;
   require Authorization: Bearer on all routes).
3. Scaffold ~/famtastic/shay-phone/ (Capacitor 6: @capacitor/core,cli,ios,push-notifications,
   preferences,barcode-scanner). appId dev.famtastic.shay, appName Shay, webDir www.
4. First-launch QR pair screen -> store {host, token} in Keychain (@capacitor/preferences);
   subsequent launches open https://{host}:8787 in WKWebView, injecting the Bearer header.
5. Apply the visual shell: dark, electric-indigo accent, Space Grotesk + Inter, icon + splash.
6. npx cap add ios; cap sync; archive for TestFlight.

Then propose Wk2 (Cloudflare Worker push relay + gateway job hooks + morning-brief push).
Use the brief's 5-tab IA and Interview Card spec for any companion-native screens.
Commit the shay-phone project to its own repo; do NOT let it get nuked uncommitted.
```
