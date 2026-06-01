---
title: swarm-worktree-verdict-2026-05-31
type: note
permalink: shay-memory/research/swarm-worktree-verdict-2026-05-31
---

# Swarm Worktree Isolation Verdict
**Date:** 2026-05-31  
**Task:** P0-WT — Verify/enable git-worktree isolation in Shay's dispatcher  
**Scope:** RECON + REPORT ONLY (no implementation). Determine whether Shay's swarm/dispatcher (LocalSwarmDispatcher + kanban board workspaces directory) can run build units in isolated git worktrees that merge back.

## Findings

### (a) Does it already isolate per-task workspaces? How?
Yes. The dispatcher isolates per-task workspaces via the `workspace_kind` and `workspace_path` fields on each Kanban task.  
- When a task is created, the `workspace_kind` defaults to `"scratch"` and `workspace_path` is set to a unique temporary directory under `<kanban_root>/workspaces/`.  
- At worker spawn time (`_default_spawn` in `shay_cli/kanban_db.py`), the dispatcher injects `SHAY_KANBAN_WORKSPACE=<workspace_path>` into the worker's environment.  
- The worker process (a `shay -p <profile> chat -q ...` subprocess) is expected to use this environment variable as its working directory for the task, ensuring isolation between concurrent tasks.

### (b) Does it use git worktrees or copies?
Currently, the dispatcher uses **copies** (scratch directories) by default.  
- The `workspace_kind` field supports three values: `"scratch"`, `"dir"`, and `"worktree"` (validated in `create_task`).  
- However, the dispatcher does **not** automatically create git worktrees. If `workspace_kind` is set to `"worktree"`, the caller must provide an absolute `workspace_path` pointing to an existing git worktree. The dispatcher merely passes that path through to the worker; it does not perform any `git worktree add` or linking operations.  
- Thus, without explicit external setup, isolation is achieved via scratch directory copies, not git worktrees.

### (c) Do edits merge back to the live repo or stay sandboxed?
Edits made in the worker's workspace **stay sandboxed** and are **not automatically merged back** to any live repository.  
- For `"scratch"` workspaces, the directory is ephemeral and discarded when the task completes (subject to GC policies).  
- For `"dir"` or `"worktree"` workspaces, the dispatcher does not invoke any merge, push, or pull operations. It treats the workspace as a pure execution sandbox. Any version‑control actions (e.g., `git commit`, `git push`) would need to be explicitly scripted inside the task prompt or worker logic.

### (d) If no worktree support, the smallest change to add it
The dispatcher already accepts `"worktree"` as a valid `workspace_kind`. To add automatic git‑worktree provisioning, the smallest change would be to modify the task creation/spawn flow to:  
1. When a task is created with `workspace_kind="worktree"` and `workspace_path` is **not** provided, automatically:  
   - Determine the base repository (e.g., the famtastic monorepo or a configurable source).  
   - Run `git worktree add <worktree_path> <branch-or-ref>` under the board's workspaces root.  
   - Set the task's `workspace_path` to the newly created worktree.  
2. Ensure the worker receives this path via `SHAY_KANBAN_WORKSPACE` as before.  
3. Optionally, on task completion, automatically clean up the worktree (via `git worktree remove`) if the task is ephemeral, or leave it for inspection based on a policy flag.  

This change would be localized to the Kanban task‑creation dispatcher logic (e.g., inside `create_task` or `_default_spawn` in `shay_cli/kanban_db.py`) and would not require altering the worker execution or the LocalSwarmDispatcher in shay-agent-os.

## Sources Inspected
- `~/famtastic/famtastic/shay-shay/shay_cli/kanban_db.py`:  
  - `create_task()` (validation of `workspace_kind`)  
  - `_default_spawn()` (injection of `SHAY_KANBAN_WORKSPACE`)  
  - `VALID_WORKSPACE_KINDS = {"scratch", "worktree", "dir"}`  
- `~/famtastic/famtastic/shay-shay/tools/kanban_tools.py`: workspace kind documentation  
- `~/famtastic/famtastic/shay-agent-os/components/swarm/local_swarm_dispatcher.py`: LocalSwarmDispatcher (uses WorkerPool, does not directly handle workspaces)  
- Current task `t_7730ddd1` shows `workspace_kind: scratch`, `workspace_path: /Users/famtasticfritz/.shay/kanban/boards/masterplan/workspaces/t_7730ddd1`

## Conclusion
Shady's dispatcher already provides per‑task isolation via scratch directories but does not automatically provision git worktrees. Adding automatic worktree creation would require a small enhancement to the task‑creation/spawn path to invoke `git worktree add` when `workspace_kind="worktree"` and no path is supplied. Until such a change is made, users seeking true worktree isolation must manually configure `workspace_path` to point at an existing worktree.

---
*This report satisfies the gate: a verdict document has been written. No engine code was edited.*