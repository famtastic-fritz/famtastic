# Part 4 — Shay Companion (Mobile Harness) — Design Doc

**Status:** Research-only. No implementation in this part.
**Generated:** 2026-06-01
**Author:** Shay Environments planning track
**Prior parts:** PART-2 (Shay Web), PART-3 (Shay Workspace decisions)

---

## 0. TL;DR

Shay Companion is the **phone/tablet harness** for Shay's brain. The brain
already exposes everything a mobile client would need over HTTP+SSE on the
local network:

- `gateway :8642` — OpenAI-compatible chat + tools, auth via `API_SERVER_KEY`
- `dashboard :9119` — management surface (runs, skills, status), auth via
  `SHAY_DASHBOARD_TOKEN`

The upstream Hermes Workspace README already documents Tailscale as the
canonical way to reach those ports from a phone, and the user already runs
Tailscale on his stack. That makes the mobile problem almost entirely a
**client + auth + UX** problem, not a networking or backend problem.

**Recommendation:** ship a PWA (`shay-companion`) served from the existing
Shay Web (Workspace) origin, reached over Tailscale, authenticated with the
existing dashboard token. Defer native React Native + Expo until the PWA
proves insufficient. MVP v0.1 = chat-from-anywhere + run-list + dashboard
status + (optional) web-push notifications.

---

## 1. Goal & Scope

### Goal
Give Fritz a pocket surface for Shay — chat with her, see what she's working
on, get notified when something needs attention — without being chained to
the laptop.

### Minimum viable scope (v0.1)
1. **Chat from anywhere** — open the app on phone, talk to Shay (gateway
   `/v1/chat/completions` + SSE streaming).
2. **Run list** — see active runs / sessions from the dashboard.
3. **Dashboard status** — at-a-glance health of brain (gateway up, dashboard
   up, last activity, current profile).
4. **Push notifications (stretch)** — "run completed", "approval needed",
   "error". Stretch because it depends on platform choice (Web Push works on
   iOS 16.4+ PWAs but with caveats).

### Explicitly out of scope for v0.1
- Skills management (create/edit/install skills from phone)
- Terminal / shell access
- Media generation (muapi, Remotion) from phone
- Multi-agent boss-mode controls
- File browser / vault editor
- Offline-first / sync (read-only cached snapshot is fine)

### Non-goals
- App-store presence in v0.1.
- Replacing Shay Desktop or Shay Web on the laptop.
- Working over the public internet without Tailscale.

---

## 2. Network Topology — how the phone reaches the brain

The brain lives on the laptop (or wherever the user runs it). The phone is
elsewhere. The connection options:

| Option | Setup cost | Ongoing cost | Security | Works off-Wi-Fi | Recommended? |
|---|---|---|---|---|---|
| **Tailscale** | Install app, sign in same account | $0, just-works | WireGuard, identity-bound | Yes (any LTE) | ✅ **Yes — already in stack** |
| Reverse SSH tunnel | Manual cmd + ngrok-style relay | Fragile, breaks on sleep | Bearer token only | Yes | No |
| Cloudflare Tunnel | DNS + cloudflared daemon | Free tier OK | TLS at edge, but exposes brain to internet | Yes | Only if Tailscale ever fails |
| mDNS / local LAN only | Zero | $0 | Bearer token, same Wi-Fi | **No — Wi-Fi only** | Useless for "anywhere" |
| Dedicated cloud relay | Build + host a relay | $5–20/mo | New attack surface, we'd own it | Yes | Overkill |

**Decision:** Tailscale. The README (`_refs/hermes-workspace-v2.3/README.md`,
sections "Running on a remote host (Tailscale / VPN / LAN)" line 144 and
"📡 Mobile Access via Tailscale" line 584) already documents this exact
pattern. Setup is:

