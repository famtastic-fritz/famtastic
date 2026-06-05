# Shay Ecosystem — Walk-Away Build Plan

> Generated 2026-06-03 by a research-first swarm (13 agents, haiku/sonnet, adversarially reviewed). The canonical plan I execute autonomously. Waves 1-5 + decision gates D1-D5.

## Shay Ecosystem — Final Walk-Away Build Plan

### Ground truth corrections before wave definitions

**The crash is port contention, not a code bug.** `launchd` (exit -15 / SIGTERM) is thrashing because the process it previously started is still bound to `0.0.0.0:8787` when launchd tries to restart. The plist has no `SO_REUSEPORT` and no `ThrottleInterval`. This is the first fix in Wave 1 — without it, nothing else runs reliably.

**`jobs.json` and `asks/20260530173835461034.json` are tracked in git.** The `.gitignore` only excludes `.token`. Both runtime-state files will leak into every commit. This is corrected in Wave 1 before adding any more runtime state.

**The voice ID is already in `~/.shay/config.yaml`** (`voice_id: pNInz6obpgDQGcFmaJgB`, the ElevenLabs "Adam" ID). The key is in `~/.shay/.env`. Both prerequisites are present, but the HTTPS blocker remains real.

**The `shay-phone` server is actually running** — `0.0.0.0:8787` is bound, the launchd loop is crashing on restart attempts because the socket is already held. The running instance is the old one launched manually or from a previous boot.

**There is no deep-research harness.** The pipeline primitives in `shay-agent-os/components/swarm/pipeline.py` are scaffolding. The `/deep-research` skill lives in the Claude Code skill system only.

**The brain adapter is not shared.** `shay-phone/server.py` has its own `call_anthropic`, `call_openrouter`, `call_gemini`, `call_codex_cli` functions. `site-studio/lib/brain-adapter-factory.js` is Node-only. These never connect.

---

## Decision Gates — Fritz Must Answer These Before or During Wave 2

**D1 — Voice output tier:** Piper (local, free, lower quality) vs ElevenLabs (API, ~$16/month at daily brief cadence, higher quality). Piper binary is referenced in config but not confirmed installed. ElevenLabs key and voice ID both confirmed present. **Default recommendation: ship browser `SpeechSynthesis` as Wave 2 output, ElevenLabs as Wave 3 opt-in behind a settings toggle. Fritz confirms or overrides.**

**D2 — HTTPS approach for voice input:** `webkitSpeechRecognition` requires HTTPS. Three options: (a) add `tailscale cert` + TLS wrapper to server.py (1 hour, permanent), (b) use ngrok free tunnel (minutes, but URL rotates), (c) ship local Whisper via `/api/stt` instead of browser API (2 hours, private, works offline). **Recommendation: local Whisper. Fritz confirms or overrides before voice input is built.**

**D3 — Runtime state location:** Move `jobs.json` and `asks/` to `~/.shay/phone-jobs.json` and `~/.shay/phone-asks/` (untracked, never in git) vs keep in `shay-phone/` and add them to `.gitignore`. **Recommendation: move to `~/.shay/` to eliminate the git leak vector permanently. Fritz confirms — this changes the constants in `server.py`.**

**D4 — Research gate depth:** Ship Gate 2 only (scope card: what it will search, estimated cost, approve/reject button) as Wave 3, or include Gate 1 interview (3-question scope refinement) at the same time. **Recommendation: Gate 2 only first. Fritz confirms.**

**D5 — Push notifications:** iOS Safari Web Push requires the PWA to be added to Home Screen and iOS 16.4+. Fritz must confirm: (a) PWA is installed to Home Screen on his phone, (b) iOS version is 16.4+. If not, push stays deferred and the daily brief Ask card is the only delivery mechanism. **Fritz confirms device state before VAPID work begins.**

---

## Wave 1 — The Smallest Slice Fritz Can Feel (Target: 2–3 hours build time)

**Goal:** Fritz wakes up, opens the PWA, sees a "Daily Brief" card in the Asks tab showing agent health + open jobs + recent revenue. That is the complete Wave 1 experience.

**What is built:**

**W1.1 — Fix the launchd crash loop** (30 min)
- File: `/Users/famtasticfritz/Library/LaunchAgents/com.famtastic.shay-phone.plist`
- Add `<key>ThrottleInterval</key><integer>10</integer>` to the plist.
- Add `SO_REUSEPORT=1` via a wrapper script, OR change server.py `main()` to set `server.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)` before bind — the stdlib `allow_reuse_address = True` class attribute on `TCPServer` does this; verify it is set on `ThreadingHTTPServer`.
- Reload: `launchctl unload ~/Library/LaunchAgents/com.famtastic.shay-phone.plist && launchctl load ~/Library/LaunchAgents/com.famtastic.shay-phone.plist`
- Verify: `launchctl list | grep shay-phone` shows a stable PID with exit code 0.

