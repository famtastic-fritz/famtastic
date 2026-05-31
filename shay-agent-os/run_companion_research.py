#!/usr/bin/env python3
"""
run_companion_research.py — Shay researches her OWN companion-app build, using
her pipeline (context_loader + parallel research + planning_loop), grounded in
the real shay-phone surface. Output → vault. Heartbeats → phone/Telegram.

Cap-safe: routes to Gemini (default brain gpt-5.5/Codex also caps).
Run detached:  nohup python3 run_companion_research.py &
"""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "components"))

from swarm import (WorkerPool, LocalSwarmDispatcher, load_policy,
                   context_loader, parallel, agent, planning_loop, ground_claim)
import notify

BRAIN = "gemini"  # cap-safe
LOG = Path(__file__).parent / "run_companion_research.log"
def log(m):
    line = f"[{time.strftime('%H:%M:%S')}] {m}"
    print(line, flush=True)
    LOG.open("a").write(line + "\n")

notify.heartbeat("companion-research", "Shay starting companion-app research (background, Gemini)")
log("=== Shay: companion-app research ===")

pool = WorkerPool(num_workers=4); pool.start(); pool.spawn_workers(4)
disp = LocalSwarmDispatcher(worker_pool=pool, policy=load_policy("balanced"))

# 1. DISCOVER — pull the companion PRD + phone state from the vault
ctx_prd = context_loader("companion app PRD instruction intake feedback self-update", k=4)
ctx_blackbox = context_loader("blackbox snapshot ledger update rollback multi-provider tool registry", k=3)
PHONE = "/Users/famtasticfritz/famtastic/shay-phone"
g_ep = ground_claim("count_matches", f"/api/|{PHONE}/server.py")
grounded = (f"- shay-phone/server.py exists; endpoint refs: {g_ep.get('value')}\n"
            f"- Existing API: /api/chat,capture,ask,asks,answer,dispatch,job/*,arc,ping\n"
            f"- PWA: web/index.html + arc.html + sw.js; monitoring spine notify.py (heartbeat/signoff/telegram)\n"
            f"- Gates for companion units: py_compile + server-boot /api/ping + node --check for JS")
log(f"discovered {len(ctx_prd)+len(ctx_blackbox)} chars; grounded endpoints")

# 2. PARALLEL RESEARCH — 4 angles
log("parallel research (4 angles)...")
def mk(q): return lambda: agent(q, disp, brain=BRAIN, tier="complex")
res = parallel([
  mk(f"Design /api/instruct: how Fritz sends an instruction from the phone and Shay's job runner picks it up. Build ON the existing /api/dispatch. Grounded:\n{grounded}"),
  mk(f"Design the feedback loop: /api/feedback (rating+note) -> ~/.shay/feedback.jsonl -> a nightly reflect that writes a vault lesson (Retain/Recall/Reflect). How does Shay measurably improve from it? Grounded:\n{grounded}"),
  mk(f"Design the self-update pipeline (steal blackbox-poc): tag commit, git pull --ff-only, py_compile, restart, poll /api/ping, auto-rollback on boot fail. Concrete steps for shay-phone. Context:\n{ctx_blackbox[:1500]}"),
  mk(f"Design the live heartbeat dashboard + sign-off inbox in the PWA reading /api/arc + /api/asks. What components, polling, badges. Grounded:\n{grounded}"),
], max_workers=4)
res = [r for r in res if r]
log(f"{len(res)}/4 angles complete")
blob = "\n\n---\n\n".join(f"### Angle {i+1}\n{r}" for i, r in enumerate(res))

# 3. SYNTHESIZE — gated plan
log("synthesizing companion build plan (planning_loop)...")
goal = ("Produce the concrete, ordered build plan for Shay's companion app (C1-C7 from the PRD), "
        "grounded in the real shay-phone surface, where each unit is a gated build step Shay can run "
        "through her own loop with the py_compile+boot gates.")
required = ["Vision", "Current State", "Unit Build Order", "Per-Unit Recipe",
            "Gates", "Feedback/Learning Loop", "Self-Update", "Risks"]
result = planning_loop(goal, disp, required_sections=required,
                       context=f"GROUNDED:\n{grounded}\n\nRESEARCH:\n{blob[:5000]}",
                       grounding_facts=grounded, brain=BRAIN, max_attempts=3)
log(f"planning_loop passed={result['passed']} chars={len(result['plan'])}")

out = Path.home()/"famtastic/obsidian/Shay-Memory/plans/COMPANION-research-shay-2026-05-31.md"
out.write_text(f"---\ntitle: Companion App — Shay's research-backed build plan\n"
               f"date: 2026-05-31\nauthor: shay-pipeline\ngate_passed: {result['passed']}\n"
               f"tags: [companion, shay-authored, research, prd]\n---\n\n{result['plan']}")
log(f"WROTE {out}")
pool.stop()
notify.heartbeat("companion-research", f"Shay DONE researching companion app — plan written (gate={result['passed']}, {len(result['plan'])} chars)")
log("=== done ===")