1. Phone joins user's tailnet (already done).
2. Gateway binds `API_SERVER_HOST=0.0.0.0` so tailnet peers can reach it.
3. Companion's "Server URL" is set to `http://100.x.y.z:8642` and
   `http://100.x.y.z:9119` (the laptop's Tailscale IP).

This collapses "internet networking" into "LAN networking with a VPN,"
which is exactly the security posture we want.

---

## 3. Platform Options — trade-offs

| Platform | Dev velocity | App store gate | Push notifications | Native feel | Code reuse from Shay Web | Verdict for v0.1 |
|---|---|---|---|---|---|---|
| **PWA** | ★★★★★ — ship today | None (Add to Home Screen) | Web Push (iOS 16.4+, Android: full) | 80% feel via standalone manifest | 100% — same React surface | ✅ **Recommended** |
| React Native + Expo | ★★★★ — fast | TestFlight / Play Console required | First-class (Expo Notifications) | 95% | ~60% (logic only, UI rewritten) | Phase 2 if PWA insufficient |
| Capacitor | ★★★ | App store required | First-class (Capacitor plugins) | 85% (webview) | 95% (wraps web) | Worse than PWA for our case |
| Native iOS (SwiftUI) | ★★ | TestFlight required | First-class (APNs) | 100% | 0% | Overkill |
| Native Android (Kotlin) | ★★ | Play Console required | First-class (FCM) | 100% | 0% | Overkill |
| Tauri Mobile | ★ — alpha | App store required | Unstable | Untested | ~80% | Too immature for v0.1 |

### Upstream landscape (GitHub search confirms an active mobile-companion ecosystem)
Several upstream Hermes/Nous-Research mobile clients already exist — useful
prior art, not direct dependencies:

- **`2winter-dev/iHermes`** — Expo-based mobile-first Hermes client
  (Android / iOS / web-PWA), connects directly to a user's own agent
  without a mandatory backend. **Closest reference implementation** for
  what Shay Companion would be in Expo form.
- **`Binair-Dev/HermesAgentMobile`** — standalone Android app wrapping the
  Hermes Agent gateway. Useful Android-only reference.
- **`areu01or00/Hermes-Agent-Mobile-Client`** — generic mobile client.
- **`p697/clawket`** — multi-agent mobile client (Hermes + OpenClaw + others).
- **`rfdiosuao/Hermes-Agent-phone`** — Android app exposing its own HTTP
  API for remote agent control.

None of these are upstream-blessed by NousResearch (no
`NousResearch/hermes-mobile` exists). They're community efforts. We can
study `iHermes` if we go Expo in Phase 2, but for v0.1 we don't depend on
any of them.

---

## 4. Auth Model

### Reuse what already works on the brain side
Both auth surfaces have been built and verified in prior parts:

- **Gateway** (`:8642`) — bearer token via `API_SERVER_KEY` env var,
  presented as `Authorization: Bearer <token>` on every request.
- **Dashboard** (`:9119`) — bearer token via `SHAY_DASHBOARD_TOKEN`,
  same header pattern.

The Companion stores both tokens in `localStorage` (PWA) or
`expo-secure-store` (RN), reads them on every fetch, and that's the entire
auth story. No OAuth, no session cookies, no refresh tokens. Tailscale
provides the network identity layer; the bearer provides the application
identity layer; defense in depth.

### Token-distribution UX (the real design question)
Typing a 64-char hex token on a phone is awful. Options:

1. **QR code on Shay Desktop / Shay Web** (recommended). User opens
   Settings → "Pair Phone" → QR code appears encoding a JSON payload:
   ```json
   { "gw": "http://100.x.y.z:8642", "gwKey": "...",
     "dash": "http://100.x.y.z:9119", "dashKey": "...", "v": 1 }
   ```
   Phone scans, app imports, done. ~10 seconds.
2. **Config import via short-lived deep link.** Same payload, delivered via
   a `shay://pair?...` URL the user AirDrops or messages to themselves.
   Backup for users without webcam access to the laptop screen.
3. **Manual paste.** Always available; documented for power users.

QR pairing is the only one normal humans will tolerate. Build it for v0.1.

### Token rotation
Out of scope for v0.1. If a token leaks, user rotates the env var on the
brain and re-pairs the phone. Document this; don't automate it yet.

---

## 5. MVP Feature Set v0.1

| Feature | Endpoint(s) consumed | UI surface | Why it ships |
|---|---|---|---|
| Chat | `POST :8642/v1/chat/completions` (SSE) | Chat tab | Core value prop |
| Run list | `GET :9119/api/runs` (or equivalent) | Runs tab | Situational awareness |
| Dashboard status | `GET :9119/api/health` (or equivalent) | Header pill | "Is Shay alive?" at a glance |
| QR pairing | n/a — reads from desktop QR | First-launch flow | Required for setup |
| Connection settings | n/a — local prefs | Settings screen | Edit URL/token after pairing |

### Deferred (post-v0.1, document but don't build)
- Skills management — `:9119/api/skills` CRUD
- Terminal — needs ttyd / xterm.js + WebSocket
- Media generation — needs muapi key plumbing, file download UX
- Push notifications — Web Push end-to-end (depends on platform choice)
- Multi-profile switching — when user runs multiple brains
- Offline cache / read-only mode

---

## 6. Recommended Approach

**Ship a PWA (`shay-companion`) served from the existing Shay Web origin,
reached over Tailscale, authenticated with the existing dashboard token.**

Defense:

1. **Zero app-store delay.** Add-to-Home-Screen → installed icon → opens
   standalone (no browser chrome) → indistinguishable from a native app
   for chat/list/status use cases.
2. **Maximum code reuse.** Shay Web is already a React app talking to the
   same `:8642` and `:9119` endpoints. Companion is a phone-optimized
   subset of the same codebase — a route group, not a separate repo. The
   pairing flow and chat surface are the only net-new UI.
3. **Tailscale already solves the network problem.** No public-internet
   exposure, no relay to operate, no DNS to configure. The README pattern
   already works for the user.
4. **Auth is already done.** `API_SERVER_KEY` + `SHAY_DASHBOARD_TOKEN` have
   been validated in PART-2 and PART-3. The phone just carries those
   bearers.
5. **Push notifications are achievable.** Web Push works on Android
   immediately and on iOS 16.4+ PWAs (must be added to Home Screen first).
   That covers the user's devices.
6. **Failure mode is gentle.** If PWA proves insufficient (background
   limits, push reliability on iOS, app-store branding pressure), Phase 2
   is React Native + Expo following the `iHermes` reference. The PWA
   doesn't lock us out of going native later — it just gets us to the
   phone in days instead of months.

**Phase 2 trigger (when to graduate to Expo):**
- Web Push on iOS proves too flaky for "approval needed" notifications.
- User wants the app icon in Spotlight / Play Store / TestFlight.
- Need background sync / always-on socket the browser won't grant.
- Need access to native capabilities (camera intents, share sheet beyond
  Web Share API, deep filesystem).

Until one of those triggers fires, the PWA is the right call.

---

## 7. Open Questions for the User

Before Phase 1 implementation can start, Fritz needs to decide:

1. **Platform confirmation.** Confirm PWA over Expo for v0.1, or override.
2. **MVP scope confirmation.** Is "chat + runs + status" the right v0.1, or
   should push notifications be cut from stretch to required (which would
   strongly favor Expo over PWA on iOS)?
3. **Branding cascade.** Does Companion get its own visual identity, or
   does it inherit Shay Web's? (Suggested: inherit, with a "Companion"
   badge in the header.)
