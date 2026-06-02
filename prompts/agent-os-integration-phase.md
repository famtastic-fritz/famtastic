# AGENT OS — AUTONOMOUS INTEGRATION PROMPT
# Paste everything below this line into: shay chat -q "$(cat ~/famtastic/prompts/agent-os-integration-phase.md)" --yolo
# Monitor with: tail -f ~/famtastic/logs/agent-os-integration-$(date +%Y%m%d).log
# Check state: cat ~/famtastic/shay-agent-os/state/build-state.json

You are the master integration agent for the FAMtastic Agent OS. This is an autonomous run — complete all remaining work without asking the user for input. Log everything. Handle blockers by noting and skipping them.

## STATE
Read `/Users/famtasticfritz/famtastic/shay-agent-os/state/build-state.json` now. This tells you what's built and what remains.

Current remaining tasks (verify against state):
1. Wire dashboard to swarm orchestrator (API/WebSocket layer)
2. Test goal loop end-to-end with real Ollama tasks
3. Integrate trust mode UI into dashboard
4. Build studio bridge stubs (Site/Media/Component)
5. Heartbeat reporter + cron autonomous run
6. Error recovery testing with real failures
7. Run full test suite

## PARALLEL STRATEGY
Independent tasks that can run simultaneously:
- Tasks 1 + 4 + 5 (different codebases)
- Tasks 2 + 6 + 7 (testing/validation)
- Task 3 depends on Task 1

Spawn parallel workers using:
```
terminal(command="shay chat -q 'WORKER_PROMPT' --yolo 2>&1 | tee ~/famtastic/logs/integration-worker-TASK.log", background=true)
```

## WORKER PROMPTS

### Worker 1: API/WebSocket Layer
```
Build an API layer in ~/famtastic/shay-agent-os/api/ that connects the React dashboard to the Python swarm orchestrator.

Requirements:
- FastAPI or Express server
- /api/agents GET — list agents from SwarmOrchestrator
- /api/tasks GET/POST — task management
- /api/events GET — WebSocket stream for real-time feed
- /api/trust GET/PUT — trust mode query/set
- /api/heartbeat POST — agent heartbeat
- CORS enabled for dashboard on port 5174
- Port: 8643 (don't conflict with Shay gateway on 8642)

Files to create:
- api/server.py (or server.ts)
- api/routes/agents.py
- api/routes/tasks.py
- api/routes/events.py
- api/routes/trust.py
- api/websocket.py (WebSocket event stream)

Log to: ~/famtastic/logs/integration-worker-api.log
```

### Worker 2: Studio Bridge Stubs
```
Build bridge stubs in ~/famtastic/shay-agent-os/bridges/ that let the Agent OS call FAMtastic studios.

Requirements:
- site_bridge.py — API to call fam-hub site commands
- media_bridge.py — API to call media generation tools
- component_bridge.py — API to call component studio
- Each bridge has: validate_input(), execute(), get_status()
- Log bridge calls to state
- Fail gracefully if studio not available

Files to create:
- bridges/__init__.py
- bridges/site_bridge.py
- bridges/media_bridge.py
- bridges/component_bridge.py
- bridges/base_bridge.py (shared interface)

Log to: ~/famtastic/logs/integration-worker-bridges.log
```

### Worker 3: Heartbeat Reporter + Cron
```
Build a heartbeat reporter in ~/famtastic/shay-agent-os/reporter/ and cron job config.

Requirements:
- reporter/heartbeat.py — monitors agent health every 30s
- reporter/status_reporter.py — writes status to dashboard
- reporter/blocker_detector.py — detects stuck agents
- logs to ~/famtastic/shay-agent-os/logs/heartbeat.log
- Cron config in ~/famtastic/shay-agent-os/cron/autonomous-run.yaml
  - Runs every 5 minutes
  - Checks build progress
  - Escalates blockers after 3 failures
  - Can be paused/resumed

Files to create:
- reporter/__init__.py
- reporter/heartbeat.py
- reporter/status_reporter.py
- reporter/blocker_detector.py
- cron/autonomous-run.yaml

Log to: ~/famtastic/logs/integration-worker-reporter.log
```

### Worker 4: End-to-End Testing
```
Test the Agent OS end-to-end in ~/famtastic/shay-agent-os/tests/e2e/.

Requirements:
- Test goal loop with real Ollama tasks
  - Submit a goal: "Sort a list of numbers"
  - Verify worker executes and returns result
  - Verify goal loop marks complete
- Test error recovery
  - Inject a failing task
  - Verify retry + escalation
- Test trust modes
  - supervised: verify approval required
  - autonomous: verify runs without approval
- Run: cd ~/famtastic/shay-agent-os && python3 -m pytest tests/ -v
- Report pass/fail for each test

Files to create:
- tests/e2e/test_goal_loop.py
- tests/e2e/test_error_recovery.py
- tests/e2e/test_trust_mode.py

Log to: ~/famtastic/logs/integration-worker-tests.log
```

## EXECUTION ORDER
1. Spawn Workers 1, 2, 3 in parallel (background=true)
2. Wait for Worker 1 to finish
3. Spawn Worker 4 (needs API layer)
4. Add trust mode UI once Worker 1 API is ready:
   - Edit dashboard useDashboardStore to add trust mode
   - Add trust mode selector component
   - Wire to /api/trust endpoint

## LOGGING
Append to ~/famtastic/logs/agent-os-integration-$(date +%Y%m%d).log every 5 minutes:
```
[TIMESTAMP] Master Integration Agent
Phase: integration
Workers active: N
Completed: [list]
In Progress: [list]
Blockers: [list]
Next: <specific next step>
```

## COMPLETION
When all 7 tasks are done:
1. Run full test suite: cd ~/famtastic/shay-agent-os && python3 -m pytest tests/ -v
2. Update build-state.json: set status to "complete", phase to "production_ready"
3. Write handoff: ~/famtastic/obsidian/Projects/Agent-OS-Build-Complete-$(date +%Y-%m-%d).md
4. Notify user by writing to: ~/famtastic/logs/BUILD_COMPLETE_NOTIFICATION.txt

## BLOCKER POLICY
- If a task fails: log error, add to blockers, skip, continue
- If a tool is missing: note upgrade needed in state
- If a model is missing: use available fallback
- NEVER stop the entire build for one failed task
- After 3 failures on same task, escalate to human via notification file

## START NOW
Read state. Spawn workers. Track. Update. Complete.
