# Agent Inspiration Synthesis — Best-of-Eight → Shay-Shay v2

We studied eight notable agent systems and extracted the single strongest pattern from
each, then resolved conflicts into one coherent design. (Patterns are summarized from
general knowledge of these projects; validate specifics against current upstream docs
before implementing — logged as an assumption.)

| # | Agent | Signature strength | Adopted into Shay-Shay v2 |
|---|-------|--------------------|----------------------------|
| 1 | **Hermes agent** | Function-calling discipline / structured tool schemas | Strict typed tool contracts; reject malformed tool calls early |
| 2 | **Open Jarvis** | Always-on voice/ambient assistant loop | Optional ambient listener surface; wake-word gated, off by default |
| 3 | **Auto-GPT** | Autonomous goal decomposition | Bounded planner with a step budget (no unbounded loops) |
| 4 | **BabyAGI** | Task-list reprioritization loop | Dynamic re-prioritization of the queue by value/urgency |
| 5 | **AutoGen** | Multi-agent conversation / role debate | Adversarial-verify + judge panel for high-stakes answers |
| 6 | **CrewAI** | Role-based crews with clear responsibilities | Lane/role separation for parallel work (like this factory's lanes) |
| 7 | **OpenDevin/OpenHands** | Sandboxed code execution environment | All execution sandboxed; never touch host outside scope |
| 8 | **MemGPT/Letta** | Tiered memory with paging between context & store | The 4-tier memory model in the Shay-Shay v2 spec |

## Conflict resolution
- **Autonomy vs. safety:** Auto-GPT-style autonomy is capped by OpenHands-style
  sandboxing and a hard step/spend budget. Autonomy never wins over the Prime Directive.
- **Voice vs. focus:** Open Jarvis ambient mode is opt-in and wake-word gated so it
  doesn't add noise to focused CLI work.
- **Many agents vs. cost:** AutoGen/CrewAI multi-agent debate is reserved for
  high-stakes decisions; routine work stays single-agent on the cheap tier.

## Net stance
Take the *stringency* of each (typed tools, bounded loops, sandboxing, tiered memory,
adversarial verification) and combine them under one rule: **nothing supersedes Fritz.**
