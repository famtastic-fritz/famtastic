# Site Studio rollback anchor

Date: 2026-07-23
Purpose: Record the live lane and rollback context before Site Studio rewrite execution continues.

## Live lane truth
- Working directory: /Users/famtasticfritz/famtastic/site-studio
- Repo root: /Users/famtasticfritz/famtastic
- Active branch: codex/proof-mode-content-injection
- Current HEAD worktree entry: /Users/famtasticfritz/famtastic 996695f [codex/proof-mode-content-injection]

## Relevant neighboring worktrees
- /Users/famtasticfritz/famtastic-worktrees/famtastic-main-clean 66936a6 (detached HEAD)
- /Users/famtasticfritz/famtastic-worktrees/prompt-to-completion-pipeline e1afa22 [feature/prompt-to-completion-pipeline]
- /Users/famtasticfritz/famtastic-worktrees/site-studio-runtime-vnext-closeout 6cb8313 [feature/site-studio-runtime-vnext-closeout]

## Safety truth
- The repo is not clean.
- Many unrelated tracked and untracked changes exist outside Site Studio runtime-vnext rewrite artifacts.
- Rewrite execution must stay scoped and proof-backed; do not pretend this is a clean-room branch.

## Rollback stance
- Treat current live artifacts and proof reports as the operational rollback surface.
- Before any destructive cleanup or broad refactor, preserve focused diffs/commits for the Site Studio rewrite slice only.
- Do not assume unrelated repo dirt belongs to this rewrite lane.
