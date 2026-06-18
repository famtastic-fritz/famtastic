# LEARNINGS.md — the factory's self-review journal

Each batch, `self_improve.review_and_tune()` appends a section below: what the
batch did (success rate, cost, latency, model mix) and which config knobs it
turned in response, with the reason. This is the human-readable companion to
`config.json → tuning_history`.

The knobs it may turn (and only these): `concurrency`,
`routing.complexity_threshold`, `poll_interval_seconds` — each clamped to the
bounds in `config.json`. Core logic is never modified.

<!-- batch entries are appended below this line -->
