# Research

Inputs came from the prior Wave 1 implementation plus the Mercury/Ruflo evaluation.

Findings carried into this wave:
1. Ruflo's capability witness pattern is useful as append-only local verification history with per-capability baselines.
2. Mercury's autopilot loop detection is useful when reduced to deterministic metrics rather than opaque heuristics.
3. Existing Data Center and second-brain surfaces are the right integration points; capture intake must remain the authoritative raw layer.
4. This wave can stay fully local by using smoke checks and existing test commands instead of provider calls.
