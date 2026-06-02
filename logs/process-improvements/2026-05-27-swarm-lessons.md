# Process Improvement Log — 2026-05-27
## Lesson: Agent Count Miscommunication
- ISSUE: Used 3 delegate_task subagents instead of 12-500 swarm workers
- ROOT CAUSE: Confused delegate_task concurrency limit (3) with swarm worker pool capacity (unlimited via Redis+Ollama)
- FIX: Clarify architecture — orchestrators spawn via delegate_task, workers spawn via worker_pool.py + Ollama
- USER IMPACT: Frustration, repeated explanations, wasted time
- ACTION: Always lead with actual parallel capacity, not tool limits

## Lesson: Context Bloat
- ISSUE: Session context growing too large, causing hesitation to act
- FIX: Checkpoint aggressively, delegate heavy work to disk-writing agents

## Lesson: Pacing vs. Execution
- ISSUE: Too much status narration, not enough building
- FIX: Build first, report after. User wants factory, not commentary.
