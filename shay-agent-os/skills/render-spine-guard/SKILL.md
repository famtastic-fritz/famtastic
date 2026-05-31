---
name: render-spine-guard
description: Guarantee a desktop screen actually renders, not just compiles
---

# Render Spine Guard

Use after wiring any Electron/React screen. Done != compiles. Launch the app, confirm the screen is reachable via the navigator, confirm no console/page errors, and confirm the preload bridge exposes every typed method as a runtime function. A typecheck-green screen can still be a white error screen.

## When to use
Guarantee a desktop screen actually renders, not just compiles

## Origin
Minted from the 2026-05-31 Shay Desktop overnight UI sprint. See obsidian/Shay-Memory/learnings and .wolf/cerebrum.md.
