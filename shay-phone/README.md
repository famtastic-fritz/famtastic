# Shay Phone — v0 (built 2026-05-30)

A minimal installable PWA + stdlib proxy so Fritz can run "Shay" from his phone
over the home LAN. First brick of the companion-app plan
(`obsidian/Shay-Memory/post-review/shay-self-orchestration-plan-2026-05-30.md`).

## What it does (v0)
- **Chat with a brain picker** — choose **Auto** (smart fallback: Claude → Codex → OpenRouter → Gemini)
  or pin a specific brain from the dropdown. Uses your Shay-Memory vault as context.
  - **Claude (direct)** — activates when a real `sk-ant-api…` key is in `~/.shay/.env`.
  - **Codex CLI** — uses your funded ChatGPT/Codex subscription (read-only, answers only).
  - **Claude (OpenRouter)** — needs OpenRouter credit.
  - **Gemini** — always-on fallback.
  - The header shows which brain actually answered; `●`/`○` dots show which are available.
- **Capture** — note / idea / diary → markdown file in `obsidian/Shay-Memory/inbox/`.
- **Recent** — lists what you've captured.

## Use it on your phone
1. Phone on the **same WiFi** as the Mac.
2. Safari → `http://<mac-LAN-ip>:8787/?k=<token>` (token is in `.token`).
3. Share → **Add to Home Screen** → opens full-screen like an app.

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
```bash
cd ~/famtastic/shay-phone
pkill -f "shay-phone/server.py"; nohup python3 server.py > /tmp/shay-phone.log 2>&1 &
```
Not yet a launchd service — a reboot stops it; rerun the command. (Durable launchd
install is a follow-up, gated on your approval.)

## Flip chat to Claude
Add a **real** Anthropic API key (the `sk-ant-api…` one your credits are on — NOT the
`sk-ant-oat…` subscription token) to `~/.shay/.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```
then restart. The proxy prefers Claude-direct → OpenRouter → Gemini automatically.

## Limits (honest, v0)
- **LAN only** — works on home WiFi, not cellular. Anywhere-access needs a tunnel
  (Tailscale/Cloudflare) — next step.
- **No mid-run approval / durability yet** — that's Milestone Zero in the plan.
- Token auth only; do not expose `:8787` to the public internet as-is.
