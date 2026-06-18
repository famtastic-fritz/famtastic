# EVALUATION — run & assess the factory without disturbing other sessions

## Your concern, answered directly
Several sessions are pointed at the same `~/famtastic`. **Will evaluating this
break their work?**

- **Running the factory: no, never.** It imports nothing from Site Studio,
  opens no ports, touches no `launchd`/`studio-config.json`, and — by the
  `assert_inside` guardrail — only ever writes inside its own folder.
- **The branch itself: safe.** `claude/agent-factory-orchestrator-flvu43` only
  *adds* `agent-foundry/` (plus two `obsidian/` session notes). It modifies zero
  Studio files, so nothing another session edits is overwritten.
- **The one real risk is git, not the code:** doing a `git checkout` of this
  branch inside the *same* working clone another session is actively editing.
  That's a shared-working-tree problem. The two options below remove it.

## Option A (recommended): Docker — full OS-level isolation
The container has its own filesystem. It **cannot see or touch** `~/famtastic`,
so it is impossible to collide with any other session, no matter how many share
that path. Requires Docker Desktop running.

```bash
# from a checkout/copy of agent-foundry/ (any location)
make build              # build the sandbox image (pure stdlib, no deps)
make run                # bounded proof run, streamed to your terminal
make scenario S=routing # any scenario: smoke|burst|routing|paypal|resilience|autonomy
make eval               # run + copy artifacts to /tmp/agent-foundry-eval for inspection
make shell              # poke around inside the sandbox
make clean              # remove the image
```
`make eval` copies `deliverables/`, `logs/`, `LEARNINGS.md`, and `dashboard/`
to `OUT=/tmp/agent-foundry-eval` (outside your repo) so you can read results
without writing anything back into `~/famtastic`. Override with
`make eval OUT=~/somewhere-else`.

Nothing the container does is visible to the host repo. When you `make clean`,
it's gone without a trace.

## Option B (no Docker): a throwaway local workspace
Because the factory is self-contained, you can copy it to a directory **outside**
the shared repo and run it there with plain Python. Other sessions never see it.

```bash
make workspace DEST=~/agent-foundry-eval   # copies the factory out of the repo
cd ~/agent-foundry-eval
python3 run.py                              # or: ./demo.sh autonomy
```
This writes only under `~/agent-foundry-eval`. Your `~/famtastic` (and every
session using it) is untouched.

## Option C (git-clean, if you don't share the working tree): worktree
If you just want the branch without disturbing your current checkout:
```bash
cd ~/famtastic
git fetch origin claude/agent-factory-orchestrator-flvu43
git worktree add ../famtastic-af claude/agent-factory-orchestrator-flvu43
cd ../famtastic-af/agent-foundry && python3 run.py
# cleanup later:  git worktree remove ../famtastic-af
```
A worktree is a separate directory on the same repo — your main checkout (and
the Studio session running from it) does not change branches.

## Recommendation
Use **Option A (Docker)** for evaluation. It is the only one that is isolated at
the OS level, which is exactly what "several sessions on the same path" calls
for. Use **Option B** if Docker isn't running and you just want to see it work.

## One-command verdict: the scorecard
The fastest way to evaluate everything at once. It runs in a throwaway temp copy
(so it never touches the repo) and prints a PASS/FAIL line per capability:

```bash
make scorecard          # in Docker
# or, no Docker:
python3 scorecard.py    # or ./demo.sh scorecard
```
It checks: end-to-end run, model routing across tiers, PayPal draft safety
(no send/capture in the API surface), fault handling, dead-worker requeue,
bounded self-improvement, and the sandbox write-guardrail. Exit code = number of
failures (0 = all green). Last verified result: **7/7 GREEN**.

## What "several testing runs" looks like
Each is independent and resets its own local state:
```bash
make scenario S=smoke       # the happy path, end to end
make scenario S=burst       # 20 tasks: watch it scale concurrency + cadence
make scenario S=routing     # see cheap/mid/premium model routing by complexity
make scenario S=resilience  # a failing task + a dead-worker task recover correctly
make scenario S=paypal      # DRAFT invoices (stub) with the real API request body
make scenario S=autonomy    # daemon picks up tasks injected live, then stops
```
Read `TESTING.md` for what each one proves and what to look for in the logs.

## Note on Site Studio
We are **not** wiring Site Studio in this evaluation (another session owns those
changes). When that settles, the only integration point is a single call —
`queue_db.add_task(...)` — from a Studio build event. Until then this stays a
standalone sandbox.
