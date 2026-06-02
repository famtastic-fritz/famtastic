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

# THE MANDATE (was missing): clone AND exceed the Claude/ChatGPT/Codex phone
# apps, with every capability tied to SHAY's workflows (she has a desktop +
# agent-OS + vault + ralph build loop behind her — incumbents don't).
INCUMBENTS = (
  "Incumbent phone-app capabilities to MATCH then EXCEED: advanced/realtime VOICE, "
  "audio/photo/file ATTACHMENTS, ARTIFACTS/canvas, PROJECTS, WEB SEARCH, IMAGE GEN, "
  "CODE INTERPRETER, persistent MEMORY, home-screen WIDGETS, iOS LIVE ACTIVITIES / "
  "Dynamic Island, Apple WATCH app, SHARE-SHEET capture, Siri/App-Intents, push. "
  "SHAY's unfair advantages (use them to EXCEED): she drives a real build pipeline "
  "(ralph loop / build_app), does mid-run human-in-the-loop APPROVALS (ask flow), has "
  "persistent VAULT memory + learning loops, controls a DESKTOP + the Agent-OS, is "
  "BRAIN-AGNOSTIC (Claude/GPT/Gemini/Ollama, survives caps), self-updates, and emits "
  "heartbeats. The companion is a REMOTE CONTROL FOR SHAY, not a generic chatbot.")

# 2. PARALLEL RESEARCH — 4 angles (correct mandate)
log("parallel research (4 angles — clone+exceed incumbents, tied to Shay)...")
def mk(q): return lambda: agent(q, disp, brain=BRAIN, tier="complex")
res = parallel([
  mk(f"Build a CAPABILITY PARITY+EXCEED matrix: for EACH incumbent capability, give the Shay equivalent on the phone AND how Shay EXCEEDS it by tying it to her desktop/agent-OS/vault/build-loop. {INCUMBENTS}\nGrounded:\n{grounded}"),
  mk(f"WORKFLOW-TIE: map each phone capability to Shay's ACTUAL workflows — build dispatch (ralph/build_app), mid-run approvals (/api/ask), vault memory + learning, desktop control, agent-OS job monitoring, heartbeats — so the phone is a true remote control for HER. {INCUMBENTS}\nGrounded:\n{grounded}"),
  mk(f"BRAIN-AGNOSTIC architecture + build-ON path: how to add voice, attachments, artifacts, search, widgets, Live Activities, share-sheet to the EXISTING shay-phone (Python server + PWA) without vendor lock; what's a PWA-feasible subset vs needs-native. Self-update (blackbox-poc): tag/pull/py_compile/restart/poll/rollback. Context:\n{ctx_blackbox[:1200]}\nGrounded:\n{grounded}"),
  mk(f"TOP-10 ways Shay's companion BEATS the Claude/ChatGPT/Codex apps (the differentiators a generic chatbot can't match), each concrete and tied to her workflows. {INCUMBENTS}"),
], max_workers=4)
res = [r for r in res if r]
log(f"{len(res)}/4 angles complete")
blob = "\n\n---\n\n".join(f"### Angle {i+1}\n{r}" for i, r in enumerate(res))

# 3. SYNTHESIZE — gated plan
log("synthesizing companion build plan (planning_loop)...")
goal = ("Produce the build plan for a Shay companion phone app that CLONES then EXCEEDS the "
        "Claude/ChatGPT/Codex phone apps, with EVERY capability tied to Shay's real workflows "
        "(build dispatch, mid-run approvals, vault memory, desktop/agent-OS control, brain-agnostic, "
        "self-update, heartbeats). Build ON the existing shay-phone. Each unit is a gated build step "
        "(py_compile + server-boot + node --check) Shay can run through her own loop.")
required = ["Vision (clone+exceed)", "Capability Parity Matrix", "Workflow Ties",
            "Top-10 Differentiators", "Unit Build Order", "Per-Unit Recipe + Gates",
            "Brain-Agnostic + Self-Update", "Risks"]
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
