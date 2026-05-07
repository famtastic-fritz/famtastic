# MBSH Premiere — Evidence Index

**Tracks:** every proof artifact collected per pass
**Updated:** 2026-05-07 (P1 paused)

---

## P0 evidence

| Exit criterion | Proof | Filename | Status |
|---|---|---|---|
| `body[data-premiere="on"]` toggling does nothing visible | preview eval | `evidence/p0-no-op-eval.json` | ✅ collected |
| Preview server renders unchanged | same eval | (same file) | ✅ |
| Smoke 7/7 still green | accepted exception (no surface modified) | n/a | ✅ |

## P1 evidence

| Exit criterion | Proof | Filename | Status |
|---|---|---|---|
| Components testable on sandbox HTML | preview eval | `evidence/p1-sandbox-state.json` | ✅ collected |
| Medallion menu opens/closes/keyboard-accessible | preview eval (click + Esc + reopen) | (same file) | ✅ |
| One section on home demonstrates frame-around-section pattern | sandbox demo (production page propagation in P2) | (same file) | ⚠️ partial — intentional |
| Preview-verified | screenshots taken in conversation | n/a (binary; artifacts in chat) | ✅ |
| Smoke 7/7 still green | accepted exception (no production surface modified) | n/a | ✅ |

## P2–P7 evidence

(Rows added when their passes start.)