**W1.2 — Git hygiene: untrack runtime state** (15 min)
- Remove `shay-phone/jobs.json` from tracking: `git rm --cached shay-phone/jobs.json`
- Remove the answered ask: `git rm --cached "shay-phone/asks/20260530173835461034.json"`
- Add to `shay-phone/.gitignore`: `jobs.json` and `asks/*.json` (keep `asks/` dir itself via `.gitkeep`)
- Commit with message: `chore: untrack runtime job/ask state from shay-phone`

**W1.3 — `assemble_daily_brief()` function in `server.py`** (45 min)
Reuses existing code. No new dependencies. Pure Python reads:

Section 1 — Agent health: read `/Users/famtasticfritz/famtastic/command-center/data/agents-registry.json` (exists, confirmed) + `launchctl list` subprocess filtered to `famtastic|shay` entries. Parse PID and exit code. Output: list of `{name, status, pid}`.

Section 2 — Revenue (last 24h): read `command-center/data/revenue.jsonl` (exists, confirmed). Parse each line as JSON, filter by timestamp >= now-86400. Sum `amount` field if present. Output: `{total_24h, entries_count}`.

Section 3 — Open jobs: call existing `list_jobs()` function (already in `server.py` at line 462). Filter `status in ["active", "pending", "running"]`. Output: list of `{id, goal, status, progress_tail}` (last progress message only).

No section 4–7 in Wave 1. Explicit deferral, not omission.

**W1.4 — `/api/daily-brief` GET endpoint in `server.py`** (20 min)
- Add to `do_GET` handler, requires auth.
- Calls `assemble_daily_brief()`, returns JSON.
- On any section error, that section returns `{error: "<section>: <message>"}` — other sections continue. Brief always returns 200 with partial data.
- Also calls existing `create_ask("daily_brief", ...)` (line 338 of server.py) to write an Ask card. The ask's `question` field is a plain-English summary of the brief. This makes it appear in the Asks tab badge automatically.

**W1.5 — `com.shay.dailybrief.plist` launchd job** (15 min)
- New file: `~/Library/LaunchAgents/com.shay.dailybrief.plist`
- Fires: `curl -s -H "X-Shay-Token: $(cat /Users/famtasticfritz/famtastic/shay-phone/.token)" http://localhost:8787/api/daily-brief`
- Schedule: `StartCalendarInterval` at hour 8, minute 0.
- No new dependencies. `curl` is stdlib on macOS.

**Verify Wave 1:**
1. `curl -s -H "X-Shay-Token: $(cat shay-phone/.token)" http://localhost:8787/api/daily-brief` returns JSON with three sections.
2. PWA Asks tab shows a "Daily Brief" card.
3. `launchctl list | grep shay-phone` shows stable PID for 60 seconds.
4. Git status shows no `jobs.json` or `asks/*.json` as tracked.

**Cost: $0. Zero new dependencies. Zero new files except the plist.**

---

## Wave 2 — Voice Output + Cross-Session Tail (Target: 3–4 hours)

**Goal:** Fritz asks Shay something on his phone, gets a spoken answer. When he opens Shay Shay Desk, the last phone exchange is in context.

**Prerequisites:** D1 and D2 decided by Fritz.

**W2.1 — Browser TTS (no server dependency)** (30 min)
- File: `shay-phone/web/index.html`
- After every chat response, call `window.speechSynthesis.speak(new SpeechSynthesisUtterance(replyText))` in the existing fetch-response handler.
- Add a mute toggle button (SVG speaker icon, 1 line of JS to set a `window._ttsEnabled` flag).
- This requires zero server changes. Works over plain HTTP. Ships immediately.
- Verify: ask Shay something, hear spoken reply. Toggle mute. Confirm silence.

