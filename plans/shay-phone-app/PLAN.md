---
title: Shay Phone App Plan
date: 2026-05-30
tags: [mobile, ios, android, shay, plan, revised]
---

# SHAY PHONE APP — Build Plan (iOS + Android) — Revision 3

**Plan ID:** `shay-phone-app`
**Status:** `active` (proposal — awaiting approval, revised after 5 adversarial critiques across two rounds)
**Owner:** Fritz Medine
**Drafted:** 2026-05-30 (rev 3)
**Source bundle:** `~/famtastic/data-center/research/shay-phone-app-bundle.md`

---

## Verdict

Shay Phone is **a mobile-shaped capture-and-control surface for the Shay desktop swarm** — designed around five concrete one-handed moments, not a desktop UI miniaturized. Who: Fritz and any FAMtastic operator who already runs Shay on a Mac. What: a companion that pairs to that desk over Tailscale-or-relay, lets you drop captures into a long-running session from anywhere (share-sheet, voice, photo, Action Button), receive push notifications when jobs land, and approve gated actions with on-device-generated risk summaries — with offline triage on Apple-Intelligence-capable hardware only, gracefully cloud-routed everywhere else. Why: every other consumer LLM phone app (including Claude's own) is locked to a single cloud brain, owns the persistence stack itself, and has no concept of "your desk agent is the worker, this phone is the capture/notify/approve extension." That gap — and the fact that Shay's persistent agents already live on a real machine the user owns — is where we win. What is **explicitly not** in this app: no terminal, no full computer-use bridge, no graph viewer, no agentic auto-input on remote desks. The mobile surface that ships is mobile-shaped.

---

## Five mobile moments this app is built around

Every surface in this plan ties back to one of these five. If a feature does not serve one of them, it does not ship.

1. **Meeting capture** — "I'm in a meeting and need to dump a thought into the brand-kit inbox without unlocking my phone." → Action Button + Lock Screen control + share extension, on-device classification, no UI gates.
2. **Commute share** — "I'm walking and I want to send a URL/PDF/photo into the right desk session." → Share extension as the *headline* surface, not chat.
3. **Bedtime triage** — "A long job finished while I was away — what changed, what needs me?" → Rich push + Live Activity with honest elapsed-time state + at-a-glance approval queue.
4. **Hands-busy voice** — "Dictate a quick instruction and let the desk act on it." → Action Button → record → on-device STT → on-device intent classification → enqueue, no in-app tap to start.
5. **Approve-or-deny in the wild** — "Shay is asking permission to do X — is it safe?" → Tiered approval UX with on-device-generated risk summary, with destructive actions hard-gated to desk-only.

Critique #3 was correct: the original draft inventoried iOS APIs and reverse-engineered features from them. This revision starts with the moments and rejects any feature that does not survive them.

---

## Claude phone app baseline

Every capability Claude's iOS + Android app ships today (as of May 2026), grouped so the Shay plan can be measured against it line-for-line. Corrections from the original draft are flagged inline.

| # | Capability | iOS | Android | Source |
|---|---|---|---|---|
| 1 | Chat with Opus 4.6 / Sonnet 4.5 | ✅ | ✅ | App Store / Play Store listings |
| 2 | Voice mode (push-to-talk, half-duplex) | ✅ | ✅ | support.claude.com voice mode |
| 3 | Memory (preferences/facts, Free + Pro since Mar 2026) | ✅ | ✅ | LumiChats memory guide |
| 4 | Projects sync (read/use only — cannot create on mobile) | ✅ | ✅ | Anthropic iOS support |
| 5 | Artifacts (read-only inside active conversation) | ✅ | ✅ | Anthropic support |
| 6 | PDF + screenshot analysis | ✅ | ✅ | App Store listing |
| 7 | Vision capture / image upload | ✅ | ✅ | Android announcement |
| 8 | 100+ language translation | ✅ | ✅ | App Store copy |
| 9 | App Intent "Ask Claude" (Spotlight, Siri, Share) | ✅ | — | App Intents support article |
| 10 | Shortcuts.app integration | ✅ | partial via App Actions | App Intents support article |
| 11 | Home Screen / Today View widget | ✅ | ✅ | Widget support article |
| 12 | Lock Screen / Control Center control (intents that work on locked device) | ✅ | partial | Lock screen article — **corrected from "without unlock"** |
| 13 | iOS system app bridging (Messages, Mail, Calendar, Maps, Reminders) | ✅ | n/a | iOS apps support article |
| 14 | Cloud MCP connectors (Drive, Gmail, Calendar, Canva, Fireflies) | ✅ | ✅ | Missing MCP Playbook |
| 15 | Custom MCP — public HTTPS + OAuth 2.1 DCR only (no local stdio) | ✅ | ✅ | Missing MCP Playbook |
| 16 | Claude Code Remote Control (Pro/Max, preview) | ✅ | ✅ | Apiyi 2026 features guide |
| 17 | Cross-device sync | ✅ | ✅ | Anthropic support |
| 18 | Push notifications for completed cloud jobs | ✅ basic | ✅ basic | observed |
| 19 | Account / billing / model picker | ✅ | ✅ | App listings |
| 20 | Free tier access | ✅ | ✅ | TechnoSports |

**Age rating:** Claude is currently rated **12+** on the US App Store (verified — original draft's "17+ consistent with Claude" was wrong). Shay will self-rate 12+ pending content-policy review.

**Notably absent from Claude's phone app** — and therefore a candidate differentiation surface for Shay, but only where it survives the five mobile moments:

- ❌ No Apple Watch app, Live Activities, Dynamic Island
- ❌ No multi-brain switcher
- ❌ No share-extension that drops arbitrary content into a long-running session
- ❌ No on-device LLM (Apple FM / Gemini Nano) for triage on capable hardware
- ❌ No deep-link to a specific message or session ID
- ❌ No persistent background agent (de-facto pattern: server-side jobs + push)

Removed from the original gap list because they don't survive critique:
- Terminal surface (critique #1, #2, #3 — all three correctly flag this as a 2.5.2 review trap *and* a UX dead-end on mobile)
- Computer Use mirror with agentic input (critique #1, #2, #3 — collapses Jump Desktop defense; recast below as desk-side only)
- Local-stdio MCP "client" framing (critique #1 — the phone is a viewer of the desk's MCP host, not an MCP client; correct accordingly)
- Smart Connections graph viewer (critique #3 — graph navigation on 6-inch glass is bad UX; replaced with list/search/recents)

---

## Where Shay phone exceeds Claude's app

Each item below maps to a research-confirmed capability, a specific mobile moment, and an explicit platform-policy honesty check. Items marked ⚠ have constraints we will not pretend away.

### 0. Lock Screen control — honest about the biometric (R2 critique #2 minor)

**Mobile moment served:** meeting capture.

The Lock Screen control's default destination in P1 is **"Capture to desk inbox"** — a non-routing, desk-only operation that does **not** send to any cloud brain and does **not** trigger a biometric prompt. The capture lands in the inbox and is triaged later (either by on-device classification on capable hardware or by the user on the desk). This preserves the one-handed-without-unlock moment the Lock Screen control exists for.

A *secondary* Lock Screen destination is "Capture and route to <active brain>" — this **does** trigger a biometric prompt before any cloud egress, because per-brain 5.1.2(i) consent is bound to user identity, not to the device session. Users who want one-tap cloud routing from the Lock Screen can set it as the default in Settings (with an inline warning that doing so means Face ID at the Lock Screen control for every press); the *default* default is the no-biometric desk-inbox path. The P1 smoke test reflects this honestly: "press Lock Screen control on locked phone, no Face ID prompt, capture appears in desk inbox."

### 1. Share extension as the headline P1 surface

**Mobile moment served:** commute share, meeting capture.

`UIActivityViewController` extension on iOS, `ACTION_SEND` intent on Android. Any content (URL, image, PDF, text selection, video) drops into:

- "New capture" → routes to the inbox on the desk for triage
- "Append to active session" → adds to whatever conversation is open
- "Run with skill…" → presents a skill picker (deep research, brand-kit, etc.)

**5.1.2(i) compliance for share-extension routing** (critique #2): the share extension's default target is **on-device classification + desk-only routing**. Routing a share payload to a *cloud* brain requires a one-time per-brain confirmation, because share-sheet payloads frequently contain third-party content (texts, emails, photos with other people, copyrighted material). The confirmation states which vendor receives the data and references our privacy policy entry for that vendor. This is the headline shipped surface in P1 — chat UI is demoted to a secondary tab because most users will hit the share extension 10× more often than they open the app.

### 2. Multi-brain switcher — default-per-session, not per-message

**Mobile moment served:** all five.

Per-session brain pick: **Claude, Codex, Gemini, On-Device (capable hardware only)**. Per-message switching is hidden behind long-press on the brain badge (power-user setting). Default mobile behavior is "the brain you picked for this session stays the brain" — per-message switching is too much cognitive load on a phone (critique #3).

**Mid-message brain switching and disclosure** (R2 critique #2 minor): when a user long-presses the brain badge mid-composition to switch to a brain they have not yet completed 5.1.2(i) first-use disclosure for, the disclosure modal **takes over the screen and blocks send** until acknowledged. The composer text is preserved across the modal; the user cannot dismiss-by-tap-outside; the message is not sent until the disclosure is explicitly accepted (or the user cancels the brain switch, which restores the previous brain). This prevents the "I tapped the wrong brain mid-typing and silently leaked the draft" failure mode.

The on-device option is only offered on Apple-Intelligence-capable hardware (iPhone 15 Pro/Pro Max, iPhone 16 line, M-series iPad) or Tensor G3+ Pixels / Galaxy S24+. On all other devices the on-device option is hidden, not greyed out — there's no point teasing a feature the hardware can't run.

Cloud brains route through the desk relay. **The phone never holds a cloud API key.** Pairing flow does hold tokens (device cert + identity tokens from Apple/Google Sign-In) — see "Token lifecycle" below.

### 3. Persistent agent runs on your desk — phone never tries to run a background loop

**Mobile moment served:** bedtime triage.

Long jobs live on the desk. Phone gets a rich APNs/FCM push the second the job state changes. **There is no background agent on the phone**, and the plan never pretends otherwise.

### 4. Apple Foundation Models / Gemini Nano — for capable hardware, with honest market sizing

**Mobile moment served:** meeting capture, hands-busy voice, approve-or-deny in the wild.

**Hardware reality check** (critique #1): Foundation Models requires **iOS 26+ on Apple-Intelligence-capable devices**: iPhone 15 Pro/Pro Max, iPhone 16 line, M-series iPad/Mac. That is **roughly 20–30% of the active iOS install base as of May 2026** (Counterpoint Q1-26 estimate). Original draft's "iPhone 13+ minimum" was wrong for on-device features — iPhone 13/14/15 non-Pro **cannot run FM at all** and will cloud-route for every on-device use case. The on-device differentiator is therefore a *premium-hardware tier* feature, not the default.

Gemini Nano: Pixel 9+, Samsung S25+. AICore handles weights, we don't ship them.

**Use cases we ship on-device (where hardware supports):**

1. Voice command intent classification
2. Capture routing classification (and the *result* lands in the inbox view — the user does **not** wait on FM inference at capture time; classification is async, capture lands instantly with a "classifying…" pill that resolves seconds later — critique #3)
3. **Approval-gate risk summary**: one-sentence on-device summary of what the action does and its blast radius (this is the most valuable on-device use — see Approval UX section below)
4. Live Activity preview summarization of long agent output
5. Title generation for new sessions
6. Tool-arg extraction

**Use cases we explicitly do NOT do on-device:** general Q&A, code generation, long-document analysis, web research.

**Devices without FM** silently cloud-route classification (sub-second to the desk) — UX is the same, the on-device latency win is just absent.

### 5. Voice — Action Button entry from day one, with honest STT story

**Mobile moment served:** hands-busy voice, meeting capture.

Critique #3 was correct: on-device STT speed only matters if the **entry friction** is also low. Tapping a mic button inside the app is worse than Siri. So:

- **Action Button mapping (iOS 15 Pro+) and Lock Screen control ship in P1**, not P3. Press Action Button → start recording → release to stop → on-device STT → on-device classification → routes to inbox. Zero in-app interaction.
- iOS: **WhisperKit** large-v3 is the target, but we ship a **distilled WhisperKit-small** as default (~150 MB) to keep the post-install download manageable. Both the default small download (~150 MB, fetched on first app launch over any connection) and the opt-in large-v3 (~1.5 GB, Wi-Fi-only, explicit user action) are **disclosed in the App Store description per Guideline 2.3.1** (R2 critique #1 minor — disclosure now applies to the default too, not just the opt-in). `NSMicrophoneUsageDescription` explicitly states "Audio is processed on this device by WhisperKit. Audio is never uploaded."
- Android: **whisper.cpp GGML quant (small.q5_1)** is the default. WhisperKit is **iOS-only** (Core ML / ANE) — original draft's "WhisperKit on Pixel" was wrong (critique #2). Android STT WER baseline budgeted before P2 entry; if whisper.cpp doesn't hit acceptable WER on Pixel 7+, we fall back to platform `SpeechRecognizer`.
- **Voice buffer expanded to 5 minutes** (critique #1 — 60 s ring silently truncates real dictation). Truncation beyond 5 minutes shows a visible "max length reached" indicator.

**Full-duplex voice + interrupt-mid-response stays at P4, not P3** (rev 3 — R2 critique #2 major correctly flagged that bundling a WebRTC media edge + barge-in handling + on-device VAD into the same phase as watchOS app, per-brain intents, read-only viewer, and Continuity Handoff was not credible at 700 hours). What ships in **P3** instead: **half-duplex streaming voice with cancel-button-to-interrupt** (no barge-in, no full-duplex). The user can interrupt by tapping a visible cancel/stop button while the model is speaking; that cancels the in-flight TTS stream and reopens the mic. This delivers ~70% of the interrupt-mid-response value at ~15% of the engineering cost, and defers the WebRTC media edge component to P4 where it gets its own focused phase. PushToTalk framework remains **dropped from the plan** (see Auth/Approvals section).

### 6. Live Activities and rich push — with honest duration limits

**Mobile moment served:** bedtime triage.

ActivityKit + Dynamic Island for any Shay job > 10 seconds. **But:**

- **iOS Live Activity hard cap: 8 hours active wall-clock (12 hours stale).** Critique #1 and #2 both correctly flagged this. Many Shay jobs (research runs, site builds) regularly exceed 8h. So:
  - Jobs are reported in **chunked checkpoints** — every meaningful step ends an LA and starts a new one if the job continues. Most jobs stay under 8h within a checkpoint.
  - For any job approaching the cap, the LA **gracefully degrades to "last update HH:MM, still running"** and the user receives a silent push that re-spawns a fresh LA with current state when they next interact.
  - We will **not** promise "Live Activity stays visible until the job ends" — that was incorrect.
- **APNs LiveActivity push budget**: Apple enforces a ~4 high-priority pushes/hour budget under the `frequent-push` entitlement (critique #2). We design for **at most one update per minute** sustained, with burst budget reserved for state transitions (start, awaiting-approval, done, failed). Streaming token-level progress is **not** attempted on the Live Activity surface.
- **Honest ETA**: most Shay jobs do not have a meaningful ETA (critique #3). LA shows "running 4m 12s — last step: scoring sources" rather than a fake ETA.
- Android equivalent: **`FOREGROUND_SERVICE_SPECIAL_USE`** with a Play Console declaration explaining why neither `dataSync` nor `mediaPlayback` fits (critique #2 — `dataSync` is the wrong type for agent-style work and is a known Play policy reject trigger). Pre-drafted justification: "Maintains persistent connection to user's own paired workstation for receiving agent-job notifications and surfacing time-sensitive approval prompts."

### 7. App Intents / Siri — deterministic intents in P2, per-brain ask-style intents in P3

**Mobile moment served:** meeting capture, hands-busy voice.

Critique #2 was correct: a single polymorphic "Ask Shay" intent that fronts multiple third-party brains can't truthfully name a single model in intent metadata, which is the pattern Apple's March 2026 guidance targets. Revised:

- **P2 ships deterministic-only intents**: "Run daily site audit", "Capture this for brand-kit", "Open the active job" — each routes to a known desk routine, not to a free-form LLM response.
- **P3 ships per-brain ask intents**: "Ask Shay-Claude…", "Ask Shay-Gemini…", "Ask Shay-Codex…" — each intent honestly declares its underlying model in metadata. The single "Ask Shay" intent that polymorphically picks a brain is **dropped**.
- **Per-brain App Intent metadata** (R2 critique #1 minor — what each intent actually declares): `INIntentMetadata` (or `AppIntent` summary string) for each per-brain intent names the underlying model and vendor explicitly: `Ask Shay-Claude` declares "Routes to Anthropic Claude Sonnet 4.5 / Opus 4.6 via your paired desk", `Ask Shay-Gemini` declares "Routes to Google Gemini 2.5 Pro via your paired desk", `Ask Shay-Codex` declares "Routes to OpenAI Codex via your paired desk". The intent's privacy disclosure surfaces the same per-brain consent record from §"App Store / Play Store review risk" — if the user has not yet completed the 5.1.2(i) first-use disclosure for that brain, invoking the intent triggers the disclosure flow before the request is routed. This is what Apple's March 2026 guidance asks for: the intent metadata names a single model, and the user has already consented to that specific model.
- Pre-iOS 27 these live in our app. If iOS 27 Siri Extensions ship at WWDC 2026 June 8, Shay registers as a brain Siri can hand off to, with the same per-brain honesty constraint.

### 8. Apple Watch micro-glance — narrowed to two things

**Mobile moment served:** hands-busy voice, bedtime triage.

Critique #3 was correct: "last 5 messages on a 41mm screen" is a known anti-pattern, and "approve destructive actions from the wrist" is a foot-gun. Watch ships in P3 with **only two surfaces**:

1. **Dictate-a-capture** (glance + 3 seconds + done) → routes through iPhone → desk.
2. **Glanceable in-flight job status** — one job, one progress bar, one elapsed-time string ("running 4m 12s"). No prose, no ETA, no message list.

**Approval from the wrist is restricted to reversible / non-destructive action classes** — e.g., "approve sending the draft email", "approve saving a draft for review". Anything `destructive: true` is hard-gated to desk-only or phone-with-summary; the Watch shows "approval pending on phone" but cannot grant it.

Wear OS Android stays deferred indefinitely — not a P4 commitment.

### 9. Computer-use — desk-side only, no agentic input from phone

**Mobile moment served:** none of the core five.

Critique #1, #2, and #3 all rejected the original framing. Revised:

- The **phone never receives agentic input authority over the remote desk**. The cloud brain cannot drive a click on a mirrored screen from the phone binary.
- What ships in P3 is a **read-only screen viewer** ("unstick a stuck agent from anywhere") — pixels stream from the desk, the phone can see, the phone cannot send synthetic input events. This is positioned as an emergency-access tool, not a daily driver.
- The **agentic computer-use loop stays desk-side only**. The desk is where the AI brain can drive the cursor — that's the existing Shay-on-desk architecture, unchanged. The iOS binary does not ship any code path that converts AI output into input events on the remote machine.
- This is honest "personal remote desktop viewer" framing (the Jump-Desktop-precedent shape that actually holds) and removes the 5.1.2(i) compounding concern.
- ScreenCaptureKit is **macOS-only** (critique #1, #2). When the paired desk is Windows or Linux, the read-only viewer is **not available** — we will not pretend otherwise. The Verdict accordingly says "paired Mac" specifically for this feature, not "Mac, iPad, or shared workstation."
- macOS 14+ requires the desk-side ScreenCaptureKit consent dialog at every launch *and* an always-visible menubar recording indicator (critique #2) — this is documented in the desk-side onboarding and not hidden from the user.

### 10. Terminal — dropped from iOS, deferred to optional Android-only behind developer-mode

**Mobile moment served:** none of the core five.

Critique #1, #2, #3 all rejected. Revised:

- **iOS: no terminal surface in any phase.** A remote-PTY tab inside a consumer "AI companion" app collapses every defensible 2.5.2 frame (the surface accepts input, not just output). We don't ship it.
- **Android: optional read-only log viewer in P2** (no input field — view-only stream of agent stdout with copy/share affordances).
- **Android: optional read-write terminal behind a developer-mode entitlement in P4**, only if user opts into developer mode in Settings, disclosed in the Play listing. Not a tab — a Settings → Developer → "Remote shell to paired desk" screen.

### 11. Read-only memory mirror — list/search/recents, not graph

**Mobile moment served:** bedtime triage, commute share.

Memory syncs as a read-only mirror with **list view + saved searches + recents** as the mobile-native shape. The original Smart Connections graph viewer is dropped (critique #3) — graph navigation on 6-inch glass is universally bad UX.

**"Recents" defined** (R2 critique #2 minor): "Recents" on the memory mirror tab means *the last 20 memory notes the user has either viewed, captured into, or had referenced by an assistant message addressed to them*, sorted most-recent-first, deduplicated by note path. It is **not** recent sessions (that's the sessions tab), recent captures (that's the inbox tab), or recent approved actions (that's the approvals history tab) — each of those four "recents" lives on its own tab with its own definition surfaced in a tooltip on long-press of the header.

**File protection class**: `NSFileProtectionCompleteUntilFirstUserAuthentication` (corrected from original `NSFileProtectionComplete` — critique #1). This keeps memory readable to background push handlers that want to enrich a notification with memory context, while still encrypting at rest before first unlock after reboot.

### 12. Continuity / Handoff — concretely scoped

**Mobile moment served:** commute share.

`NSUserActivity` Handoff: the **session position cursor** hands off. Specifically, the (`session_id`, `last_seen_message_id`, `composer_draft_text`) tuple is published as `NSUserActivity` — pick up on Mac and you land at the same scroll position with your half-typed message restored. Anything beyond that tuple is **not** in the handoff payload (critique #3 — "what state actually hands off" was undefined; now defined).

**Handoff draft sensitivity** (R2 critique #2 minor): NSUserActivity Handoff payloads transit via iCloud-backed Bluetooth/Wi-Fi advertisement between the user's own devices and are not encrypted with this app's keys. The threat model treats Handoff as plaintext between user-owned devices, which is acceptable for a session-position cursor. To bound exposure: `composer_draft_text` is **truncated to 256 characters** in the Handoff payload (full draft remains on the originating device — pickup device gets the truncated string and a "draft truncated, full text available on original device" hint if the original exceeded 256 chars). Drafts shorter than 256 chars hand off in full. Documented in the privacy disclosure under "Apple Continuity / Handoff."

---

## Platform choice

**Decision: native — SwiftUI on iOS, Jetpack Compose on Android. Shared business logic in Kotlin Multiplatform.**

(Decision unchanged from rev 1; the three reasons hold: differentiation surface is OS features, App Store review posture matters in 2026, Apple FM is Swift-only. KMP for shared models, repositories, sync engine, relay client. UI stays per-platform.)

---

## Architecture diagram

```
┌────────────────────────────────────────────────────────────────┐
│  PHONE (iOS / Android)                                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  UI          │  │  On-Device   │  │  Local Storage       │  │
│  │  SwiftUI /   │  │  Apple FM    │  │  Sessions cache (RO) │  │
│  │  Compose     │  │  Gemini Nano │  │  Pending captures Q  │  │
│  │              │  │  WhisperKit  │  │  Attachment LRU      │  │
│  │              │  │  (capable    │  │  Voice buffer (5min) │  │
│  │              │  │   hw only)   │  │  Memory mirror (RO)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                     │              │
│  ┌──────┴─────────────────┴─────────────────────┴───────────┐  │
│  │  Shared (KMP) — Relay Client, Sync Engine, Models       │  │
│  └───────────────────────────┬───────────────────────────────┘ │
└──────────────────────────────┼─────────────────────────────────┘
                               │
                  ┌────────────┴────────────┐
                  │                         │
       ┌──────────▼──────────┐   ┌──────────▼──────────┐
       │   Tailscale         │   │   shay-relay        │
       │   (preferred if     │   │   (default —        │
       │    both ends are    │   │   Cloudflare        │
       │    on tailnet)      │   │   Durable Object,   │
       │                     │   │   WS Hibernation)   │
       └──────────┬──────────┘   └──────────┬──────────┘
                  │                         │
                  └────────────┬────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────┐
│  SHAY DESK (the user's Mac for full feature set;               │
│             Win/Linux desk = no screen-viewer surface)         │
│                                                                 │
│  Gateway (HTTPS + WS)                                           │
│      │                                                          │
│      ├─→ Job runner (persistent agents, brain pool)             │
│      ├─→ Brain registry (Claude / Codex / Gemini / OD)          │
│      ├─→ MCP host (local-stdio + HTTPS) — phone is a VIEWER     │
│      │     of this, not an MCP client itself                    │
│      ├─→ Basic Memory store (truth)                             │
│      ├─→ Data Center (jobs, ledgers, events.jsonl)              │
│      └─→ ScreenCaptureKit feed (macOS only, read-only stream)   │
│                                                                 │
│  Push: APNs / FCM via Anthropic-style notification server       │
└─────────────────────────────────────────────────────────────────┘
```

**Shay media edge** (P4 only — full-duplex voice path): not on the diagram above because it lands in P4 and the provider is selected at P4 entry (see Open Questions #6). When added, it sits parallel to the relay — phone WebRTC connects directly to the media edge for audio, while text/state continues over the relay path. Half-duplex voice in P3 uses the existing relay WebSocket — no media-edge component required.

**Online / Offline / Desk asleep states** — unchanged from rev 1 in shape.

**Tailscale is now the *fallback*, shay-relay is the *default*** (critique #2 minor): App Review increasingly asks apps that depend on a sister app to either bundle it or document the manual install. Defaulting to relay sidesteps the 2.1 metadata reject; Tailscale auto-activates only when the client detects the local Tailscale daemon and the desk is on the same tailnet.

**Universal links AASA + assetlinks.json**: `https://shay.famtastic.dev/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` ship at apex before P1 submission (critique #2 minor).

---

## Data model on device

(Schema mostly unchanged from rev 1, with these corrections:)

- **Voice transcript buffer**: ring expanded to **5 minutes**, with explicit "max length reached" indicator beyond.
- **`unread_count` semantics defined** (critique #3): a session is "unread" iff there is at least one *assistant message addressed to the user* (a question, an approval gate, a final result) that the user has not yet seen on this device. **Progress events do not count as unread.** A 14-event progress burst while the user slept is 1 unread (the final result), not 14. Badge increments on terminal state transitions only.
- **`payload_path` encryption**: capture payloads in the pending queue are written under `NSFileProtectionCompleteUntilFirstUserAuthentication` so background-launched share extensions can write to the queue.

**Secrets policy.** No cloud API keys on device. The device cert + identity tokens are the only secrets — see token lifecycle below.

**Token lifecycle** (critique #3 minor — closing the apparent contradiction):

- Device certificate: stored in Keychain/Keystore under biometric protection; never leaves secure enclave context; used only to mTLS to the relay/desk.
- Apple Sign-In / Google Sign-In identity tokens: short-lived (1h ID token, refresh via system), stored in Keychain under same biometric class. Used only to bind the device to a user record so a second device can pair via "trusted user" path without re-scanning a QR.
- No third-party cloud LLM API keys are ever sent to or stored on the device.

---

## Auth flow

**Pair-with-desk (first-run, primary path)** — QR + biometric mTLS cert flow (unchanged from rev 1).

**Pair-with-desk (second device, desk-not-present path)** — new in this revision (critique #1, #3 minor):

If the user has an existing paired device (e.g. their main phone is paired and they're now adding a tablet at the airport), the second device can pair via **Apple Sign-In / Google Sign-In identity bridge**:
1. Second device signs in with the same Apple/Google account already known to the relay.
2. Relay sends a push to the existing primary device asking "Approve new device: <model>?"
3. Primary device approves with biometric.
4. Relay issues new device cert to the second device.
5. **The desk can be asleep during this flow** — the desk learns about the new device on next wake and adds it to the allowed-cert list.

**Out-of-band first-pair (desk asleep at QR time)** — new (critique #1 minor): if no existing device is paired and the desk is asleep, the user receives an email link with a one-time pair token (24h validity) sent from the relay. The link, opened on a logged-in browser session of the relay control panel, completes the pair when the desk next wakes.

**Out-of-band pair confirmation** (R2 critique #1 minor — closing the email-mailbox attack surface): the email link alone is **not sufficient** to complete a pair. Opening the link in the relay control panel additionally requires either (a) re-entry of the relay account password *plus* a TOTP code from the relay's authenticator enrollment, or (b) a biometric confirmation from an already-paired device of the same user (if such a device exists on any tailnet/account, even one currently offline — the confirmation queues and the pair finalizes when that device next reaches the relay). A bare mailbox compromise cannot complete a pair without one of those two factors. Documented in the Auth section of the security disclosure.

**Apple Sign-In requirement (Guideline 4.8)**: if any third-party SSO appears on iOS, Apple Sign-In is **mandatory, not optional** (critique #1 minor). Current plan: Google Sign-In ships on Android only; iOS uses Apple Sign-In only — so the 4.8 trigger is avoided.

---

## Approval gates — tiered UX, on-device-generated summaries

This is the **most important behavioral change** in the revision. Critiques #2 and #3 both correctly flagged that "Approve: Shay wants to run `mv /Users/fritz/site-mbsh/dist/* /tmp/`" on a Lock Screen is meaningless when walking, and that a one-toggle "auto-approve safe tools" ships a foot-gun.

### Three risk tiers, three approval surfaces

| Tier | Examples | Approval surface |
|---|---|---|
| **Tier 0 — read-only** | search files, read URL, summarize, list dir, query memory | No approval required. Reduce-confirmations toggle defaults ON for this tier. |
| **Tier 1 — reversible writes** | save a draft, queue an email (not sent), create a calendar event in a separate "review" calendar | Phone push with **on-device-generated one-sentence summary** of action + blast radius + confidence badge. Approvable from phone or Watch. |
| **Tier 2 — destructive / irreversible** | `rm`, `mv` outside sandbox, deploy, send email/SMS, post publicly, charge a card, write to system locations | **Desk-only approval.** Phone shows "Approval pending on your desk" with a deep-link to open the desk approval UI via Handoff/Universal Clipboard. Phone *cannot* grant Tier 2. Watch cannot grant Tier 2. |

### Allowlist enforcement is on the phone, not the desk

Critique #2: the phone must be the enforcer, not trust a `destructive: true` flag the desk sets. Implementation:

- Phone holds a **hardcoded read-only allowlist** of tool identifiers that qualify for Tier 0/1.
- Any tool the phone has never heard of defaults to **Tier 2 (desk-only)**.
- Updates to the allowlist ship with app updates (App Store / Play Store reviewable), **not** server-pushed config.
- The "reduce confirmations" toggle is renamed from "Auto-approve safe tools" to **"Reduce confirmations for read-only tools"** — it cannot apply to anything that has network egress, write capability, or PII access regardless of what the desk claims about the tool.

### New-tool onboarding (R2 critique #1 minor — closing the UX cliff)

Because the allowlist ships only with app updates, every newly-installed MCP tool on the desk defaults to Tier 2 (desk-only approval) on the phone until the next app-store release. To avoid the UX cliff where a user installs a perfectly benign read-only MCP and suddenly has to walk to their desk to approve every call:

- **Signed manifest path:** the desk publishes a signed `tools.manifest.json` enumerating every tool's `(id, capability_class, requires_network, requires_write, requires_pii)` declaration, signed with the desk-side identity key. The phone verifies the signature against the keyring established at pair time, then *promotes* tools whose declared capability class is `read-only` to Tier 1 (still surfaces a summary, still requires approval — just from the phone instead of desk-only). Tier 2 *cannot* be downgraded by manifest — destructive-capable tools stay desk-only no matter what the manifest claims.
- **Manifest never grants Tier 0** — Tier 0 (no approval required) remains gated to the hardcoded allowlist alone. Manifest-promoted tools always go through at least the Tier 1 approval surface.
- This means a freshly installed read-only MCP gets phone approval immediately (no app-update wait) without weakening the security boundary against destructive-capable tools.
- Documented in the Settings → Security panel so users understand the difference between "hardcoded allowlist" (highest trust, Tier 0 eligible) and "signed manifest entry" (verified by the desk you paired with, Tier 1 eligible).

### On-device risk summary

When an approval gate fires on Tier 1, the phone runs Apple FM / Gemini Nano (capable hardware) or routes a sub-second classification request to the desk (other hardware) to produce a **one-sentence "what happens if approved" summary plus a confidence/risk badge** (green / amber / red). The user sees something like: "Sends an email to 47 people about the brand kit launch. Reversible: no. Confidence in summary: high." rather than a raw shell command.

If the on-device classifier returns low confidence on a Tier 1, the gate is **auto-escalated to Tier 2 (desk-only)** rather than presenting a low-confidence summary the user might over-trust. Critique #2's exact concern.

### Fallback when the desk-routed summary doesn't arrive (R2 critique #2 major)

The summary mechanism has a real failure mode on the ~70–80% of iOS hardware without Apple Intelligence: the phone routes a sub-second classification request to the desk to produce the summary, but the desk may be the very thing waiting on the approval, may be asleep, or the network may be flaky. Specified behavior:

- **Timeout:** the phone waits **1.5 seconds** for the desk-routed summary.
- **On timeout, auto-escalate to Tier 2 (desk-only).** This is the same handling as low-confidence Tier 1. The push notification updates in place to "Approval pending — open desk to review" with a Handoff deep-link. The user is **never** shown a raw command on the Lock Screen with no summary; we'd rather force a desk trip than ship the foot-gun.
- **Phone never holds a blocking spinner on a push notification.** The push fires immediately with a tier-aware generic template ("Tier 1 reversible write requested — generating summary…"); the in-place update either replaces the generic line with the real summary or escalates to Tier 2 within 1.5s.
- This means: on AI-capable hardware the user gets the rich summary; on non-AI-capable hardware with reachable desk they get the rich summary slightly later; on non-AI-capable hardware with unreachable desk they get an honest "approve at the desk" prompt. The approval gate UX works everywhere; the *summary* is the premium-hardware-or-online-desk feature.

---

## Mobile-specific surfaces

Revised table — each surface tied to a mobile moment, with phase corrected.

| Surface | iOS mechanism | Android mechanism | Mobile moment | Phase |
|---|---|---|---|---|
| Share extension (HEADLINE) | `UIActivityViewController` ext | `ACTION_SEND` intent receiver | commute share | P1 |
| Action Button voice capture | Action Button API (iPhone 15 Pro+) | Assist gesture / power-button long-press | hands-busy voice | P1 |
| Lock Screen control (iOS 18 Controls API) | `ControlWidgetButton` + `AppIntent` (intents work when locked; sensitive ones present biometric in-line) | Quick Settings tile | meeting capture | P1 |
| Pair QR scanner | `AVCaptureMetadataOutput` | ML Kit Barcode | (pairing) | P1 |
| Microphone + on-device STT (capable hw) | AVAudioEngine + WhisperKit small (default) / large-v3 (opt-in Wi-Fi download) | AudioRecord + whisper.cpp GGML small.q5_1 (or SpeechRecognizer fallback) | hands-busy voice | P1 |
| Push notifications (basic) | APNs alert | FCM high-priority | bedtime triage | P1 |
| Live Activity (in-flight job, ≤8h cap) | ActivityKit + Dynamic Island | `FOREGROUND_SERVICE_SPECIAL_USE` + notification | bedtime triage | P2 |
| Notification Service Extension (rich push) | NSE with mutable-content (image URLs HTTPS, <30s download — relay must serve via public CDN, not Tailscale-only path) | FCM message + notification helper | bedtime triage | P2 |
| Approval gate UI (tiered) | Push with action buttons + in-app card | Notification with action buttons + in-app card | approve-or-deny | P2 |
| Deterministic App Intents | `AppIntent` (named routines only, not free-form Ask) | App Actions (limited) | meeting capture, hands-busy voice | P2 |
| Photo / PDF intake | PHPicker + Photos framework | MediaStore + DocumentsContract | commute share | P2 |
| Camera | AVCaptureSession | CameraX | commute share | P2 |
| Android read-only log viewer | — | Compose stream view | (developer mode) | P2 |
| Per-brain Ask intents (Ask Shay-Claude, etc.) | `AppIntent` per brain, each declaring model honestly | App Actions | meeting capture | P3 |
| Watch dictate-a-capture | watchOS app + dictation | (Wear OS deferred indefinitely) | hands-busy voice | P3 |
| Watch glanceable status (one job, one bar, elapsed) | ComplicationKit + watchOS app | — | bedtime triage | P3 |
| Read-only screen viewer (Mac desk only) | MTKView render of streamed pixels, NO input events | (Win/Linux desk unsupported) | (emergency unstick) | P3 |
| Continuity Handoff (session position + draft tuple) | NSUserActivity | — | commute share | P3 |
| Half-duplex streaming voice + cancel-button interrupt | AVAudioEngine + WebSocket streaming + visible Stop button | AudioRecord + WebSocket | hands-busy voice | **P3** |
| Full-duplex voice + barge-in (WebRTC + media edge) | WebRTC to Shay media edge (provider TBD pre-P4) | WebRTC | hands-busy voice | **P4** |
| Action Button → locked-phone voice flow | CallKit + VoIP push (replaces PTT framework, see below) | n/a | hands-busy voice | P4 |
| Android developer-mode read/write terminal | — | Compose terminal behind Settings toggle | (developer mode) | P4 |

**PushToTalk framework is dropped.** Critique #1 and #2 both flagged that Apple's PTT entitlement is gated to human-to-human walkie-talkie use cases and routinely denied for AI assistants. The locked-phone voice flow uses **CallKit + VoIP push** instead — an "incoming call from Shay" pattern that has its own approval gate but is achievable for AI assistant apps and matches a more honest mental model ("ring Shay when you need it, talk like a phone call").

**CallKit / PushKit entitlement risk** (R2 critique #1 minor — parallel to the PTT analysis): Apple has tightened PushKit eligibility through 2025–2026, rejecting apps that use CallKit to front non-call experiences (e.g. "AI as phone call" framings without an actual second-party voice channel). Our framing is *honest*: there is a real bidirectional voice session at the other end (the Shay desk media edge with TTS/STT acting as the called party). The CallKit incoming-call UI maps to a genuine voice session that the user accepts or declines. We do **not** use CallKit to (a) front a chat-only experience, (b) bypass background-execution limits, or (c) display arbitrary content as "call" metadata. Submission posture: P4 entitlement request is filed with a written justification mirroring the PTT analysis (real bidirectional voice, real "ring" semantics, user can decline, no background-execution abuse). If denied, the fallback is **locked-phone voice unavailable** — the Action Button still works on the unlocked phone, and the locked-phone moment degrades to "wake phone, press Action Button." This is an acceptable degradation and is documented in the Risks section.

---

## On-device AI decision tree (revised)

```
Voice or text input received
  │
  ├─ Is this device Apple-Intelligence-capable or Gemini-Nano-capable?
  │     ├─ no  → cloud route (desk relay → cloud brain); on-device branch unavailable
  │     └─ yes → continue
  │
  ├─ Is the network reachable AND desk reachable?
  │     ├─ no  → on-device brain handles what it can (classify, summarize, draft);
  │     │        result queued for sync; UI shows "drafted offline — will send when reconnected"
  │     └─ yes → continue
  │
  ├─ Is the request a classification, summarization, arg-extraction,
  │  or approval-summary task?
  │     └─ yes → on-device first (latency win + no token cost),
  │              with cloud as logit-margin-fallback
  │
  └─ Otherwise → cloud brain (Claude / Codex / Gemini per session brain pick)
```

Capability sourcing unchanged from rev 1 (Apple FM 4096 ctx, Gemini Nano 510-940 tok/s, Apple FM iOS 26+ on AI-capable hardware only).

---

## App Store / Play Store review risk — revised

Revised mitigation table — every claim cross-checked against critiques #1 and #2.

| Risk | Mitigation (revised) |
|---|---|
| Guideline 2.5.2 — dynamic code execution | **No terminal surface on iOS in any phase.** No shell-over-network UI. Live Activity content is structured data, not code. |
| Guideline 4.7 — code execution patterns | No remote-PTY tab. Read-only screen viewer is pixels-in, no synthetic input events from phone. |
| Agent-app crackdown (Winbuzzer Mar/May 2026) | Phone binary contains no code path that converts AI output into input events on a remote machine. Agentic loops stay desk-side. App Store description avoids "agent" — uses "remote companion for your desktop AI workspace." |
| 5.1.2(i) — AI data sharing | **Per-brain disclosure UI before first use of each brain** (Claude, Codex, Gemini), each with vendor name, data-flow description, retention policy reference, and link to that vendor's privacy entry in our privacy policy. **Privacy nutrition label declares each vendor under Third-Party Advertising/Diagnostics as appropriate.** Share extension defaults to on-device + desk-only routing; cloud routing from share extension requires one-time per-brain confirmation. |
| Personal remote desktop framing | Read-only viewer only. Mac desk only. Opt-in on desk (ScreenCaptureKit consent + visible macOS menubar indicator). Phone shows no agentic-input affordance. |
| PushToTalk entitlement | **Not requested.** Locked-phone voice uses CallKit + VoIP push instead. |
| ScreenCaptureKit | macOS-only, desk-side. Phone never requests it. Win/Linux desks have no screen-viewer surface. |
| FOREGROUND_SERVICE type misdeclaration (Android) | **`FOREGROUND_SERVICE_SPECIAL_USE`** with pre-drafted Play Console declaration. Not `dataSync`. |
| Hidden features (Guideline 2.3.1) | Post-install WhisperKit large-v3 model download is user-gated, Wi-Fi-only, **disclosed in App Store description**. |
| Privacy nutrition label honesty | "Crash diagnostics only, no behavioral analytics" — declares MetricKit / Sentry under Diagnostics. No "no analytics" claim. |
| Apple Sign-In (Guideline 4.8) | Required if any 3rd-party SSO on iOS. We ship Apple Sign-In on iOS only; Google Sign-In on Android only — no trigger. |
| Crash telemetry SDK disclosure | Sentry declared in nutrition label under Diagnostics. |
| Universal links | AASA + assetlinks.json shipped at apex pre-submission. |
| Tailscale dependency framing | Relay is default; Tailscale is auto-activated fallback. App functions without Tailscale installed. App description does not require user to install another app. |
| App name | "Shay for FAMtastic" (not bare "Shay" — one-word brand names are routinely held for trademark conflict checks per critique #2). |
| Reportable model outputs | "Report objectionable output" affordance on every assistant message per Guideline 1.2 — covers cloud brains AND on-device FM/Nano outputs. |
| Age rating | **12+** (verified against current Claude listing — original "17+" was wrong). |

**Behind-toggle features** (default OFF, user must enable in Settings):

- Cloud routing from share extension (default routes on-device + desk-only)
- Read-only screen viewer (Mac desk only, desk-side opt-in required)
- "Reduce confirmations for read-only tools" (renamed — and bounded by hardcoded read-only allowlist)
- Action Button background voice capture
- Wi-Fi download of WhisperKit large-v3
- Android developer mode → read-only log viewer (P2) / read-write terminal (P4)

---

## Phase plan (revised)

### Phase 1 — Capture & Pair (weeks 1–4)

**Goal:** the headline mobile surfaces work — share extension, Action Button voice capture, Lock Screen control, basic push. Chat UI exists but is secondary.

Ships:
- Pair-with-desk QR flow + out-of-band email-link fallback + identity-bridged second-device flow
- mTLS cert in Keychain/Keystore + biometric unlock
- **Share extension as headline surface** (text, URL, image, PDF) — defaults to on-device classification + desk-only routing
- **Action Button voice capture** (iPhone 15 Pro+) → WhisperKit small → on-device classify (capable hw) or sub-second cloud classify (other hw)
- **Lock Screen control** (iOS 18 Controls API) — "Capture to Shay" tile, biometric-gated for cloud routing
- Sessions list + chat UI (secondary tab, read-only mirror of desk)
- Streaming tokens over WebSocket
- Brain picker (Claude only in P1, per-session default)
- Push notifications (basic alert)
- Per-brain 5.1.2(i) disclosure on first use of Claude
- Settings: account, pair status, log out, privacy disclosures

Smoke: pair on fresh device <90s; pair second device with desk asleep (email link); share a URL from Safari → lands as new capture on desk; press Action Button → speak → release → capture appears in inbox with on-device classification pill resolving asynchronously.

### Phase 2 — Live Activities, Approvals, Deterministic Intents (weeks 5–9)

Ships:
- WhisperKit STT pipeline + Android whisper.cpp / SpeechRecognizer fallback with WER baselines documented
- **Tiered approval gate UI** with on-device risk summaries and hardcoded read-only allowlist
- Live Activity for in-flight jobs (≤8h cap with graceful degradation)
- Android `FOREGROUND_SERVICE_SPECIAL_USE` with Play Console declaration
- Notification Service Extension (rich pushes, CDN-served images)
- **Deterministic App Intents only** (named routines, not free-form Ask)
- Photo + PDF intake
- Android read-only log viewer (developer-mode behind Settings)
- "Reduce confirmations for read-only tools" toggle (bounded by allowlist)

Smoke: dictate 5-minute voice note offline → on reconnect, capture flushes; start desk job → LA appears <2s; LA graceful-degrades at the 8h mark without losing job state; Tier 1 approval push shows readable on-device summary; Tier 2 attempt from phone shows "approve on desk" deep-link.

### Phase 3 — Watch, Per-Brain Intents, Half-Duplex Voice, Read-Only Viewer, Handoff (weeks 10–15)

Ships:
- watchOS companion: dictate-a-capture + one-job glanceable status
- Per-brain Ask intents (Ask Shay-Claude, Ask Shay-Gemini, Ask Shay-Codex) with honest model metadata
- Multi-brain switcher unlocked (Codex + Gemini routes added) with mid-message disclosure flow
- **Half-duplex streaming voice with visible cancel-button interrupt** (no WebRTC, no media edge — those move to P4)
- Read-only screen viewer (Mac desk only, no synthetic input)
- Continuity Handoff (session position + draft tuple, 256-char draft truncation)
- Action Button mapping (extended)

Smoke: dictate from Watch → capture lands; start a long model response and tap Stop mid-stream — TTS cuts within 200ms, mic reopens; tap pixel-stream of desk screen and verify no input is sent; Handoff session position from phone to Mac restores composer draft.

### Phase 4 — Full-Duplex Voice, Locked-Phone Voice, Developer Mode (weeks 16–19)

Ships:
- **Full-duplex voice + barge-in via WebRTC to Shay media edge** (provider selected and architecture-diagrammed before phase entry — see Open Questions)
- CallKit + VoIP push for "incoming call from Shay" locked-phone voice flow (replaces PTT framework), with documented degradation if entitlement is denied
- Android developer-mode read/write terminal (behind Settings, disclosed in Play listing)
- **iOS 27 Siri Extensions integration — conditional**: ships only if iOS 27 GA arrives before week 18 (week 18 ≈ mid-October 2026; iOS 27 typically GAs late September). If iOS 27 GA slips, this drops to a P5 follow-up rather than blocking P4 ship.

Smoke: full-duplex voice session — user interrupts model mid-utterance and model stops within 300ms; locked phone "rings" with Shay incoming call via VoIP push, voice flow runs; if iOS 27 GA missed, the Siri Extension smoke is skipped without blocking phase exit.

---

## Cost + timeline estimate (revised)

Critique #1 correctly flagged the original 620 eng hours as dramatically low for the full scope (industry benchmark 2,000–3,500 hours). Revised scope is also smaller (terminal dropped, computer-use bridge degraded to read-only viewer, graph viewer dropped, full feature surface defined in concrete mobile moments), and R2 critique #1 correctly flagged that P3 was overstuffed at 700 hours when WebRTC full-duplex was bundled in. P3 has been re-budgeted (half-duplex with cancel-button interrupt only, no media edge), and the WebRTC + media edge work moved to its own focused P4. Cost table reflects the reshuffle.

| Phase | Engineering hours | Review back-and-forth hours | Cloud cost (tokens + media-edge minutes) | Calendar |
|---|---|---|---|---|
| P1 Capture & Pair | 420 | 24 | $80 | 4 weeks |
| P2 LA / Approvals / Intents | 560 | 32 | $140 | 5 weeks |
| P3 Watch / Per-Brain / Half-duplex Voice / Viewer / Handoff | 520 | 32 | $180 | 6 weeks |
| P4 Full-duplex Voice (WebRTC + media edge) / CallKit-VoIP / Dev mode / iOS 27 (conditional) | 460 | 32 | **$600 (token + media-edge smoke testing — see below)** | 4 weeks |
| **Totals** | **1,960** | **120** | **~$1,000** | **19 weeks** |

**Engineering hours column is engineering only**; review back-and-forth is tracked separately. Loaded total including review = 2,080 hours.

**Cloud cost line items** (R2 critique #1 minor — original $480 was not justified):
- P1–P3 cloud cost ($400 combined): smoke-test tokens against Claude/Codex/Gemini at desk-side rates during dev iteration.
- P4 cloud cost ($600): WebRTC media-edge minutes during full-duplex smoke testing — using OpenAI Realtime or equivalent at ~$0.06/min for STT+LLM+TTS round-trip, budgeted ~10,000 minutes (167 hours of test sessions across the phase) to validate barge-in, jitter buffer, and reconnect behavior. If we settle on a self-hosted media edge during P4 architecture work, this drops to roughly $200 (egress + compute only).

The 1,960-hour revised total remains at the low end of the 2,000–3,500 industry benchmark for native iOS + native Android + KMP + watchOS + share ext + NSE + ActivityKit + WhisperKit + Foundation Models + Cloudflare DO relay + WebRTC media edge — defensible because computer-use is passive, terminal is dropped, graph is dropped, and full-duplex voice is properly phased rather than rammed into P3.

Apple Developer ($99/yr) and Google Play Console ($25 one-time) are sunk.

Gates that block phase advance: TestFlight + Internal Testing build approved, manual smoke 100% green, no P0 bugs in `.wolf/buglog.json`, SITE-LEARNINGS.md + CHANGELOG.md updated.

---

## Risks + mitigations — top 5 (revised)

### 1. App Store rejection on agent framing

App Store listing avoids "agent" — uses "remote companion for your desktop AI workspace." Privacy nutrition label is comprehensive and honest. First submission is P1 (capture + share + pair only — no Live Activity yet, no screen viewer, no Watch, no terminal). Reviewer trust established before P2 ships approvals and Live Activity. Pre-WWDC June 8 we have the option of paying for Apple Developer Tech Support consultation if a reviewer flags.

### 2. Live Activity 8h cap breaks the "your desk just finished" promise on long jobs

Already addressed in plan: checkpoint chunking, graceful degradation to "last update HH:MM, still running" + silent-push re-spawn. APNs LiveActivity push budget respected (≤1 update/min sustained).

### 3. On-device-AI differentiator only addressable on ~20–30% of iOS install base

Honest hardware tier: on-device option is **hidden** on non-AI-capable hardware. UX is identical (cloud-routes sub-second), the on-device latency win is just absent. Marketing claims that depend on on-device must explicitly say "on iPhone 15 Pro and later" rather than implying all hardware.

### 4. Approval-gate foot-gun (auto-approve mis-classifies a destructive action)

Hardcoded read-only allowlist on phone, app-update-controlled. Tier 2 is desk-only — phone literally cannot grant it regardless of any toggle. Low-confidence Tier 1 auto-escalates to Tier 2.

### 5. Tailscale / relay / network dependencies

Relay is default. Tailscale auto-detected fallback. App functions without Tailscale installed. AASA + assetlinks.json shipped at apex pre-submission. NSE image URLs served via public CDN, not via Tailscale-only paths (would fail cert validation from Apple's push infrastructure).

### 6. CallKit / PushKit entitlement denial (P4)

Apple has tightened PushKit eligibility through 2025–2026 and has rejected apps that front non-call experiences with CallKit. Our justification is honest (real bidirectional voice session with TTS/STT at the desk-side media edge acting as the called party), but denial is non-zero risk. Mitigation: P4 phase entry includes the entitlement filing as the first work item, not the last. If denied, the documented degradation is "locked-phone voice unavailable; Action Button on unlocked phone still works" — the rest of P4 ships unaffected. No part of the plan depends on CallKit working for an MVP-shippable feature.

### 7. P3 schedule slip if half-duplex voice + watchOS + per-brain intents + viewer + Handoff all run hot

P3 is the busiest phase at 520 hours across 6 weeks. The biggest risk is that half-duplex voice with cancel-button interrupt turns out to need more work than budgeted (TTS stream cancellation across iOS/Android audio sessions is finicky). Mitigation: half-duplex voice and per-brain intents are the two P3 items that can slip to a P3.5 mini-phase between P3 and P4 without blocking the rest. The read-only viewer, watchOS app, and Handoff are independent and ship even if voice slips.

---

## Open questions (resolve before Phase 1 starts)

1. **Relay provider:** Cloudflare DO (lowest unit cost) vs Convex vs self-hosted Fly.io. Lean: Cloudflare WS edge + Convex metadata DB.
2. **Memory mirror format:** sqlite snapshot vs JSONL vs Basic Memory git clone. Lean: sqlite snapshot with monotonic version cursor.
3. **Watch UI scope:** dictate + one-job-status (P3) is the floor — anything more added in P4?
4. **Android STT WER baseline:** is whisper.cpp small.q5_1 acceptable on Pixel 7, or do we fall back to platform SpeechRecognizer? Spike before P2 entry.
5. **App name in stores:** "Shay for FAMtastic" leans most defensible against trademark hold — confirm with counsel.
6. **Media-edge provider for P4 full-duplex voice** (resolve before P4 entry, not P1): OpenAI Realtime API ($0.06/min, fastest to integrate, vendor lock) vs LiveKit Cloud + own STT/TTS ($0.015/min media + STT/TTS cost, more moving parts) vs self-hosted LiveKit on Fly.io ($200/mo flat, full control). Lean: LiveKit Cloud during P4 build, evaluate self-host after 90 days of production data. Architecture diagram updates to add the Shay media edge component once selected.

---

## Appendix: source map

(Unchanged from rev 1 — Anthropic iOS apps docs, Apple FM docs + TN3193 + InfoQ Mar 2026, Android Gemini Nano + ML Kit GenAI + Android Authority benchmarks, WhisperKit GitHub + arxiv 2507.10860, OpenAI Realtime/WebRTC blog, Cloudflare DO WebSocket Hibernation docs, 2026 framework comparisons, Winbuzzer May 2026, 9to5Mac Mar 2026.)

---

## Response to critique

Three adversarial critiques returned **revise-major** with overlapping concerns. Every major issue has been addressed; here is the disposition trace.

**Critique #1 (platform-policy realism):**

- *Terminal as first-class tab* → **Dropped from iOS entirely.** Android-only behind a developer-mode entitlement, not a tab.
- *Computer-use mirror with tap-to-click* → **Degraded to read-only viewer, Mac desk only.** Phone ships no code path that produces synthetic input events on the remote desk. Agentic CU stays desk-side.
- *Live Activity "until job ends"* → **Acknowledged 8h hard cap + APNs LA budget.** Plan now specifies checkpoint chunking, graceful degradation to "last update HH:MM, still running", and ≤1 update/min sustained.
- *Apple FM available on iOS 18+ across iPhone 13+* → **Corrected.** Foundation Models requires iOS 26+ on Apple-Intelligence-capable hardware (iPhone 15 Pro/Pro Max, iPhone 16 line, M-series iPad). Addressable market explicitly stated as ~20–30% of iOS install base; on-device option hidden on non-capable hardware.
- *PushToTalk for AI* → **Dropped.** Replaced with CallKit + VoIP push for locked-phone voice.
- *"Lightweight MCP client"* → **Reframed.** Phone is a viewer of the desk's MCP host, not an MCP client. Differentiation is desk-mediated access, which was already in the architecture.

Minor items addressed inline: Android FGS cap clarified, Controls API "without unlock" corrected to "intents that work locked", ScreenCaptureKit positioned as macOS-only (Win/Linux desks have no viewer), voice buffer expanded to 5 minutes, WhisperKit on Android replaced with whisper.cpp / SpeechRecognizer fallback, Apple Sign-In 4.8 trigger documented, out-of-band pair path added for desk-asleep first-run, `NSFileProtectionComplete` downgraded to `NSFileProtectionCompleteUntilFirstUserAuthentication` for background-handler readability, cost estimate raised from 620 to 1,960 hours.

**Critique #2 (App Store / Play Store hardening):**

- *Terminal tab as P1* → Dropped (iOS); developer-mode Android-only (P4).
- *Computer-use bridge collapses Jump Desktop defense* → Split into "viewer-only" (P3) and "agentic stays desk-side."
- *Background execution + FGS dataSync misdeclaration* → Live Activity 8h cap acknowledged; Android switched to `FOREGROUND_SERVICE_SPECIAL_USE` with pre-drafted Play Console declaration.
- *5.1.2(i) consent screen insufficient* → Per-brain disclosure UI before first use of each brain, with vendor data-flow description, retention policy reference, and per-vendor entries in privacy nutrition label. Share extension defaults to on-device + desk-only routing; cloud routing requires one-time per-brain confirmation.
- *Polymorphic "Ask Shay" intent misrepresents model* → Dropped. P2 ships deterministic intents only; P3 ships per-brain Ask intents that honestly declare the underlying model.
- *WhisperKit privacy posture + Android port hand-wave* → Privacy strings written for `NSMicrophoneUsageDescription` ("processed on this device"); WhisperKit small (~150 MB) shipped as default, large-v3 user-gated Wi-Fi download disclosed in App Store description per 2.3.1; Android pinned to whisper.cpp GGML small.q5_1 with `SpeechRecognizer` fallback, WER baseline budgeted before P2 entry.
- *PushToTalk* → Dropped. CallKit + VoIP push instead.
- *Auto-approve safe tools foot-gun* → Renamed "Reduce confirmations for read-only tools"; bounded by **hardcoded read-only allowlist enforced on phone** (not desk-claimed flag); Tier 2 actions can never be granted from phone regardless of toggle.

Minor items: age rating corrected to 12+; app name now "Shay for FAMtastic"; privacy label declares Sentry under Diagnostics; Tailscale demoted to fallback (relay is default); AASA + assetlinks.json scheduled pre-submission; Apple Sign-In 4.8 trigger documented and avoided; "Report objectionable output" affordance added per Guideline 1.2; ScreenCaptureKit macOS consent dialog + menubar indicator surfaced in desk-side onboarding; NSE image URL CDN-served (not Tailscale-only); FOREGROUND_SERVICE_SPECIAL_USE Play Console declaration pre-drafted.

**Critique #3 (mobile UX honesty):**

- *Reverse-engineered from APIs, not from mobile moments* → Plan now opens with **five concrete mobile moments**; every surface ties back to one. Features that don't survive the walking-commuter test are cut.
- *Terminal is desktop thinking* → Dropped (iOS); read-only log viewer behind developer mode (Android P2); read/write terminal behind developer mode (Android P4).
- *Computer-use bridge fails one-handed test* → Recast as emergency-access read-only viewer, P3, Mac-only, removed from main differentiation list.
- *Approval UX has no human design around the mechanism* → **Tiered approval UX with on-device-generated one-sentence summaries + risk badges**; Tier 2 hard-gated to desk-only.
- *Voice positioned as differentiator with bad entry friction* → **Action Button + Lock Screen control ship in P1, not P3.** Full-duplex + interrupt-mid-response moved from P4 to P3. STT speed only matters when entry friction is also low — now it is.
- *Watch is doing too much* → Watch ships only dictate-a-capture + one-job glanceable status. Approve/deny on Watch restricted to reversible classes; never Tier 2.

Minor items: share extension promoted to **headline P1** (chat UI demoted); out-of-band re-pair path added; honest LA elapsed-time string replaces fake ETA; on-device classification is async at capture time (capture lands instantly, classification pill resolves later); token lifecycle documented (cert + identity tokens); graph viewer dropped, replaced with list/search/recents; Continuity Handoff payload defined as (`session_id`, `last_seen_message_id`, `composer_draft_text`) tuple; per-message brain switching demoted to long-press power-user setting; `unread_count` defined to count user-addressed messages only (progress events do not count); full-duplex interrupt explicitly called out as worth more than 80% of P4.

**Strengths preserved across all three critiques:**

- Server-side jobs + push as the only viable persistence pattern — retained as the core architectural commitment.
- mTLS device cert in Secure Enclave + biometric unlock + per-action approval gates — retained and strengthened (allowlist now phone-enforced).
- Native + KMP decision — retained for the same OS-features reason all three critiques endorsed.
- No API keys on device — retained; token lifecycle now explicit.
- Phase gating with TestFlight + smoke checklist + buglog hygiene — retained.
- Pending captures queue with content-hash idempotency — retained, with payload encryption class corrected.

---

## Response to R2 critique (rev 2 → rev 3)

Two R2 critiques returned **ship** and **revise-minor** respectively. The revise-minor verdict surfaced two major issues plus minor items; the ship verdict surfaced seven minor items. All addressed below.

**R2 Critique #2 major #1 — P3 full-duplex voice + media edge not credible at 700 hours, media edge undefined.** Accepted. Full-duplex voice + WebRTC media edge moved from P3 to P4 (its own focused phase). P3 ships **half-duplex streaming voice with cancel-button-to-interrupt** instead — ~70% of the interrupt-mid-response value at ~15% of the engineering cost. P4 calendar extended from 3 weeks to 4 weeks. Total calendar moves from 18 to 19 weeks. Media edge provider added to Open Questions (LiveKit Cloud lean, decided at P4 entry). Architecture diagram annotated.

**R2 Critique #2 major #2 — On-device risk-summary fallback when desk unreachable not specified.** Accepted. New "Fallback when the desk-routed summary doesn't arrive" subsection: 1.5s timeout, auto-escalate to Tier 2 (desk-only) on timeout, never show raw command on Lock Screen, push fires immediately with tier-aware generic line and either updates in place with the real summary or escalates within 1.5s. Approval gate UX now works everywhere; the rich *summary* is the premium-hardware-or-online-desk feature.

**R2 Critique #1 minors (all 7 addressed):**

1. *P3 schedule risk for full-duplex voice + WebRTC* → Resolved structurally by moving full-duplex to P4. P3 risk flagged in Risks section #7 with explicit slip path (P3.5 mini-phase between P3 and P4).
2. *CallKit + VoIP push entitlement risk* → New paragraph parallel to PTT analysis. Honest framing (real bidirectional voice with TTS/STT at media edge as called party), entitlement filed as P4 first work item, documented degradation if denied (locked-phone voice unavailable; rest of P4 ships).
3. *New-tool onboarding UX cliff* → New "New-tool onboarding" subsection. Signed manifest path: desk publishes signed `tools.manifest.json`; phone verifies and promotes declared `read-only` tools to Tier 1 (manifest cannot grant Tier 0; Tier 2 cannot be downgraded by manifest). Read-only MCPs get phone approval immediately without app-update wait.
4. *WhisperKit small default disclosure* → 2.3.1 disclosure language updated to cover both the default ~150 MB and the opt-in ~1.5 GB download.
5. *Per-brain Ask intent metadata* → New paragraph specifying `INIntentMetadata` declares model and vendor explicitly; first-use of an intent triggers 5.1.2(i) disclosure if not yet completed for that brain.
6. *Cloud cost line-items* → Cost table updated with per-line-item justification. P4 raised to $600 (WebRTC media-edge minutes at ~$0.06/min × ~10,000 test minutes); self-host fallback noted as dropping to ~$200. Total revised to ~$1,000.
7. *Out-of-band email-link attack surface* → New paragraph: email link alone is not sufficient; requires either (a) re-entry of relay password + TOTP code, or (b) biometric confirmation from an already-paired device (queues if none online). Bare mailbox compromise cannot complete a pair.

**R2 Critique #2 minors (all 6 addressed):**

1. *Lock Screen control biometric contradiction* → New §0 "Lock Screen control — honest about the biometric." P1 default destination is "Capture to desk inbox" (no biometric, no cloud egress); cloud routing from Lock Screen is a secondary destination that triggers Face ID. P1 smoke test reflects this honestly.
2. *Mid-message brain switch disclosure* → New paragraph in §2: long-press brain switch to a not-yet-disclosed brain blocks send with full-screen disclosure modal; composer preserved; cancel restores previous brain.
3. *Handoff `composer_draft_text` sensitivity* → New paragraph in §12: draft truncated to 256 chars in Handoff payload (full draft remains on origin device); documented in privacy disclosure under "Apple Continuity / Handoff."
4. *iOS 27 Siri Extensions timing honesty* → P4 ships condition explicit: only if iOS 27 GA arrives before week 18; otherwise drops to P5 follow-up. P4 smoke skipped without blocking phase exit.
5. *"Recents" definition* → New paragraph in §11: defined as last 20 memory notes viewed/captured-into/referenced by user-addressed assistant messages. Three other "recents" (sessions, captures, approved actions) each live on own tab with tooltip-on-long-press definitions.
6. *Cost table column clarity* → Cost table headers clarified: "Engineering hours" is engineering-only; "Review back-and-forth hours" tracked separately; loaded total = 1,960 + 120 = 2,080 hours, called out explicitly.

**Strengths reinforced (R2 ship verdict explicitly endorsed):**

- Five mobile moments as load-bearing framing — preserved.
- Tiered approval UX with phone-enforced hardcoded allowlist — preserved and extended with manifest-based onboarding path.
- Honest hardware-tier framing for on-device AI — preserved.
- WhisperKit-small default with opt-in large — preserved; disclosure scope expanded to default.
- PTT dropped for CallKit + VoIP push — preserved; CallKit risk now analyzed parallel to PTT.
- Live Activity 8h cap concrete mitigation — preserved.
- Per-critique disposition traceability — preserved and extended through R2.

End of revised plan (rev 3).
