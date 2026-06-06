# Shay Command Center — Information-Architecture Spec (2026-06-06)

> Produced with the `ui-ux-advisor` skill. This is the design north-star: what
> information exists, who sees it where, how it scales phone↔laptop, and the
> smallest path from "not usable" to "usable." Engineering serves this — not the
> reverse. The test: you could build from this without re-asking "where does this go?"

## TL;DR (the decision)

You don't have a UI problem — you had a **data + executor** problem wearing a UI
costume. The phone view is already the right shape. **Keep two surfaces, retire the
rest, point both at one truth:**

- **Phone = the shay-phone PWA** (glance + dispatch + answer + view jobs + chat).
- **Laptop = the shay-agent-os dashboard** (the full operating console / board).
- **One model:** `kanban.db` (jobs) + `events.jsonl` (live nerve) + asks + agents.
- Everything else (command-center Node hub, Shay Web, Shay Workspace, companion-app)
  is **not the command center** — park or scope out (see §5).

---

## 1. Information model (the nouns — one source of truth each)

| Noun | What it is | Single source of truth | Status |
|---|---|---|---|
| **Job** | a unit of work you send Shay (goal, status, progress, result) | **`kanban.db`** (survivor) | ⚠️ phone still writes `shay-phone/jobs.json` — **consolidate** |
| **Event** | the live activity stream (job started/done, ask raised, agent heartbeat) | **`~/.shay/events.jsonl`** (the spine) | ✅ wired both ways |
| **Ask** | a question Shay needs *you* to answer | `shay-phone/asks/*.json` | ✅ exists; should also surface on laptop |
| **Agent** | a worker/process and its health | one registry (orchestrator ↔ `agents-registry.json`) | ⚠️ two sources disagree — pick one |
| **Chat** | a conversation with Shay's brain | Shay gateway `:8642` | ✅ exists (phone Chat + Shay Web) |

**Rule applied:** if two surfaces don't match, it's because a noun has two stores.
Jobs (kanban.db vs jobs.json) and Agents (orchestrator vs registry) are the two live
violations. Close those and "sync" stops being a feature you chase — it's automatic.

---

## 2. Audiences × devices (there is one audience: Fritz)

| Context | Device | The job he's doing | Frequency |
|---|---|---|---|
| Away from desk | **Phone** | glance ("what needs me?"), **dispatch a job**, **answer an ask**, check a job's result, quick chat | many times/day |
| At the desk | **Laptop** | watch the board, see all jobs/agents/feed at once, run/triage, deep chat | focused sessions |

That's it. No other audience. So the answer is exactly **one phone view + one laptop
view** — anything else is sprawl.

---

## 3. Per-view layout

### 3a. PHONE — shay-phone PWA (already the right shape)
Bottom tab bar, single column, touch-first. **Trim to ≤5 tabs** (currently 6).

