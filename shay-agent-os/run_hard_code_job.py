#!/usr/bin/env python3
"""
run_hard_code_job.py — The REAL test. No safety nets.

Task: have Shay migrate Soul.tsx to use Soul.module.css.
This requires reading an existing file, rewriting it completely,
and passing real typecheck:web. It WILL fail on some iterations.
We log every failure and every fix attempt transparently.

This is the self-healing loop test.
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

log("=== HARD TEST: Shay migrates Soul.tsx to use CSS module ===")
log("    No wrappers. Real typecheck. Real failures. Real fixes.")

from swarm import WorkerPool, LocalSwarmDispatcher, load_policy
from swarm.brain_client import BrainAvailabilityCheck, BrainChain
from swarm.pipeline import write_file, shell, _parse_json

BASE = Path.home() / "famtastic/shay-desktop-electron"
SOUL_TSX = BASE / "src/renderer/src/screens/Soul/Soul.tsx"
SOUL_CSS = BASE / "src/renderer/src/screens/Soul/Soul.module.css"
TYPECHECK = f"cd {BASE} && npm run typecheck:web 2>&1"
BACKUP = SOUL_TSX.with_suffix(".tsx.bak")

# Read current state
soul_tsx_original = SOUL_TSX.read_text()
soul_css = SOUL_CSS.read_text() if SOUL_CSS.exists() else ""

log(f"Soul.tsx: {len(soul_tsx_original)} chars")
log(f"Soul.module.css: {len(soul_css)} chars, {soul_css.count('.')} classes")

# Back up the original
BACKUP.write_text(soul_tsx_original)
log(f"Backed up original to {BACKUP.name}")

# Set up Shay's dispatcher
pool = WorkerPool(num_workers=2)
pool.start()
pool.spawn_workers(2)
policy = load_policy("balanced")
dispatcher = LocalSwarmDispatcher(worker_pool=pool, policy=policy)
BrainAvailabilityCheck(dispatcher._brain)

# The task prompt — what Shay gets told
TASK = f"""You are migrating Soul.tsx to use a CSS module instead of global className strings.

CURRENT Soul.tsx (the file you must rewrite):
{soul_tsx_original}

SOUL.MODULE.CSS (the module that already exists — use its class names):
{soul_css[:3000]}

YOUR JOB: Rewrite Soul.tsx so that:
1. It imports: import styles from './Soul.module.css'
2. Every soul-* className is replaced with the matching styles.X (camelCase)
   Examples: "soul-container" -> styles.soulContainer, "soul-editor" -> styles.soulEditor
