---
title: FAMtastic Designs cleanup latest
created: 2026-06-19 22:31:18+00:00
updated: 2026-06-19 22:31:18+00:00
status: partial
permalink: famtastic/01-shay-platform/reports/designs-cleanup-latest
---

# FAMtastic Designs duplicate-path cleanup report

- timestamp: 2026-06-19T22:31:18Z
- repo: `/Users/famtasticfritz/famtastic`
- canonical tree: `/Users/famtasticfritz/famtastic/sites/site-famtastic-designs`
- losing tree checked: `/Users/famtasticfritz/famtastic/famtastic-sites/famtastic-designs`

## What changed

1. Verified live filesystem truth before editing.
2. Confirmed the canonical tree already contains:
   - `sites/site-famtastic-designs/docs/DEPLOY-RUNBOOK.md`
   - `sites/site-famtastic-designs/.env.deploy.example`
3. Updated canonical deploy docs so they now use the canonical path and stop pretending the static-export pipeline already lives in the canonical tree.
4. Rewrote repo-level stale canonical references from `famtastic-sites/famtastic-designs` to `sites/site-famtastic-designs` where those references were presenting the losing path as truth.
5. Updated these tracked files:
   - `sites/site-famtastic-designs/docs/DEPLOY-RUNBOOK.md`
   - `sites/site-famtastic-designs/.env.deploy.example`
   - `CHANGELOG.md`
   - `SITE-LEARNINGS.md`
   - `plans/hosting-surface-audit-and-production-remediation-2026-06-19.md`
   - `obsidian/01-Shay-Platform/LATEST-BRIEFING.md`

## Losing directory disposition

- status: left in place
- reason: not safe to archive/delete yet

Why it was left in place:
- `famtastic-sites/famtastic-designs` is a separate nested Git repo on branch `main`
- it has uncommitted changes
- it contains unique content not present in the canonical tree, including `apps/web/`, deploy artifacts, and additional docs
- deleting or renaming it in this pass would risk destroying unique work

## Verification commands and results

### Filesystem truth
- Checked both candidate trees directly.
- Result: both directories exist; canonical tree is Drupal-root shaped, losing tree is a separate nested repo with Next/static-export work.

### Nested repo risk check
- Command: `git -C /Users/famtasticfritz/famtastic/famtastic-sites/famtastic-designs status --short --branch`
- Result: dirty nested repo on `main` with modified and untracked files.

### Stale-reference sweep
- Command: repo search for `famtastic-sites/famtastic-designs`
- Result: no remaining stale canonical-truth references in the canonical deploy docs.
- Remaining matches are intentional explanatory mentions documenting why the losing directory was not deleted.

### Canonical deploy-doc verification
- Verified `sites/site-famtastic-designs/docs/DEPLOY-RUNBOOK.md` exists and contains `/Users/famtasticfritz/famtastic/sites/site-famtastic-designs`
- Verified `sites/site-famtastic-designs/.env.deploy.example` exists and contains `/Users/famtasticfritz/famtastic/sites/site-famtastic-designs`
- Verified neither canonical file contains `famtastic-sites/famtastic-designs`

### Diff integrity
- Command: `git diff --check`
- Result: `DIFF_CHECK_OK`

### Plan audit
- Command: `node scripts/plans/audit.js`
- Result: `Verdict: ✅ clean`

### Git status
- Command: `git status --short --branch`
- Result:
  - branch: `feature/memory-to-intelligence`
  - modified tracked files only:
    - `CHANGELOG.md`
    - `SITE-LEARNINGS.md`
    - `plans/hosting-surface-audit-and-production-remediation-2026-06-19.md`

## Commit / push

- commit SHA: none
- push status: not pushed

Why no commit/push happened:
1. cleanup is only partial because the losing directory could not be safely archived or deleted honestly
2. the repo is currently on `feature/memory-to-intelligence`, not `main`
3. the requested `commit and push to upstream main` was not safe/obvious under current branch state and unresolved duplicate-tree migration risk

## Remaining blockers

1. The losing directory is not a disposable duplicate; it is a dirty nested repo with unique static-export work.
2. The static-export build lane has not been migrated into `sites/site-famtastic-designs`, so the canonical tree owns deploy-truth docs but not the rebuild pipeline.
3. A real completion pass still needs one of these outcomes:
   - migrate the unique Next/static-export lane into the canonical tree, then archive/delete the old tree safely
   - or archive the losing tree with explicit provenance after its dirty state is resolved

## Honest outcome

This run completed the safe doc-path cleanup and briefing/report sync.
It did **not** complete destructive duplicate-tree removal, because that would have been reckless against the live filesystem truth.