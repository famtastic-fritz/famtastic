# Shay Desktop Rewrite (Stream B) - Core Specification

**Status:** Draft - Canonical Reference for Phase 2, Stream B
**Last Updated:** 2026-05-29

---

## 1. Goal

Build a native, high-performance Shay Desktop application (`shay-desktop-v2`) that:
- Steals the best of Swift (SSH-native operator panels) and Electron (API-backed chat).
- Fully implements the `HERMES Agent OS - Design` visual system.
- Serves as the primary human interface for commanding the FAMtastic AI Platform.
- Is designed for a future where Shay B (Stream A) is its core runtime.

---

## 2. Core Architecture: Hybrid Backend

The new Shay Desktop will utilize a hybrid backend approach, leveraging the strengths of different communication protocols:

### 2A. SSH-Native Operator Panels
-   **Purpose:** For panels requiring direct, low-latency access to the Shay runtime's filesystem, processes, and core state (e.g., Kanban boards, raw file browsers, system usage, cron job management).
-   **Mechanism:** Direct SSH connection to the Shay runtime host. This bypasses the API gateway for operator-level tasks, ensuring real-time truth and minimizing sync drift.
-   **Benefit:** High performance, direct access to the source of truth, resilience against API gateway issues for critical ops.
-   **Example Panels:** Kanban, Files, Usage, Cron, SSH Terminal.

### 2B. API/WebSocket for Chat & Interactive Services
-   **Purpose:** For the core chat interface, real-time tool feedback, notifications, and other interactive services where an API/WebSocket model is more suitable.
-   **Mechanism:** Connects to the Shay runtime's API gateway (e.g., port 8642) using authenticated WebSocket and REST endpoints.
-   **Benefit:** Scalable for high-volume chat messages, supports streaming updates, handles complex multi-agent interactions.
-   **Example Panels:** Chat, Notifications, Real-time Agent Status.

---

## 3. UI/UX: `HERMES Agent OS - Design` + Codex Patterns

The design will be a full implementation of the `HERMES Agent OS - Design` spec, integrated with key UI/UX patterns stolen from Claude Code and Codex Desktop.

### 3A. Core Layout (Three-Column OS)
-   **Left Sidebar (Global Navigation):**
    -   Logo area, Main Navigation (Command Center, Agents, Workflows, Data Hub, Integrations, Analytics, Marketplace, Settings).
    -   OS status card, Active agents summary, Upgrade action.
    -   **Stolen from Codex:** Left sidebar session queue with `⌘1-5` shortcuts for local sessions, distinct bucket for scheduled/cron/cloud sessions.
-   **Center Workspace (Primary Command & Orchestration):**
    -   Search / command input, Main headline, Command bar, Active agent cards, Orchestration flow map, Activity feed.
-   **Right Intelligence Panel (System Intelligence & Analytics):**
    -   Circular system overview meter, Efficiency score, System health confirmation, Tasks completed, Time saved, Success rate, Revenue impact, Top workflows list, Mini trend charts.
    -   **Stolen from Codex:** Right rail for live `/goal` checklist + environment state (changes, branch, commit, PR).

### 3B. Key UI Elements & Patterns (Phase 1 Focused)

#### Chat Excellence
-   **Multi-Chat:** Support multiple named chat threads in a sidebar.
-   **Rich History:** SQLite-backed local session store with full-text search.
-   **Real-time:** Streaming, clean markdown, visible tool calls, syntax highlighting.
-   **Detached Windows:** Option to pop out chat threads into separate `BrowserWindow` instances.

#### Mode Switching (Stolen from Claude Code/Codex)
-   **Top-Level Mode Pills:** (e.g., "Chat", "Workflows", "Terminal")
-   **Context-Specific Sidebars:** Each mode pill rewrites the left sidebar and potentially the tool palette to show tools specific to that context.
-   **Top Bar Utility:** Model selector, access level, project/branch selector always visible (location TBD: top-left utility row or top bar across canvas).

#### Panels & Utilities
-   **CLI Bridge Panel:** Command input, real-time Shay CLI output, process management.
-   **Log Watcher Panel:** `tail -f` on key Shay logs (`~/.shay/logs/shay.log`), color-coded by level.
-   **Cost Panel:** Real-time token and API cost burn visibility.
-   **Notification Queue:** Native Electron notifications for long-running background tasks.
-   **Pop-out Terminal (Phase 2):** Inline terminal block that detaches into its own `BrowserWindow` (`node-pty` + `xterm.js` stack).
-   **Computer-use Live Thumbnail (Phase 2):** Inline screen feed visible when Shay uses `computer_use` (option: stream screenshots from Anthropic tool calls or Electron `desktopCapturer`).
-   **MCP Server Manager UI (Phase 2):** First-class UI for adding, removing, testing, and authenticating MCP servers (e.g., Cognee, Obsidian).

#### Design System Implementation
-   **Full Color System:** Implement `--bg-primary`, `--accent-cyan`, `--state-active`, etc. as defined in `HERMES Agent OS - Design`.
-   **Glassmorphism Components:** Frosted transparent panels, blurred buttons, translucent cards.
-   **State-Aware Buttons:** Buttons light up according to agent status/state (e.g., idle, active, thinking, complete, error).
-   **Motion Design:** Subtle animations for agent cards, workflow lines, command bar, system meter (as per spec).
-   **Typography:** Modern and technical (Inter, Geist, JetBrains Mono, etc.).
-   **Texture & Background:** Subtle noise, deep gradients, radial glows, faint grid lines.

---

## 4. Tentative Phase 1 Scope (Electron)

Based on the `fathah/hermes-desktop` starting point, Phase 1 will focus on rebranding, fixing critical gaps, and implementing core operator panels.

### 4A. Rebrand & Cleanup
-   Update all `HermesDesktop` symbols to `Shay Desktop` within the codebase.
-   Replace all Hermes branding assets (banner, logos, splash screens).

### 4B. Core Chat Interface Improvements
-   Enhance existing chat for multi-chat support.
-   Implement robust SQLite-backed history and full-text search.
-   Ensure smooth streaming of markdown and tool calls.

### 4C. CLI Bridge Implementation
-   Build the communication layer for Desk to send commands to Shay CLI and receive real-time output/status.

### 4D. Initial Panels (Minimum Operator Cockpit)
-   **Chat Panel:** Polish existing, add multi-chat, improved history.
-   **CLI Bridge Panel:** Command input, real-time output, process management.
-   **Log Watcher Panel:** `tail -f` on key Shay logs (`~/.shay/logs/shay.log`) with color-coding.
-   **Cost Panel:** Real-time token/cost burn visibility.
-   **Notification Queue:** Native Electron notifications for long-running tasks.

---

## 5. Connection to Competitor Research

The `competitor-analysis.md` and `home-services-market.md` (which need to be re-researched with citations) will inform feature prioritization and differentiation for Shay Desktop v2. Key areas:
-   **UX Innovation:** What unique interaction patterns can Shay Desk offer compared to Cursor, Claude Code, etc.?
-   **Vertical Focus:** How can the Desktop UI be optimized for specific revenue-generating workflows (e.g., home services client onboarding, site generation)?
-   **Agentic Orchestration:** How do other agent platforms visualize and control multi-agent workflows, and how can Shay Desk surpass them?
