# Run it on YOUR machine, in a sandbox, and test

Everything is self-contained and offline. Getting it local is just: clone the
branch, isolate it, run the test. No keys, no install of third-party packages,
no money movement.

## 0. Prereqs
- Python 3.9+ (`python3 --version`). That's it — standard library only.
- git.

## 1. Get the code onto your machine

You already have the famtastic repo. From it:

```bash
cd ~/famtastic
git fetch origin claude/deal-engine-travel-deals-g9wyge
git checkout claude/deal-engine-travel-deals-g9wyge
cd deal-engine
```

Prefer a throwaway copy so nothing else is touched? Lift just this folder into a
standalone sandbox dir:

```bash
# from ~/famtastic on the branch above
git worktree add /tmp/deal-engine-sandbox claude/deal-engine-travel-deals-g9wyge
cd /tmp/deal-engine-sandbox/deal-engine
```

## 2. Isolate the runtime (optional but clean)

```bash
python3 -m venv .venv && source .venv/bin/activate
# no `pip install` needed — there are zero dependencies
```

## 3. Test it (one command)

```bash
./bin/deal-engine test
```

This runs the full offline self-test: seeds tasks, orchestrates them to
completion, asserts the queue drains, checks cost routing used multiple tiers
(with triage staying free), confirms every business deliverable was produced,
verifies the self-improvement loop ran, checks the sandbox path guard, and proves
the live model HTTP path against a local mock. Expect:

```
== 19/19 checks passed ==
SELF-TEST PASSED ✅
```

## 4. See it actually work

```bash
./bin/deal-engine demo        # seed -> orchestrate -> dashboard, end to end
open public/dashboard.html        # macOS  (xdg-open on Linux)
ls business/                      # the playbooks/deliverables it generated
cat logs/ORCHESTRATOR.log         # every decision it made
cat LEARNINGS.md                  # what it tuned about itself
```

Other entrypoints:
```bash
./bin/deal-engine verify              # just prove the live model path (mock)
./bin/deal-engine daemon              # run continuously, self-scheduling (Ctrl-C)
./bin/deal-engine mockmodel --port 11434   # run the mock model on its own
```

## 5. Flip on REAL models (still no spend by default)

The live HTTP path is already proven against the mock. To use a real model:

```bash
cp .env.example .env
# edit .env: set OPENROUTER_API_KEY=...  (and/or LOCAL_MODEL_URL for Ollama)
export DEAL_ENGINE_ALLOW_LIVE_CALLS=1     # the hard safety switch
./bin/deal-engine demo
```

Have a local model? Point it at Ollama and the free tier becomes truly free:
```bash
# with `ollama serve` running:
export LOCAL_MODEL_URL=http://localhost:11434/v1
export LOCAL_MODEL_NAME=llama3.1:8b
export DEAL_ENGINE_ALLOW_LIVE_CALLS=1
./bin/deal-engine demo
```

Any live-call error falls back to stub automatically, so it never breaks.

## 6. Clean up
```bash
deactivate 2>/dev/null            # leave the venv
rm -rf data/engine.db logs/*.log # reset state (or just `./bin/deal-engine seed --reset`)
git worktree remove /tmp/deal-engine-sandbox   # if you used a worktree
```

Nothing the system does ever escapes `deal-engine/` — see `SANDBOX.md`.
