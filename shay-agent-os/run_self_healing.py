#!/usr/bin/env python3
"""
run_self_healing.py — The real self-healing + self-learning loop.

Three things that weren't in run_hard_code_job.py:
  1. A task hard enough to actually fail on first attempt
  2. Every failure written to .wolf/buglog.json automatically
  3. Lessons written to Obsidian so the next run benefits

Task: write a complete IPC handler for skills:list in the Electron main
process — this requires exact electron TypeScript types, correct module
imports, and strict-mode compliance. Claude will get it wrong at least once.

When it fails: buglog entry written, lesson captured, error fed back.
When it succeeds: success written to buglog, lesson captured.
The NEXT run reads the buglog first.
"""
import sys, time, json, traceback, re
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "components"))

FAMTASTIC = Path.home() / "famtastic"
BUGLOG = FAMTASTIC / ".wolf/buglog.json"
OBSIDIAN = FAMTASTIC / "obsidian/Shay-Memory/learnings"
LOG_PATH = Path(__file__).parent / "run_self_healing.log"
LOG = []

def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    LOG.append(line)
    LOG_PATH.write_text("\n".join(LOG))

def record_failure(attempt: int, task: str, error: str, fix_attempted: str):
    """Write failure to buglog.json — permanent record."""
    try:
        d = json.loads(BUGLOG.read_text()) if BUGLOG.exists() else {"bugs": []}
        bugs = d.get("bugs", d) if isinstance(d, dict) else d
        entry = {
            "id": (bugs[-1]["id"] + 1) if bugs else 1,
            "timestamp": datetime.now().strftime("%Y-%m-%d"),
            "error_message": f"[self-healing attempt {attempt}] {task[:100]}: {error[:300]}",
            "file": "shay-agent-os/run_self_healing.py",
            "root_cause": f"Attempt {attempt} failed. Error: {error[:200]}",
            "fix": fix_attempted[:200] if fix_attempted else "iteration in progress",
            "tags": ["self-healing", "code-job", "ipc", "typescript"]
        }
        bugs.append(entry)
        BUGLOG.write_text(json.dumps(d, indent=2))
        log(f"  → buglog entry #{entry['id']} written")
    except Exception as e:
        log(f"  → buglog write failed: {e}")

def record_success(attempts: int, task: str):
    """Write success + lesson to buglog and Obsidian."""
    # buglog
    try:
        d = json.loads(BUGLOG.read_text()) if BUGLOG.exists() else {"bugs": []}
        bugs = d.get("bugs", d) if isinstance(d, dict) else d
        entry = {
            "id": (bugs[-1]["id"] + 1) if bugs else 1,
            "timestamp": datetime.now().strftime("%Y-%m-%d"),
            "error_message": f"SUCCESS after {attempts} attempt(s): {task[:100]}",
            "file": "shay-agent-os/run_self_healing.py",
            "root_cause": f"Task succeeded in {attempts} iteration(s)",
            "fix": "N/A — success",
            "tags": ["self-healing", "success", "ipc", "typescript"]
        }
        bugs.append(entry)
        BUGLOG.write_text(json.dumps(d, indent=2))
        log(f"  → success logged to buglog as entry #{entry['id']}")
    except Exception as e:
        log(f"  → buglog write failed: {e}")

def write_lesson(attempt: int, errors: list, final_status: str):
    """Capture lesson to Obsidian so future runs benefit."""
    OBSIDIAN.mkdir(parents=True, exist_ok=True)
    date = datetime.now().strftime("%Y-%m-%d")
    fname = OBSIDIAN / f"self-healing-lesson-{date}.md"
    lesson = f"""---
title: Self-Healing Loop Lesson — {date}
date: {date}
tags: [self-healing, ipc, typescript, code-job]
attempts: {attempt}
final_status: {final_status}
---

# Self-Healing Loop Lesson

**Task:** Write Electron IPC handler for skills:list
**Attempts needed:** {attempt}
**Result:** {final_status}

## What failed (in order)
{chr(10).join(f"- Attempt {i+1}: {e[:200]}" for i, e in enumerate(errors)) if errors else "- No failures (passed first try)"}

## What to watch for next time
- Electron `ipcMain` imports must come from `'electron'` not a submodule
- Handler must be registered in the correct main-process setup file
- TypeScript strict mode catches `undefined` returns — always type the return
- CSS module class names must exactly match what's in the .module.css file

## Pattern for future IPC handlers
```typescript
import {{ ipcMain }} from 'electron'
ipcMain.handle('namespace:method', async (_event, ...args) => {{
  // implementation
  return result  // must match declared return type
}})
```
"""
    fname.write_text(lesson)
    log(f"  → lesson written to {fname.name}")

log("=== SELF-HEALING LOOP TEST ===")
log("    Hard task + failure recording + lesson capture")

