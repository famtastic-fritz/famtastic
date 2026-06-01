#!/usr/bin/env python3
"""
run_ui_swarm_fix.py — Shay's OWN multi-agent swarm fixes the morning vision-sweep
UI defects. No Claude Code Workflow tool; Shay's pipeline dispatches each file to
her brain workers (auto → Gemini/Ollama per policy), self-heals against a
project-wide typecheck gate, and rolls back on failure.

Clusters (from the 2026-05-31 morning vision sweep):
  - StatusBar.module.css  : last pill ("Gateway unknown") clipped at the right edge
  - SettingsShell.module.css : "Launch on startup" checkbox misaligned w/ its label;
                               ADVANCED sub-nav items inconsistently indented
  - ChatTabsRow.module.css : tabs cramped; text jammed against the close (x)
  - Providers.global.css (NEW) : API-key <input> placeholder text cut off on the left

Run: /Users/famtasticfritz/famtastic/shay-shay/.venv/bin/python3 run_ui_swarm_fix.py
"""
import sys, time, json, traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "components"))

def log(m): print(f"[{time.strftime('%H:%M:%S')}] {m}", flush=True)

log("=== Shay UI-fix swarm starting ===")
from swarm import WorkerPool, LocalSwarmDispatcher, load_policy
from swarm.pipeline import multi_file_code_job
from swarm.brain_client import BrainAvailabilityCheck

APP = Path.home() / "famtastic/shay-desktop-electron"
SRC = APP / "src/renderer/src"
TEST_CMD = f"cd {APP} && npm run typecheck:web 2>&1 | tail -8"

CONTEXT = (
    "This is the Shay Desktop Electron app (React + TypeScript, CSS Modules). "
    "Target a polished dark Claude-Desktop-style look. Edit ONLY CSS — never change "
    "selector/class names that already exist (they are referenced by hashed CSS-module "
    "imports in .tsx files); only adjust property values and ADD new rules. Keep all "
    "existing rules. Use the CSS custom properties already present (var(--space-*), "
    "var(--color-*), var(--font-*)). Do not introduce inline styles or !important unless "
    "strictly necessary. Output the COMPLETE file content."
)

MANIFEST = [
    {
        "path": str(SRC / "status/StatusBar.module.css"),
        "instruction": (
            "Fix: the right-hand status cluster's last pill ('Gateway unknown') is clipped "
            "at the window's right edge and the right cluster feels cramped. Ensure the bar "
            "row never clips its trailing pill: give the right/trailing cluster a small "
            "padding-right (e.g. 4-6px) and allow pills to shrink gracefully (min-width:0 on "
            "pill labels, flex-shrink allowed) so the last pill stays fully visible inside the "
            "bar. Do NOT remove the existing nowrap/overflow handling. Keep all existing classes."
        ),
    },
    {
        "path": str(SRC / "settings/SettingsShell.module.css"),
        "instruction": (
            "Two fixes. (1) Checkbox alignment: when a .fieldControl contains a checkbox/radio, "
            "the control and its label must sit on one baseline-aligned row. Add a rule so a "
            "field whose control is a checkbox aligns the input and the label text centered "
            "vertically (align-items:center) with a small gap, instead of the checkbox floating "
            "misaligned above/below the label. (2) Nav indentation: items under a nav category "
            "header (e.g. the 'ADVANCED' group, .navItem inside .navCategory) are inconsistently "
            "indented relative to the .navCategoryLabel header. Make the nav items' left inset "
            "consistent with their category label so the sidebar list reads as a clean aligned "
            "column. Keep every existing class and only adjust spacing/alignment."
        ),
    },
    {
        "path": str(SRC / "shell/ChatTabsRow.module.css"),
        "instruction": (
            "Fix: the chat tabs ('New chat', 'terminal') are cramped — the tab title text is "
            "jammed against the close (x) button with insufficient padding. Increase the tab's "
            "horizontal padding and add a small gap between the tab label and the .chat-tab-close "
            "button so each tab breathes, matching a polished Claude-Desktop tab strip. Keep tab "
            "height reasonable and all existing classes."
        ),
    },
    {
        "path": str(SRC / "screens/Providers/Providers.global.css"),
        "instruction": (
            "Create a NEW global (non-module) stylesheet for the Providers screen. The API-key "
            "text inputs currently cut off their placeholder text on the LEFT edge (no horizontal "
            "padding). Add global kebab-case rules so inputs on the Providers screen have proper "
            "padding (e.g. padding: 6px 10px), box-sizing:border-box, full width, and a subtle "
            "border/background using the app's CSS variables, so the 'API Key' placeholder is fully "
            "visible. Scope rules under the Providers containers actually used: '.settings-input-row "
            "input', '.settings-pool-key input', '.settings-pool-key', and a plain '.settings-container "
            "input[type=text], .settings-container input:not([type])' fallback. CSS only; this is a new "
            "file so output the full file."
        ),
    },
]

log("init dispatcher (auto brain → Gemini/Ollama per policy; Claude reserved)...")
pool = WorkerPool(num_workers=4); pool.start(); pool.spawn_workers(4)
policy = load_policy("balanced")
dispatcher = LocalSwarmDispatcher(worker_pool=pool, policy=policy)
try:
    avail = BrainAvailabilityCheck(dispatcher._brain); log(f"brains available: {avail.available}")
except Exception as e:
    log(f"brain check skipped: {e}")

log(f"dispatching {len(MANIFEST)}-file swarm job (typecheck-gated, self-heal)...")
t0 = time.time()
result = multi_file_code_job(
    manifest=MANIFEST,
    test_cmd=TEST_CMD,
    cwd=str(APP),
    dispatcher=dispatcher,
    context=CONTEXT,
    brain="auto",
    max_iterations=4,
    read_existing=True,
)
dt = int(time.time() - t0)
log(f"DONE in {dt}s — passed={result.get('passed')} iterations={result.get('iterations')}")
log(f"files_written={result.get('files_written')}")
print(json.dumps({"passed": result.get("passed"), "iterations": result.get("iterations"),
                  "files_written": result.get("files_written")}, indent=2))
try: pool.stop()
except Exception: pass
sys.exit(0 if result.get("passed") else 2)
