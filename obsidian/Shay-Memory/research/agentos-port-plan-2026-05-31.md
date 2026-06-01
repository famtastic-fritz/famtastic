---
title: agentos-port-plan-2026-05-31
type: note
permalink: shay-memory/research/agentos-port-plan-2026-05-31
---

# Shay-Shay OS Port Plan: Grounding hermes-webui (2026-05-31)

This document outlines a phased plan to leverage the information architecture and feature set of `hermes-webui` to inform the development of native React/TypeScript screens for `shay-desktop-electron`'s `agentos` domain (rebranded Shay-Shay OS).

**`hermes-webui` Architecture Note:**
`hermes-webui` is built with "pure Python + vanilla JS with no bundler," meaning a direct component-level port is not feasible or desirable. Instead, this plan focuses on translating its proven user flows and functional components into native `React/TS` using `Shay-Shay OS` naming and routing conventions.

---

## 1. Inventory of `hermes-webui` Features/Screens

Based on the `static/index.html` structure and associated JS files, `hermes-webui` provides the following core functional areas:

*   **Core Agent Interaction (Chat):**
    *   Main chat interface (`panelChat`) with message display, input composer.
    *   Session history and search (`sessionList`, `sessionSearch`).
    *   New conversation button (`btnNewChat`).
*   **Task Management:**
    *   **Scheduled Jobs (Cron):** List, refresh, and create new jobs (`panelTasks`, `cronList`).
    *   **Kanban Board:** Task list, search, filters (assignee, tenant, archived, mine), bulk actions, and dispatcher controls (`panelKanban`, `kanbanList`).
    *   **Todos:** A simple list for current session tasks (`panelTodos`).
*   **Knowledge & Configuration:**
    *   **Skills:** List, search, and creation of skills (`panelSkills`, `skillsList`).
    *   **Personal Memory:** Display of stored memories (`panelMemory`).
*   **Agent & Environment Management:**
    *   **Workspaces:** Add and switch between different operational workspaces (`panelWorkspaces`).
    *   **Agent Profiles:** List and creation/management of agent profiles (`panelProfiles`).
*   **System Monitoring & Settings:**
    *   **Logs:** View system logs with file, tail, and severity filters; auto-refresh option (`panelLogs`).
    *   **Insights:** Analytics dashboard with period selection (`panelInsights`).
    *   **Settings:** Comprehensive application settings with sub-sections for Conversation, Appearance, Preferences, Providers, Plugins, and System (`panelSettings`).
*   **Interactive Overlays & Notifications:**
    *   Update Banner, Reconnect Banner, Offline Banner, Agent Health Banner.
    *   Composer (rich input area), Approval Card (tool execution approval), Clarify Card (user clarification prompts).

---

## 2. Map to NATIVE React/TS Screens (Shay-Shay OS `agentos` domain)

The goal is a native React/TS implementation within `shay-desktop-electron`, adhering to `Shay-Shay OS` branding and UI patterns.

*   **`AppLayout.tsx` (Overall Structure):**
    *   `SidebarNavigation.tsx`: Common navigation component with icons and labels for each main panel.
    *   `MainContentArea.tsx`: Dynamic area to render the active panel's content.
*   **`agentos/ChatScreen.tsx`:** (Maps to `panelChat`)
    *   `ConversationList.tsx`: Manages and displays agent session history.
    *   `ChatWindow.tsx`: Handles message rendering, prompt input (`Composer.tsx`), and interaction.
    *   `SessionSearchInput.tsx`: Component for filtering conversations.
*   **`agentos/TasksScreen.tsx`:** (Maps to `panelTasks`)
    *   `ScheduledJobsList.tsx`: Displays a list of scheduled cron jobs, with refresh and creation actions.
*   **`agentos/KanbanScreen.tsx`:** (Maps to `panelKanban`)
    *   `KanbanBoard.tsx`: Visual board for managing tasks, including search, filtering, and bulk actions.
    *   `NewTaskInput.tsx`: Quick task entry form.
