---
name: typed-screen-manifest
description: Single typed manifest as source of truth for screens
---

# Typed Screen Manifest

Use to prevent routing drift. Define one typed manifest mapping screen id -> component + metadata; the registry, sidebar nav, and CLI-parity map all derive from it. Hand-maintained parallel lists drift; a typed manifest makes a missing/placeholder screen fail typecheck.

## When to use
Single typed manifest as source of truth for screens

## Origin
Minted from the 2026-05-31 Shay Desktop overnight UI sprint. See obsidian/Shay-Memory/learnings and .wolf/cerebrum.md.
