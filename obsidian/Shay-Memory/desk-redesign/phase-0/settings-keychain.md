---
title: Phase 0 — settings-keychain progress note
date: 2026-05-29
phase: 0
label: settings-keychain
permalink: shay-memory/desk-redesign/phase-0/settings-keychain
---

## What I built

Scaffolding for the consolidated settings IPC contract and the safeStorage-
backed keychain. Phase 0 lands the modules; Phase 1 wires them into
`src/main/index.ts`, `config.ts`, and `sudoCreds.ts` (intentionally untouched
in this pass).

## Files created

- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/keychain.ts`
  - `getSecret(key)`, `setSecret(key, value)`, `deleteSecret(key)`,
    `isProtected()` API.
  - Persists to `<userData>/secrets.json` with a per-install salt, per-entry
    iv, and base64-encoded `safeStorage.encryptString(...)` ciphertext.
  - Atomic writes (`.tmp` → rename).
  - When `safeStorage.isEncryptionAvailable()` is false (Linux without a
    secret-service backend) the module **never touches disk** — values live
    in memory only and `isProtected()` returns false so the UI can warn.
    No silent plaintext-on-disk fallback.
  - Eager decrypt-on-init populates an in-memory cache so reads are sync-
    fast.
  - Exposes `__resetForTests()` for the vitest harness.

- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/settings-handler.ts`
  - `getSettings()` / `getSettings(group)` and `setSettings(group, patch)`
    typed helpers.
  - `register(ipcMain)` adds two channels: `settings.get` and `settings.set`
    (channel names exported from `shared/settings-schema.ts`).
  - Backed by `<userData>/settings.json` (`schemaVersion: 1`, `groups: {...}`).
  - In-memory cache + atomic write (`.tmp` → rename).
  - Shallow-merges defaults with persisted values on load so newly added
    schema fields adopt their defaults on upgrade.
  - Does **not** remove or alter the existing ad-hoc handlers in
    `src/main/index.ts` — coexists alongside them per Phase 0 ownership.

- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/shared/settings-schema.ts`
  - Typed groups: `general`, `appearance`, `shortcuts`, `notifications`,
    `language`, `voice-audio`, `capabilities`, `connectors`, `desktop-app`
    (mirrors Claude Desktop baseline groups; Phase 4 sub-pages reuse these
    shapes).
  - `DEFAULTS: SettingsByGroup` map with sensible per-group defaults.
  - `SETTINGS_GROUPS`, `isSettingsGroup`, `SettingsGroup`, `SettingsByGroup`
    types.
  - Channel name constants `SETTINGS_GET_CHANNEL` / `SETTINGS_SET_CHANNEL`
    consumed by both main and preload.

- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/keychain.test.ts`
  - Vitest suite. Stubs `electron` via `vi.mock` with both
    `isEncryptionAvailable()=true` and `=false` paths.
  - Covers: set+get round-trip, encrypted-on-disk assertion (no cleartext in
    `secrets.json`), rehydrate-from-disk after module reset, delete from
    cache + disk, unprotected memory-only behavior, and the no-disk-write
    invariant when unprotected.

## What I did NOT touch (per ownership)

- `src/main/index.ts` — IPC wiring stays for Phase 1.
- `src/main/config.ts` — `desktop.json` plaintext migration is Phase 1.
- `src/main/sudoCreds.ts` — left as-is.
- `src/main/domains/keychain.ts` — that placeholder is owned by the IPC
  namespacing agent. My `src/main/keychain.ts` is the safeStorage primitive
  the domain handler will call into during Phase 1.

## Notes for Phase 1 hand-off

- The domain handler in `src/main/domains/keychain.ts` should call into the
  new `src/main/keychain.ts` API (`getSecret`/`setSecret`/`deleteSecret`/
  `isProtected`) — those are 1:1 with the existing `KeychainDomain` interface
  (`get`/`set`/`delete` + a `status` derived from `isProtected()`).
- The `config.ts` migration should: on first boot detect plaintext
  `remoteApiKey` in `desktop.json`, move it to `keychain.setSecret('remote-api-key', value)`,
  strip the field from the file, and bump `schema_version` to 2.
- The Linux "secrets unprotected" pill in the UI reads from `isProtected()`
  (StatusBar, Phase 2).