# Odysseus Workspace Optimization for Shay-Shay v2

Target: the self-hosted AI workspace at https://github.com/pewdiepie-archdaemon/odysseus.
Goal: make Odysseus the local execution + memory substrate for Shay-Shay v2 so that
heavy/private work runs locally and cloud spend is reserved for genuinely hard steps.

## What Odysseus gives us
- Local chat + local agent runs (cut cloud cost / keep data private).
- Deep research, model serving, document editing, memory/skills, email triage,
  notes/tasks, calendar — a full local workspace.

## Optimization plan
1. **Routing handoff:** Shay-Shay's router treats Odysseus-served local models as the
   *cheapest capable tier*. Triage, classification, summarization, and first-draft
   generation run locally; only hard reasoning escalates to cloud Claude.
2. **Memory bridge:** sync skills and semantic memory between Odysseus and the FAMtastic
   brain so a learning captured in either surface is recalled by both. One canonical
   store, two read paths.
3. **Email/notes/calendar:** wire Odysseus' triage to feed the Sense layer; the Prime
   Directive middleware still gates any outbound action.
4. **Skills parity:** mirror the FAMtastic skill catalog into Odysseus so "reuse before
   generate" works locally too.
5. **Sandbox discipline:** Odysseus runs in its own container; it never modifies the
   FAMtastic repo outside agreed sync paths.

## Integration checklist
- [ ] Stand up Odysseus locally (own container/env).
- [ ] Point Shay-Shay router's "local" tier at Odysseus' served model endpoint.
- [ ] Establish the bidirectional memory/skills sync.
- [ ] Route email/notes/calendar through the Sense layer with Prime Directive gating.
- [ ] Measure: % of steps served locally and the resulting cloud-spend reduction.

(Operational install/driving of a real instance is handled by the dedicated `odysseus`
operator agent; this doc is the optimization/integration design.)