4. **Push notification provider — if/when we ship push.** Web Push
   (VAPID-signed, no third party) vs. Expo Notifications (FCM/APNs via
   Expo's relay) vs. self-hosted (web-push library + service worker).
   Recommended: Web Push with VAPID for v0.1 because it stays inside the
   tailnet boundary.
5. **Tailscale Funnel for non-tailnet access?** If Fritz ever wants to let
   non-tailnet devices reach Companion (he probably doesn't), Funnel is the
   path. Default: no, keep tailnet-only.
6. **Multi-device pairing semantics.** Should pairing a second phone
   invalidate the first, or coexist? (Suggested: coexist for v0.1; revisit
   if leak risk becomes real.)
7. **Where does the PWA live on disk?** Recommended: new route group
   `shay-web/app/companion/*` so it shares build pipeline, auth helpers,
   and component library with Shay Web. Confirm or override.

---

## Appendix A — Endpoint inventory the Companion will consume

(Confirmed from prior parts and the Hermes Workspace README. Will be
re-verified during Phase 1 implementation prep.)

| Purpose | Verb | URL | Auth header |
|---|---|---|---|
| Chat (OpenAI-compat, SSE) | POST | `:8642/v1/chat/completions` | `Authorization: Bearer $API_SERVER_KEY` |
| Models list | GET | `:8642/v1/models` | same |
| Dashboard health | GET | `:9119/api/health` (TBD) | `Authorization: Bearer $SHAY_DASHBOARD_TOKEN` |
| Runs / sessions list | GET | `:9119/api/runs` (TBD) | same |
| Current profile | GET | `:9119/api/profile` (TBD) | same |

Exact dashboard paths to be confirmed at Phase 1 kickoff against the
running dashboard (PART-3 install report has the surface map).

## Appendix B — Why we didn't pick the other options

- **Capacitor** — wraps a web view; same constraints as PWA plus an
  app-store gate. Only wins if we need app-store presence, in which case
  Expo is the better choice because the ecosystem is bigger.
- **Native iOS / Android** — two codebases for two phones for a feature
  set that's 80% "render a chat stream." Indefensible cost.
- **Tauri Mobile** — alpha; the cost of being a beta-tester for a build
  tool while also shipping a product is too high.
- **Reverse SSH / Cloudflare Tunnel** — Tailscale already solves this
  better. Keep as documented fallbacks, don't build for them.

---

**End of PART-4-DESIGN.md**