| Tab | Home/glance content | Primary action | Deliberately omitted |
|---|---|---|---|
| **Brief** (home) | one line: "N jobs running · M asks · agents up" + stat tiles | tap a tile → its list | revenue/ideas detail (link, don't embed) |
| **Jobs** *(merge Tasks)* | jobs as stacked cards, status dot, filter chips (All/Running/Done) | **＋ New job** (dispatch) — the headline action | full logs (tap → detail sheet) |
| **Asks** *(promote)* | Shay's pending questions as cards | **Answer** inline | — |
| **Feed** | the event stream (one truth, live) | tap → source detail | raw JSON |
| **Chat** | conversation with Shay | send / 🎙 | — |

> Consolidation: today's tabs are Brief/Tasks/Feed/Chat/Dispatch/You = 6. Fold
> **Dispatch into Jobs** (the "＋ New job" button *is* dispatch) and move **You**
> (settings/push) into a header gear icon. → 5 tabs: **Brief · Jobs · Asks · Feed ·
> Chat.** "Add / view / answer" all become first-class, which is exactly the ask.

### 3b. LAPTOP — shay-agent-os dashboard (the console)
Three panes, density is the point:

| Pane | Content |
|---|---|
| Left — **Agents/Nav** | agent health, trust mode, surface switch |
| Center — **Board + Chat** | jobs as a **kanban board** (Queued/Running/Done lanes from `kanban.db`), dispatch box, chat |
| Right — **Activity** | the live event feed (`events.jsonl` via WS) + asks needing an answer |

Primary action: dispatch + drag/triage jobs across lanes. Omitted: nothing — this is
the full console.

---

## 4. Responsive map (wide → narrow, same nouns/verbs)

| Laptop pane | becomes on phone |
|---|---|
| Agents/Nav (left) | Brief tiles + header (not a pane) |
| Board (center) | **Jobs** tab (lanes → filter chips, board → vertical cards) |
| Chat (center) | **Chat** tab |
| Activity (right) | **Feed** tab |
| Asks (in right pane) | **Asks** tab |

Same five nouns everywhere; only the container changes (pane ↔ tab). A job dispatched
on either shows on both because both read `kanban.db` + `events.jsonl`. **This is the
"Claude Code scales down" model — and we ship it as Two-Skins-One-Backend** (the phone
PWA already exists and is good; don't rebuild it as a responsive monolith).

---

## 5. What to build vs what exists (smallest path to usable)

**Already exists / shipped — don't rebuild:**
- Phone view (shay-phone PWA) — the correct mobile shape. ✅
- Live nerve (`events.jsonl`) + phone Feed + dashboard feed wiring. ✅
- **Job executor** (`scripts/shay/job-runner.py`) — closes dispatch→run→result. ✅
- Dashboard reachable from phone (dynamic host + tailnet CORS). ✅

**The remaining work is plumbing to one truth, not new screens:**
1. **One job store** — phone `dispatch_job()` writes **kanban.db**; job-runner +
   dashboard read **kanban.db**. Retire/mirror `jobs.json`. *(biggest unlock)*
2. **One agent truth** — phone Brief + dashboard read agents from the same source.
3. **Dashboard renders the board from kanban.db** (lanes), not the in-memory pool.
4. **Phone tab trim** — Dispatch→Jobs button, You→header → 5 tabs, Asks promoted.

**Park / scope out (sprawl — not the command center):**
- **command-center (Node hub):** its *collectors* (revenue/ideas/process) can feed the
  dashboard later as data; the duplicate UI is retired.
- **Shay Web (hermes-webui):** a fine general chat UI, but redundant with the phone
  Chat tab for command-center purposes — keep as optional, not a surface to maintain.
- **Shay Workspace (Electron):** a desktop agentic IDE — legitimate, but a *different
  product*; not part of the phone↔laptop command center. Out of scope here.
- **companion-app:** stale → delete.

---

## 6. Honest gaps + anti-patterns caught

**Anti-patterns we caught (and avoided):**
- **Cram-the-desktop:** the near-miss of opening the 3-pane React dashboard on the
  phone. Avoided — the phone keeps its own scaled view.
- **Duplicate truths:** jobs (kanban.db vs jobs.json) and agents (orchestrator vs
  registry). *This is the actual root of "not in sync."* Closing #1 and #2 above
  fixes it structurally.
- **Surface sprawl:** five overlapping UIs. Cut to two.

**Gaps still open:**
- Job store consolidation (kanban.db) not yet done — interim is jobs.json.
- Asks aren't surfaced on the laptop yet (only phone).
- No rotation policy on `events.jsonl` (fine until it's large).
- Dashboard board view (kanban lanes) not built — currently a task list.
- The runner is unproven against the *real* gateway (tested in mock only).

**One-line verdict:** the command center is two surfaces (phone PWA + laptop
dashboard) over one model (kanban.db + events.jsonl). The phone is already shaped
right; "usable" is now a plumbing job — and the executor that was actually missing is
shipped.