**W2.2 — `/api/tts` ElevenLabs endpoint (conditional on D1)** (45 min)
If Fritz chooses ElevenLabs for Wave 2 (vs deferring to Wave 3):
- Add to `server.py`: `POST /api/tts` accepts `{"text": "..."}`, reads `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` from `ENV_FILE` (`load_env()` already parses this at line 114), POSTs to `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` with `Accept: audio/mpeg`, buffers the response bytes, returns them with `Content-Type: audio/mpeg`.
- PWA receives bytes via `response.arrayBuffer()` → `new Blob([bytes], {type:'audio/mpeg'})` → `URL.createObjectURL(blob)` → `new Audio(url).play()`. The `new Audio(url).play()` line explicitly needs the blob URL, not a text URL. This is the exact implementation — the design doc's "streams audio blob back" shorthand conceals this step.
- Fallback: if `/api/tts` returns non-200 or throws, fall back to `SpeechSynthesis.speak()`.
- Gate: read a `tts_provider` setting from a new `GET /api/settings` thin endpoint (returns a JSON slice of `~/.shay/config.yaml`). Default is `"browser"`. Only call `/api/tts` if setting is `"elevenlabs"`.
- Cost gate: add a `tts_char_count_today` counter written to `~/.shay/tts-usage.json`. If daily char count exceeds 50,000 (configurable), fall back to browser TTS and add a warn flag to the response.

**W2.3 — Session continuity tail** (45 min)
The safe implementation (no race condition):

- In `server.py` `do_chat()` (or wherever the chat response is assembled), after a successful response, append to `~/.shay/memories/phone-session.md` using the vault append path. This is the same path used by `/api/capture` — reuse `do_capture("phone_session", ...)` or write directly to the VAULT path.
- Format: a fenced code block with timestamp, user message, and assistant reply tail (last 500 chars to keep the file bounded).
- Shay Shay Desk already reads the vault on session start (confirmed in `~/.shay/config.yaml` vault config). The phone session context flows in automatically.
- No new file. No polling. No race: vault appends are sequential single-writer operations from `server.py`.

**Verify Wave 2:**
1. PWA chat response triggers spoken audio (browser TTS).
2. If ElevenLabs enabled: response audio is noticeably higher quality.
3. Open Shay Shay Desk after a phone conversation — confirm the vault note `phone-session.md` exists with recent entries.
4. `/api/tts` with 1000 chars does not exceed 1 second latency on LAN.

**Cost: browser TTS is $0. ElevenLabs at Fritz's actual usage rate is Fritz's call (see D1).**

---

## Wave 3 — Voice Input + Research Gate 2 (Target: 4–6 hours)

**Goal:** Fritz speaks to Shay on his phone. Fritz can request research, approve the scope, and get a report in the Asks tab.

**Prerequisites:** D2 (voice input method) and D4 (research gate depth) decided. HTTPS solution in place.

**W3.1 — HTTPS for Web Speech API (if local Whisper chosen per D2)** (2 hours)
- Add `/api/stt` to `server.py`: `POST /api/stt` accepts a WAV/OGG blob (from `MediaRecorder` in PWA), writes to a temp file, runs `whisper-cpp` or Python `faster-whisper` subprocess, returns `{"text": "..."}`.
- Check if `whisper.cpp` or `faster-whisper` is installed: `which whisper-cpp` or `python3 -c "import faster_whisper"`.
- If neither is installed, this is a one-time setup step: `pip3 install faster-whisper` + download the `base.en` model (~150MB). Document as a setup prerequisite.
- PWA: mic button triggers `MediaRecorder` → POSTs blob to `/api/stt` → drops transcript into `#input` → auto-submits.
- This works over plain HTTP (no Google, no HTTPS requirement for this path).

If Tailscale/ngrok chosen instead: document the exact `tailscale cert` command and TLS wrapper addition to `server.py` as a setup step Fritz runs once.

**W3.2 — Research Gate 2 only (scope card)** (2 hours)
- Add `POST /api/research/gate` to `server.py`.
- This endpoint is **non-blocking**: it creates a job (`dispatch_job(...)`) and creates an Ask (`create_ask("research_scope", ...)`) immediately and returns `{"job_id": "...", "ask_id": "..."}` — does not block.
- The Ask card shows: what will be searched (synthesized from the topic via a single cheap Gemini Flash call — `call_gemini([{"role":"user","content":"Summarize what a research brief on '{topic}' would cover in 2 sentences"}], ctx="")` — single call, ~$0.001), estimated cost ("~$0.05–0.20 for a thorough search"), and Approve/Reject buttons.
- On Approve (Fritz taps): the existing `/api/answer` endpoint (line 663) receives `{"id": ask_id, "answer": "approved"}`. The job `status` updates to `"active"`.
- Execution: a separate background thread polls `jobs.json` for `status=active` research jobs and runs a simplified fan-out: 3 searches via Gemini Flash (cheap tier), collects snippets, synthesizes a report with Claude Sonnet (escalated only here, where quality matters), writes to `data-center/jobs/research-<id>/report.md`. Appends a ledger row to `data-center/ledgers/research-jobs.jsonl` (existing file, confirmed present).
- On completion: calls existing `job_complete(jid, output)` (line 497) + calls `wp_push()` if VAPID is live, else creates a new Ask card with a link to the report.
- No threading deadlock because the gate endpoint returns immediately. The background thread is a `threading.Thread(daemon=True)` started on server boot that polls every 5 seconds — same pattern as is implied by the existing job queue.

