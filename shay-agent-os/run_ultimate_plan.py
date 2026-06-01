#!/usr/bin/env python3
"""
run_ultimate_plan.py — Shay researches + maps the ULTIMATE Shay Desktop + Agent-OS plan.

Uses HER pipeline, gated:
  1. context_loader / vault_search → discover what's been done + read the plans
  2. parallel research agents → multiple angles at once (multi-process)
  3. planning_loop → grounded, completeness-gated synthesis (won't truncate/hallucinate)
  4. write a ralph/gsd-style PRD to the vault, ready to hand to the autonomous build loop
"""
import sys, time, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent)); sys.path.insert(0,str(Path(__file__).parent/"components"))

from swarm import (WorkerPool, LocalSwarmDispatcher, load_policy,
                   context_loader, vault_search, parallel, agent,
                   planning_loop, ground_claim)
from swarm.brain_client import BrainAvailabilityCheck

LOG=[]
def log(m):
    line=f"[{time.strftime('%H:%M:%S')}] {m}"; print(line,flush=True); LOG.append(line)
    (Path(__file__).parent/"run_ultimate_plan.log").write_text("\n".join(LOG))

log("=== SHAY: research + map the ULTIMATE Desktop + Agent-OS plan ===")

pool=WorkerPool(num_workers=4); pool.start(); pool.spawn_workers(4)
dispatcher=LocalSwarmDispatcher(worker_pool=pool, policy=load_policy("balanced"))
BrainAvailabilityCheck(dispatcher._brain)

# 1. DISCOVER — pull the existing plans/lessons from her own vault
log("Step 1: discovering prior work from the vault...")
ctx_desktop = context_loader("ultimate shay desktop plan screens routing build", k=4)
ctx_orch    = context_loader("self orchestration swarm agent os plan phases", k=4)
ctx_gaps    = context_loader("desktop gap analysis what works what is stub", k=3)
ctx_lessons = context_loader("build lessons surgical edit two gate harness", k=3)
discovered = "\n\n".join([ctx_desktop, ctx_orch, ctx_gaps, ctx_lessons])
log(f"  discovered {len(discovered)} chars across 4 vault queries")

# 2. GROUND — real facts about current state (no guessing)
APP="/Users/famtasticfritz/famtastic/shay-desktop-electron"
g_screens = ground_claim("list_dir", f"{APP}/src/renderer/src/screens")
g_ipc = ground_claim("count_matches", f"invoke|{APP}/src/preload/index.ts")
grounded = (f"- Desktop screens ({g_screens.get('count')}): {g_screens.get('value')}\n"
            f"- preload IPC invoke calls: {g_ipc.get('value')}\n"
            f"- Routing today: only Chat ('main') + Soul/Models just wired via nav view\n"
            f"- Proven build method: build_app/surgical_patch + typecheck gate + runtime render gate + rollback\n"
            f"- Agent-OS swarm lives in shay-agent-os/components/swarm/ (brain_client, goal_loop, dispatcher, pipeline)")
log(f"  grounded: {g_screens.get('count')} screens, {g_ipc.get('value')} IPC calls")

# 3. PARALLEL RESEARCH — 4 angles at once (multi-process)
log("Step 2: parallel research (4 angles simultaneously)...")
def mk(q):
    return lambda: agent(q, dispatcher, brain="claude", tier="complex")
research = parallel([
  mk(f"Based on this prior work, list the COMPLETE set of screens/surfaces the ultimate Shay Desktop must have to be a daily-driver command center (chat + the 20 screens + agent-OS control). Prior work:\n{discovered[:3000]}"),
  mk(f"Define what 'Agent-OS as part of the desktop' concretely MEANS: what control surfaces (dispatch jobs, watch swarm, approve, policies, live agent tree) must exist, wired to shay-agent-os. Grounded facts:\n{grounded}"),
  mk(f"Given the proven build method (build_app/surgical_patch + 2 gates + ralph-loop), describe HOW the ultimate desktop gets built screen-by-screen: the per-unit recipe and the order. Lessons:\n{ctx_lessons[:1500]}"),
  mk(f"List the integration/wiring work beyond screens: nav routing trigger, the 5 unregistered gateway routers, window.shay namespace, right-panel content, sessions persistence. From the gap analysis:\n{ctx_gaps[:1800]}"),
], max_workers=4)
research=[r for r in research if r]
log(f"  {len(research)}/4 research angles complete")
research_blob="\n\n---\n\n".join(f"### Angle {i+1}\n{r}" for i,r in enumerate(research))

# 4. SYNTHESIZE — gated planning_loop produces the complete mapped plan
log("Step 3: synthesizing the complete mapped plan (planning_loop, gated)...")
goal=("Produce the COMPLETE, MAPPED build plan for the ULTIMATE Shay Desktop + Agent-OS "
      "command center, ready to hand to an autonomous ralph-style build loop. It must be "
      "grounded in the real current state, cover every screen + agent-OS surface, and give a "
      "numbered build order where each unit is a concrete gated build step.")
context = (f"GROUNDED CURRENT STATE:\n{grounded}\n\nDISCOVERED PRIOR PLANS:\n{discovered[:2500]}\n\n"
           f"PARALLEL RESEARCH FINDINGS:\n{research_blob[:4000]}")
required=["Vision","Current State","Screen & Surface Inventory","Agent-OS Integration",
          "Build Order","Per-Unit Recipe","Acceptance Criteria","Risks"]
result=planning_loop(goal, dispatcher, required_sections=required, context=context,
                     grounding_facts=grounded, brain="claude", max_attempts=3)
log(f"  planning_loop: passed={result['passed']} attempts={result['attempts']} chars={len(result['plan'])}")

# 5. WRITE the PRD to vault
out=Path.home()/"famtastic/obsidian/Shay-Memory/plans/ULTIMATE-desktop-agentos-plan-2026-05-30.md"
out.write_text(f"---\ntitle: ULTIMATE Shay Desktop + Agent-OS — Build Plan (Shay-authored)\n"
               f"date: 2026-05-30\nauthor: shay-pipeline\ngate_passed: {result['passed']}\n"
               f"tags: [ultimate, desktop, agent-os, ralph-ready, prd]\n---\n\n{result['plan']}")
log(f"\nWROTE: {out}")
log(f"GATE PASSED: {result['passed']} | sections required: {len(required)}")
pool.stop()
log("=== done ===")
print("\n\n========== PLAN PREVIEW (first 2500 chars) ==========\n")
print(result['plan'][:2500])