*   **`agentos/SkillsScreen.tsx`:** (Maps to `panelSkills`)
    *   `SkillsList.tsx`: Displays and allows search/management of agent skills.
*   **`agentos/MemoryScreen.tsx`:** (Maps to `panelMemory`)
    *   `PersonalMemoryView.tsx`: Interface for viewing stored agent memories.
*   **`agentos/TodoScreen.tsx`:** (Maps to `panelTodos`)
    *   `TodoList.tsx`: Manages and displays the agent's current task list.
*   **`agentos/WorkspacesScreen.tsx`:** (Maps to `panelWorkspaces`)
    *   `WorkspaceList.tsx`: Manages and allows switching/adding different agent workspaces.
*   **`agentos/ProfilesScreen.tsx`:** (Maps to `panelProfiles`)
    *   `AgentProfilesList.tsx`: Manages and displays available agent profiles.
*   **`agentos/LogsScreen.tsx`:** (Maps to `panelLogs`)
    *   `LogViewer.tsx`: Displays system logs with filtering and auto-refresh capabilities.
*   **`agentos/InsightsScreen.tsx`:** (Maps to `panelInsights`)
    *   `InsightsDashboard.tsx`: Displays overview metrics and agent performance insights.
*   **`agentos/SettingsScreen.tsx`:** (Maps to `panelSettings`)
    *   `SettingsNavigation.tsx`: Sub-navigation for different settings categories.
    *   `SettingsPanes.tsx`: Content areas for Conversation, Appearance, Preferences, Providers, Plugins, System settings.

---

## 3. Phased, Adversarial-Reviewed Port Plan (with per-screen Build Cards)

This plan prioritizes core agent interaction, then expands to management, configuration, and monitoring, with adversarial reviews at key milestones to ensure usability and correct agent behavior.

### Phase 1: Core Agent Interaction (MVP)
**Goal:** Establish a functional chat interface for direct agent communication, laying the foundation for all other modules.
*   **Build Cards:**
    *   `agentos/AppLayout.tsx`: Implement base layout with top-bar and `MainContentArea`.
    *   `agentos/SidebarNavigation.tsx`: Basic navigation with "Chat" entry.
    *   `agentos/ChatScreen.tsx`: Initial `ChatWindow` for message display and basic input.
    *   `agentos/ConversationList.tsx`: Display static placeholder conversations or recent sessions.
    *   `Routing`: Implement basic React Router for `/chat` route.
*   **Adversarial Review Focus:** Is text input responsive? Do messages render correctly? Can a user understand how to start a new interaction?

### Phase 2: Task Management Essentials
**Goal:** Provide basic visibility and control over agent tasks and scheduled activities.
*   **Build Cards:**
    *   `agentos/SidebarNavigation.tsx`: Add "Tasks", "Kanban", and "Todos" entries.
    *   `agentos/TasksScreen.tsx`: `ScheduledJobsList.tsx` (display read-only cron jobs).
    *   `agentos/KanbanScreen.tsx`: `KanbanBoard.tsx` (display read-only tasks).
    *   `agentos/TodoScreen.tsx`: `TodoList.tsx` (basic read-only list).
    *   `Routing`: Add routes for `/tasks`, `/kanban`, `/todos`.
*   **Adversarial Review Focus:** Can the user see the agent's workload? Is the information presented clearly?

### Phase 3: Knowledge Base & Skill Management
**Goal:** Enable users to view and manage agent knowledge (skills and memory).
*   **Build Cards:**
    *   `agentos/SidebarNavigation.tsx`: Add "Skills" and "Memory" entries.
    *   `agentos/SkillsScreen.tsx`: `SkillsList.tsx` (display existing skills, search).
    *   `agentos/MemoryScreen.tsx`: `PersonalMemoryView.tsx` (display memory entries).
    *   `Routing`: Add routes for `/skills`, `/memory`.
*   **Adversarial Review Focus:** Is it intuitive to browse and understand agent capabilities?

