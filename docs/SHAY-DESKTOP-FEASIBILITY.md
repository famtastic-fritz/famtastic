# Feasibility Study — Shay Multi-Brain Desktop Command Center

> **Prepared as:** Senior software-architect feasibility analysis
> **Date:** 2026-06-04
> **Scope:** A desktop "command center" that sits *above* multiple AI chat
> systems (ChatGPT, Claude, Gemini, local models) and maintains its own
> memory, tasks, projects, and workflows — with a first version that avoids
> per-message API costs by hosting the existing subscription web UIs.
> **Audience:** Experienced Drupal/PHP developer with React experience and
> local AI tooling, building solo.

---

## 0. TL;DR — the one-paragraph verdict

This is **feasible and worth building**, but the specific v0.1 you described —
embedding the *logged-in subscription web UIs* of ChatGPT, Claude, and Gemini
inside one desktop shell — is the **hardest and most fragile** version of the
idea, for reasons that are mostly *outside your control* (provider Terms of
Service, Google's hard block on OAuth inside embedded webviews, Cloudflare
bot-detection, and DOM churn). The **Shay layer itself** — memory, tasks,
notes, projects, idea capture, agent delegation, local databases — is
**genuinely easy** and you already own ~80% of the building blocks in this
repo. My recommendation: **decouple the two halves.** Build the durable,
high-value Shay layer first as a local-first app, and treat "host the
provider web UIs" as a *pluggable surface* where a **browser extension** (not
an embedded webview) is the lower-risk, lower-maintenance way to get the
"Save to Shay" button next to your real ChatGPT/Claude/Gemini sessions. Keep
embedded webviews as an option, not the foundation.

---

## 1. Feasibility assessment

### 1.1 Two fundamentally different products are hiding in this brief

It's critical to separate them, because they have *opposite* risk profiles:

