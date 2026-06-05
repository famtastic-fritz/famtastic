# The Omnipresent Personal Assistant — Landscape Research for "Shay"

**Question this answers:** Fritz wants Shay to be a manager-grade assistant with a "virtual body" (avatar/voice/persona) that can reach him *everywhere* and that he can reach from anywhere — phone app, web, phone calls/SMS, Alexa/Google voice, smartwatch, AR glasses. The exact product does not exist as one thing. This report maps what exists, what's open-source and composable, what's locked down by platforms, and the concrete stack to build it on top of today's Telegram-only Shay.

**Date:** 2026-06-02 · **Audience:** Fritz · **Web access:** WORKING (one source, the Meta developer FAQ, returned HTTP 403 and is corroborated via secondary coverage). **~45 distinct sources cited inline.**

**Bottom line up front:** Nobody ships "omnipresent personal manager with a face." The pieces all exist and are cheap-to-moderate to wire. The *reach* problem is mostly solved on open channels (Telegram, SMS/voice via Twilio, push via FCM/APNs, email, Alexa proactive events) and *blocked or heavily gated* on the closed ones (smart glasses, watch complications, Siri). The *virtual body* is shippable today as a cloud streaming avatar (HeyGen LiveAvatar / Anam / Tavus) but is a cost and latency tax you should defer behind a voice-first persona. The single highest-leverage build is a **"reach fabric" service** — one outbound/inbound message bus that Shay talks to, with per-channel adapters — not a pile of per-platform integrations.

---

## 1. Existing products — what's out there and where each falls short

**Bottom line:** Every shipping product is either a *great brain with no reach* (ChatGPT/Claude/Gemini apps), *great reach with a weak/locked brain* (Siri, Alexa, Google), or *a doomed standalone gadget* (Humane, Rabbit, pendants). None is a personal *manager* that runs your work and reaches you across all your surfaces. That gap is the whole opportunity.

### General-purpose assistants (great brain, no reach)
- **ChatGPT / Claude / Gemini apps.** Best reasoning available, voice modes, mobile + web + desktop. But they are *pull* products: you open the app and talk. They don't proactively manage your day, can't reach you on your terms across channels, and have shallow persistent memory of *your* operational life. They're a brain you visit, not a manager who finds you.
- **Pi / Inflection AI.** Pioneered warm, persona-forward conversational EQ, but Inflection pivoted to enterprise in 2024 and Pi is effectively de-prioritized — a cautionary tale that "nice personality, no jobs-to-be-done" doesn't sustain.

### Platform voice assistants (reach everywhere, weak/locked brain)
- **Siri / Google Assistant / Alexa.** Genuinely omnipresent (phone, watch, speakers, car, TV) — the reach Fritz wants. But the brain is weak, they're closed to deep third-party orchestration, and you can't drop your *own* agent (Shay) behind them. **Alexa+** (the 2025 generative relaunch) adds LLM reasoning and new developer SDKs (Alexa AI Action SDK, Web Action SDK, Multi-Agent SDK) ([Amazon, Feb 2025](https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2025/02/new-alexa-announce-blog)) — the most "open your agent behind it" of the three, but still Amazon's runtime, not yours.