### Phase 4: Agent & Environment Configuration
**Goal:** Allow users to manage different agent profiles and operational workspaces.
*   **Build Cards:**
    *   `agentos/SidebarNavigation.tsx`: Add "Workspaces" and "Profiles" entries.
    *   `agentos/WorkspacesScreen.tsx`: `WorkspaceList.tsx` (display, switch workspace logic).
    *   `agentos/ProfilesScreen.tsx`: `AgentProfilesList.tsx` (display profiles, basic creation).
    *   `Routing`: Add routes for `/workspaces`, `/profiles`.
*   **Adversarial Review Focus:** Can a user easily set up new agents or switch their operational context without confusion?

### Phase 5: System Health & Settings
**Goal:** Provide essential system monitoring and full access to application settings.
*   **Build Cards:**
    *   `agentos/SidebarNavigation.tsx`: Add "Logs", "Insights", and "Settings" entries.
    *   `agentos/LogsScreen.tsx`: `LogViewer.tsx` (displays logs, file/severity filters).
    *   `agentos/InsightsScreen.tsx`: `InsightsDashboard.tsx` (initial metrics display).
    *   `agentos/SettingsScreen.tsx`: `SettingsNavigation.tsx` (tabs/menu for settings sections).
    *   `agentos/SettingsPanes.tsx`: Implement key settings sections (e.g., Appearance, Providers).
    *   `Routing`: Add routes for `/logs`, `/insights`, `/settings`.
*   **Adversarial Review Focus:** Can a user quickly diagnose system issues? Are critical settings easily discoverable and configurable?

### Phase 6: Advanced Interactions & Refinements
**Goal:** Implement remaining interactive components, polish UI/UX, and integrate real-time notifications.
*   **Build Cards:**
    *   `agentos/ChatScreen.tsx`: Full `Composer.tsx` (tool suggestions, file upload, command mode).
    *   `agentos/overlays/ApprovalCard.tsx`: Implement interactive tool approval.
    *   `agentos/overlays/ClarifyCard.tsx`: Implement interactive clarification prompts.
    *   `agentos/KanbanScreen.tsx`: Implement advanced Kanban features (bulk actions, dispatcher controls, comprehensive filters).
    *   `agentos/SettingsScreen.tsx`: Complete all remaining settings sections (Conversation, Preferences, Plugins, System).
    *   `agentos/Notifications.tsx`: Implement update, reconnect, offline, and agent health banners.
    *   **Global (`Shay-Shay OS`) theming and design system application.**
*   **Adversarial Review Focus:** Does the application feel cohesive and intuitive? Are all complex agent interactions smooth and error-proof?

---

## 4. Overlap with Existing Shay Desktop Screens

Given that `shay-desktop-electron` is already an existing application, there will be conceptual and integration overlaps rather than direct UI component reuse (due to `hermes-webui` being vanilla JS vs. `shay-desktop-electron`'s React/TS).

*   **Chat Interface:** `Shay-Shay OS` undoubtedly has a chat component. The integration challenge will be to adapt existing backend chat services to the new React/TS frontend and ensure feature parity with `hermes-webui`'s session management, search, and message display.
*   **Task Management (Kanban/Todos):** Current `Shay-Shay` task management (if any) could benefit significantly from the structured Kanban and Todo list views in `hermes-webui`. This presents an opportunity for a major upgrade in task orchestration.
*   **Skills & Memory:** Core to Shay's functionality. Existing backend APIs for skills and memory will be consumed by new `React/TS` frontend components designed to align with `AgentOS` UI standards.
*   **Workspaces & Profiles:** `Shay-Shay` likely has internal concepts of user or agent contexts. `hermes-webui` offers a clear UI pattern for managing these, which will inform the `shay-desktop-electron` implementation.
*   **Settings:** Many settings (e.g., appearance, provider configurations) will have direct parallels. The `hermes-webui` settings structure provides a good reference for organizing and presenting a comprehensive settings panel in `Shay-Shay OS`.

The primary effort will be *translating* the proven functional patterns and information layouts from `hermes-webui` into greenfield `React/TS` components within the `shay-desktop-electron` framework, rather than attempting to port code directly.