| | **The Shay Layer** (memory/tasks/projects/agents) | **The Provider Surface** (host ChatGPT/Claude/Gemini) |
|---|---|---|
| Technical difficulty | Low–Medium | Medium–High |
| Legal/ToS risk | Effectively zero (it's your own data, local) | Gray → High (depends *how* you integrate) |
| Maintenance burden | Low (you control the schema) | High (you don't control their DOM/auth) |
| Durable value | Very high — survives any provider change | Fragile — breaks when a provider changes anything |
| You already own it | ~80% (see §9) | 0% |

**The strategic insight:** the part you asked to build *first* (the provider
surface) is the part most likely to break and least likely to last. The part
you treated as the "separate layer" is the actual product and the actual moat.
Invert the build order.

### 1.2 Is each provider embeddable?

| Provider | Login in embedded webview | Manual chat in webview | "Save to Shay" (manual capture of *your own* content) | Programmatic scraping / auto-injection |
|---|---|---|---|---|
| **ChatGPT** (chatgpt.com) | Usually works but Cloudflare-sensitive | Works | Low risk — it's your data, you triggered it | **ToS violation** — see §1.3 |
| **Claude** (claude.ai) | Usually works, Cloudflare-sensitive | Works | Low risk | Against ToS / bot-detection |
| **Gemini** (gemini.google.com) | **BLOCKED** — Google rejects OAuth in embedded webviews with `disallowed_useragent` (enforced since 2017) | Works *after* you solve login | Low risk | Against ToS |

The **Gemini/Google login is the single biggest technical blocker** for the
embedded-webview approach. Google deliberately refuses OAuth flows inside
embedded webviews to prevent credential interception. There are gray
workarounds (spoofing a desktop Chrome user-agent on the auth partition,
running the OAuth leg in the *system* browser and importing the session
cookie), but they are brittle, against the spirit of the policy, and can
break without notice. This alone is a strong argument for the
**extension/system-browser** alternative (§6), which sidesteps it entirely
because the login happens in real Chrome.

### 1.3 The legal line that actually matters: *manual use* vs *automation*

Read carefully, because this is where the project lives or dies legally:

- **You, a human, using your own paid subscription, reading and typing in a
  window** — this is normal product use. A desktop shell that just *renders*
  the page doesn't change that.
- **You clicking "Save to Shay" to copy a snippet of *your own* conversation
  into *your own* local store** — this is you exercising control over your own
  data. Low risk, especially if the capture is *user-initiated* and grabs the
  selected/visible text rather than silently harvesting everything.
- **Software that programmatically extracts data/output, scrapes the DOM on a
  loop, auto-submits prompts, or drives the UI without you** — OpenAI's Terms
  explicitly prohibit using "automated or programmatic" methods to extract
  data or output "except as permitted through the API," and prohibit
  circumventing rate limits or protective measures. Anthropic and Google have
  equivalent clauses. **This is the bright line.** The moment Shay
  *automates* the web UI, you're in violation territory and you've also
  signed up for an arms race against bot detection.

**Design rule for v0.1:** Shay may *host* and it may *capture what you
explicitly select*, but it must **never auto-drive** a provider web UI. Keep
all automation on the **API path** (where it's explicitly allowed) for later
versions. This keeps the subscription-hosting feature on the right side of
the line.

### 1.4 Bottom line on feasibility

- **Shay layer:** ✅ Feasible now, low risk, high reuse from this repo.
- **Embedded-webview subscription hosting:** ⚠️ Feasible *technically* (minus
  Gemini login friction) but legally gray if automated, and a permanent
  maintenance tax. Acceptable **only** as a passive render + manual capture
  surface.
- **Better surface for the same goal:** ✅ A **browser extension** gives you
  "Save to Shay" next to your real sessions with *none* of the login/bot
  problems and a fraction of the maintenance. Strongly recommended (§6.1).

---

## 2. Recommended architecture

### 2.1 The core principle: a provider-agnostic core with swappable surfaces

```
                          ┌─────────────────────────────┐
                          │           YOU                │
                          └──────────────┬──────────────┘
                                         │
        ┌────────────────────────────────────────────────────────────┐
        │                    SHAY  (the durable core)                  │
        │                                                              │
        │   ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
        │   │  Capture   │  │  Command   │  │   Knowledge Graph    │   │
        │   │  Inbox     │→ │  Palette   │  │  (notes/ideas/tasks/ │   │
        │   │ "Save to   │  │  (⌘K)      │  │   projects/memory)   │   │
        │   │  Shay"     │  └────────────┘  └──────────┬──────────┘   │
        │   └────────────┘                             │              │
        │                                              ▼              │
        │   ┌──────────────────────────────────────────────────────┐ │
        │   │  Shay Core Service (local-first)                       │ │
        │   │  • SQLite (structured) + Markdown vault (portable)     │ │
        │   │  • Embeddings index (local, semantic recall)           │ │
        │   │  • Memory taxonomy  • Task/Plan ledger  • MCP host     │ │
        │   └──────────────────────────────────────────────────────┘ │
        │                                                              │
        └───────┬───────────────┬───────────────┬───────────────┬─────┘
                │               │               │               │
   ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ │ ─ swappable surfaces ─ │ ─ ─ ─ │ ─ ─ ─
                ▼               ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │  Webview     │ │  Browser     │ │  API path    │ │  Local model │
        │  surface     │ │  extension   │ │  (later)     │ │  (Ollama/    │
        │  (Electron   │ │  (real       │ │  OpenAI/     │ │   LM Studio) │
        │  WebContents │ │  Chrome,     │ │  Claude/     │ │              │
        │  per provider│ │  Save-to-Shay│ │  Gemini SDKs │ │              │
        │  isolated    │ │  button)     │ │  + MCP +     │ │              │
        │  sessions)   │ │              │ │  agents)     │ │              │
        └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
          ChatGPT          ChatGPT          ChatGPT
          Claude           Claude           Claude
          Gemini           Gemini           Gemini
```

The key architectural move: **everything of value lives in the Shay Core
Service.** The provider surfaces are *adapters* that feed the core. If a
provider blocks webviews tomorrow, you lose a surface, not your product.

### 2.2 Inside the desktop shell (Electron concretely)

```
Electron main process
 ├── Shay Core Service (in-process Node, or sidecar)
 │     ├── SQLite (better-sqlite3 / libSQL)
 │     ├── Markdown vault writer (git-trackable)
 │     ├── Embeddings (local: fastembed/transformers.js)
 │     └── IPC + local HTTP for surfaces
 │
 ├── Shay UI window  (React renderer)  ← the command center chrome
 │
 └── Provider windows  (one WebContentsView per provider)
       ├── partition: persist:chatgpt   (isolated cookie jar)
       ├── partition: persist:claude
       ├── partition: persist:gemini
       └── preload.js  → injects ONLY a "Save to Shay" affordance
                         + reads user-selected text on demand
                         (NO autonomous DOM scraping loop)
```

Notes that matter for implementation:
- Use **`WebContentsView`** (the modern replacement for `BrowserView`), **not**
  the deprecated `<webview>` tag and **not** `<iframe>` (these providers send
  `X-Frame-Options`/CSP that forbid iframing — only a real browser engine view
  works).
- Give each provider its **own `session` partition** so three independent
  logins coexist with persistent cookies.
- The **preload script** is the entire integration: it adds the "Save to Shay"
  button/hotkey and, *on user action only*, reads the current selection or the
  focused message node and posts it to the Shay Core over IPC. Keep it
  minimal — the bigger the DOM coupling, the more often you'll be fixing it.

---

## 3. Technology stack recommendation

### 3.1 Desktop shell — **Electron** (for v0.1), reconsider Tauri later

| Framework | Verdict for *this* job | Why |
|---|---|---|
| **Electron** | ✅ **Recommended for v0.1** | Best-in-class for *multiple authenticated webviews with isolated cookie jars + preload injection*. Mature `WebContentsView`, per-view `session` partitions, persistent storage, huge prior art. Bundled Chromium = consistent behavior + far less likely to trip "unsupported browser"/bot checks than OS webviews. You already have React experience for the chrome. |
| **Tauri 2.x** | 🟡 Strong later option | Tiny bundles, Rust core, and Tauri 2 *does* support multiple webviews. But it uses the **OS webview** (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux), which means inconsistent behavior across platforms and *higher* odds of provider bot-detection/login quirks on the very pages you need to host. The per-view isolated-session + content-injection story is less battle-tested than Electron's. Great for a v2 rewrite if bundle size/RAM become real complaints. |
| **React Native Desktop** | ❌ | Not built for hosting multiple full browser sessions; webview story is weak for this use case. |
| **Flutter** | ❌ | Same problem — embedding three independently-authenticated, cookie-isolated provider sites with content injection is awkward; also throws away your React skills. |
| **Plain web app / PWA** | ❌ for hosting (CSP/X-Frame-Options block iframing the providers), ✅ for the Shay layer alone |

**Recommendation:** Electron now (velocity + your React skills + the
webview-isolation maturity you specifically need). Keep the Shay Core
*framework-agnostic* (plain Node + SQLite + IPC) so a future Tauri port only
rewrites the shell, not the brain.

### 3.2 Shay Core stack

- **Runtime:** Node.js (keeps it in-process with Electron; matches your
  existing ecosystem which is Node/Express heavy).
- **Structured store:** **SQLite** via `better-sqlite3` (synchronous, fast,
  zero-config, already used in `site-studio`) — or **libSQL** if you later
  want optional sync.
- **Portable store:** **Markdown + YAML frontmatter** vault, git-trackable —
  mirrors what you *already* do in `memory/`, `second-brain/`, and the
  Obsidian `Shay-Memory` vault. This is your "own memory, independent of any
  provider" guarantee: plain files you own forever.
- **Semantic recall:** local embeddings — **fastembed** (`bge-small-en-v1.5`,
  ONNX, no API key) which is *exactly* what your existing
  `vault-semantic-search` MCP already uses. Reuse it.
- **Cross-tool protocol:** expose Shay's memory/tasks as an **MCP server**
  (you already have the pattern in `mcp-server/server.js`) so Claude Desktop,
  Claude Code, Codex, etc. can read/write Shay memory directly.
- **UI:** React + a fast component kit (your call — Radix/shadcn or Mantine),
  plus a **command palette** (⌘K) as the primary interaction. Zustand for
  state (already the choice in `shay-agent-os/components/dashboard`).

### 3.3 Local-model surface

- Talk to **Ollama** / **LM Studio** over their local HTTP APIs (OpenAI-
  compatible). This is the *easiest* "AI window" to build and carries **zero**
  ToS risk — make it a first-class citizen early; it's a great
  proof-of-concept for the chat surface without touching anyone's web UI.

---

## 4. How hard are the Shay-layer features? (Spoiler: not hard)

| Capability | Difficulty | How |
|---|---|---|
| Save conversation snippet | **Easy** | Preload reads selection → IPC → Core writes a `note`/`capture` row + markdown file with source/provider/url/timestamp. |
| Create task | **Easy** | One table + a form/command. Reuse your `tasks/tasks.jsonl` schema (task_id, plan_id, priority, status, acceptance). |
| Project / project memory | **Easy–Medium** | A `project` entity that snippets/tasks/notes link to; "project context" = a saved query over the graph. |
| Local databases | **Easy** | SQLite file in app data dir. Migrations with a tiny runner. |
| Idea capture | **Easy** | Global hotkey → quick-capture box → inbox. Mirror `ideas/capture/` timestamped pattern. |
| Memory independent of any AI | **Easy** | It's *literally* just your local SQLite + markdown. No provider involved. ✅ |
| Semantic search over everything | **Medium** | fastembed index, refreshed on write. Already proven in your `vault-semantic-search`. |
| Agent delegation | **Medium–Hard (defer)** | Hand a task to a local agent runner. Reuse `shay-agent-os` dispatcher (`components/swarm/dispatcher.py`) rather than build new. |

**Answer to Q4 and Q5 directly:** snippets, tasks, project memory, and local
databases are all *easy*, days not weeks. And **yes — Shay can absolutely
maintain its own memory fully independent of any AI provider**; that
independence is the whole point and is the *easiest* part to guarantee
because it's just local files you control.

---

## 5. Development roadmap

A staged plan sized for a solo developer. Each version is independently
useful — you could stop after any of them and still have something you'd use
daily.

### v0.1 — "The Shay layer + one safe surface" (the foundation)
**Goal:** prove the durable core; don't fight any provider yet.
- Electron shell + React command center (⌘K palette, capture inbox).
- Shay Core: SQLite + markdown vault, schema for note/task/project/idea/memory.
- Global quick-capture hotkey.
- **Local-model window** (Ollama/LM Studio) as the first "AI window" — zero ToS risk.
- One provider webview (start with **Claude** or **ChatGPT** — *not* Gemini,
  whose login is the hard one) with a manual "Save to Shay" preload button.
- Reuse: memory taxonomy, fastembed index, vault pattern (§9).

### v0.5 — "Multi-brain + knowledge graph"
- All three provider webviews with isolated session partitions (tackle Gemini
  login here, or punt Gemini to the extension surface — see §6.1).
- Bidirectional links between notes/tasks/projects/captures (the "OS" feel).
- Semantic search across the whole vault.
- **Shay-as-MCP-server** so Claude Desktop/Code can read your memory.
- Multi-model **comparison view** (send the same prompt to 2–3 *local/API*
  models side-by-side; do **not** auto-drive the web UIs).
- Provider-agnostic "context injection": Shay assembles relevant memory into
  your clipboard / a paste-ready block you drop into any chat.

### v1.0 — "Idea Operating System"
- API path enabled (optional, BYO keys) for *automatable* workflows: agents,
  batch comparison, scheduled research — all on the API where automation is allowed.
- Agent delegation via `shay-agent-os` dispatcher.
- Integrations as plugins: GitHub, email, calendar, MCP tool servers, Hermes.
- Graph/canvas view of the knowledge base; saved "project workspaces."
- Sync option (libSQL/git) across machines.

---

## 6. Alternative approaches you should seriously consider

### 6.1 ⭐ Browser extension instead of (or alongside) embedded webviews — *strongest alternative*
Put the "Save to Shay" button **inside real Chrome/Edge**, next to your real
ChatGPT/Claude/Gemini sessions, via a content script. The Shay layer is a
local app (Electron or even a local web app) that the extension talks to over
a localhost port or native messaging.

**Why this is often the better v0.1:**
- **Eliminates the Gemini/Google login blocker entirely** — login happens in
  real Chrome, which Google fully supports.
- **Eliminates bot-detection problems** — you're literally in a real browser.
- **Drastically lower maintenance** — you're not babysitting Electron's
  Chromium against three providers' anti-embedding measures.
- Still gives you the exact UX you described: chat normally, click "Save to Shay."
- Cross-provider by default; works anywhere you browse (capture from docs,
  GitHub, Drupal.org, etc., too).

**Trade-off:** less of a single "command center window" feel; the providers
live in browser tabs, not in your app. But the *value* (capture + memory)
is identical and the *durability* is far higher. **My recommendation: build
the extension surface first, add the embedded-webview surface only if you
truly want the unified-window aesthetic.**

### 6.2 API-key aggregator (what Chatbox / BoltAI / Msty / Askimo already do)
The mature products in this space (Chatbox, BoltAI, Msty, Askimo, LibreChat)
**don't** host the subscription web UIs — they use **your API keys** and build
a native chat UI. This is legal, robust, and low-maintenance, but it
**reintroduces the per-message API cost you wanted to avoid**, and a flat
subscription often gives better value for heavy interactive use. Worth
offering as the *v1.0 API path*, not the v0.1 default.

### 6.3 Fork existing open source
**LibreChat** (multi-provider chat, MCP support, very active) or **Chatbox**
(local-first, MIT-ish, multi-provider) could be forked so you build only the
*Shay memory layer* on top instead of the whole shell. Big head-start; cost is
inheriting someone else's architecture. Evaluate before greenfielding.

### 6.4 Obsidian plugin
You *already live in an Obsidian vault* (`Shay-Memory`, `second-brain/`). An
Obsidian plugin + the browser extension could deliver the entire "Idea OS"
with almost no shell to maintain — Obsidian *is* your knowledge graph,
backlinks, and markdown store. This may be the **lowest-effort path to the
highest-value outcome** for an idea/knowledge use case. Strongly worth a
spike before committing to Electron.

### 6.5 System-browser + local companion
Skip embedding: open providers in the default browser; a tiny local Shay
service + global hotkey handles capture. Crude, but trivial and unbreakable.

---

## 7. Major risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **ToS violation if Shay automates web UIs** | High (account ban) | Never auto-drive web UIs. Manual capture only. Put all automation on the API path. |
| R2 | **Google blocks OAuth in embedded webviews** (Gemini login fails) | High | Use the **extension/system-browser** surface for Gemini; or accept brittle UA-spoofing; or Gemini via API. |
| R3 | **Cloudflare / bot detection** flags Electron's Chromium on claude.ai / chatgpt.com | Medium–High | Persistent sessions, real user-agent, isolated partitions; or use the extension surface (real browser). |
| R4 | **DOM churn** breaks your preload "Save to Shay" hooks whenever a provider redesigns | Medium (recurring) | Keep DOM coupling *minimal* (capture selection, not structured scraping). Extension surface reduces blast radius. |
| R5 | **Maintenance tax** of chasing three third-party UIs solo | Medium | Decouple core from surfaces; prefer extension; budget recurring upkeep. |
| R6 | **Credential/security** — you're hosting logged-in sessions | Medium | Per-provider partitions; OS keychain for any secrets (you already have `platform/vault/vault.sh`); never log conversation content unexpectedly; encrypt vault at rest if it leaves the machine. |
| R7 | **Cross-platform drift** — your ecosystem is macOS-centric (launchd, Keychain, `/Users/famtasticfritz`) | Low–Medium | Abstract paths via Electron `app.getPath`; keychain via `keytar`/`safeStorage`; don't bake macOS assumptions into Shay Core. |
| R8 | **Scope creep** — the brief already lists GitHub/email/calendar/MCP/Hermes/agents | Medium | Hard-gate them to v1.0 as plugins. Ship the core first. |
| R9 | **Provider ToS changes** retroactively forbid even passive hosting | Low–Medium | Core survives because it's provider-agnostic; surfaces are disposable. |
| R10 | **"Build vs reuse"** — reinventing memory/agents you already have | Medium | Reuse the assets in §9 instead of greenfielding. |

---

## 8. "Idea Operating System" vs "Profit Automation System" — how the architecture changes

You said you care about idea generation, research, architecture, Drupal,
project/knowledge management, multi-model comparison, and long-term memory —
**not** lead-gen/sales automation. That preference *materially* changes the design:

**Optimize for (Idea OS):**
- **Capture friction → zero.** Global hotkey, "Save to Shay" everywhere,
  capture-from-anywhere (not just the AI windows — also Drupal docs, GitHub,
  PDFs). The inbox is the heart.
- **Knowledge graph, not pipelines.** Bidirectional links, backlinks,
  tags/facets, "what connects to this idea?" Your existing `memory/TAXONOMY.md`
  (decisions/bugs/learnings/recipes/rules/gaps) is already this shape — extend
  it with `idea`, `research`, `project`.
- **Semantic recall as a first-class verb.** "What did I think about X three
  months ago across *all* models?" Provider-agnostic memory makes this
  possible; that's the superpower a single-provider chat can't offer.
- **Multi-model comparison as a thinking tool**, not a throughput tool — same
  question to several brains, answers captured side-by-side into one note for
  *synthesis*, with provenance.
- **Long-lived project workspaces** that assemble relevant memory + tasks +
  captures + links on demand, and can *inject* that context into any chat
  (clipboard/paste block) so every model benefits from your memory.

**De-emphasize / cut (Profit Automation):**
- CRM, lead scoring, outreach sequences, sales pipelines, conversion funnels,
  scheduled blast jobs. None of it. (Your FAMtastic site-factory already
  handles the "ship product" side; Shay is your *thinking* tool, not a revenue
  engine.)
- Heavy autonomous agent swarms early — keep agent delegation as a *v1.0*
  convenience for research/synthesis, not the centerpiece.

**Net architectural shift:** the center of gravity moves from "router that
moves messages between AIs" to **"a personal knowledge graph with semantic
memory, where AI windows are *inputs* to your thinking, not the product."**
The AIs become interchangeable; *your accumulated memory* becomes the asset.

---

## 9. Reuse before generate — what you already own in this repo

Per your standing doctrine ("reuse before generate"), Shay should *not* start
from scratch. Concrete reuse map from this codebase:

| Need in Shay | Reuse this existing asset | Path |
|---|---|---|
| Memory schema & taxonomy | Memory ledger (decisions/bugs/learnings/recipes/rules/gaps + INDEX) | `memory/INDEX.json`, `memory/TAXONOMY.md` |
| Memory retrieval logic | Shay memory-context helper | `lib/shay/memory-context.js` |
| Local semantic search (no API key) | `vault-semantic-search` MCP (fastembed bge-small, ONNX) | (MCP `search_vault`) |
| Task / plan ledger schema | Plan registry + task JSONL | `plans/registry.json`, `tasks/tasks.jsonl` |
| Idea capture pattern | Timestamped capture dir | `ideas/capture/` |
| Knowledge vault format | Obsidian markdown vault | `obsidian/Shay-Memory/`, `second-brain/` |
| MCP exposure pattern | Existing MCP server (resources + tools) | `mcp-server/server.js`, `.mcp.json` |
| Cross-session learning | OpenWolf (anatomy/cerebrum/buglog) | `.wolf/` |
| Agent delegation (v1.0) | shay-agent-os dispatcher + launcher | `shay-agent-os/components/swarm/dispatcher.py`, `shay-agent-os/launch-agent.py` |
| Dashboard UI stack reference | React 19 + Vite + Tailwind v4 + Zustand | `shay-agent-os/components/dashboard/package.json` |
| Secret storage pattern | Keychain-backed vault | `platform/vault/vault.sh` |
| SQLite usage precedent | `better-sqlite3` in studio | `site-studio/` (`lib/` db modules) |
| Provider SDK precedent | Anthropic/OpenAI/Gemini already wired | `site-studio/server.js` |

**Critical update (see §12):** an earlier draft of this study claimed "Shay
would be the first true desktop app in the ecosystem." **That is wrong.** A
working **`shay-desktop-electron`** app already exists (Electron, a *live*
Chat screen, 20+ scaffolded screens, a proven `build_app` + typecheck +
render-gate harness, keychain-backed Providers screen, and a *planned*
CaptureInbox). It is not cloned in this repo's container, but it is real and
in active development. This means the *shell is already built* and the *brain*
is ~80% present here — so the only genuinely net-new part of this study is the
**provider-webview surface + "Save to Shay" capture**, roughly **10–15%** of
the total. Build the Shay Core as a Node library that the existing Electron
app imports, and reuse is near-total.

---

## 10. Rough level-of-effort (solo developer)

Estimates assume your stated profile (strong PHP/Drupal, React experience,
local AI tooling) and *part-time* solo pace. Ranges reflect "smooth" → "with
the inevitable provider/auth yak-shaving."

| Milestone | Scope | Effort |
|---|---|---|
| **Spike** | Electron shell + one `WebContentsView` logged into Claude/ChatGPT + a preload "Save to Shay" → console | **2–4 days** |
| **v0.1** | Shay Core (SQLite + markdown), ⌘K palette, quick-capture, inbox, local-model window, one provider webview w/ manual capture | **3–5 weeks** |
| **v0.5** | All 3 webviews (incl. solving/sidestepping Gemini login), bidirectional links, semantic search, Shay-as-MCP, comparison view | **4–7 weeks** |
| **v1.0** | API path, agent delegation (reuse shay-agent-os), GitHub/email/calendar/MCP plugins, graph view, sync | **6–12 weeks** |
| **Alt: extension surface** (instead of embedded webviews) | Content-script "Save to Shay" + native messaging to Shay Core | **1–2 weeks** (and it *replaces* much of the webview risk/effort) |
| **Alt: Obsidian-plugin route** for the Idea-OS core | Plugin + extension, skip Electron shell | **2–4 weeks to a daily-usable tool** |

**Recurring tax:** budget **~2–6 hours/month** maintaining each embedded
provider webview against DOM/auth/bot-detection changes. The extension and
Obsidian routes cut this dramatically.

**Revised effort given the existing app (see §12):** because
`shay-desktop-electron` already provides the shell, IPC pattern, keychain
Providers screen, Memory screen, and a planned CaptureInbox, the *only*
net-new build is the **provider-surface layer**:

| Net-new milestone (atop the existing app) | Scope | Effort |
|---|---|---|
| **Provider-window surface** | 3 new screens (ChatGPT/Claude/Gemini) as `WebContentsView` with isolated session partitions, wired into the existing router as units U25–U27 | **1–2 weeks** |
| **"Save to Shay" preload + capture wiring** | Minimal preload (selection capture only) → existing Memory/CaptureInbox IPC | **3–6 days** |
| **Browser-extension surface** (recommended alt to webviews) | Content-script "Save to Shay" → native messaging to the existing app's IPC | **1–2 weeks** |

---

## 11. Final recommendation

1. **Build the Shay Core first** (v0.1 brain): local-first SQLite + markdown
   vault, command palette, capture inbox, semantic recall — reusing §9 assets.
   This is low-risk, high-value, and yours forever.
2. **Make the local-model window the first AI surface** — zero ToS risk,
   proves the chat surface.
3. **Use a browser extension (real Chrome) as the primary "Save to Shay"
   surface** for ChatGPT/Claude/Gemini. It dodges the Gemini login block, bot
   detection, and most maintenance — while delivering the exact UX you want.
4. **Add embedded webviews only if you want the unified-window aesthetic**,
   and only as *passive render + manual capture* — never auto-driven.
5. **Reserve the API path, agents, and integrations for v1.0** as plugins,
   reusing `shay-agent-os`.
6. **Strongly spike the Obsidian-plugin route first** — given you already live
   in an Obsidian vault, it may get you to a daily-usable Idea OS faster than
   any custom shell.

The version most likely to *last* is the one where the AIs are interchangeable
inputs and **your memory is the product.** Build that, and every provider
change becomes a surface swap instead of an existential threat.

---

## 12. Reconciliation with the existing `shay-desktop-electron` build

> Added after discovering an in-flight desktop effort that this study must be
> read against. **This is the most important section if you already have that
> app open.**

### 12.1 What already exists

Per `obsidian/Shay-Memory/plans/ULTIMATE-desktop-agentos-plan-2026-05-30.md`
(and the related `shay-desktop-plan-*` and `skills-screen-plan` docs), there is
already a working **`shay-desktop-electron`** application — *not* in this repo's
container, but real and actively built by Shay's autonomous pipeline:

- **Electron app, React renderer**, screens under `src/renderer/src/screens/`.
- **Chat screen is LIVE**; Soul + Models are nav-wired; ~20 more screens
  scaffolded (Sessions, Memory, Agents, Kanban, Schedules, Skills, Studio,
  Providers, Settings, Gateway, Office, Tools, + planned Logs, Diagnostics,
  AgentMonitor, **CaptureInbox**).
- **Proven build harness:** `build_app` + `surgical_patch`, a **typecheck
  gate** (`tsc --noEmit`) and a **runtime render gate**, with auto-rollback —
  driven by a `.ralph` autonomous loop over a 24-unit PRD.
- **33 proven IPC `invoke` calls; 232 `ipcMain.handle` handlers.**
- **Keychain-backed Providers screen** (API keys saved to OS keychain).

### 12.2 The critical distinction — two visions share one name

| | **Existing `shay-desktop-electron`** | **This study's brief** |
|---|---|---|
| What it is | An **Agent-OS control center** — Shay drives *her own swarm* (dispatch agents, monitor tasks, manage memory) from one window | A **multi-brain command center** — *you* drive *external* AIs (ChatGPT/Claude/Gemini) from one window |
| AI surface | Shay's own brains + API/local **providers** (keychain config) | **Hosted subscription web UIs** + capture |
| Provider webviews | **None** — the only webview use is the Studio screen wrapping FAMtastic Studio | The whole point |
| "Save to Shay" capture from a provider | Not present | The whole point |
| Status | Built, Chat live, harness proven | Greenfield in the brief; ~10–15% net-new given the shell exists |

**They are not competitors — they are two surfaces of one app.** The existing
app is the *brain/agent* surface; this study describes the *external-AI
capture* surface that's currently missing from it.

### 12.3 How they merge cleanly

The existing app already gives you almost everything §2 of this study asks for:
- The **shell** → exists.
- The **Memory screen + IPC** → exists (the "independent memory" guarantee).
- The **CaptureInbox** → already a *planned* unit (U19) — this is precisely the
  destination for "Save to Shay."
- **Keychain** for any secrets → exists (Providers screen).
- The **swarm IPC domain** (`src/main/domains/swarm.ts`, units U9–U15) → the
  v1.0 agent-delegation path this study defers to later.

So the provider surface slots in as **three new units appended to the existing
24-unit PRD**, following the same recipe (new screen folder + IPC domain +
preload binding + router entry + both gates):

```
U25 → ProviderWindow surface: ChatGPT/Claude/Gemini as WebContentsView,
       one isolated session partition each (persist:chatgpt|claude|gemini)
U26 → Save-to-Shay preload: user-triggered selection capture → IPC →
       existing CaptureInbox/Memory handlers (NO autonomous DOM scraping)
U27 → Capture review flow: inbox item → note/task/project/memory, with
       provider+url+timestamp provenance
```

> **These three units are fully specified** (files, IPC channels, acceptance
> checklists, render-gate adaptations, and a Gemini login spike) in
> `docs/SHAY-DESKTOP-PROVIDER-SURFACE-PRD.md`, written in the same per-unit
> format as the ULTIMATE plan so they drop straight into the `.ralph` loop.

Everything in §1.3 (manual-only, never auto-drive) and §5 (Gemini login via
the extension/system browser) still governs these units unchanged.

### 12.4 The one open decision for you

The existing app was scoped as an **Agent-OS control center**; this study was
asked for as a **subscription-hosting command center.** Before building, decide
which is true:

- **(A) Merge** — add U25–U27 to the existing app; one "Shay" with both an
  agent surface and an external-AI capture surface. *(Recommended — maximal
  reuse, one app to maintain.)*
- **(B) Keep separate** — `shay-desktop-electron` stays the agent console; a
  thinner, capture-focused build (or just the **browser extension** from §6.1)
  becomes the external-AI surface. *(Lower coupling, two things to maintain.)*

My recommendation is **(A)** with the **extension** (§6.1) as the primary
capture mechanism layered in — you get the unified window *and* dodge the
Gemini-login / bot-detection tax. But this is a genuine product-scope call
that's yours to make; the rest of the study holds under either choice.

---

## Sources

- [OpenAI Terms of Use](https://openai.com/policies/row-terms-of-use/) — prohibition on automated/programmatic extraction except via the API; no circumventing rate limits/protective measures.
- [OpenAI Service Terms](https://openai.com/policies/service-terms/)
- [Google: Upcoming security changes to OAuth in embedded webviews](https://developers.googleblog.com/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/) and [Auth0: Google blocks OAuth from embedded browsers](https://auth0.com/blog/google-blocks-oauth-requests-from-embedded-browsers/) — `disallowed_useragent` block.
- Prior-art products: [Chatbox](https://github.com/chatboxai/chatbox), [BoltAI](https://boltai.com/), [Msty Studio](https://msty.ai/studio/), [Askimo (open-source, Kotlin)](https://askimo.chat/blog/desktop-ai-chat-app-kotlin-chatgpt-claude-gemini/), [PolyGPT side-by-side (HN)](https://news.ycombinator.com/item?id=46013984) — note most are **API-key** aggregators, not subscription-webview hosts.
