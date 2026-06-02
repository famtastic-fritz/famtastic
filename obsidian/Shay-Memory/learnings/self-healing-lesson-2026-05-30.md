---
title: Self-Healing Loop Lesson — 2026-05-30
date: 2026-05-30
tags:
- self-healing
- ipc
- typescript
- code-job
attempts: 2
final_status: SUCCESS
permalink: shay-memory/learnings/self-healing-lesson-2026-05-30
---

# Self-Healing Loop Lesson

**Task:** Write Electron IPC handler for skills:list
**Attempts needed:** 2
**Result:** SUCCESS

## What failed (in order)
- Attempt 1: shell exit 2: 
> shay-desktop@0.4.3 typecheck:node
> tsc --noEmit -p tsconfig.node.json --composite false

src/main/domains/skills.ts(1,1): error TS6133: 'ipcMain' is declared but its value is never r

## What to watch for next time
- Electron `ipcMain` imports must come from `'electron'` not a submodule
- Handler must be registered in the correct main-process setup file
- TypeScript strict mode catches `undefined` returns — always type the return
- CSS module class names must exactly match what's in the .module.css file

## Pattern for future IPC handlers
```typescript
import { ipcMain } from 'electron'
ipcMain.handle('namespace:method', async (_event, ...args) => {
  // implementation
  return result  // must match declared return type
})
```