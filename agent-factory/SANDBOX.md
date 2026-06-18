# SANDBOX CONTRACT

This directory (`agent-factory/`) is a **hard isolation boundary**.

## The one rule

> **Nothing outside `agent-factory/` may be created, modified, scheduled, or
> deleted by this system — ever.**

Every process, schedule, database, log, spawned worker agent, output artifact,
and config value produced by the agent factory lives entirely inside this
folder. The factory is designed so you can `cp -r agent-factory /anywhere` (or
detach it into its own git repo — see below) and it keeps working with zero
external state.

## What "isolated" concretely means here

| Concern | How it is sandboxed |
| --- | --- |
| **Filesystem** | All reads/writes are under `agent-factory/`. Paths are resolved relative to `ROOT = Path(__file__).resolve().parents[1]` so the code cannot wander up the tree. |
| **Scheduling** | The orchestrator runs its **own in-process scheduler** (a min-heap of next-run timestamps in `src/orchestrator.py`). It **never** touches the real system `crontab`, `launchd`, `systemd`, or `at`. Kill the process → all schedules stop. |
| **Processes** | Worker agents are spawned as child `python3` subprocesses of the orchestrator. They are tracked by PID, monitored, and reaped. Killing the orchestrator orphans nothing it cannot account for; `--daemon` mode installs a clean shutdown that terminates its children. |
| **Money / external spend** | **Zero.** No real network calls. The model layer (`src/llm.py`) is an OpenRouter-style client that is **stubbed offline by default** and returns deterministic mock completions. It only attempts a real call if `OPENROUTER_API_KEY` is present in `.env`, and even then it is the user's explicit opt-in. No PayPal, no email send, no card rails are ever invoked — those are documented as *mock* integration points in `SETUP.md`. |
| **Credentials** | None are required to run. `.env.example` lists the keys a future operator *could* fill in. Real secrets go in `.env`, which is git-ignored. |
| **Git** | Builds as a normal subdirectory so it is reviewable on the feature branch, **and** ships `setup.sh init-repo` to detach into its own standalone git repo on demand (see "Own repo" below). |

## Own repo (per the build spec)

The spec asks for "its own git repo." To stay reviewable inside the parent
FAMtastic branch *and* satisfy the standalone-repo requirement, this folder is:

1. Committed to the parent repo's feature branch (so a reviewer sees every file), **and**
2. One command away from being its own repo:

```bash
cd agent-factory
./setup.sh init-repo   # runs `git init` here + first commit, fully detached
```

**Decision logged:** a *nested* `.git` was deliberately avoided because the
parent repo would track it as an opaque gitlink and the reviewer would see no
files. Reviewability beat literal nesting. This trade-off is recorded in
`LEARNINGS.md` and `ORCHESTRATOR.log` is unaffected.

## Isolated environment

No third-party packages are required. The entire system runs on the **Python 3
standard library** (`sqlite3`, `threading`, `subprocess`, `http.server`,
`json`, `heapq`). This is the strongest form of "isolated env": nothing to
install, nothing to download, runs on a plane.

```bash
./setup.sh            # creates a .venv (optional, for parity) and seeds the queue
./run.sh              # starts the orchestrator demo run
```

`requirements.txt` is intentionally empty (stdlib-only). A `.venv` is created
for environment parity but installs nothing.

## Kill switch

```bash
# stop everything this sandbox is doing, instantly:
pkill -f 'agent-factory/src/orchestrator.py'
pkill -f 'agent-factory/agents/'
```

Because there is no external scheduler, killing those processes fully stops the
system. Nothing reschedules itself outside this folder.
