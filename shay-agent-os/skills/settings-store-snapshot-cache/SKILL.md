---
name: settings-store-snapshot-cache
description: Stable getSnapshot for useSyncExternalStore
---

# Settings Store Snapshot Cache

Use whenever exposing an external store to React via useSyncExternalStore. getSnapshot MUST return a cached, referentially-stable value; rebuild the snapshot only when underlying data actually changes. Returning new Set()/{} each call causes React #185 'Maximum update depth'.

## When to use
Stable getSnapshot for useSyncExternalStore

## Origin
Minted from the 2026-05-31 Shay Desktop overnight UI sprint. See obsidian/Shay-Memory/learnings and .wolf/cerebrum.md.