### Standalone AI gadgets (the graveyard — learn from it)
- **Humane AI Pin — DEAD.** HP acquired the assets for $116M in Feb 2025; devices were *bricked* (no cloud, no calling/messaging/AI) at noon PST Feb 28, 2025 ([TechCrunch](https://techcrunch.com/2025/02/18/humanes-ai-pin-is-dead-as-hp-buys-startups-assets-for-116m/), [Fortune](https://fortune.com/2025/02/19/hp-humane-deal-ai-pin-shutting-down/)). **Why it failed:** poor battery, overheating, limited functionality, a laser-projector UI nobody wanted, and a $499 + $24/mo price for less than a phone does ([Axios](https://www.axios.com/2025/02/18/humane-ai-pin-shut-down-hp), [Dataconomy](https://dataconomy.com/2025/02/20/humane-ai-pin-shutdown-proves-the-hype-was-always-fake/)). **Lesson for Shay: do not build hardware. Ride the phone.**
- **Rabbit r1 — alive but niche.** A year of OTAs fixed the early disaster; battery now lasts a workday, and the **LAM Playground** web-agent + **Teach Mode** can record-and-replay web tasks ([Tom's Guide](https://www.tomsguide.com/ai/one-year-later-the-rabbit-r1-is-actually-good-now-heres-why), [rabbit.tech](https://www.rabbit.tech/lam-playground)). But the LAM is slow, breaks on CAPTCHA, and reviewers still call it a disappointing secondary device ([Android Authority](https://www.androidauthority.com/rabbit-lam-playground-3486938/)). **Lesson: action-taking web agents are real but brittle; treat them as a capability, not a product.**
- **Friend / Limitless pendants — "memory," not "manager."** The **Limitless Pendant** ($199, ~100hr battery, visible recording light) records, transcribes, and lets you search your day ([limitless.ai](https://www.limitless.ai/), [jock.pl review](https://thoughts.jock.pl/p/voice-ai-hardware-limitless-pendant-real-world-review-automation-experiments)). **Meta acquired Limitless in 2025** ([Yanko Design](https://www.yankodesign.com/2025/07/16/the-limitless-ai-pendant-feels-like-spiritual-predecessor-to-the-inevitable-openai-wearable-device/)). **Friend** (Avi Schiffmann) is a continuous-listening *companion*, not a productivity tool, and draws surveillance/dependency criticism ([Entrepreneur](https://www.entrepreneur.com/business-news/meta-is-reportedly-creating-a-new-ai-wearable)). These solve *ambient capture* — a feature Shay could consume — not *omnipresent management*.

### Smart-glasses AI (the most promising "everywhere face," most locked down)
- **Meta AI on Ray-Ban / Ray-Ban Display.** The 2025 **Ray-Ban Display** ($799 incl. Neural Band) does hands-free notifications, navigation with on-lens map, live captions/translation, WhatsApp/Messenger/IG message viewing and video calls, and "Meta AI sees what you see" ([Meta Store](https://www.meta.com/ai-glasses/meta-ray-ban-display/), [Meta Newsroom](https://about.fb.com/news/2025/09/meta-ray-ban-display-ai-glasses-emg-wristband/)). The **Neural Band** EMG wristband enables silent scroll/click and emerging handwriting input. This is the closest thing to "Shay on your face." **The catch — see §3 — is it's Meta's AI, not yours, and third-party access is severely gated.**

---

## 2. Open-source building blocks to build *on*

**Bottom line:** You don't need to invent any layer. Shay already *is* the agent framework (Hermes). What you need from open source is the **voice loop** (Pipecat/LiveKit + a fast STT/TTS pair) and, only if/when you want a face, the **avatar layer**. Everything below is composable into the reach fabric.

### Agent frameworks / personal-assistant projects
- **Hermes Agent** — Shay's existing base (v0.13.0). Keep it. It's the orchestrator. ([context: SHAY-MASTER-PLAN])
- **Leon** ([github.com/leon-ai/leon](https://github.com/leon-ai/leon)) — the canonical open-source personal assistant; 2.0 is a rebuild around tools/memory/context/agentic execution ([getleon.ai](https://getleon.ai/)). Worth mining for skill patterns, not adopting wholesale.
- **LangGraph + Open Agent Platform** ([github.com/langchain-ai/open-agent-platform](https://github.com/langchain-ai/open-agent-platform)) — graph-based multi-agent workflows; reference architecture for the subagent pattern Shay already uses.
- **Open Interpreter** — natural-language → local code execution; a model for safe action-taking. Curated landscape: [awesome-ai-agents-2026](https://github.com/Zijian-Ni/awesome-ai-agents-2026), [Vellum's open-source assistant roundup](https://www.vellum.ai/blog/best-open-source-personal-ai-assistants).

### Voice stack (STT / TTS) — the real-time loop
- **Whisper (OpenAI, open weights)** — excellent batch transcription but **not streaming**; unsuitable for the live loop on its own ([benchmark context](https://introl.com/blog/voice-ai-infrastructure-real-time-speech-agents-asr-tts-guide-2025)). Use for recorded/async (voicemail, pendant capture).
- **Deepgram (STT, Nova-3; TTS Aura-2 ~90ms)** — production streaming STT, the standard for low-latency agents ([Deepgram](https://deepgram.com/learn/deepgram-vs-elevenlabs)).
- **ElevenLabs** — best voice quality; Flash v2.5 ~75ms TTFB, 32 langs; v3 expressive flagship 70+ langs ([futureagi benchmark](https://futureagi.com/blog/best-text-to-speech-providers-2026/)).
- **Cartesia (Sonic)** — fastest raw TTS, ~40ms TTFA / Sonic-3 ~188ms P50 — built for sub-300ms voice agents ([Gradium benchmark](https://gradium.ai/content/tts-latency-benchmark-2026)).
- **OpenAI Realtime API (gpt-realtime)** — speech-to-speech in a *single* model over WebRTC/WebSocket, ~$0.06/min in + $0.24/min out; collapses the STT→LLM→TTS chain and preserves prosody/laughs/code-switching ([OpenAI](https://openai.com/index/introducing-gpt-realtime/), [pricing](https://openai.com/api/pricing/)). Target: human turn-taking is 300–500ms; >500ms feels unnatural ([benchmark](https://gradium.ai/content/tts-latency-benchmark-2026)).

### Voice orchestration (the loop manager)
- **Pipecat** ([github.com/pipecat-ai/pipecat](https://github.com/pipecat-ai/pipecat), by Daily) — open-source Python framework; pipeline of processors (transport→STT→LLM→TTS) as a frame stream. **Best fit for a 1:1 Shay voice agent** ([comparison](https://inworld.ai/resources/vapi-vs-pipecat-vs-livekit)).
- **LiveKit Agents** ([docs.livekit.io/agents](https://docs.livekit.io/agents/)) — Apache-2.0 WebRTC SFU + agent framework (Go/Python/Node); heavier, shines for multi-party (Shay joining a call with others) ([WebRTC.ventures](https://webrtc.ventures/2026/03/choosing-a-voice-ai-agent-production-framework/)).

### Avatar / "virtual body" (open source)
- **met4citizen/TalkingHead** ([github](https://github.com/met4citizen/talkinghead)) — JS real-time lip-sync on full-body 3D **VRM** avatars; the VTuber/VRM path, fully self-hostable in-browser.
- **MuseTalk** (Tencent) — 30+ FPS GPU lip-sync, SOTA real-time ([pixazo roundup](https://www.pixazo.ai/blog/best-open-source-lip-sync-models)).
- **SadTalker / LivePortrait / Wav2Lip** — single-image talking heads and portrait animation (SadTalker expressive, LivePortrait emotion-aware, Wav2Lip the lip-sync staple) ([lipsync.com](https://lipsync.com/blog/open-source-lip-sync)).
- **PunithVT/ai-avatar-system** ([github](https://github.com/PunithVT/ai-avatar-system)) — full open stack: photo → voice clone → real-time face via Claude + Whisper + MuseTalk + WebSocket streaming. Closest open analog to what Fritz describes.

---

## 3. The reach / notification fabric — how one assistant reaches you everywhere

**Bottom line:** Build **one outbound service** ("reach fabric") with per-channel adapters and a single inbound webhook bus. Open channels (Telegram, SMS/voice, push, email, Alexa proactive) are fully buildable today. Locked channels (glasses, watch complications, Siri) are constrained — plan around them, don't fight them.

### OPEN — build these now
- **Telegram Bot API** ([core.telegram.org/bots/api](https://core.telegram.org/bots/api)) — *already working for Shay.* Free, instant, two-way, rich media, inline buttons for approve/dispatch. This is the cheapest control surface and the foundation of the two-way morning digest in the ROADMAP. **Make it the reference adapter.**
- **SMS + Voice — Twilio.** SMS from $0.0083/msg; **Programmable Voice** outbound ~$0.014/min, inbound ~$0.0085/min; **Conversational AI voice** product from $0.07/min for natural turn-taking + barge-in ([Twilio pricing](https://www.twilio.com/en-us/pricing)). This gives Shay an actual *phone number* — she can call Fritz, take his calls, and text. Highest-value "reach me anywhere, even no-internet" channel.
- **WhatsApp Business — via Twilio.** Messages from $0.005; utility convos $0.004 + $0.005/msg; note Meta's July 2025 per-template-message billing change ([Twilio WhatsApp](https://www.twilio.com/en-us/whatsapp/pricing), [pricing change notice](https://help.twilio.com/articles/30304057900699)). Good if Fritz lives in WhatsApp; otherwise Telegram covers it cheaper.
- **Push (APNs / FCM).** When Shay gets her own phone app, server composes JSON payload → APNs (iOS) / FCM (Android, also fronts APNs for iOS) ([deep dive](https://www.spritle.com/blog/push-notifications-deep-dive-the-ultimate-technical-guide-to-apns-fcm/)). Use an orchestration layer rather than raw certs — e.g. open-source **shove** ([github.com/pennersr/shove](https://github.com/pennersr/shove), does APNS+FCM+WebPush+Telegram+Email in Go) or a provider like Courier/MagicBell ([Courier roundup](https://www.courier.com/blog/top-7-push-notification-providers-in-2025)).
- **Email — Resend.** Already a FAMtastic platform capability (`platform/registry/capabilities.json`). Reuse it for long-form digests and async approvals.
- **Alexa — Skills + Proactive Events API.** A custom skill can *push* notifications to Fritz's Echoes via the **Proactive Events API** (Alexa Notifications channel; per-skill 24h rate limit, HTTP 432 when exceeded) ([Amazon docs](https://developer.amazon.com/en-US/docs/alexa/smapi/proactive-events-api.html), [demo repo](https://github.com/alexa-samples/proactive-events-demo)). Alexa+'s new SDKs let you wire real task completion ([Amazon, 2025](https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2025/02/new-alexa-announce-blog)). **This is the most open of the big-three voice assistants.** Google Home has no equivalent open proactive-push path for third parties — treat it as closed.

### LOCKED / GATED — design around these
- **Smart glasses (Meta).** The **Meta Wearables Device Access Toolkit** (developer preview, late 2025) lets an *existing iOS/Android app* extend onto the glasses, or build Web Apps, and can push content to the Display's right lens ([Road to VR](https://roadtovr.com/meta-ray-ban-smart-glasses-third-party-app-sdk-device-access-toolkit/), [UploadVR](https://www.uploadvr.com/meta-wearables-device-access-toolkit-announced-smart-glasses-sdk/)). **Hard limits:** (1) **publishing is restricted to select partners** through the preview, broader publishing only "in 2026"; (2) **the toolkit does NOT give you Meta AI** — you must run *your own* continuous audio stream + camera frames to *your own* model, at your cost, hurting battery; (3) governance/permissions for display apps are unspecified ([Next Reality SDK analysis](https://virtual.reality.news/news/meta-ray-ban-display-developer-preview-sdk-paths-and-platform-gaps/)). **Net: you can't drop Shay onto Meta glasses as a first-class assistant today.** Realistic near-term path: Shay notifications surface on the glasses *via the phone's notification mirror*, not a native Shay glasses app.
- **Smartwatch (watchOS / WearOS).** Push works, but **third-party notifications mostly mirror the iPhone** with limited customization, and **complication/WidgetKit updates are budgeted and delivered opportunistically** — no high-frequency custom pushes ([Apple via OneSignal](https://documentation.onesignal.com/docs/en/watchos-and-wear-os-support), [Kodeco watchOS](https://www.kodeco.com/books/push-notifications-by-tutorials/v4.0/chapters/14-watchos), [Android Wear OS](https://developer.android.com/training/wearables/notifications)). **Net: the watch is a notification mirror, not an independent Shay surface.** Send a good phone push and the watch inherits it.
- **Siri.** No path to put your own agent behind it. Ignore for now; revisit if Apple opens App Intents to third-party LLMs.

---

## 4. The "virtual body" — face, voice, presence

**Bottom line:** Ship **voice-first persona now** (a consistent ElevenLabs/Cartesia voice + the SOUL.md personality), and treat the *visual face* as a Phase-2 "desk-only" feature using a cloud streaming-avatar API. A real-time face everywhere is technically shippable in 2026 but is a latency + cost tax that buys little for a founder's manager assistant.

| Option | What it is | Latency | Cost posture | Verdict |
|---|---|---|---|---|
| **Voice persona only** (ElevenLabs/Cartesia + Pipecat) | Consistent voice + personality, no face | 40–300ms | Cheap (~$0.06–0.30/min combined) | **Ship now.** 90% of the "she's a person" feeling for 10% of the work. |
| **HeyGen LiveAvatar** | Cloud real-time WebRTC talking avatar, lip-sync + gestures, listens/responds live ([HeyGen](https://www.heygen.com/interactive-avatar), [SDK](https://docs.heygen.com/docs/streaming-avatar-sdk-reference)) | Low (WebRTC) | Per-minute streaming, requires avatar approval | **Phase 2, desk app only.** Great demo; expensive per-minute. |
| **Anam** | Real-time interactive avatars, **~180ms** agent response, fast SDK ([anam.ai](https://anam.ai/)) | ~180ms (best-in-class) | Per-minute | Strong contender if you want the face fast and low-latency. |
| **Tavus / D-ID** | Personalized/talking-head video; D-ID lifelike faces ([A2E comparison](https://a2e.ai/top-5-best-avatar-apis-2025/)) | Medium | Per-minute / per-video | D-ID/Tavus better for async video messages than live chat. |
| **Self-hosted (MuseTalk/TalkingHead/ai-avatar-system)** | Run the face on your own GPU | Variable | GPU capex/opex, eng-heavy | Only if avatar becomes core; not worth it for v1. |

**On-device vs cloud:** on-device avatars (TalkingHead/VRM in-browser) avoid per-minute fees and keep data local but need engineering and a decent GPU for smooth lip-sync; cloud APIs (HeyGen/Anam) are turnkey but metered and send your audio/video out. For a single user (Fritz), cloud-metered is fine — usage is low.

**Shippable in 2026:** voice persona everywhere; a live avatar *face inside the Shay desktop app* (Electron — already planned). **Aspirational:** Shay's animated face on glasses or watch (blocked by §3 platform limits).

---

## 5. Architecture recommendation — composing Shay's omnipresence

**Bottom line:** Keep Hermes as the brain. Build **one new service — the Reach Fabric** — that owns every channel, so Shay never learns channel-specific code. Phase from Telegram-only to omnipresent by adding *adapters*, not rewrites.

### What Shay already has (reuse — do not rebuild)
- Hermes orchestrator (Claude Sonnet plan/judge + Gemini research + Ollama workers), durable Kanban, FTS5 memory, three live crons including the **7:30am morning-command-center Telegram digest**, autonomous build pipeline, Data Center evidence substrate, **Resend email capability**, and **Telegram delivery confirmed working** (per `SHAY-MASTER-PLAN-2026-05-28.md` and `ROADMAP.md`). Telegram is already the prototype of the reach fabric — generalize it.

### What to build — the single Reach Fabric service
One process Shay calls with a channel-agnostic intent (`notify`, `ask`, `call`, `speak`), plus a single inbound webhook bus that normalizes every channel's replies into one event shape Shay's intent router already understands.

```
                       ┌──────────────────────────────┐
   Shay (Hermes brain) │  reach.send({to, urgency,     │
   crons / Kanban  ───▶ │  intent, payload, channels})  │
   approvals / digests  └──────────────┬───────────────┘
                                        │  policy: pick channel by urgency+presence
                  ┌─────────────┬───────┼────────┬─────────────┬──────────┐
                  ▼             ▼       ▼        ▼             ▼          ▼
              Telegram      Twilio    Push     Email        Alexa      Avatar
              (built ✓)   SMS+Voice  APNs/FCM (Resend ✓)  Proactive   (LiveAvatar
                                                           Events       Phase 2)
                  └─────────────┴───────┴────────┴─────────────┘
                                  ▲ inbound webhooks normalized → Shay intent router
```

Design rules:
- **Channel-agnostic API.** Shay says *what* and *how urgent*; the fabric decides *where* (presence + escalation: Telegram → push → SMS → call).
- **One inbound bus.** All replies (Telegram button, SMS, voice DTMF/transcript, email reply, Alexa intent) normalize to `{from, channel, text, action}` and feed the existing intent router — reuse the two-way digest handlers from ROADMAP item #3.
- **Approval-aware.** Honor the send-vs-draft policy (ROADMAP §5): some channels carry one-tap approve/deny buttons (Telegram, push); customer/boss-facing actions stay draft-only.
- **No silent drops.** SQLite-backed queue with delivery receipts (already a Desk requirement in the master plan's Notification Queue).
- **Voice loop as a sub-service.** Pipecat pipeline (Deepgram STT → Hermes/Claude → Cartesia or ElevenLabs TTS), fronted by Twilio for phone and by the Desk app's mic for local talk. Optionally swap to OpenAI Realtime for the lowest-latency speech-to-speech.

### Phased path: Telegram-only → omnipresent
1. **Phase A — Generalize what works.** Refactor Telegram delivery into the Reach Fabric with a clean `reach.send` interface + inbound bus. Wire the **two-way morning digest** (ROADMAP #3/#4) through it. *No new vendors.* This is the phone companion.
2. **Phase B — Add Twilio.** Give Shay a phone number: SMS escalation + outbound/inbound calls (Pipecat voice loop). Now Shay reaches Fritz with no internet and can *call* him for urgent approvals.
3. **Phase C — Add push + Shay mobile/web app.** APNs/FCM via shove/Courier; the app inherits to the watch automatically. Email digests via Resend.
4. **Phase D — Add Alexa skill** with Proactive Events for ambient home reach + Alexa+ action SDK for spoken commands.
5. **Phase E — Virtual body.** Live avatar (HeyGen/Anam) inside the Desk app only; consistent voice persona already shipped in Phase B.
6. **Phase F — Glasses (when Meta opens publishing in 2026).** Surface Shay notifications via the phone mirror first; native glasses app only if/when partner publishing opens.

---

## 6. Gaps & risks

**Bottom line:** The brain, reach, and voice are solved-and-cheap. The genuinely hard/expensive/locked parts are (a) a *native* assistant on glasses/watch/Siri, (b) reliable action-taking web agents, and (c) the always-on per-minute cost of a live avatar.

- **Platform lock-in is the core constraint.** Apple (Siri closed, watch is a mirror with budgeted complication pushes), Meta (glasses don't expose Meta AI to you; publishing is partner-gated until 2026; you'd run your own model on-glasses at battery+cost expense — [Next Reality](https://virtual.reality.news/news/meta-ray-ban-display-developer-preview-sdk-paths-and-platform-gaps/)), Amazon (most open, but still their runtime), Google Home (no open proactive push). **"Reach me on my glasses/watch as Shay" is not buildable as a first-class experience today** — only as mirrored phone notifications.
- **Action-taking is brittle.** Rabbit's LAM and similar web agents still fail on CAPTCHA, latency, and edge cases ([Android Authority](https://www.androidauthority.com/rabbit-lam-playground-3486938/)). Shay's "do my Jira / send the invoice" actions need draft-and-approve guardrails, not blind autonomy.
- **Live avatar is a recurring cost.** Per-minute streaming-avatar pricing (HeyGen/Anam/Tavus) plus voice tokens means an always-on visual Shay is expensive; keep it on-demand and desk-bound.
- **Latency stacks up.** STT + LLM + TTS + (avatar) can blow past the 500ms naturalness threshold ([benchmark](https://gradium.ai/content/tts-latency-benchmark-2026)); favor Cartesia/Deepgram or OpenAI Realtime and keep the brain's first-token fast.
- **Privacy / always-listening.** Pendant-style ambient capture (Limitless/Friend) invites surveillance concerns ([Entrepreneur](https://www.entrepreneur.com/business-news/meta-is-reportedly-creating-a-new-ai-wearable)); if Shay ever ingests ambient audio, make recording visible and consented.
- **Hardware is a trap.** Humane proved a standalone device is a money pit ([Fortune](https://fortune.com/2025/02/19/hp-humane-deal-ai-pin-shutting-down/)). Shay must ride existing devices.
- **Vendor cost creep.** WhatsApp's mid-2025 per-template billing shift ([Twilio notice](https://help.twilio.com/articles/30304057900699)) shows channel economics change under you — the fabric's channel-agnostic design is the hedge.

---

## 7. Top recommendations — the first 5 concrete moves (ranked)

1. **Build the Reach Fabric service by generalizing Telegram.** One `reach.send` API + one normalized inbound webhook bus, SQLite-backed, no silent drops. This is the keystone — everything else is an adapter behind it. (Reuse the working Telegram delivery from `SHAY-MASTER-PLAN`; no new vendor.)
2. **Ship the two-way morning digest / phone companion** (ROADMAP #3 → #4) through the fabric — reply-to-act, one-tap approve/dispatch from Telegram. Cheapest, highest-autonomy gain; turns the existing 7:30am cron into a control surface.
3. **Give Shay a phone via Twilio** — SMS escalation + a Pipecat voice loop (Deepgram STT → Hermes → Cartesia TTS) for inbound/outbound calls. This is the true "reach me anywhere, even offline" channel and lays the voice persona that the avatar later inherits.
4. **Add a Shay mobile/web app with push (APNs/FCM)** so notifications reach the lock screen and *inherit to the Apple Watch / Wear OS for free* — the realistic wearable path given platform limits.
5. **Add the live-avatar face inside the Desk app only** (Anam for lowest latency, or HeyGen LiveAvatar), on-demand and metered — the "virtual body" payoff without the everywhere-cost. Defer glasses entirely until Meta opens partner publishing in 2026.

---

### Sources (selected, ~45 cited inline above)
Humane shutdown ([TechCrunch](https://techcrunch.com/2025/02/18/humanes-ai-pin-is-dead-as-hp-buys-startups-assets-for-116m/), [Fortune](https://fortune.com/2025/02/19/hp-humane-deal-ai-pin-shutting-down/), [Axios](https://www.axios.com/2025/02/18/humane-ai-pin-shut-down-hp)) · Rabbit r1 ([Tom's Guide](https://www.tomsguide.com/ai/one-year-later-the-rabbit-r1-is-actually-good-now-heres-why), [Android Authority](https://www.androidauthority.com/rabbit-lam-playground-3486938/), [rabbit.tech](https://www.rabbit.tech/lam-playground)) · Pendants ([limitless.ai](https://www.limitless.ai/), [Yanko Design](https://www.yankodesign.com/2025/07/16/the-limitless-ai-pendant-feels-like-spiritual-predecessor-to-the-inevitable-openai-wearable-device/), [Entrepreneur](https://www.entrepreneur.com/business-news/meta-is-reportedly-creating-a-new-ai-wearable)) · Meta glasses ([Meta Store](https://www.meta.com/ai-glasses/meta-ray-ban-display/), [Meta Newsroom](https://about.fb.com/news/2025/09/meta-ray-ban-display-ai-glasses-emg-wristband/), [Road to VR](https://roadtovr.com/meta-ray-ban-smart-glasses-third-party-app-sdk-device-access-toolkit/), [UploadVR](https://www.uploadvr.com/meta-wearables-device-access-toolkit-announced-smart-glasses-sdk/), [Next Reality](https://virtual.reality.news/news/meta-ray-ban-display-developer-preview-sdk-paths-and-platform-gaps/)) · Agent frameworks ([Leon](https://github.com/leon-ai/leon), [Open Agent Platform](https://github.com/langchain-ai/open-agent-platform), [awesome-ai-agents-2026](https://github.com/Zijian-Ni/awesome-ai-agents-2026)) · Voice ([OpenAI Realtime](https://openai.com/index/introducing-gpt-realtime/), [Gradium benchmark](https://gradium.ai/content/tts-latency-benchmark-2026), [futureagi](https://futureagi.com/blog/best-text-to-speech-providers-2026/), [Pipecat](https://github.com/pipecat-ai/pipecat), [LiveKit](https://docs.livekit.io/agents/)) · Avatars ([HeyGen](https://www.heygen.com/interactive-avatar), [Anam](https://anam.ai/), [TalkingHead](https://github.com/met4citizen/talkinghead), [ai-avatar-system](https://github.com/PunithVT/ai-avatar-system), [lipsync.com](https://lipsync.com/blog/open-source-lip-sync)) · Reach ([Telegram Bot API](https://core.telegram.org/bots/api), [Twilio pricing](https://www.twilio.com/en-us/pricing), [Twilio WhatsApp](https://www.twilio.com/en-us/whatsapp/pricing), [Alexa Proactive Events](https://developer.amazon.com/en-US/docs/alexa/smapi/proactive-events-api.html), [Alexa+ SDKs](https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2025/02/new-alexa-announce-blog), [APNs/FCM deep dive](https://www.spritle.com/blog/push-notifications-deep-dive-the-ultimate-technical-guide-to-apns-fcm/), [shove](https://github.com/pennersr/shove), [watchOS limits](https://documentation.onesignal.com/docs/en/watchos-and-wear-os-support)).
