---
title: phone-app-plan-2026-05-30
type: note
permalink: shay-memory/post-review/phone-app-plan-2026-05-30
---

# SHAY PHONE APP PLAN v3

---
title: Shay Phone App Plan v3 — Brain-Agnostic, iOS V1
date: 2026-05-30
tags: [phone-app, v3, brain-agnostic, ios]
---

**Brain-Agnostic, Exceeds Claude + ChatGPT/Codex Phone Apps**
*Drafted 2026-05-30. Supersedes V2 after a second adversarial critique pass. V1 lives at `~/famtastic/obsidian/Shay-Memory/post-review/phone-app-plan-2026-05-30.md`.*

---

## 1. Verdict

Shay phone is **not another chatbot in a bubble**. It is a **brain-agnostic control surface** for a runtime that lives on Fritz's home Mac mini, with first-class iOS ambient surfaces (Live Activities, Watch complications, App Intents, Share Extensions) and an honest offline fallback via Apple Foundation Models on eligible devices that have Apple Intelligence enabled. Where Claude and ChatGPT each ship one brain and bury everything else, Shay exposes per-message brain selection with a visible cost/latency badge — Claude for reasoning, GPT for vision, Codex on the desk for shell, Gemini Live for cheap voice, on-device for narrow classification — all carrying the same conversation state. The phone is the router and the surface; the desk is the runtime; nobody is the brain by default.

**V1 ships iOS-only.** Android is deferred to a separate plan after iOS hits production. Fritz uses an iPhone; Fritz is the first user; doubling the build surface for a hypothetical Android user before iOS is in the App Store is the wrong solo-dev trade. KMP is rejected for V1 — see §4.

---

## 2. Reference Baseline — Capability Matrix (May 2026)

Legend: ✓ shipping, ✗ not present, ~ partial / behind paywall / preview. Shay-target columns are tagged with the phase they land in: **[P1]** week 6 TestFlight, **[P2]** week 12, **[P3]** week 20, **[Px]** deferred to post-V1 roadmap. **FM-conditional** = available only on Apple Intelligence-eligible hardware where the user has Apple Intelligence enabled and model assets have finished downloading.

| Capability | Claude iOS | ChatGPT iOS | Codex in ChatGPT Mobile | Perplexity iOS | **Shay target (phase)** |
|---|---|---|---|---|---|
| Per-message **brain switcher** (multi-vendor) | ✗ | ✗ | ~ (OpenAI only) | ~ (one vendor) | **✓ [P1]** Claude/GPT/Gemini/Codex-desk/Ollama-desk + FM-conditional row |
| Voice (any) | ✓ PTT | ✓ 9 voices | ✗ | ✓ via OpenAI Realtime in Comet | ✓ [P2] |
| **Realtime S2S voice** | ~ pipelined | ✓ Advanced Voice | ✗ | ✓ | ✓ [P2] Gemini Live default, OpenAI Realtime premium |
| **Brain-independent voice channel** | ✗ | ✗ | ✗ | ✗ | **✓ [P2]** voice provider ≠ chat brain |
| Background voice (locked phone) | ✗ | ✓ | ✗ | ✗ | ✓ [P2] CallKit-backed only, see §9 |
| **Live Activities** (Lock Screen / Dynamic Island) | ✗ | ~ unclear | ✗ | ✗ | **✓ [P3]** AgentRun, system-throttled per ActivityKit budget |
| **Apple Watch app + complications** | ✗ | ✓ basic | ✗ | "later 2026" | **✓ [P3]** see-on-wrist + finish-on-phone (biometric on phone), see §8 |
| Lock Screen widget | ✓ | ✓ | ✗ | ✗ | ✓ [P3] |
| Today View / Home widget | ✓ | ✓ | ✗ | ✗ | ✓ [P3] |
| App Intents / Siri Shortcuts catalog | ~ partial | ~ partial | ✗ | ✗ | **✓ [P3]** 6 intents in V1; destructive gate on biometric |
| iOS Action Button binding | ✓ | ✓ | ✗ | ✗ | ✓ [P3] |
| CarPlay | ✗ | ✓ | ✗ | ✗ | **Px** — entitlement risk, see §9 |
| Share Extension / Sharesheet intake | ~ limited | ✓ | ✗ | ✓ | **✓ [P2]** small on-device classifier only |
| Photo library intake | ✓ | ✓ | ✗ | ✓ | ✓ [P2] |
| Files / Documents intake | ✓ | ✓ | ✗ | ✓ | ✓ [P2] |
| Continuity Handoff (iOS↔Mac) | ✗ | ✗ | ✗ | ✗ | **Px** requires real macOS app target, see §9 |
| Persistent agent runs (>5min) | ✗ | ✗ | ✓ (devbox) | ✗ | **✓ [P1]** via desk runtime |
| Approve-tool-call gates from phone | ✗ | ✗ | ✓ | ✗ | ✓ [P1] biometric re-auth on destructive |
| Terminal / shell view of run | ✗ | ✗ | ✓ | ✗ | **✓ [P2]** xterm.js read-only mirror |
| **MCP-proxy display on phone** | ✗ | ✗ | ✗ | ✗ | **✓ [P2]** phone shows desk's MCP registry; calls proxied opaquely via relay |
| On-device LLM (FM-conditional) | ✗ | ✗ | ✗ | ✗ | **✓ [P1]** Apple FM on eligible+enabled+ready devices only — see §7 |
| Non-LLM on-device classification (NLTagger / CoreML) | ✗ | ✗ | ✗ | ✗ | **✓ [P1]** ubiquitous, runs on every supported iOS device |
| **Offline drafting on Apple Intelligence devices; queued elsewhere** | ✗ | ✗ | ✗ | ✗ | **✓ [P1]** — honest framing, no "true offline" claim |
| Cross-brain context handoff | ✗ | ✗ | ~ (within OpenAI) | ✗ | **✓ [P1]** shared abstract message format |
| Computer-use bridge (phone→desk) | ✗ | ✗ | ✗ | ✗ | **Px — cut from V1, see §10** |
| Basic-memory read-only snapshot pull | ✗ | ✗ | ✗ | ✗ | ✓ [P3] on-demand pull via iCloud Drive, not live sync — see §3 #13 |
| HealthKit read | ~ Pro | ✗ | ✗ | ✗ | **Px** — insufficient justification under 5.1.3 |

**Matrix honesty notes (footnotes referenced by the rows above):**

