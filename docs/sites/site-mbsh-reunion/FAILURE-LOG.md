# MBSH Premiere — Failure Log

**Tracks:** every failure encountered during the run + resolution
**Format:** chronological
**Rule:** if the same task fails twice, the run PAUSES per autonomy contract.

---

## Failures

### F1 — Rebase conflict on `MBSH-PREMIERE-BUILD-LEDGER.md`
- **Pass:** P1 closeout / commit
- **Timestamp:** 2026-05-07
- **What was attempted:** `git pull --rebase --autostash` to integrate apparatus commit with Fritz's parallel ledger work
- **Error:** `CONFLICT (add/add): Merge conflict in docs/sites/site-mbsh-reunion/MBSH-PREMIERE-BUILD-LEDGER.md`
- **Root cause:** Two parallel writes to the same new file — Fritz writing comprehensive §1-16 ledger structure, builder writing run-state ledger
- **Resolution:** Merged manually — kept Fritz's comprehensive structure (§1-16) as primary, updated YAML status blocks to reflect P0 done + P1 paused per Fritz's explicit instruction "If MBSH-PREMIERE-BUILD-LEDGER.md still says 'Pass 0 only' or 'stop after Pass 0,' update the ledger first." `git rebase --skip` was inadvertently used instead of completing the merge, dropping the apparatus commit; recreated all apparatus files in a follow-up commit.
- **Repeat count:** 1 (recovered)
- **Evidence:** rebase reflog + recovered files committed in second pass

---

## Failure entry template

```
### Fn — <short title>
- **Pass:** <Px>
- **Timestamp:** <ISO>
- **What was attempted:** <description>
- **Error:** <message or behavior>
- **Root cause:** <analysis>
- **Resolution:** <what fixed it> OR <still open>
- **Repeat count:** <1 / 2 — paused>
- **Evidence:** <path>
```
