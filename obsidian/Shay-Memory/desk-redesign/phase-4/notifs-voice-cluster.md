---
title: notifs-voice-cluster
type: note
permalink: shay-memory/desk-redesign/phase-4/notifs-voice-cluster
---

# Phase 4 · notifs-voice-cluster — progress note

## What landed

Two new Settings sub-pages, both registered with the Phase 4 `SettingsShell`
via `registerSettingsPage` at module load:

- `src/renderer/src/settings/pages/Notifications.tsx`
  - `registerSettingsPage("notifications", ...)`
  - Persists through the typed `notifications` group in
    `src/shared/settings-schema.ts` via `useSettingsGroup`.
- `src/renderer/src/settings/pages/VoiceAudio.tsx`
  - `registerSettingsPage("voice-audio", ...)`
  - Persists through the typed `voice-audio` group.

Both pages compose `SettingsPage`, `SettingsField`, and `useSettingsGroup`
from the Phase 4 chrome. Save / Discard is driven by the shell footer,
not the pages.

## Notifications page details

- Master `enabled` toggle.
- Per-category rules table for the six schema categories:
  `input_needed`, `task_complete`, `task_failed`, `mention`,
  `system_update`, `auth_action_required`. Per row:
  - Enabled (master row toggle that touches `osBanner`, `dockBadge`,
    `inAppPulse` together)
  - Sound
  - OS banner
  - Dock badge
  - "Send test" button — uses `window.shay.notifications.emit` if the
    preload binding exists (Phase 3 surface, see
    `src/main/domains/notifications.ts` — channel `shay:notifications:emit`),
    else falls back to the Web Notification API.
- Quiet hours DND scheduler. `dnd.enabled` toggle plus an editable list
  of `{ weekday, start, end }` entries (Sunday = 0 → matches
  `Date.getDay()`). Weekday chips, native `<input type="time">`
  controls, "Add quiet-hour window" + per-row Remove.

### Category-name bridge

The typed schema uses descriptive names
(`task_complete` etc.) but the Phase 3 `notifications-service` runtime
uses shorter keys (`task`, `approval`, `mention`, `system`, `auth`,
`update`). A local `TEST_CATEGORY_MAP` in `Notifications.tsx` bridges
the two so the "Send test" button fires through the real DND/OS
pipeline. Persistence stays on the schema names — no schema edits.

## Voice/Audio page details

- Mic picker — `navigator.mediaDevices.enumerateDevices()` filtered to
  `audioinput`. Labels are only populated after mic permission is
  granted, so the page exposes a "Refresh devices" button and shows a
  hint when labels are missing.
- Output picker — same enumeration filtered to `audiooutput`.
- Push-to-talk hotkey — click-to-capture button. The next non-modifier
  keydown becomes the binding (formatted like
  `Meta+Shift+T`). Modifier-only chords are rejected. `Esc` cancels
  capture without recording. Clear button resets to `null`.
- TTS voice picker — feature-detects `window.shay.tts.voices()` first,
  then `window.speechSynthesis.getVoices()`, else a 3-entry placeholder
  list. The page surfaces which source the list came from in the help
  text.
- TTS speed slider — 0.5×–2× range. The schema does not yet have a
  `ttsRate` field, so persistence is best-effort via `localStorage`
  under `shay.settings.voice.ttsRate`. Documented inline; Phase 6 wires
  the typed field.
- "Voice replies" toggle — single user-facing switch that flips both
  `ttsEnabled` and `vadEnabled` so the schema stays internally
  consistent until the engine-side split lands.
- "Test mic" button — opens a `MediaStream`, attaches an `AnalyserNode`,
  and renders a peak-amplitude meter so the user can see input is live.
- "Test TTS" button — uses `window.shay.tts.speak` if present, else
  `SpeechSynthesisUtterance`.
- "Voice memo quality" — low / medium / high selector mapped to the
  `voiceMemoQuality` schema field.

## Persistence contract

Both pages persist exclusively through `useSettingsGroup` → Phase 0
`settingsService` (`settings.get` / `settings.set` IPC). No direct
`window.shay.settings` calls, no `hermesAPI` access. The shell footer
drives Save / Discard via the existing `shay:settings:save` /
`shay:settings:discard` window CustomEvents.

## What I did NOT touch

- `screens/Settings/Settings.tsx` (the 1079-LOC monolith) — left
  alone, per Phase 6 deprecation plan.
- `package.json` — untouched.
- `shared/settings-schema.ts` — untouched. The TTS speed slider is
  documented as deferred until Phase 6 adds a typed field.
- `settings/index.ts` — sub-pages register themselves; no barrel
  edits needed.
- Other agents' files. Verified separately:
  - `pages/Connectors.tsx` (different agent) has a TS2307 path bug —
    flagging here so the cluster lead can route it.
  - `pages/DesktopExtensions.tsx` (different agent) has a TS2349 style
    object call error.
  - My two files type-check clean under `tsconfig.web.json` strict
    mode.

## Verification

```
cd shay-desktop-electron
npx tsc -p tsconfig.web.json --noEmit 2>&1 | grep -E "Notifications\.tsx|VoiceAudio\.tsx"
# → empty (zero errors in my files)
```