- *On-device LLM row:* FM is available only on Apple Intelligence-eligible SKUs (iPhone 15 Pro / 16+ in 2026, ~30–40% of active install in 2026), in supported regions/languages, with Apple Intelligence toggled on in Settings, and after on-device model assets have finished downloading (which can take hours post-opt-in and re-downloads after major OS updates). On devices that fail any of those gates, the FM row in the brain switcher is **hidden, not greyed** — see §7.
- *Offline drafting row:* "Offline" here is **drafting on Apple Intelligence devices that pass the FM availability check; queued-for-cloud-on-reconnect everywhere else.** The plan does not claim "true offline" for the V1 install base.

**V1 (Phases 1–3) wedge:** Shay beats every incumbent on per-message brain switcher, brain-independent voice channel, MCP-proxy display, on-device routing tier (Tier A is ubiquitous), cross-brain context handoff, in-sandbox terminal mirror, persistent desk-runtime agent runs, and see-on-wrist Watch approval. Eight rows, all shippable inside 20 weeks. CarPlay, Continuity Handoff, computer-use bridge, and HealthKit are explicitly deferred to a post-V1 roadmap — see §10.

---

## 3. Where Shay Phone Exceeds Reference

The capabilities below define the V1 bar. Each lands in a specific phase; none are slogans.

1. **Per-message brain switcher with cost+latency badge.** [P1] A bottom-sheet picker on every message: `Claude Sonnet 4.6` `GPT-5` `Gemini 3 Pro` `Codex (desk)` `Ollama qwen3:32b (desk)`. On Apple Intelligence-eligible+enabled+ready devices, the picker adds a sixth row: `On-device FM`. **The FM row is hidden — not greyed — when the runtime availability check (§7) returns anything other than `.available`.** Each row shows estimated cost and p50 latency from the last 50 calls. Same conversation can change brains mid-thread. **Comparison shopping risk:** badges show *user's own* historical p50 with their own keys, not vendor-published numbers — keeps the UX inside the BYOK frame and out of vendor TOS trouble (§12 risk row).

2. **In-sandbox terminal mirror.** [P2] Xterm.js inside WKWebView renders the desk runtime's terminal stream live. ANSI colors, scrollback, copy. Read-only by default; tap-to-approve for input, and any approval is a biometric re-auth.

3. **MCP-proxy display, not a from-scratch MCP client.** [P2] The desk Studio is the real MCP host. The phone calls a single `shay-relay` endpoint that opaquely proxies the desk's MCP tool registry and tool calls. Marshalling the full MCP wire protocol (stdio/SSE, sampling, resources, prompts, roots) into a shared core would be a multi-week reimplementation; instead the phone shows the desk's tool registry, displays schemas, and dispatches calls through the relay's typed JSON envelope. Smaller surface, same user-visible value.

4. **Multi-brain live switcher mid-stream.** [P1] "Continue with GPT-5 but keep Claude's reasoning so far" is one tap. Conversation state is a normalized message graph; brain swap is a re-attach.

5. **On-device routing layer — honest two-tier.** [P1] **Tier A (ubiquitous, every supported iOS device):** Apple NLTagger / NLClassifier / custom CoreML for intent routing, sentiment, language ID. Non-LLM, fast, accurate enough for the routing decision. Bundled classifier is ~5MB. **Tier B (FM-conditional, see §7 for the four-gate availability check):** Apple Foundation Models for summarization, structured extraction via `@Generable`, and offline drafting under FM's 4K ceiling. **Removed from V1:** bundled Gemma 3 / Qwen / WhisperKit Large weights — see §7.

6. **Persistent agent runs via paired desk.** [P1] Tailscale tunnel to the home Mac mini; the long-running agent lives on the desk, the phone shows it. Live Activity arrives in Phase 3; in Phase 1 we use standard push notifications.

7. **Share Extension with on-device routing classifier.** [P2] PDF → Claude. Image → GPT-5. Code file → Codex on desk. URL → desk research. **Classifier inside the extension is non-LLM** (NLTagger + content-type heuristics) so we stay inside the iOS Share Extension memory budget (60MB on non-Plus devices; FM is not invoked inside the extension).

8. **Siri Shortcuts / App Intents — V1 catalog of 6.** [P3] Every Shay primitive that ships in V1 is a typed App Intent. V1 catalog: `OpenChat`, `AskShay(prompt)`, `CaptureToShay(payload)`, `OpenLastRun`, `ApproveNextToolCall(run_id)`, `CancelRun(run_id)`. **Every destructive intent (`ApproveNextToolCall`, `CancelRun`) is marked `requiresAuthentication = true` and gates on biometric re-auth before execution** — non-negotiable, even though it weakens the third-party voice-composition story. Read-only intents (`OpenChat`, `OpenLastRun`, `AskShay`, `CaptureToShay`) compose freely. Larger intents like `StartAgentRun`, `SwitchBrain`, `RouteToBrain`, `OpenSiteStudio` are deferred to a post-V1 catalog expansion — see §10 for the budget reconciliation. Apple Intelligence third-party composition is treated as a *dependency*, not a given.

9. **Live Activities for every agent task.** [P3] Lock Screen + Dynamic Island. Frequent-updates is **declared in Info.plist via `NSSupportsLiveActivitiesFrequentUpdates`** — this is a self-declared key, enforced at runtime by iOS's system energy budget, not an Apple-approval queue. Payload kept under 4KB; updates batched to one push per 5s of compute or per state transition. Per-app simultaneous-Live-Activity count is OS-governed and iOS may evict at its discretion; Shay treats the **observable eviction signal from ActivityKit state as authoritative** and self-limits to 4 simultaneous as a UX guideline. **Documented honestly to the user as "up to 8h, system-throttled."**

10. **Apple Watch see-on-wrist with finish-on-phone (biometric).** [P3] Complication, Smart Stack card, drill-down sheet. **Honest framing of the value prop:** the Watch shows the approval prompt instantly on your wrist; the actual approve/cancel decision round-trips a biometric prompt on the paired phone before the relay dispatches. This is required to clear the "watch unlocked, phone locked, consequential action" rejection vector Apple has cited. The plan does not claim "approve from wrist" — it claims "see the prompt on your wrist, finish it on your phone."

11. **Lock Screen widget.** [P3] Rectangular + circular. Updates piggyback on Live Activity payload.

12. **Offline drafting path — honest framing.** [P1] On Apple Intelligence-eligible+enabled+ready devices that pass §7's availability check: FM handles short answers under 3K context. On every other device or when any availability gate fails: messages queue with a yellow "while you were offline" badge and re-route to a cloud brain on reconnect. No bundled 1.8GB model weights. Apple FM is provisioned by the OS on eligible devices that have completed asset download.