# ── Read buglog for prior lessons (carry-forward) ─────────────────────────────
log("\nStep 1: checking buglog for prior lessons on this task...")
prior_lessons = ""
try:
    if BUGLOG.exists():
        d = json.loads(BUGLOG.read_text())
        bugs = d.get("bugs", d) if isinstance(d, dict) else d
        ipc_bugs = [b for b in bugs if "ipc" in str(b.get("tags", [])) or "typescript" in str(b.get("tags", []))]
        if ipc_bugs:
            prior_lessons = f"\nPRIOR LESSONS FROM BUGLOG ({len(ipc_bugs)} relevant entries):\n"
            for b in ipc_bugs[-3:]:  # last 3 relevant
                prior_lessons += f"- {b.get('error_message','')[:120]}\n  Fix: {b.get('fix','')[:100]}\n"
            log(f"  Found {len(ipc_bugs)} prior IPC/TS lessons — injecting into context")
        else:
            log("  No prior IPC lessons in buglog")
except Exception as e:
    log(f"  buglog read failed: {e}")

# ── Set up Shay's dispatcher ──────────────────────────────────────────────────
log("\nStep 2: setting up Shay's dispatcher...")
from swarm import WorkerPool, LocalSwarmDispatcher, load_policy
from swarm.brain_client import BrainChain, BrainAvailabilityCheck
from swarm.pipeline import write_file, shell

pool = WorkerPool(num_workers=2)
pool.start()
pool.spawn_workers(2)
policy = load_policy("balanced")
dispatcher = LocalSwarmDispatcher(worker_pool=pool, policy=policy)
BrainAvailabilityCheck(dispatcher._brain)

# ── Read the actual target files for context ──────────────────────────────────
BASE = Path.home() / "famtastic/shay-desktop-electron"
log("\nStep 3: reading codebase context...")

preload = (BASE / "src/preload/index.ts").read_text(errors="ignore")[:3000]
# Find existing ipcMain.handle patterns
main_files = list((BASE / "src/main").rglob("*.ts"))
ipc_examples = ""
for f in main_files[:3]:
    txt = f.read_text(errors="ignore")
    if "ipcMain.handle" in txt:
        idx = txt.find("ipcMain.handle")
        ipc_examples += f"\n// From {f.name}:\n{txt[max(0,idx-50):idx+300]}\n"
log(f"  preload: {len(preload)} chars | IPC examples: {len(ipc_examples)} chars")

# ── Define the hard task ──────────────────────────────────────────────────────
# This is genuinely hard:
# 1. Must use exact electron types (ipcMain from 'electron')
# 2. Must call into Python-side list_skills() somehow
# 3. Must return the right TypeScript type
# 4. Must be registered correctly in main process

OUTPUT_PATH = str(BASE / "src/main/domains/skills.ts")
BACKUP_PATH = BASE / "src/main/domains/skills.ts.bak"

# Check if skills.ts already exists
existing = ""
if Path(OUTPUT_PATH).exists():
    existing = Path(OUTPUT_PATH).read_text()
    BACKUP_PATH.write_text(existing)
    log(f"  Backed up existing skills.ts ({len(existing)} chars)")

TASK = f"""Write a TypeScript IPC handler module for Shay Desktop Electron app.

File to create: src/main/domains/skills.ts

This module registers an IPC handler that lets the renderer process
list available skills from ~/.shay/skills/.

{prior_lessons}

EXISTING IPC PATTERNS IN THIS CODEBASE:
{ipc_examples[:1500]}

PRELOAD BRIDGE (src/preload/index.ts) — shows how IPC is exposed:
{preload[:2000]}

YOUR TASK: Write the COMPLETE src/main/domains/skills.ts file that:

1. Imports ipcMain from 'electron'
2. Imports execSync from 'child_process' (to call the Python skills lister)
3. Defines a SkillInfo interface:
   interface SkillInfo {{
     name: string
     description: string
     path: string
     tags: string[]
   }}
4. Registers an ipcMain handler for 'skills:list' that:
   - Runs a python3 subprocess via execSync to call list_skills() from the swarm pipeline
   - The python command: python3 -c with sys.path setup + from swarm.pipeline import list_skills + json.dumps output
     where query comes from the IPC call args
   - Parses the JSON output
   - Returns SkillInfo[] or empty array on error
5. Exports a register(ipcMain: Electron.IpcMain) function that registers the handler
6. TypeScript strict mode must pass

IMPORTANT CONSTRAINTS:
- The execSync call should use {{ encoding: 'utf8' }} option
- Wrap in try/catch — return [] on any error
- The handler signature: ipcMain.handle('skills:list', async (_event, query: string = '') => SkillInfo[])
- Export register as named export AND default export

Output ONLY the complete TypeScript file. No markdown. No explanation.
First line must be: import {{ ipcMain }} from 'electron'
"""

# ── The self-healing iteration loop ───────────────────────────────────────────
log(f"\nStep 4: starting self-healing iteration loop")
log(f"  Output: {OUTPUT_PATH}")
log(f"  Test: npm run typecheck:node (checks main process types)")

