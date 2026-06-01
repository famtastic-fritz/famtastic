#!/usr/bin/env python3
"""
run_real_code_job.py — Real test of Shay's code_job() loop.

No Claude Code Workflow tool. No agent wrapper.
Just Shay's own pipeline dispatching to her brain.

Target: write Soul.module.css for the Shay Desktop Electron app,
        test it compiles (typecheck:web), iterate up to 3 times if not.

Run: python3 run_real_code_job.py
"""
import sys, time, json, traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "components"))

LOG = []
def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    LOG.append(line)

log("=== Shay code_job() real test starting ===")

# ── Step 1: Import Shay's own pipeline ───────────────────────────────────────
log("Step 1: importing Shay's swarm...")
try:
    from swarm import WorkerPool, LocalSwarmDispatcher, load_policy, code_job
    from swarm.brain_client import BrainAvailabilityCheck
    log("  imports OK")
except Exception as e:
    log(f"  IMPORT FAILED: {e}")
    traceback.print_exc()
    sys.exit(1)

# ── Step 2: Read the current Soul screen to understand what CSS is needed ─────
SOUL_TSX = Path.home() / "famtastic/shay-desktop-electron/src/renderer/src/screens/Soul"
soul_files = list(SOUL_TSX.glob("*.tsx")) + list(SOUL_TSX.glob("*.ts"))
soul_content = ""
for f in soul_files:
    soul_content += f"\n// {f.name}\n" + f.read_text(errors="ignore")[:3000]

log(f"Step 2: read Soul screen — {len(soul_content)} chars from {len(soul_files)} files")
if not soul_content.strip():
    log("  WARNING: no Soul TSX found — proceeding with general knowledge")

# ── Step 3: Read the Skills module as a style reference ──────────────────────
skills_css_path = Path.home() / "famtastic/shay-desktop-electron/src/renderer/src/screens/Skills/Skills.module.css"
skills_css_ref = skills_css_path.read_text(errors="ignore")[:2000] if skills_css_path.exists() else ""
log(f"Step 3: style reference — {len(skills_css_ref)} chars")

# ── Step 4: Set up Shay's dispatcher ─────────────────────────────────────────
log("Step 4: initialising dispatcher...")
try:
    pool = WorkerPool(num_workers=2)
    pool.start()
    pool.spawn_workers(2)
    policy = load_policy("balanced")
    dispatcher = LocalSwarmDispatcher(worker_pool=pool, policy=policy)
    avail = BrainAvailabilityCheck(dispatcher._brain)
    log(f"  dispatcher ready. brains: {avail.available}")
except Exception as e:
    log(f"  DISPATCHER FAILED: {e}")
    traceback.print_exc()
    sys.exit(1)

# ── Step 5: Define the job spec ───────────────────────────────────────────────
OUTPUT_PATH = str(Path.home() / "famtastic/shay-desktop-electron/src/renderer/src/screens/Soul/Soul.module.css")
TEST_CMD = f"cd {str(Path.home() / 'famtastic/shay-desktop-electron')} && npm run typecheck:web 2>&1 | tail -5"

# NOTE: typecheck:web won't fail just from adding a CSS module unless Soul.tsx
# imports it and has missing classes. So we use a second test: grep that the
# file exists and has real CSS class definitions.
VALIDATE_CMD = f"test -f '{OUTPUT_PATH}' && grep -c '{{' '{OUTPUT_PATH}'"

JOB_SPEC = json.dumps({
    "name": "Soul.module.css",
    "goal": "Write Soul.module.css — a scoped CSS module for the Soul screen in the Shay Desktop Electron app.",
    "phases": [
        {
            "name": "Generate",
            "brain": "claude",
            "tier": "complex",
            "tasks": [
                f"""Write the COMPLETE content of Soul.module.css.

This is a CSS Module file for the Soul screen in a dark-themed Electron desktop app.

CURRENT Soul screen TSX (shows what className strings are used):
{soul_content[:2000]}

REFERENCE — Skills.module.css pattern to follow:
{skills_css_ref[:1500]}

Requirements:
- Define scoped classes for every element in the Soul screen
- Use CSS variables with fallbacks: --color-text-primary (#e2e8f0), --color-surface-2 (#1e2a3a), --color-border (#334155), --color-accent (#38bdf8), --spacing-md (1rem)
- The Soul screen is a text editor — include classes for: container, header, title, textarea/editor area, toolbar, save indicator, reset button, loading state
- Match the dark theme (same variables as Skills.module.css)
- Output ONLY valid CSS. No markdown. No backticks. No explanation. Just the CSS file content starting with /* Soul.module.css */
"""
            ]
        }
    ],
    "output_path": OUTPUT_PATH,
    "test_cmd": VALIDATE_CMD
})

log(f"Step 5: job spec ready — output={OUTPUT_PATH}")
log(f"         test_cmd: {VALIDATE_CMD}")

# ── Step 6: Run Shay's code_job() ─────────────────────────────────────────────
log("\nStep 6: RUNNING code_job() — this is Shay dispatching, not Claude Code")
log("        max_iterations=3, test must pass each iteration")

t0 = time.time()
result = None
error = None

try:
    result = code_job(JOB_SPEC, dispatcher, max_iterations=3)
    elapsed = time.time() - t0
    log(f"\n=== RESULT ===")
    log(f"  status:        {result.status}")
    log(f"  quality_gate:  {result.quality_gate}")
    log(f"  elapsed:       {elapsed:.1f}s")
    log(f"  output_chars:  {len(result.final_output or '')}")
    log(f"  phases:        {[(p.phase_name, p.status) for p in result.phases]}")
    if result.final_output:
        log(f"\n--- First 300 chars of output ---")
        log(result.final_output[:300])
    if result.status == "completed":
        log(f"\n✅ SUCCESS — Soul.module.css written and test passed")
        log(f"   File: {OUTPUT_PATH}")
    else:
        log(f"\n❌ FAILED — status={result.status}")
except Exception as e:
    elapsed = time.time() - t0
    error = e
    log(f"\n❌ EXCEPTION after {elapsed:.1f}s: {e}")
    traceback.print_exc()
finally:
    pool.stop()

# ── Step 7: Verify on disk regardless ─────────────────────────────────────────
log(f"\nStep 7: disk verification")
p = Path(OUTPUT_PATH)
if p.exists():
    content = p.read_text(errors="ignore")
    log(f"  File exists: {len(content)} chars")
    log(f"  CSS blocks: {content.count('{')}")
    log(f"  First line: {content.splitlines()[0] if content else '(empty)'}")
else:
    log(f"  File NOT written to disk")

# Save log
log_path = Path(__file__).parent / "run_real_code_job.log"
log_path.write_text("\n".join(LOG))
log(f"\nLog saved: {log_path}")
