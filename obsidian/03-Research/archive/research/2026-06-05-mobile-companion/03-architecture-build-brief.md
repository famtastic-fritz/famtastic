---
title: 03-architecture-build-brief
type: note
permalink: famtastic/03-research/archive/research/2026-06-05-mobile-companion/03-architecture-build-brief
---

# Mobile Companion — Architecture + Clickable-App Path (agent 3 of 3)
> Background swarm, 2026-06-05. Raw report. Synthesized into the final build brief once all 3 land.

## Decision: **Capacitor 6 thin native wrapper** around the existing Shay web UI

| | PWA (a) | **Capacitor wrapper (b)** | Full native (c) |
|---|---|---|---|
| Time to icon on phone | 1–3 days | **3–7 days** | 16–19 weeks |
| Looks like Claude's app | no (browser chrome) | **yes (native shell)** | yes |
| Push (job done/needs input) | ✗ unreliable on iOS | **✓ APNs/FCM** | ✓ |
| Cost | $0 | **$0** (Apple dev already paid) | 1,960 eng-hrs |

**PWA ruled out** — iOS won't reliably deliver background "job done" push (the most important signal). **Full native ruled out for MVP** — the existing `shay-phone-app/PLAN.md` (Rev 3) is excellent but 19 weeks; it becomes **Phase 2**. Capacitor wraps the existing web UI in a WKWebView + native shell (push, home-screen icon, splash) → native-feeling app in days.

## Connectivity: **Tailscale** (primary) + Cloudflare Tunnel (fallback)
- Tailscale on Mac + phone → phone hits `https://fritz-mac.tail.ts.net:8787` from anywhere, P2P encrypted, $0.
- Gateway bind change: `127.0.0.1` → `0.0.0.0`; add **Caddy** as local TLS terminator (WKWebView requires HTTPS for non-localhost).
- Cloudflare Tunnel = no-app fallback (valid HTTPS, ~20–50ms edge latency).

## Push: Capacitor `@capacitor/push-notifications` + a tiny **Cloudflare Worker relay** (~50 lines, $0)
Mac gateway POSTs to relay `/notify` on job `done`/`awaiting_approval`/`failed` → relay calls APNs/FCM (p8 key as a Worker secret). (Can't push Mac→APNs directly behind NAT.)

## Auth: **Bearer token** (`openssl rand -hex 32`) in config; gateway requires `Authorization: Bearer`; phone stores it in Keychain via `@capacitor/preferences`; pair by QR. Sufficient for single-user + Tailscale WireGuard channel.

## Gateway endpoints the phone uses
`POST /v1/chat/completions` (SSE) · `GET /sessions` · `GET /sessions/:id` · `GET /status` · `POST /api/jobs/approve/:id` · optional `WS /ws`.

## Phased plan
- **MVP (1 wk, 1 Claude Code session):** gateway bind 0.0.0.0 + Caddy TLS; Tailscale; Capacitor scaffold → WKWebView on the web UI; QR pair screen (Keychain); iOS icon/splash; TestFlight build. → remote control (chat/sessions/status) + clickable icon.
- **Wk 2:** Cloudflare Worker push relay; register token; gateway job hooks → push; morning-briefing (07:30 cron) push; tap → deep-link to session.
- **Wk 3:** offline pending-captures queue; iOS share extension (route URLs→Shay inbox); badge.
- **Phase 2 (mo 2–4):** promote to full native (PLAN.md Rev 3) with usage data — push relay/auth/Tailscale layers carry forward.

## Repo: `~/famtastic/shay-phone/` (capacitor.config.ts appId `dev.famtastic.shay`, www/, ios/, push-relay/ Worker, scripts/ mac-setup + gen-pair-qr).

**Bottom line:** don't build a new UI or write Swift yet — wrap the existing Shay web UI in Capacitor, push via a Cloudflare Worker, connect via Tailscale, ship a TestFlight build in ~1 week, $0 incremental.