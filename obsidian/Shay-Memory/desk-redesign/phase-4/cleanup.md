---
title: cleanup
type: note
permalink: shay-memory/desk-redesign/phase-4/cleanup
---

# Phase 4 — cleanup

## Scope
Fix non-ASCII em-dash in a Python bytes literal that broke `py_compile` of
`shay-shay/gateway/desk_tasks_routes.py`.

## Change
- File: `gateway/desk_tasks_routes.py`
- Line ~130, inside `_stub_sse_stream()`:
  - Before: `yield b": stub stream — wire in Phase 5\n\n"` (em-dash U+2014 inside a `bytes` literal — Python rejects non-ASCII in `b"..."`)
  - After:  `yield b": stub stream -- wire in Phase 5\n\n"` (two ASCII hyphens)

Behavior unchanged — this is the body of an SSE comment line that the renderer's
parser already discards. No callers depended on the exact character.

## Verification
```
cd /Users/famtasticfritz/famtastic/shay-shay
.venv/bin/python -m py_compile gateway/desk_tasks_routes.py
# exit 0
```

## Ownership note
Only `gateway/desk_tasks_routes.py` was touched. No other Shay backend or
Desk renderer files were modified.