errors_by_attempt = []
last_error = ""
success = False
TYPECHECK = f"cd {BASE} && npm run typecheck:node 2>&1"

for iteration in range(1, 4):
    log(f"\n{'='*50}")
    log(f"ITERATION {iteration}/3")
    log(f"{'='*50}")

    prompt = TASK
    if last_error:
        log(f"  Injecting error from iteration {iteration-1} into context...")
        # Extract just the TS error lines
        ts_lines = [l for l in last_error.split("\n") if "error TS" in l or ".ts(" in l]
        short_error = "\n".join(ts_lines[:8]) if ts_lines else last_error[:400]
        prompt = f"""{TASK}

⚠️  PREVIOUS ATTEMPT (iteration {iteration-1}) FAILED WITH THESE TYPESCRIPT ERRORS:
{short_error}

Fix EXACTLY these errors. Do not change working parts. Output the complete corrected file."""

    log(f"  Calling Shay's brain...")
    t0 = time.time()
    try:
        brain = BrainChain(preferred="claude")
        generated = brain.call_prompt(prompt, timeout=120.0)
        log(f"  Response: {len(generated)} chars in {time.time()-t0:.1f}s via {brain.last_brain}")
    except Exception as e:
        log(f"  BRAIN FAILED: {e}")
        record_failure(iteration, TASK[:80], str(e), "brain call failed")
        errors_by_attempt.append(str(e))
        break

    # Clean markdown fences
    cleaned = generated.strip()
    if "```" in cleaned:
        lines = cleaned.split("\n")
        start = next((i for i, l in enumerate(lines) if l.startswith("```")), 0)
        end = next((i for i in range(len(lines)-1, start, -1) if lines[i].strip() == "```"), len(lines))
        cleaned = "\n".join(lines[start+1:end])
        log(f"  Stripped markdown fences")

    # Sanity check
    if "ipcMain" not in cleaned or "import" not in cleaned:
        err = "Output missing required 'ipcMain' import — not a valid TS module"
        log(f"  FORMAT CHECK FAILED: {err}")
        log(f"  First 200: {cleaned[:200]}")
        record_failure(iteration, TASK[:80], err, "format validation failed")
        errors_by_attempt.append(err)
        last_error = err
        continue

    # Write the file
    log(f"  Writing {len(cleaned)} chars to skills.ts...")
    try:
        write_file(OUTPUT_PATH, cleaned)
        log(f"  Written ✓")
    except Exception as e:
        log(f"  WRITE FAILED: {e}")
        record_failure(iteration, TASK[:80], str(e), "write_file failed")
        errors_by_attempt.append(str(e))
        break

    # Run typecheck
    log(f"  Running typecheck:node...")
    t0 = time.time()
    try:
        tc = shell(TYPECHECK, timeout=60.0, trust_gate=False)
        elapsed = time.time() - t0
        log(f"  ✅ TYPECHECK PASSED in {elapsed:.1f}s")
        success = True
        record_success(iteration, TASK[:80])
        write_lesson(iteration, errors_by_attempt, "SUCCESS")
        break
    except RuntimeError as e:
        elapsed = time.time() - t0
        error_text = str(e)
        errors_by_attempt.append(error_text)
        last_error = error_text

        # Extract TS error lines for logging
        ts_errors = [l.strip() for l in error_text.split("\n") if "error TS" in l]
        log(f"  ❌ TYPECHECK FAILED in {elapsed:.1f}s — {len(ts_errors)} TS error(s):")
        for err in ts_errors[:5]:
            log(f"     {err}")

        # Record failure + write lesson
        record_failure(iteration, TASK[:80], "\n".join(ts_errors[:5]), "feeding errors back to brain")
        write_lesson(iteration, errors_by_attempt,
                     f"IN PROGRESS (iteration {iteration})")

pool.stop()

# Final summary
log(f"\n{'='*50}")
log(f"FINAL RESULT")
log(f"{'='*50}")
if success:
    log(f"✅ SUCCESS in {iteration} iteration(s)")
    log(f"   skills.ts written and typechecks clean")
    log(f"   Lesson saved to Obsidian")
    log(f"   Success recorded in buglog")
else:
    log(f"❌ FAILED after 3 iterations")
    log(f"   Errors encountered:")
    for i, e in enumerate(errors_by_attempt):
        ts = [l for l in e.split("\n") if "error TS" in l]
        log(f"   Attempt {i+1}: {(ts[0] if ts else e[:100])}")
    # Restore backup
    if BACKUP_PATH.exists():
        Path(OUTPUT_PATH).write_text(BACKUP_PATH.read_text())
        log(f"   Original restored from backup")
    log(f"\n   What needs fixing in the pipeline:")
    log(f"   1. Are TS errors being extracted and fed back clearly enough?")
    log(f"   2. Does the brain have enough context about electron's IPC types?")
    log(f"   3. Is the test command right (typecheck:node vs typecheck:web)?")
    write_lesson(3, errors_by_attempt, "FAILED")