**Note on deep-research harness:** There is no standalone harness to call. This implementation IS the harness — it is a 50-line background worker in `server.py` that uses Gemini Flash for search (via `call_gemini()`, already in server.py) and Claude Sonnet for synthesis (via `call_anthropic()`, already in server.py). No new harness. No subprocess calls to skills. The adversarial review's complaint is valid; this plan does not inherit that assumption.

**Verify Wave 3:**
1. Speak a command → transcript appears in input field → Shay responds.
2. Type `/research <topic>` → scope card appears in Asks tab within 3 seconds.
3. Tap Approve → job status goes to `active` in `GET /api/jobs`.
4. Within 2 minutes → report exists at `data-center/jobs/research-<id>/report.md`.
5. Completion Ask card appears in PWA.

**Cost: Gemini Flash fan-out (3 calls, ~100 tokens each) + Claude Sonnet synthesis (~2000 tokens) = ~$0.07 per research run at current rates.**

---

## Wave 4 — Full Daily Briefing + Push Notifications (Target: 3–4 hours)

**Goal:** Complete the 7-section daily briefing. Push notifications reach Fritz's phone without opening the PWA.

**Prerequisites:** D5 (push prereqs confirmed by Fritz). VAPID setup done.

**W4.1 — Complete the daily briefing sections** (1.5 hours)
Extend `assemble_daily_brief()` with:

Section 4 — Open asks: `list_pending_asks()` (exists at line 382 of server.py). Already works.

Section 5 — Ideas triage: read `command-center/data/` for an ideas file. **Note: this file path needs to be confirmed — it is not one of the two confirmed files (`agents-registry.json`, `revenue.jsonl`). Lead must verify the ideas store location before implementing.** Fallback: skip silently if the file does not exist.

Section 6 — Data Center proof digest: read `data-center/ledgers/*.jsonl` directly in Python (NOT via `node -e`). Each ledger file is newline-delimited JSON. Filter by timestamp >= now-86400. Count rows per ledger. This is 10 lines of Python, zero Node dependency.

Section 7 — Promoted intelligence: read `~/.shay/config.yaml` for the active site tag, then read `sites/<tag>/intelligence-promotions.json`. If no active tag is known at brief time (likely), skip silently — do not error the whole brief. Write the active tag to `~/.shay/active-site.txt` from Studio when a site is loaded; the briefing reads that file.

**W4.2 — VAPID setup and push delivery** (1.5 hours)
- **Fritz must do this first:** `pip3 install pywebpush` (confirm not installed), run `python3 -c "from py_vapid import Vapid; v=Vapid(); v.generate_keys(); v.save_key('~/.shay/webpush.json')"` to generate keys.
- Fritz installs the PWA to Home Screen (mandatory for iOS Web Push).
- The `/api/subscribe` endpoint (line 644 of server.py) already handles subscription registration. Fritz visits the PWA, triggers subscribe — this creates `~/.shay/webpush-subs.json`.
- `wp_push()` (line 72 of server.py) already has the pywebpush call. Verify it works with a test ping.
- `assemble_daily_brief()` calls `wp_push()` after writing the Ask card. Both delivery paths active.

**Verify Wave 4:**
1. `curl .../api/daily-brief` returns all 7 sections (with graceful skips for missing data).
2. Fritz receives a push notification on his phone at 08:00 without the PWA open.
3. Tapping notification opens to the Daily Brief Ask card.

**Cost: $0. pywebpush is free. Push delivery is free.**

---

## Wave 5 — Shared Spine + Surface Routing (Target: 1 week, multiple sessions)

**Goal:** Intent classification in `shay-phone/server.py` routes `build` and `media` intents to Site Studio and Media Studio. Brain routing is consistent across surfaces.

**Note:** This wave is correctly scoped as a multi-session effort. The "shared brain adapter" claim in the design is aspirational. The real path is:

