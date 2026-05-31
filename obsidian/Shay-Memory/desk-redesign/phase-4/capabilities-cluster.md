---
title: Phase 4 — Capabilities Cluster (Capabilities, Connectors, Shay Code, Cowork)
date: 2026-05-29
label: capabilities-cluster
phase: 4-settings-decomposition
permalink: shay-memory/desk-redesign/phase-4/capabilities-cluster
---

## Scope delivered

Four Settings sub-pages on the App / Capabilities rails, all built on the
Phase 4 chrome (`SettingsPage`, `SettingsField`, `useSettingsGroup`,
`registerSettingsPage`, `registerSettingsNavEntry`).

## Files created (ownership)

- `src/renderer/src/settings/pages/Capabilities.tsx`
- `src/renderer/src/settings/pages/Connectors.tsx`
- `src/renderer/src/settings/pages/ShayCode.tsx`
- `src/renderer/src/settings/pages/Cowork.tsx`

No files outside this list were modified. `screens/Settings/Settings.tsx`
is left untouched per the phase 6 deferral.

## Per-page detail

### Capabilities

Persists via `useSettingsGroup("capabilities")` — typed group already in
`shared/settings-schema.ts`. Eight rows, one per `CapabilitiesSettings`
field:

- `computerUseInstalled` — "Computer use" (badged **Requires permission**)
- `acpEnabled` — "ACP (Agent Client Protocol)"
- `hooksEnabled` — "Hooks"
- `curatorEnabled` — "Context curator"
- `autoSwitchOnShellTool` — "Auto-switch on shell tool"
- `autoSwitchOnFileDiff` — "Auto-switch on file diff"
- `autoSwitchOnArtifact` — "Auto-switch on artifact"
- `autoSwitchOnPlan` — "Auto-switch on plan"

The aspirational rows from the task brief (vision, audio in/out, browser,
screen-record, voice memo, ambient suggestions) are **not** wired — the
typed schema doesn't carry fields for them and schema extension is outside
this agent's ownership. Doc the gap honestly here rather than ship dead
toggles.

The page does not render its own save bar — the shell footer drives it via
`useSettingsGroup`'s dirty publish + window events.

Registers nav entry: `id: "capabilities", category: "Capabilities",
order: 10, icon: "info"`. Page renderer registered for id `capabilities`.

### Connectors

Persists via `useSettingsGroup("connectors")` — typed group in the schema
as `Record<string, ConnectorEntry>`. The catalog (rendered list) lives in
the page itself and covers the eight providers in the brief: GitHub,
GitLab, Slack, Linear, Notion, Google Drive, S3, Custom HTTP.

Each row shows status badge (Connected / Not connected / Session expired
/ Error), description, last-sync timestamp when present, and a Connect /
Disconnect / Reconnect button. The buttons call
`window.shay.connectors.connectViaBrowser(id)` / `disconnect(id)` when
the bridge exposes them; otherwise they fall through to a
`console.info("[connectors] TODO Phase 5 — …")` log and optimistically
update the local entry so the UI is fully exercisable for testing. The
status badge re-renders from the persisted `connectors.entries[id]`
record.

Registers nav entry: `id: "connectors", category: "App", order: 20,
icon: "context"`.

### Shay Code

The Phase 0 schema has no `shay-code` group, and extending the schema is
outside this agent's ownership. The page therefore persists through a
local `useShayCodeSettings` hook backed by `localStorage` under the key
`shay.settings.shay-code`. Shape is exported as `ShayCodeSettings`
(`defaultProjectPath`, `allowFileEditsDocsConfig`, `allowFileEditsCode`,
`allowFileEditsMigrations`, `defaultThinkingLevel`, `showInModeTabs`) so
a follow-up phase can lift it into the typed schema with zero UI churn.

Because the typed dirty registry (`useSettingsGroup → publishDirty`) is
module-private, the page can't surface its dirty state to the shell
footer. To keep the user-visible Save / Discard affordance available, the
page renders its own pair in the `<SettingsPage>` `actions` slot. The
hook also listens for the shell's `shay:settings:save` /
`shay:settings:discard` window events so once the schema gains a
`shay-code` group and we migrate to `useSettingsGroup`, the global footer
will start driving us with no further wiring.

Fields:

- Default project (text input)
- Allow file edits — docs & config (select: auto / manual / ask)
- Allow file edits — source code (select)
- Allow file edits — migrations (select)
- Default thinking level (select: off / quick / standard / deep)
- Show Shay Code mode in mode tabs (checkbox)

Registers nav entry: `id: "shay-code", category: "App", order: 30,
icon: "edit"`.

### Cowork

Same shape and persistence pattern as Shay Code — local hook,
`localStorage` key `shay.settings.cowork`, shape exported as
`CoworkSettings`. Inline `actions` Save / Discard for the same reason.

Fields:

- Auto-accept low-risk edits
- Show diff side-by-side by default
- Quote-to-reply enabled
- Sticky-to-bottom while streaming

Registers nav entry: `id: "cowork", category: "App", order: 40,
icon: "branch"`.

## Persistence wiring summary

| Page         | Group               | Path                              |
| ------------ | ------------------- | --------------------------------- |
| Capabilities | `capabilities`      | `settings-service` → typed IPC    |
| Connectors   | `connectors`        | `settings-service` → typed IPC    |
| Shay Code    | (local) `shay-code` | `localStorage` (TODO: typed group) |
| Cowork       | (local) `cowork`    | `localStorage` (TODO: typed group) |

When a sibling agent lands `shay-code` and `cowork` in the typed schema:

1. Delete the local `useShayCodeSettings` / `useCoworkSettings` hooks.
2. Replace with `useSettingsGroup("shay-code")` /
   `useSettingsGroup("cowork")` — the imports and field accessors are
   already shaped identically.
3. Drop the `actions` slot from `<SettingsPage>` — the shell footer will
   take over automatically.

## TypeScript

`npx tsc -p tsconfig.web.json --noEmit` shows zero errors in any of the
four files in my ownership. Remaining errors elsewhere in the diff are
owned by other Phase 4 agents.

## Stub behavior (Phase 5 handoff)

- `Connectors.tsx` checks for `window.shay.connectors.connectViaBrowser`
  and `window.shay.connectors.disconnect`. When they're missing it logs
  `"[connectors] TODO Phase 5 — connect <id> via browser OAuth"` and
  toggles local state. When Phase 5 lands the bridge, no UI change is
  needed — the existing code path already calls it.

## Open questions for review

- The Capabilities panel currently does not render the "vision", "audio
  in/out", "browser", "screen-record", "voice memo", "ambient
  suggestions" rows the brief lists, because the typed
  `CapabilitiesSettings` group does not carry those fields. Decide
  whether to (a) extend the schema in a later phase and re-add the rows,
  or (b) accept the current four-capability + four-auto-switch surface
  as the canonical set.
- Schema groups for `shay-code` and `cowork` should be added in Phase 5
  alongside the connectors OAuth wiring; the local-storage adapters are
  marked as TODO and self-document the migration path.
