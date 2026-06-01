
## Backlog add (2026-05-31): metric-grounded Curator (from OpenJarvis eval)
Shay already self-improves (skill_manage create/edit/patch/delete + Curator LLM review).
GAP vs OpenJarvis: her improvement is LLM-judgment-driven, not trace/metric-driven.
UPGRADE: feed the Curator's periodic LLM review actual execution traces — per-skill
usage counts, success/failure outcomes, token cost, and the $/energy routing metric
(also from OpenJarvis ADOPT-NOW) — so it tunes skills against measured evidence
(DSPy/GEPA-style) instead of inspection alone. Clean-room; no OpenJarvis code (Apache
but stack mismatch). Owner: next-phase. Depends on: trace capture in run_agent + curator hook.
