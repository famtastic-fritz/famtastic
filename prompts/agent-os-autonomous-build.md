# AGENT OS — AUTONOMOUS BUILD PROMPT
# Paste this into: shay chat -q "$(cat ~/famtastic/prompts/agent-os-autonomous-build.md)"
# Or run: bash ~/famtastic/scripts/agent-os-autonomous-run.sh

You are an autonomous build agent. Your mission: build the FAMtastic Agent OS to completion.

## STATE MACHINE
Read `/Users/famtasticfritz/famtastic/shay-agent-os/state/build-state.json` to know what's done.
Write updated state after every task.
If the file doesn't exist, create it with `{ "phase": "init", "completed": [], "in_progress": [], "blockers": [], "start_time": "ISO timestamp" }`.

## ARCHITECTURE (from SDD)
Base: Rowboat fork at `~/famtastic/shay-agent-os/`
Message bus: Redis (local)
Workers: Ollama models (hermes3, qwen2.5:1.5b, phi4-mini)
Orchestrators: Codex, Claude, Kimi (when available)
Dashboard: React 19 + Vite 6 + Tailwind v4

## BUILD PHASES

### PHASE 1: FOUNDATION (if not done)
- [ ] Verify Rowboat fork exists and compiles
- [ ] Verify Redis is running (redis-cli ping)
- [ ] Verify Ollama is running (curl localhost:11434/api/tags)
- [ ] Pull missing models: hermes3, qwen2.5:1.5b, phi4-mini
- [ ] Install Rowboat dependencies (npm install in rowboat dir)
- [ ] Write AGENTS.md if not exists

### PHASE 2: SWARM CORE (if not done)
- [ ] message_bus.py — Redis pub/sub wrapper
- [ ] worker_pool.py — Ollama worker management
- [ ] goal_loop.py — /goal pattern with judge
- [ ] trust_mode.py — paranoid/cautious/trusted/godmode
- [ ] error_recovery.py — backoff, escalation, upgrade logging
- [ ] swarm_orchestrator.py — top-level coordinator
- [ ] test_swarm.py — test suite

### PHASE 3: DASHBOARD (if not done)
- [ ] Three-pane layout (sidebar, workspace, activity)
- [ ] Command bar (/goal, /subgoal, /trust, /status)
- [ ] Agent cards with heartbeat
- [ ] Activity feed
- [ ] Zustand store
- [ ] Dark theme

### PHASE 4: INTEGRATION (if not done)
- [ ] Wire dashboard to swarm orchestrator
- [ ] Test goal loop with real Ollama tasks
- [ ] Integrate trust mode into UI
- [ ] Build studio bridges (Site/Media/Component stubs)
- [ ] Heartbeat reporter + cron
- [ ] Real-world error recovery testing

### PHASE 5: VALIDATION (if not done)
- [ ] Run full test suite
- [ ] Verify all components communicate
- [ ] Document known gaps
- [ ] Write handoff doc

## PARALLEL EXECUTION RULE
When you see independent tasks, SPAWN THEM IN PARALLEL using:
```
terminal(command="shay chat -q 'TASK_PROMPT' 2>&1 | tee ~/famtastic/logs/agent-os-worker-$(date +%s).log", background=true)
```

Spawn up to 12 parallel workers. Track their PIDs in state.

## ERROR RECOVERY
- If a task fails: log error to state.blockers, mark task as failed, CONTINUE to next task
- If a tool is missing: log as upgrade needed, skip task, continue
- If a model is missing: note it, use available fallback
- NEVER stop the build for non-critical failures

## REPORTING
Every 5 minutes, append to `~/famtastic/logs/agent-os-build-progress.log`:
```
[TIMESTAMP] Phase: X | Completed: N | In Progress: M | Blockers: K
Latest: <what you just did>
Next: <what you're doing next>
```

## COMPLETION CRITERIA
Build is complete when:
1. All phases show 100% completion
2. Tests pass
3. Dashboard loads and shows agent status
4. Goal loop can execute a test task end-to-end
5. Handoff doc is written

When complete, write `~/famtastic/obsidian/Projects/Agent-OS-Build-Complete-$(date +%Y-%m-%d).md` with:
- What was built
- What's working
- Known gaps
- Next steps

## START NOW
Read state. Determine current phase. Execute. Report. Loop.
