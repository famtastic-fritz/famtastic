# Agent Run Report Template

Use this template after each slice. The report should be short, concrete, and tied to proof.

```text
[RUN REPORT]
Project: FAMtastic Development
Branch:
Status: PASS | FAIL | BLOCKED

1. Slice:
2. Objective:
3. Files created:
4. Files modified:
5. Commands run:
6. Validation:
7. Fixed:
8. Added:
9. Proved:
10. Deferred:
11. Non-blockers:
12. Blockers:
13. Cost:
14. Commit hash:
15. Next action:
```

## Reporting Rules

- Do not claim completion without proof.
- State what the slice fixed, added, and proved.
- Classify deferred items as V1 required, V1 optional, or V2 backlog.
- If the slice is blocked, identify the hard blocker and stop.
- If no hard blocker exists, identify the next slice.
- Anything projected above `$50` must be marked as `BLOCKED` until Fritz approves.

