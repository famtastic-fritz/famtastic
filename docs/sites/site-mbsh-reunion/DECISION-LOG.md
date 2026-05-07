# MBSH Premiere — Decision Log

**Extends:** V3 §8 (decisions D1–D16) with run-time decisions made during execution
**Last updated:** 2026-05-07 (P1 paused)

| ID | Decision | Options | Chosen | Why | Rejected | Status |
|---|---|---|---|---|---|---|
| (D1–D16 from V3 §8 — see PREMIERE-EXPERIENCE-V3-PLAN-2026-05-07.md) | | | | | | |
| **R1** | P0 starting point | Reset branch to main, Continue on `feat/premiere-theme` at `1386d17` | Continue at `1386d17` | V3 §8 calls out elements to KEEP — resetting would lose all of that work | Reset to main | Closed |
| **R2** | Run apparatus location | mbsh-reunion repo, famtastic repo | famtastic repo | Existing planning docs already live there; closeouts should be discoverable next to plans | deploy repo | Closed |
| **R3** | When to flag GEMINI_API_KEY block | Now (P0 ledger), at P3, at P4 | At P0 ledger as known constraint, P3 confirms or escalates | Visibility upfront prevents surprise | Surface at P3 only | Closed |
| **R4** | D9 per-page video assignment | Skip existing MP4s, Use `02-rebuilt-school-push-in.mp4` on Through-Years, Use multiple | Use 02 on Through-Years; others stay CSS | Resource-efficient; surfaces an unused asset | Multiple, Skip | Closed (default proposal accepted) |
| **R5** | D10 Memorial audio | Omit, Opt-in only | OMIT | Reverence over ornament; brief AVOID list says no autoplay anyway | Opt-in | Closed (default proposal accepted) |
| **R6** | D11 Memorial candle / dove SVG | Skip, Add candle, Add dove | SKIP | Starfield + moon is already the visual; candle would overcomplicate | Candle, Dove | Closed (default proposal accepted) |
| **R7** | D15 Medallion size per page | Single size, Brand-mark on home + 70% inner | Brand-mark on home, 70% scale on inner pages | Home is the "presence" moment; inner pages need accessible but not dominating | Single size | Closed (default proposal accepted) |
| **R8** | Open D4 / D5 / D8 disposition | Decide now, Build prototype + pause for Fritz | Build prototype + pause for Fritz | These are headline visual decisions; prototype proves intent better than spec | Decide-now | Closed |
| **R9** | P1 surface | Build into production HTMLs, Build sandbox-first | Sandbox-first | Matches V3 §7 learning loop; gives Fritz isolated review target; production stable | Direct propagation | Closed |
| **R10** | Medallion radial menu arc | Fixed arc, Anchor to medallion position | Anchor to medallion position via `--menu-cx/cy` CSS vars set on open | Right behavior regardless of medallion placement | Fixed arc | Closed |
| **R11** | Closeout file naming | `Px-2026-05-07.md` (date-stamped), `PASS-X-CLOSEOUT.md` (canonical) | `PASS-X-CLOSEOUT.md` per Fritz ledger §6 convention | Aligns with Fritz's ledger naming; supports single canonical closeout | Date-stamped | Closed |
| **R12** | P1 disposition (D4 / D5 / D8) | Block-pending-approval, Provisional approval + carry-forward polish | Fritz: provisional approval — keep momentum; do not stay stuck in sandbox review | "I do not want to stay stuck in sandbox review. Keep momentum and continue the build. Treat this as provisional approval of the P1 foundation, with polish notes carried forward." | Block | Closed (Fritz, 2026-05-07) |
| **R13** | D4 polish carry-forward | Apply now in P1, Defer to P2 lightweight tweak, Defer to P5 | Defer to P5 polish candidate (with optional lightweight P2 win) | Fritz: "Do not overwork this in P1. Carry it as a P5 polish candidate unless there is a lightweight improvement during P2." Lightweight P2 idea: "SCENE 0X" slate badge on poster cards. P5 candidate: bend/curve film strips, add perspective/depth, make content feel like zoomed-in cinematic reel detail rather than flat straight dividers. | Apply-now in P1 | Closed (Fritz, 2026-05-07) |
| **R14** | Drift guard | Allow taste drift, Maintain "do not drift cheap or generic" gate | Maintain quality gate | Fritz: "Do not let the design drift cheap or generic. We can refine after seeing the full experience in context." | Allow drift | Closed (Fritz, 2026-05-07) |
| **R15** | P2/P3 sequencing | P2-then-P3-then-P4 sequential, Parallel | Sequential — P2 ship first (existing assets + fallbacks), then P3 generation, then P4 integration | Per Design Map §0 + autonomy contract; P3 unblock confirmed earlier today | Parallel | Closed (autonomy continuation) |

---

## Run-time decisions (added as the run progresses)

Each closed decision references the pass that made it and any evidence file.