**W5.1 — Intent classifier in server.py** (3 hours)
Add a `classify_intent(text)` function that calls Gemini Flash with a simple prompt: "Classify this user message as one of: chat, capture, research, build, media. Return only the label." This is a single cheap call (~$0.001). Route accordingly:
- `build` → POST to Site Studio's `/api/shay-shay` (port from `~/.famtastic/config` or `~/.shay/config.yaml`)
- `media` → POST to Media Studio if running
- `research` → research gate flow from Wave 3
- `chat` / `capture` → existing handlers

**W5.2 — Unified brain config** (2 hours)
Extract the four `call_*` functions from `server.py` into `shay-phone/lib/brain.py`. This doesn't share code with `site-studio/lib/brain-adapter-factory.js` (Node), but it consolidates the Python surface. Both Python surfaces (shay-phone, shay-agent-os pipeline) import from the same module. Node surfaces (Site Studio) continue to use their own adapter. Document this as the actual architecture — two separate brain layers (Python, Node) that share the same API keys via `~/.shay/.env` and `~/.shay/config.yaml`.

---

## Explicit Non-Goals (Deferred Past Wave 5)

- Gate 1 research interview (3-question scope refinement): adds friction before the Gate 2 loop is proven. Defer.
- Session continuity via a shared file with race conditions: replaced by vault append in Wave 2.
- ElevenLabs as the default TTS: too expensive at daily brief cadence. Remains opt-in.
- Cross-surface "shared spine" in the architectural sense: not achievable without a runtime that spans Python and Node. The correct long-term answer is an HTTP microservice (thin Python sidecar that wraps `brain-adapter-factory.js` via subprocess) — this is a Wave 6+ design decision.
- AGENT_CONTEXT.generated.md's routing diagram showing `shay-shay gateway` as the router for phone traffic: the phone server is its own entry point. They share vault and `~/.shay/config.yaml` but are not co-routed. Update the architecture doc to reflect this honestly.

---

## Security Fixes (Bundled with Wave 1 and Wave 2)

These are not a separate wave. They ship with the waves where they are cheapest to fix.

**With Wave 1:** Add `shay-phone/asks/*.json` and `shay-phone/jobs.json` to git exclusion (W1.2 above). Consider moving to `~/.shay/` per D3 — Fritz decides.

**With Wave 2 (before any spend-gated feature):** Add a daily cost counter to `~/.shay/spend-today.json`. Any endpoint that makes an API call increments it. `GET /api/settings` returns current spend. If spend exceeds a configurable cap (default: $5/day), new API calls return 429 with a message. This is 20 lines of Python and prevents runaway spend from a compromised token.

**With Wave 3 (before research):** Add `ThrottleInterval` to the research gate — no more than 3 research jobs per 24 hours without Fritz manually raising the cap. Write the count to `~/.shay/research-jobs-today.json`.

**Ongoing (not a wave, not a build task):** Bind address should be `127.0.0.1` if Tailscale serve is the remote access method. If Fritz wants LAN access from his phone without Tailscale, `0.0.0.0` is required and the current token auth is the only gate. Document this honestly. Do not change the bind address until D2 is decided, because the answer affects whether `0.0.0.0` is needed.

---

## File Reference Map

| What | Path | Status |
|---|---|---|
| Phone server | `shay-phone/server.py` (719 lines) | Running, crash loop due to port reuse |
| Phone PWA | `shay-phone/web/index.html` | Installed, functional |
| Jobs queue | `shay-phone/jobs.json` | Tracked in git — fix in W1.2 |
| Asks | `shay-phone/asks/` | One file tracked in git — fix in W1.2 |
| Agent registry | `command-center/data/agents-registry.json` | Confirmed present |
| Revenue ledger | `command-center/data/revenue.jsonl` | Confirmed present |
| Data center ledgers | `data-center/ledgers/*.jsonl` | Confirmed, 6 files |
| Vault | `obsidian/Shay-Memory/` | Live |
| Config | `~/.shay/config.yaml` | Live, has voice IDs |
| Env/secrets | `~/.shay/.env` | Live, has ElevenLabs key |
| VAPID keys | `~/.shay/webpush.json` | Does NOT exist yet |
| Push subscriptions | `~/.shay/webpush-subs.json` | Does NOT exist yet |
| launchd plist | `~/Library/LaunchAgents/com.famtastic.shay-phone.plist` | Exists, needs ThrottleInterval |
| Daily brief plist | `~/Library/LaunchAgents/com.shay.dailybrief.plist` | Does NOT exist yet |