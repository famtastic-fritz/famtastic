# Shay Phone — Companion (UI rebuilt 2026-06-05)

An installable PWA + stdlib proxy so Fritz can remote-control "Shay" from his
Android phone over Tailscale. The **experience was rebuilt from scratch on
2026-06-05** to the spec in `obsidian/01-Shay/SHAY-COMPANION-BUILD-BRIEF.md`
(the old v0 skin was rejected). The Python backend (`server.py`) and web-push
plumbing carried forward unchanged — only `web/` was rebuilt.

## The companion UI (5-tab IA)
Dark layered surfaces, single **electric-indigo `#5B4FE8`** accent, Space Grotesk
display + Inter body, status dots (cyan=working / amber=needs-input / rose=failed /
gray=done), and a breathing-cyan-dots "thinking" indicator (never a spinner).

- **Brief ☀** — morning digest from `assemble_daily_brief()`: agents up, revenue 24h,
  open jobs, asks waiting, in-flight job cards, fresh ideas, promoted intel, Data
  Center digest. "Generate fresh brief" re-pulls `/api/daily-brief`.
- **Tasks ⚡** — the Code-tab: job list with All/Working/Needs-input/Done filters,
  status dots, tap → detail sheet with live activity log + result + cancel.
- **Chat ✦** — conversation with the brain picker (Auto + per-brain), breathing-dot
  thinking, voice (STT). Auto: Claude → Codex → OpenRouter → Gemini.
- **Dispatch ▷** — approvals queue + a new-job composer (goal + autonomy policy) +
  quick capture (note/idea/diary → vault inbox).
- **You ○** — default autonomy (Suggest/Copilot/Autopilot), push notifications
  (enable + test), daily notification budget, quiet hours, Mac health, chat brain.

### The Interview Card (centerpiece)
Pending questions/interviews surface as a **bottom-attached sheet** — "SHAY IS
ASKING" pill with breathing dots, the question, tappable option rows (title +
description, split on `" — "`), a "type your own" field, and progress dots for
multi-question interviews. A multi-question interview ends in a **read-only plan
card** → **Approve & start** / **Let's adjust**. Renders both single asks
(`/api/ask` kind `question`/`approval`/`research_scope`) and multi-question
interviews (`/api/interview`); surfaced automatically by a 12s poller.

## Use it on your phone (Android, over Tailscale)
1. Mac + phone both on Tailscale (the gateway binds `0.0.0.0:8787`).
2. Chrome → `http://<mac-tailscale-name>:8787/?k=<token>` (token is in `.token`).
   The `?k=` is stored in `localStorage`, so later visits don't need it.
3. ⋮ → **Add to Home screen** → installs with icon + manifest; **You → Enable
   lock-screen alerts** wires Web Push (VAPID keys auto-generate on server start).

## Approval / question flow (the Claude-Code-style connection)
When a Shay job needs your input mid-task, it asks — and **blocks until you answer
from your phone**. The 🔔 **Asks** tab shows pending requests (with a live badge);
tap an option or type an answer, and the waiting job resumes.

Any job/agent uses the bridge:
```python
from ask_shay import ask, approve
if approve("Deploy to production?", context="build passed"):
    deploy()
choice = ask("Which brand direction?", ["Bold", "Classic", "Playful"])
```
CLI: `python3 ask_shay.py "Approve deploy?" --options Yes No --timeout 600`

Endpoints: agent creates `/api/ask`, polls `/api/ask?id=`; phone reads `/api/asks`,
answers `/api/answer`. Pending requests persist as JSON in `./asks/`.
(v0 = phone polls every 5s while open; APNs/Web-Push wake-up is a follow-up.)

### Interviews (structured review sessions)
Bigger than a single ask: a titled, multi-question session with a thing to review
(e.g. *"interview Fritz on the research from X"*, or *"review this site"*). A cron
job or any agent queues it; it waits in the 🔔 tab; you work through the questions
and submit; the answers flow back to the job.
```python
from ask_shay import interview, queue_interview
# blocking (job waits for you):
answers = interview("Review: competitor pricing research",
    [{"q":"Accurate?","options":["Yes","No"]}, "Anything to add?"],
    context="overnight findings…", url="http://…/report")
# fire-and-forget (cron queues it, picks up answers later):
iid = queue_interview("Review the new site", [...], url="http://…")
```
Endpoints: `/api/interview` (create), `/api/asks` (phone lists, interviews included),
`/api/answer` with `{id, answers:[…]}` (submit).

## Run / restart
The server is a **launchd** service (`com.famtastic.shay-phone`) — it starts on
login and survives reboots. To force a restart (e.g. to regenerate VAPID keys or
pick up a `server.py` change):
```bash
launchctl stop com.famtastic.shay-phone   # launchd relaunches it in ~2s
```
Static `web/` files are read fresh per request, so UI edits go live without a
restart. Logs: `/tmp/shay-phone.log`.

## Flip chat to Claude
Add a **real** Anthropic API key (the `sk-ant-api…` one your credits are on — NOT the
`sk-ant-oat…` subscription token) to `~/.shay/.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```
then restart. The proxy prefers Claude-direct → OpenRouter → Gemini automatically.

## Limits (honest)
- **Reachability = Tailscale.** `:8787` is plain HTTP bound to `0.0.0.0`; reach it
  over the Tailscale tailnet, not the public internet. Token auth only — do **not**
  port-forward `:8787`.
- **Web Push needs a secure context.** Tailscale `*.ts.net` names and `localhost`
  count as secure, so push works there. A bare LAN IP over `http://` does **not**
  expose `PushManager` — use the tailnet hostname for lock-screen alerts. (Caddy/TLS
  in front is the fallback if a non-secure origin is unavoidable.)
- **Chat is request/response, not streaming.** `/api/chat` returns the full reply;
  the breathing-dots indicator covers the wait. SSE streaming is a later upgrade.
- **Autonomy modes + notification budget/quiet-hours are client-side prefs** today
  (stored in `localStorage`); they label intent but are not yet enforced server-side.