13. **Basic-memory read-only snapshot pull via iCloud Drive.** [P3] The Obsidian basic-memory vault is exposed through iCloud Drive (Fritz's existing setup). The Shay iOS app does an **on-demand snapshot pull** through `UIDocument`-backed file enumeration, not a live sync engine. Concurrent desk writes are common and would create UIDocument conflict states; on-demand pull-with-timestamp sidesteps that class of bug. Smart Connections WebGL graph viewer is **deferred to Px** — the >2000-node performance ceiling on mid-tier hardware is real.

---

## 4. Platform Choice — One Defended Pick

**V1 pick: native iOS only. SwiftUI + ActivityKit + WatchKit + App Intents. No KMP, no Android.**

The V1 draft picked KMP + dual-native. The repo state defends the iOS-only revision: 153 Swift files in `shay-desktop`, zero Kotlin files anywhere. Fritz has shipped no Android, no KMP, no Compose, no Wear, no Gradle/Konan/expect-actual. Asking a solo dev to absorb that toolchain *and* SwiftUI's native-only premium surfaces (FM, Live Activities, App Intents, Watch) in 14 weeks breaks at week 5.

**Rejected alternatives:**

- **React Native + Expo — rejected.** Every premium surface (FM, Live Activities, Watch, App Intents, Share Extension, SpeechAnalyzer) is a bridge tax.
- **Flutter — rejected.** Same bridge tax; weaker Watch story.
- **Capacitor / Ionic — rejected.** Web-stack performance ceiling collides with on-device inference and xterm streaming.
- **Kotlin Multiplatform + dual-native (V1 draft) — rejected for V1.** Shared-core savings (~30% of code) do not justify the dual-platform tax for a solo dev whose first user is himself on iOS.
- **Pure native dual (SwiftUI + Compose, no shared layer) — also rejected for V1.**

**Android path:** A separate plan, written after iOS hits production. Likely revisits KMP at that point because by then the shared-core surface (brain router, MCP proxy client, conversation graph) is stable Swift code that can be extracted to Kotlin once, not rebuilt twice.

**Deployment target:** **iOS 26.0 minimum** for V1. This is a deliberate trade: SpeechAnalyzer is iOS 26+, FM availability surfaces are cleanest on iOS 26+, and ActivityKit's current behavior model is stabilized at iOS 26+. The cost is install-base: iOS 26 adoption in late 2026 is materially smaller than the full active install. Fritz is the first user, on an iPhone 15 Pro on iOS 26 — so V1 ships for Fritz first, public install base grows naturally. This is named explicitly so the §11 hardware budget and the §2 install-base footnote are internally consistent.

**Why this is still the FAMtastic move.** "Brain-agnostic phone app" is the wedge, not "cross-platform phone app." Shipping the wedge to App Store on iOS in ~20 focused weeks beats shipping to neither store in ~50.

---

## 5. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        SHAY PHONE (iOS 26+, V1)                      │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────────────┐ │
│  │   SwiftUI     │  │ ActivityKit    │  │ WatchKit app +          │ │
│  │  chat + UI    │  │ Dyn. Island    │  │ complications + Smart   │ │
│  │               │  │ (P3)           │  │ Stack (P3)              │ │
│  └───────┬───────┘  └────────┬───────┘  └────────────┬────────────┘ │
│          │                   │                       │              │
│  ┌───────┴───────────────────┴───────────────────────┴───────────┐  │
│  │           Swift shared core (single platform, V1)             │  │
│  │  Brain router │ MCP-proxy client │ Conv. graph │ Offline Q    │  │
│  │  Prompt asm   │ Keychain crypto  │ Snapshot pull (iCloud)     │  │
│  │  Sentry SDK   │ Event pipeline   │ FM availability gate       │  │
│  └───────┬───────────────────┬──────────────────────┬────────────┘  │
│          │                   │                      │               │
│  ┌───────┴────────┐  ┌───────┴────────┐  ┌──────────┴───────────┐   │
│  │ On-device      │  │ STT / TTS      │  │ Native intake        │   │
│  │ Tier A: CoreML │  │ SpeechAnalyzer │  │ Share Ext / Photos / │   │
│  │ Tier B: FM     │  │ (iOS 26)       │  │ Files / Action Btn   │   │
│  │ (conditional)  │  │                │  │                      │   │
│  └────────────────┘  └────────────────┘  └──────────────────────┘   │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                  Tailscale (WireGuard, mesh, E2E)
                               │
┌──────────────────────────────┴───────────────────────────────────────┐
│                   SHAY DESK RUNTIME (Mac mini, launchd)              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │   shay-relay (Node) — SSE token stream + WS control channel    │  │
│  │   + MCP opaque proxy + APNs JWT rotation (every ~45min, signed │  │
│  │   with long-lived .p8 auth key) + WoL trigger (laptop case)    │  │
│  └─────────────┬──────────────────────────┬───────────────────────┘  │
│                │                          │                          │
│  ┌─────────────┴───────────┐  ┌───────────┴────────────────────┐    │
│  │  Agent runtime          │  │  MCP server registry           │    │
│  │  Claude/GPT/Gemini/     │  │  filesystem, git, brave,       │    │
│  │  Codex/Ollama brains    │  │  basic-memory, smart-conn, …   │    │
│  └─────────────┬───────────┘  └────────────────────────────────┘    │
│                │                                                     │
│  ┌─────────────┴───────────────────────────────────────────────┐    │
│  │  Data Center: jobs/, ledgers/, proofs, post-eval            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                               │
                  HTTPS to cloud brains as fanout
                               │
       ┌───────────────────────┼────────────────────────┐
   Anthropic API           OpenAI API              Google AI
```

**Streaming model.** SSE desk → phone (one-way token stream, simplest reconnect). WS bidirectional for tool-call approval, cancel, brain switch, prompt injection. APNs for "agent finished" / "approval needed" wake-ups.

**Wake-the-phone path.** Long agent runs trigger APNs with `interruption-level=time-sensitive`. In Phase 3, payload carries Live Activity update (≤4KB delta-only).

**APNs credential model.** The `.p8` auth key is long-lived (Apple does not rotate it on a schedule and only revokes on request). The **provider tokens (JWTs signed with the .p8) rotate every ~45min per APNs guidance** — that is the operational concern, and the relay handles it via an in-process cron. The architecture diagram and §11 ops budget both say "APNs JWT rotation," not "auth-key rotation."

**Wake-the-desk path.** Home Mac mini is launchd-supervised and always on; Tailscale tunnel persistent — **no wake-the-desk needed in the normal case.** For laptop scenarios where the desk Mac sleeps, the WoL path is more involved than V2 implied: Tailscale does not forward broadcast magic packets through the tunnel, so a **Tailscale subnet router on the LAN** is required to relay the broadcast, plus the desk Mac needs `Wake for network access` enabled (and reliable WoL response from deep sleep is firmware-dependent and notoriously flaky over Wi-Fi). For V1, the **always-on Mac mini is the supported topology**; the WoL fallback is documented but not promised, and the phone shows a "desk asleep, queued" state instead of guaranteeing wake. **Launchd contract honored**: `shay-relay` is a separate launchd job (`com.famtastic.shay-relay.plist`), and the relay never starts or restarts the Studio's `com.famtastic.studio` job — it observes the studio's state and surfaces it to the phone.

**Offline path.** When relay is unreachable: on devices where FM passes the four-gate availability check (§7), demote to FM if context fits under 3K; on all other devices, queue messages with a yellow badge and a `Re-run on cloud` button.

---

## 6. Auth + Pair

**Pair-with-desk via QR.** Desk Studio renders a one-time pairing QR: desk's Tailnet hostname, ephemeral pairing token (15-min TTL), WireGuard public-key fingerprint. **Onboarding cliff acknowledged:** Tailscale's iOS SDK does not support embedded sign-in; the user must install the Tailscale app separately and approve a VPN profile. The Shay onboarding flow links to the Tailscale App Store page, waits for tailnet join, then resumes pairing. This is a real friction point and is the #3 risk in §12.

**Cloud identity.** Apple Sign-In day one. **Per Guideline 4.8**, no other social sign-in is offered alongside it in V1 — keeps the parity requirement out of the way.

**App unlock.** Face ID / Touch ID, passcode fallback. Per-device Ed25519 keypair in Keychain behind `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`.

**BYOK posture and Guideline 3.1.1 — external-link surface.** V1 is BYOK-only. **There are no in-app links to vendor signup or billing pages** — not in onboarding, not in settings, not in the brain switcher. The user pastes their Anthropic / OpenAI / Google AI key in from outside the app. Empty-state copy says "Add your Anthropic key in Settings" with no link to console.anthropic.com or equivalent. This is the explicit mitigation for the 3.1.1 pattern that has rejected BYOK AI apps in 2025–2026 (buttons or links directing customers to purchasing mechanisms other than IAP for digital content/services consumed in the app). App Review notes will call this out, and the reader-app / External Link Account entitlement is not requested because V1 doesn't qualify and doesn't need it.

**Per-action approval gates** (configurable in settings, per-brain and per-tool):
- `auto` — desk executes, phone notified after. Read-only tools only.
- `notify` — phone notified before execution, 5s to cancel.
- `approve` — desk blocks until phone taps approve + **biometric re-auth**. Live Activity pulses.
- `always_approve` — every tool call blocks. For new MCP server trials.

Defaults: `auto` for read-only (`fs_read`, `git_log`, `brave_search`), `approve` for write/destructive (`fs_write`, `git_push`, `shell_exec`), `notify` for everything else.

---

## 7. On-Device AI Routing — Honest Tiers and the FM Four-Gate Availability Check

**Tier A — non-LLM, every supported iOS device, every time.**

| Use | Mechanism |
|---|---|
| Intent routing (capture / summarize / ask / build / approve) | Apple NLTagger + custom CoreML classifier (~5MB, bundled, allowed) |
| Language ID | NLLanguageRecognizer |
| Sentiment for thread title hints | NLTagger sentiment scheme |
| Content-type sniffing in Share Extension | UTType + heuristics, no LLM call |

This is the **load-bearing classification layer** because it runs on every device. It is not an LLM and is not subject to the FM 4K ceiling or device eligibility gates.

**Tier B — Apple Foundation Models, behind the four-gate availability check.**

Before V1 routes any work to FM or surfaces the FM row in the brain switcher, the runtime calls `SystemLanguageModel.availability` (or the equivalent on the shipped iOS 26 API) and the result must be `.available`. The four gates that produce `.available`:

1. **Hardware eligibility.** Device is on Apple's Apple Intelligence-eligible SKU list (iPhone 15 Pro / 16+ in 2026).
2. **Region/language.** User's region and primary language are in Apple's supported set.
3. **User opt-in.** Apple Intelligence is toggled on in Settings.
4. **Asset readiness.** On-device model components have finished downloading. (Apple's own components download post-opt-in and can take hours; major OS updates can trigger re-downloads.)

Any other return value (`.unavailable(.deviceNotEligible)`, `.unavailable(.appleIntelligenceNotEnabled)`, `.unavailable(.modelNotReady)`, etc.) means:

- The FM row in the §3 #1 brain switcher is **hidden, not greyed**. No silent failure surface.
- The §3 #12 offline drafting path falls through to "queue with badge."
- A distinct UX state surfaces in Settings explaining *which gate* failed and what (if anything) the user can do — "Apple Intelligence not enabled," "Model still downloading," "Not available on this device."

This is the explicit mitigation for Guideline 1.5 / 2.3.1 (accurately represent functionality) — Shay does not advertise FM-dependent features as available when any of the four gates is unsatisfied.

**Tier B usage table (when `.available`):**

| Use | Route to FM? |
|---|---|
| Summarize a thread for Live Activity title | Yes — `@Generable`, ≤512 tokens |
| Structured extraction from a voice clip (date, project, tag) | Yes — `@Generable` schema |
| Offline answer to a short question | Yes if estimated context < 3K tokens |
| Long reasoning ≥4K context | Never — exceeds FM ceiling, route to cloud or desk Ollama |
| Code generation | Never — route to Codex on desk |
| Vision / multimodal | Never — FM is text-only; route to GPT-4o or Gemini |
| Image captioning of shared images on iOS | Apple Vision (OCR/classification) on-device; generative captioning routed to cloud |

**Removed from V1: bundled Gemma 3 4B and WhisperKit Large.** The V1 draft proposed bundling ~3.4GB of model weights inside the IPA. Rejected on conversion grounds and the App Thinning contradiction. V1 ships **SpeechAnalyzer as default STT** (iOS 26+, available because deployment target is iOS 26+ — see §4). WhisperKit becomes a Px consideration if pre-iOS-26 support is added later, and any bundled model in that future case is delivered via On-Demand Resources behind a user opt-in.

**Routing decision tree (every message):**

```
incoming message
   │
   ├─ Tier A intent classification (every device, always)
   │
   ├─ user explicitly picked a brain in the bottom-sheet?
   │     YES → honor user pick (skip auto-routing)
   │     NO  → continue
   │
   ├─ network reachable AND desk paired?
   │     YES → routed cloud brain (Claude/GPT/Gemini/Codex/Ollama)
   │     NO  → on-device path
   │
   ├─ on-device path
   │     ├─ FM four-gate availability check passes
   │     │   AND est. context < 3K?
   │     │     YES → FM, return
   │     │     NO  → queue with "while you were offline" badge,
   │     │           offer `Re-run on cloud` on reconnect
```

**Latency budget for Tier A classification.** NLTagger + CoreML classification target ≤30ms p95 on A17 Pro+ (the deployment-target floor at iOS 26). The supported-device floor is named: V1 supports iPhone XS and later, which is the iOS 26 minimum. On the floor device (A12), warm-start classification can exceed 100ms; in that case the UI **dispatches the send optimistically to the user's last-selected brain and updates the routing decision in the background**, so the "feels instant" promise survives the slower hardware.

---

## 8. Mobile-Specific Surfaces

**Live Activities (P3).** One activity per active agent run; UX self-limits to 4 simultaneous (the OS-governed per-app cap is system-controlled and observable via ActivityKit state — Shay treats eviction signals as authoritative). Payload: brain name + color, step N/M, current tool, elapsed, approval-needed flag. Updates batched: one APNs push per 5s of compute or per state transition. **`NSSupportsLiveActivitiesFrequentUpdates` is declared in Info.plist** — this is a self-declared key, not an Apple-approved entitlement; iOS enforces it at runtime through an energy budget that throttles updates per system state. If the system throttles, the standard update cadence remains functional. Documented to user as "up to 8h, system-throttled" — not as a hard guarantee.

**Lock Screen widget (P3).** Rectangular (current run + brain + step) and circular (run count). Both deep-link to the run view.

**Watch see-on-wrist with finish-on-phone (P3).** Complication shows active-run count. Smart Stack auto-promotes the Live Activity card. Watch app provides per-run drill-down and a "See approval prompt" / "Cancel" sheet. **Honest framing of the UX:** the watch is the *notification and preview* surface; the *decision* surface is the paired phone. Every Watch-initiated approval triggers a biometric prompt on the paired phone before the relay actually dispatches — this clears the "watch unlocked, phone locked, consequential action" rejection vector, at the cost of requiring the user to pick up their phone. The plan does not market this as "approve from your wrist."

**Siri Shortcuts / App Intents — 6 intents in V1 (P3).** Catalog: `OpenChat`, `AskShay(prompt)`, `CaptureToShay(payload)`, `OpenLastRun`, `ApproveNextToolCall(run_id)`, `CancelRun(run_id)`. **All destructive intents (`ApproveNextToolCall`, `CancelRun`) set `requiresAuthentication = true` and prompt for biometric before execution.** Budget reconciliation: 6 intents × ~2.5 days each = ~15 dev-days ≈ 3 weeks of Phase 3 — arithmetic now consistent. Larger intents (`StartAgentRun`, `SwitchBrain`, `RouteToBrain`, `OpenSiteStudio`) move to post-V1 catalog expansion. Apple Intelligence third-party composition is treated as roadmap, not a guaranteed distribution channel. Per Apple's stricter review posture on unrestricted generative output in voice-only surfaces, `AskShay` output via Siri voice contexts will be moderated by the Tier A pre-flight classifier before cloud dispatch (see §9).

**Action Button binding (P3).** Single-tap → PTT to default brain. Long-press → start a new agent run with last-used brief template.

**Share Extension (P2).** Accepts text, URL, image, file, code. **Routing decided by Tier A non-LLM classifier inside the extension** — stays well under the realistic 60MB extension memory budget on non-Plus devices. User can override before sending.

**Photo library intake (P2).** Custom picker with project/site/idea tagging. Photos route through Apple Vision OCR/classification on-device; generative captioning is a cloud call.

**Background voice (P2).** **CallKit-backed only** for the locked-phone case. The V1 draft proposed `UIBackgroundModes=audio` for general voice continuation — that's the 2.5.4 rejection vector ChatGPT, Bing, and several coaching apps have hit. CallKit gives the right entitlement story for "AI voice that continues like a call." Non-CallKit voice sessions auto-pause when the app backgrounds >60s.

**Continuity Handoff — Px.** Cut from V1. Requires a real macOS app target sharing the Team ID — the current desk runtime is a Node service, not an app.

**CarPlay — Px.** Cut from V1. CarPlay entitlement categories don't include "AI chat in the car."

---

## 9. App Store Compliance Posture

**Guideline 1.5 / 2.3.1 — accurately represent functionality.** FM-dependent features are gated on the four-gate availability check (§7). The FM brain row is hidden, not greyed, on devices where any gate fails. The "Offline drafting on Apple Intelligence devices; queued elsewhere" matrix row is the honest description; the plan does not claim "true offline" for the V1 install base.

**Guideline 2.5.2 — self-contained, no executable code download.** Tool execution stays on desk; phone displays output and dispatches approvals. No bundled 1.8GB models in V1 — FM is provisioned by the OS on eligible+enabled+ready devices. Any future on-device model is delivered via On-Demand Resources, gated behind explicit user opt-in. App Review notes will include the architecture diagram from §5 and explicitly state the phone never executes shell, eval, or downloaded code.

**Guideline 2.5.4 — background audio.** **No `UIBackgroundModes=audio` for general voice continuation in V1.** Background voice is CallKit-backed only.

**Guideline 3.1.1 — IAP / external links.** V1 is **BYOK-only** with no in-app subscription or token-pack purchases. **No in-app links to vendor signup or billing pages** — see §6 for the explicit mitigation against the 3.1.1 external-link rejection pattern that has hit BYOK AI apps in 2025–2026. The reader-app / External Link Account entitlement is not requested. If a subscription path is added later, IAP becomes mandatory.

**Guideline 4.2.7 — remote desktop / 2.5.2 remote code execution.** **Computer-use bridge cut from V1 entirely.**

**Guideline 4.8 — Apple Sign-In parity.** V1 ships Apple Sign-In only.

**Guideline 5.1.1 / 5.1.2(i) — third-party data sharing.** Privacy Nutrition Label lists each provider Shay can route to (Anthropic, OpenAI, Google AI, on-device-never-transmitted, your-desk-runtime). **Per-provider consent screens on first invocation of each provider, with that provider's data-retention defaults documented.**

**Guideline 5.1.3 — HealthKit.** HealthKit cut from V1.

**Guideline 1.1 / 1.2 — objectionable content.** Pre-flight moderation via Tier A classifier before cloud dispatch; cloud provider's filter as second layer. In-app `Report this response` button on every assistant message. **App Intents that surface generative output through voice-only Siri contexts (e.g. `AskShay`) route through the same pre-flight moderation** — App Review has been stricter about unrestricted generative output in voice surfaces.

**App Intents destructive actions.** Every destructive intent gates on biometric re-auth (see §8). Non-negotiable.

**Live Activities.** `NSSupportsLiveActivitiesFrequentUpdates=YES` declared in Info.plist (self-declared key, not Apple-approved); iOS enforces via runtime energy budget. Graceful fallback to standard cadence is the design. `time-sensitive` interruption level default-on. `critical-alerts` removed from V1.

**Default-on vs toggle-behind.**
- **Default on:** chat, BYOK brain switcher, Tier A classification, Share Extension, Apple Sign-In, push notifications, Sentry crash reporting (with anonymous-by-default ID).
- **Phase 2 default-on:** voice (Gemini Live), FM offline path on devices passing the four-gate check, CallKit-backed voice.
- **Phase 3 default-on:** Live Activities (graceful fallback), Watch app, App Intents (destructive ones require biometric).
- **Cut from V1 (Px):** Critical Alerts, Continuity Handoff, computer-use bridge, CarPlay, HealthKit, bundled offline model weights, Smart Connections WebGL graph, live basic-memory sync.

**Age rating.** 17+ to match Claude/ChatGPT given unbounded generative output.

---

## 10. Phase Plan

iOS-only, three-phase V1, 20 weeks of focused work. Each phase ends with a TestFlight build and documented smoke pass.

**Phase 1 — Shell + Auth + Relay + Brain Router + Tier A + Observability (6 weeks).**
- Swift shared core: networking, encryption, conversation graph, offline queue.
- **Sentry SDK + minimal event pipeline wired from day one** (crash reporting, error telemetry, anonymous event log) so Phase 1+2 TestFlight crashes are debuggable from the start. This was previously parked in Phase 3 — moved forward because TestFlight #1 lives for 14 weeks before P3 lands.
- Pair-with-desk QR flow, Tailscale install link onboarding, Apple Sign-In, biometric unlock.
- `shay-relay` Node service: SSE token stream + WS control channel + APNs JWT rotation (every ~45min, signed with long-lived .p8 auth key).
- **Full per-message brain switcher** with cost/latency badges (Claude, GPT-5, Gemini 3, Codex-via-desk, desk-Ollama) and conditional sixth FM row gated on §7's four-gate availability check.
- Tier A on-device classification (NLTagger + CoreML).
- Tier B FM on eligible devices that pass the four-gate check.
- Minimum chat UI.
- **Exit gate:** Fritz pairs phone with home Mac mini, sends a message with each of the five always-available brains and confirms the FM row appears on his iPhone 15 Pro (Apple Intelligence enabled, model assets downloaded), sees cost/latency badges, gets offline FM answer in airplane mode. Sentry receives a deliberate test crash. TestFlight build #1 lives. **Supported-device floor verified:** smoke test on a clean iOS 26 device near the floor SKU.

**Phase 2 — Voice + Share + Terminal Mirror + MCP-proxy + Persistent Runs (6 weeks).**
- SpeechAnalyzer STT (iOS 26+, baseline since deployment target is iOS 26).
- Realtime voice: Gemini Live default, OpenAI Realtime premium. Voice channel independent of chat brain. CallKit integration for background voice.
- Share Extension with Tier A routing classifier (memory-safe).
- Photo / Files intake with Apple Vision OCR.
- Xterm.js terminal mirror inside WKWebView.
- MCP-proxy display: phone shows desk's MCP tool registry, dispatches calls through relay's typed JSON envelope.
- Persistent agent runs visible in phone with standard push notifications (Live Activities arrive in P3).
- Per-action approval gates with biometric re-auth on destructive.
- **Exit gate:** Fritz holds a voice conversation while Gemini handles speech and Claude handles reasoning; shares a PDF from Safari → Shay routes to Claude; runs a 30-min Codex job on the desk, gets push notification when it needs approval, approves with biometric, watches the terminal stream. TestFlight build #2.

**Phase 3 — Live Activities + Watch + Widgets + App Intents + Basic-Memory Snapshot Pull (8 weeks).**
- AgentRun Live Activity with Dynamic Island; `NSSupportsLiveActivitiesFrequentUpdates` declared (self-declared, system-throttled, graceful fallback).
- Lock Screen widgets (rectangular + circular).
- Apple Watch app + complications + Smart Stack card + see-on-wrist with finish-on-phone (biometric round-trip).
- **App Intents catalog of 6 intents** (`OpenChat`, `AskShay`, `CaptureToShay`, `OpenLastRun`, `ApproveNextToolCall`, `CancelRun`); destructive ones gated on biometric. 6 × 2.5 days = 15 dev-days ≈ 3 weeks — arithmetic now consistent.
- Action Button binding.
- Basic-memory **on-demand snapshot pull** via iCloud Drive (not a live sync; sidesteps UIDocument conflict states from concurrent desk writes).
- **Exit gate:** Fritz starts a long-running build job from desk, walks away, gets Live Activity, sees approval prompt on Apple Watch, picks up phone for biometric, build completes, notification fires, tap opens run summary. App Intents survive a Siri voice composition. TestFlight build #3 = production candidate.

**Cut from V1 → Px roadmap:** computer-use bridge (separate product, 6–12 months), Continuity Handoff (requires macOS app target), CarPlay (entitlement risk), HealthKit (no 5.1.3 justification), Smart Connections WebGL graph, bundled offline model weights, live basic-memory sync, expanded App Intents catalog (`StartAgentRun`, `SwitchBrain`, `RouteToBrain`, `OpenSiteStudio`), Android entire surface.

**Total: 20 weeks of focused work** for iOS V1 — see §11 for the hours-to-weeks reconciliation.

---

## 11. Cost + Timeline Estimate

**Engineering hours (Fritz-solo, AI-paired) — iOS V1 only:**

| Phase | Hours (Fritz) | Hours (Codex/Claude paired) |
|---|---|---|
| 1: Shell + Auth + Relay + Router + Tier A + Sentry | 115 | +70 |
| 2: Voice + Share + Terminal + MCP-proxy + Runs | 130 | +90 |
| 3: Live Activities + Watch + Widgets + 6 App Intents + iCloud pull | 165 | +110 |
| **iOS V1 build hours total** | **410** | **+270** |

**Hours-to-weeks reconciliation.** 410 build hours ÷ 25 focused hrs/week = 16.4 weeks of pure build. Add **~90 hours of ramp / admin / research / TestFlight cycle / App Review iteration** (Live Activities ramp ~25h, watchOS ramp ~30h, App Intents ramp ~15h, App Review cycles and resubmission ~20h) = **500 total hours ÷ 25 hrs/week = 20 weeks**. Phase 1 TestFlight in week 6, Phase 3 production candidate week 20. The slack is named explicitly so the numbers in §10 and §11 are internally consistent.

**Cloud token cost during build & test:**
- Dev Claude/GPT/Gemini calls during testing: ~$350/month for 5 months = **$1,750**.
- Gemini Live testing: ~$30 total.
- OpenAI Realtime testing (full-duplex output included): ~$150 total.
- Anthropic API for Fritz-only production traffic first 90 days: ~$50/month = **$150**.
- **Build-period total: ~$2,100.**

**Hardware Fritz must buy or already own:**
- Apple Watch (any current series) — required for watchOS development and approval-from-wrist testing.
- iPhone 15 Pro or later — required for Apple Intelligence / FM testing on Tier B. (Fritz already has one — confirmed in §4.)

**App Store entitlements timeline.**
- Apple Developer Program: $99/year (already paid).
- APNs JWT rotation: ~45min cycle, automated in `shay-relay`; .p8 auth key generated once and stored in relay's `~/.config/famtastic/shay-relay/apns.p8`.
- `NSSupportsLiveActivitiesFrequentUpdates`: self-declared in Info.plist; no Apple approval queue. Runtime energy budget enforced by iOS.
- `critical-alerts`: not requested in V1.
- iOS review window: 24–48hr typical 2026; first-app submission 4–7 days. Plan: first production submission at Phase 3 end → 1 week buffer.

**Bundled asset size:** V1 bundles only the Tier A CoreML classifier (~5MB). No bundled LLM weights. IPA stays under 100MB.

---

## 12. Risks + Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | App Store rejection under Guideline 2.5.2 | Low | High | Tool execution stays on desk; no bundled LLM weights; no computer-use bridge. |
| 2 | Guideline 2.5.4 background-audio rejection | Medium if mis-implemented | High | CallKit-backed voice only for locked-phone case. |
| 3 | **Tailscale onboarding cliff** — separate Tailscale app install + VPN profile | High | High | Onboarding links to Tailscale App Store page, waits for tailnet join, resumes pairing. Documented as #1 setup-time risk. Cloudflare Tunnel as a fallback is acknowledged but **deferred to a Px option**: a real CF fallback requires the Cloudflare Access policy, tunnel daemon on the desk, and a public hostname — that's a Phase-Px design effort, not a V1 mitigation line. Last resort: direct cloud brain only, no desk runtime. |
| 4 | Apple FM 4K context ceiling | Certain | Low | FM is only Tier B summarization + extraction + short offline drafting. Long reasoning routes to cloud/desk. |
| 5 | **FM four-gate availability** (hardware + region + opt-in + asset-ready) | Certain | Medium | §7's runtime availability check. FM row in switcher is hidden, not greyed, on devices where any gate fails. Distinct Settings UX surfaces which gate failed. |
| 6 | Share Extension memory limit ~60MB on non-Plus devices | Certain | Low | Extension uses Tier A non-LLM classifier only. FM never invoked inside extension. |
| 7 | **Live Activities throttled by iOS system energy budget** | Medium | Medium | `NSSupportsLiveActivitiesFrequentUpdates` is self-declared and OS-throttled at runtime; standard cadence works as fallback. Documented to user as "up to 8h, system-throttled." |
| 8 | Live Activity battery drain | Medium | Medium | Payload <4KB; one push per 5s of compute or per state transition. Battery telemetry in settings. |
| 9 | Brain provider TOS on comparison-shopping UI | Medium | Medium | BYOK only; badges use user's own historical p50, not vendor-published numbers; legal review of the brain-switcher UI before production submission. |
| 10 | Apple Intelligence third-party voice composition is roadmap, not given | Medium | Low | App Intents work standalone via Siri Shortcuts even without Apple Intelligence chain composition. |
| 11 | App Intents destructive composition without biometric | Mitigated by design | High if not mitigated | All destructive intents `requiresAuthentication = true`. |
| 12 | Watch-initiated approval with phone locked | Mitigated by design | High if not mitigated | Watch approval always round-trips biometric on paired phone; UX honest about "see-on-wrist, finish-on-phone." |
| 13 | Solo-dev scope creep | High | High | Phase 4 cut; Android cut; Continuity Handoff cut; CarPlay cut; HealthKit cut; Smart Connections graph cut; expanded App Intents cut; live basic-memory sync cut. |
| 14 | No second Apple Watch to test approval edge cases | Medium | Medium | Apple Watch purchase budgeted in §11. |
| 15 | Launchd contract reconciliation with phone-triggered desk wake | Low | Medium | `shay-relay` is its own launchd job, never starts/restarts `com.famtastic.studio`. WoL fallback requires Tailscale subnet router on LAN + WoL-from-deep-sleep firmware support — documented but not promised; V1 supported topology is always-on Mac mini. |
| 16 | **3.1.1 external-link rejection on BYOK AI apps** | Medium | High | §6: no in-app links to vendor signup or billing; empty-state copy says "Add your key in Settings" with no URL; reader-app entitlement not requested. Documented in App Review notes. |
| 17 | **iCloud Drive UIDocument conflict from concurrent desk writes on basic-memory vault** | Medium | Medium | §3 #13: on-demand snapshot pull with timestamp, not a live sync engine. Sidesteps the conflict-state class of bug. |
| 18 | iOS 26 deployment target excludes install base on iOS 17/18 | Certain | Medium | Trade is named in §4: Fritz is first user on iOS 26; install base grows naturally. Pre-iOS-26 STT fallback (SFSpeechRecognizer) is Px. |
| 19 | **Generative output via Siri voice-only contexts** | Medium | Medium | Pre-flight Tier A moderation on App Intent generative outputs that surface in voice contexts; §9 calls this out. |

---

## Critique trail

### R1 (V1 draft → V2 review)

R1 flagged two **blockers**: (a) bundled Gemma 3 / Qwen / WhisperKit Large weights in the IPA contradicted the App Thinning fallback in the same draft and didn't actually clear Guideline 2.5.2 the way V1 claimed; (b) the computer-use bridge dressed up as "phone never executes" was a Guideline 4.2.7 trap and was also a 6–12-month project on its own. **Majors:** general `UIBackgroundModes=audio` for AI voice continuation (Guideline 2.5.4 rejection pattern), comparison-shopping UI risk on vendor TOS, App Intents destructive composition without biometric, Live Activity "8h window" overclaim, on-device LLM device-eligibility hand-waving, Share Extension memory budget overrun risk, KMP scope-vs-skill mismatch against Fritz's actual stack (153 Swift files, 0 Kotlin), and the 14-week timeline being fantasy for a solo dev shipping Live Activities + Watch + App Intents + KMP for the first time. **Minors:** Tailscale embedded SSO doesn't exist, frequent-updates not auto-granted, voice cost math wrong, basic-memory sync mechanics undefined, Smart Connections perf ceiling, App Intents per-intent time cost, crash/telemetry infra missing, Wear/Watch hardware not budgeted, Play-side red-team docs missing, Tailscale onboarding cliff understated.

### V2 response

V2 cut the computer-use bridge to Px, removed bundled LLM weights and replaced them with a two-tier on-device story (Tier A ubiquitous + Tier B FM-conditional), constrained background voice to CallKit-only, gated destructive App Intents on biometric, rejected KMP for V1, revised the timeline from 14 to 20 weeks, repositioned MCP as proxy-display through a typed JSON envelope on `shay-relay`, upgraded comparison-shopping risk to Medium with BYOK-only and user's-own-p50 badge framing, switched to per-provider consent screens, shipped Apple Sign-In only to sidestep 4.8 parity, reconciled the launchd contract (shay-relay as its own job), and cut CarPlay / Continuity Handoff / HealthKit / Smart Connections graph / Android to Px.

### R2 (V2 review)

R2 returned `revise-minor` with zero blockers and zero remaining majors in the first agent's pass, but the second agent's pass added three majors and seven minors that V3 still had to clear. **R2 majors:** (a) FM "eligible device" framing still understated the eligibility gate and risked Guideline 1.5 / 2.3.1 by advertising FM-dependent features that would silently fail on most install-base devices — fix is to hide the FM row, not grey it, and rename the offline matrix row honestly; (b) FM availability also depends on user opt-in and asset-readiness, not just hardware, and V2 had no runtime availability check — fix is an explicit four-gate `SystemLanguageModel.availability` check before any FM routing or UI surface; (c) the BYOK "no IAP" posture needed sharper Guideline 3.1.1 read on external-link surface — fix is no in-app links to vendor signup/billing pages and explicit App Review notes. **R2 minors:** App Intents math (10 intents × 2.5 days ≠ 3 weeks — V3 trims catalog to 6 intents), hours-vs-weeks reconciliation (410 hours ÷ 25 hrs/wk ≠ 20 weeks without explicit ramp budget — V3 names the ~90h ramp/admin), Tailscale WoL hand-waving (V3 documents subnet router requirement and deep-sleep firmware caveats; V1 supported topology is always-on Mac mini), iOS 26 SpeechAnalyzer with no fallback or deployment target (V3 sets iOS 26 minimum and owns the install-base cost), Watch UX overclaim ("approve from wrist" — V3 reframes as "see-on-wrist, finish-on-phone"), Sentry/observability parked in Phase 3 leaves TestFlight #1 undebuggable for 14 weeks (V3 moves it to Phase 1), `frequent-updates` mis-framed as Apple-approved (V3 corrects to self-declared Info.plist key enforced by runtime energy budget), Cloudflare Tunnel one-liner masking a real second design (V3 demotes it to Px), iCloud Drive sync risk (V3 swaps live sync for on-demand snapshot pull), APNs auth-key rotation conflated with JWT rotation (V3 corrects in §5 and §11 to JWT rotation every ~45min signed with long-lived .p8). R2 also flagged the matrix legend not naming "FM-conditional" in the on-device LLM row (V3 adds the FM-conditional tag and footnote) and the App Intents voice-only generative output review posture (V3 routes voice-surface AskShay output through Tier A pre-flight moderation).

### V3 response

V3 hides — not greys — the FM row in the brain switcher and the §3 #1 picker when any of the four gates fails, gates all FM routing on `SystemLanguageModel.availability == .available`, renames the offline matrix row to "Offline drafting on Apple Intelligence devices; queued elsewhere," removes all in-app links to vendor signup or billing pages and documents the 3.1.1 mitigation in App Review notes, trims the V1 App Intents catalog to 6 intents (15 dev-days ≈ 3 weeks, arithmetic consistent), names the 410-build-hours-plus-90-ramp-hours total = 500 hours ÷ 25 hrs/wk = 20 weeks reconciliation explicitly, demotes Tailscale-WoL to the always-on supported topology and documents the subnet-router + deep-sleep firmware caveats, sets iOS 26 as the V1 deployment target and owns the install-base cost in §4, reframes the Watch UX as "see-on-wrist, finish-on-phone," moves Sentry SDK + minimal event pipeline to Phase 1 (default-on with anonymous ID), corrects `NSSupportsLiveActivitiesFrequentUpdates` framing to self-declared / system-throttled across §3 #9, §8, §9, and Risk #7, demotes the Cloudflare Tunnel fallback in Risk #3 to a Px option, swaps live basic-memory sync for on-demand snapshot pull in §3 #13 and adds Risk #17, corrects APNs JWT rotation framing in §5 architecture diagram and §11 ops budget (long-lived .p8 auth key signing JWTs that rotate every ~45min), and adds Risk #19 plus the §9 line about pre-flight Tier A moderation on App Intent voice-surface generative output. Three new risks total in §12: #16 (3.1.1 external-link rejection), #17 (iCloud UIDocument conflict), #18 (iOS 26 deployment-target install base), #19 (Siri voice-context generative output review posture).

V3 ships what a solo dev with Fritz's actual skill stack can credibly produce in 20 weeks of focused work: an iOS 26+, brain-agnostic, BYOK control surface for the home desk runtime, with the differentiation wedge intact (per-message brain switcher, brain-independent voice, MCP-proxy display, on-device routing tier, in-sandbox terminal mirror, persistent desk-runtime runs, Live Activities, Watch see-on-wrist with finish-on-phone) and the high-risk surfaces (computer-use bridge, bundled LLM weights, general background audio, Android, live sync, expanded App Intents catalog) honestly cut to a Px roadmap.