3. Global classes like "btn", "btn-secondary", "btn-sm", "btn-primary" stay as bare strings
4. The loading-spinner class stays as a bare string (it's global)
5. All the TypeScript logic, hooks, and JSX structure stays IDENTICAL — only classNames change
6. Output ONLY the complete TypeScript file content — no markdown, no backticks, no explanation

The output must be the full Soul.tsx file from the first import to the last line.
"""

log("\n=== Starting iteration loop ===")
log(f"Max iterations: 3")
log(f"Test command: npm run typecheck:web")

last_error = ""
result_tsx = ""
success = False

for iteration in range(1, 4):
    log(f"\n--- Iteration {iteration}/3 ---")

    # Build the prompt with error context if we have one
    prompt = TASK
    if last_error:
        log(f"  Feeding back error from iteration {iteration-1}:")
        log(f"  {last_error[:300]}")
        prompt = f"""{TASK}

PREVIOUS ATTEMPT FAILED WITH THIS TYPESCRIPT ERROR:
{last_error}

Fix the specific error above. The most common causes:
- A CSS class name in the module doesn't match what you used (check exact camelCase)
- You forgot to handle a class that doesn't have a module equivalent
- A type annotation issue

Output the corrected complete Soul.tsx file."""

    # Call Shay's brain directly
    log(f"  Calling Shay's brain (Claude)...")
    t0 = time.time()
    try:
        brain = BrainChain(preferred="claude")
        generated = brain.call_prompt(prompt, timeout=120.0)
        elapsed = time.time() - t0
        log(f"  Brain answered in {elapsed:.1f}s via {brain.last_brain}: {len(generated)} chars")
    except Exception as e:
        log(f"  BRAIN FAILED: {e}")
        traceback.print_exc()
        break

    # Strip markdown fences if the brain returned them (common failure mode)
    cleaned = generated.strip()
    if cleaned.startswith("```"):
        # Strip opening fence (with optional language tag)
        lines = cleaned.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]  # remove opening fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]  # remove closing fence
        cleaned = "\n".join(lines)
        log(f"  Stripped markdown fences — cleaned to {len(cleaned)} chars")

    result_tsx = cleaned

    # Sanity check: does it look like a TypeScript file?
    if not ("import" in cleaned and "function" in cleaned and "export default" in cleaned):
        log(f"  WARNING: output doesn't look like a TSX file")
        log(f"  First 200 chars: {cleaned[:200]}")
        last_error = "The output was not a valid TypeScript file. It must start with import statements and contain the Soul function component."
        continue

    # Write to disk
    log(f"  Writing {len(cleaned)} chars to Soul.tsx...")
    try:
        write_file(str(SOUL_TSX), cleaned)
        log(f"  Written ✓")
    except Exception as e:
        log(f"  WRITE FAILED: {e}")
        traceback.print_exc()
        break

    # Run the real typecheck
    log(f"  Running: npm run typecheck:web ...")
    t0 = time.time()
    try:
        tc_out = shell(TYPECHECK, timeout=120.0, trust_gate=False)
        elapsed = time.time() - t0
        log(f"  TYPECHECK PASSED in {elapsed:.1f}s ✅")
        success = True
        break
    except RuntimeError as e:
        elapsed = time.time() - t0
        error_text = str(e)
        last_error = error_text
        log(f"  TYPECHECK FAILED after {elapsed:.1f}s ❌")
        log(f"  Error (first 500 chars):")
        # Extract the actual TS errors (after "error TS")
        ts_errors = [line for line in error_text.split("\n") if "error TS" in line or "error:" in line.lower()]
        for err_line in ts_errors[:5]:
            log(f"    {err_line.strip()}")
        if not ts_errors:
            log(f"    {error_text[:500]}")

pool.stop()

# Final report
log("\n=== FINAL RESULT ===")
if success:
    log(f"✅ SUCCESS")
    log(f"   Soul.tsx successfully migrated to use CSS module")
    log(f"   Iterations needed: {iteration}")
    log(f"   typecheck:web: PASS")
    log(f"\n   Verifying no bare soul-* strings remain:")
    remaining = [line.strip() for line in result_tsx.split("\n") if '"soul-' in line and "styles." not in line]
    if remaining:
        log(f"   WARNING: {len(remaining)} bare soul-* strings still found:")
        for r in remaining[:5]:
            log(f"     {r}")
    else:
        log(f"   Clean ✅ — no bare soul-* className strings")
else:
    log(f"❌ FAILED after 3 iterations")
    log(f"   Restoring original Soul.tsx from backup...")
    SOUL_TSX.write_text(soul_tsx_original)
    log(f"   Restored. Last error:")
    log(f"   {last_error[:400]}")
    log(f"\n   DIAGNOSIS NEEDED:")
    log(f"   1. Was the brain generating wrong class names?")
    log(f"   2. Was the error context being fed back correctly?")
    log(f"   3. Is there a CSS module type issue in the TS config?")
    log(f"   4. Was the output format wrong (markdown fences, etc.)?")

# Save full log
log_path = Path(__file__).parent / "run_hard_code_job.log"
log_path.write_text("\n".join(LOG))
log(f"\nFull log: {log_path}")
