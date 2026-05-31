---
name: dead-wire-detector
description: Detect screens wired to placeholder divs instead of real implementations
---

# Dead Wire Detector

Use when auditing a screen registry/router. Cross-check every registry entry against the real screen component on disk — a route rendering <div>Name</div> while a full implementation exists unimported is dead-wiring. A typed screen manifest converts this from a silent stub into a compile error.

## When to use
Detect screens wired to placeholder divs instead of real implementations

## Origin
Minted from the 2026-05-31 Shay Desktop overnight UI sprint. See obsidian/Shay-Memory/learnings and .wolf/cerebrum.md.
