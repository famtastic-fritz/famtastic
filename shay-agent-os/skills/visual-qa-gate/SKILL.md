---
name: visual-qa-gate
description: Vision-model screenshot judge as a required UI gate
---

# Visual Qa Gate

Use to verify a UI looks right, not just runs. Screenshot the rendered screen, pass to a vision model (Gemini 2.5 flash) with a PASS/FAIL rubric scoring 0-10 and listing defects. Blind gates (typecheck/jsdom) cannot see white/unstyled/cut-off UI; the vision gate is what catches 'it looks like shit'.

## When to use
Vision-model screenshot judge as a required UI gate

## Origin
Minted from the 2026-05-31 Shay Desktop overnight UI sprint. See obsidian/Shay-Memory/learnings and .wolf/cerebrum.md.
