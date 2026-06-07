# Fork-Ownership Architecture — how to own a forked codebase forever

> Lead-architect answer to: "even if we forked and started over, how do you run a
> post-load script, and implement your changes as upgrades?" The pattern that separates
> a fork that rots from a fork you own forever: three layers, never hand-edit the middle.

## Core principle — three layers, never hand-edit upstream
```
vendor/      ← upstream, pulled as-is, treated as READ-ONLY
transform/   ← scripted post-load: brand + wire + apply overlay + apply patches
overlay/     ← YOUR code (extensions, agent-mgmt, your views) — physically separate
```
**Golden rule:** every change is either (a) an overlay file you own, or (b) a tracked
patch against upstream — NEVER a silent in-place edit. That discipline is what lets you
re-pull upstream without clobbering yourself.

## Anticipated structure
```
agent-workbench/
├── vendor/upstream-desktop/   # forked source + VENDOR.md (records exact upstream sha)
├── brand/brand.json + assets/ # identity as data
├── overlay/
│   ├── core/                  # gateway client, job store, event spine (shared desktop+cli)
│   ├── plugins/               # extensions (agent management lives here)
│   └── patches/               # numbered patch series for unavoidable upstream edits
├── cli/                       # Python/Typer
├── config/ + config/migrations/
└── scripts/                   # vendor-sync · postload · migrate · doctor
```

## Requirements → layers (classify every requirement, in this preference order)
1. **Take from upstream** (exact functionality) → `vendor/`. Don't reimplement.
2. **Transform via script** (unbranded + wiring) → `brand.json` + post-load. Data-driven.
3. **Add via overlay/plugin** (your extensions, esp. agent mgmt) → `overlay/`. No conflict.
4. **Patch upstream** (last resort) → `overlay/patches/`, one tracked patch per change + why.
Bias: push ~90% into bucket 3 (a plugin can't conflict with an upstream upgrade). Patching
upstream is the expensive lane — minimize it, keep every patch explicit.

## The post-load script — idempotent, fail-loud pipeline
Runs after you vendor; turns upstream into YOUR app. Running twice = same result; if
upstream moved under a patch, it STOPS with exactly which file/patch broke.
1. **verify** — confirm/record upstream sha in VENDOR.md
2. **debrand** — read brand.json → rewrite names/titles/icons/appId/bundleId/env-prefix
3. **wire** — inject gateway URL + data-home via config/env (never edit upstream logic)
4. **overlay** — drop in your core/ + plugins/
5. **patches** — `git apply` the numbered series; a patch that won't apply = HARD STOP
6. **validate** — build + doctor; no "done" without proof

## Changes as upgrades — two kinds, two mechanisms
- **New capability you own** → an **overlay/plugin**, semver'd independently. Upgrade = bump
  + re-run post-load. Additive, never conflicts.
- **Behavior change to upstream** → a **new patch in the series**. The patch series IS your
  living diff against upstream — explicit, reviewable, never lost. Upstream change in that
  area → patch fails loud → reconcile deliberately.
- **Config/DB shape change** → a **versioned, forward-only, idempotent migration**
  (`config_version`/`schema_version`). One `migrate` runs ALL migrations from zero on a
  new install, only PENDING ones on an existing install — same code path. That's how
  "update the settings we need" works for both fresh and existing users, no manual step.

## The repeatable upgrade loop
```
vendor-sync → git fetch upstream; cherry-pick the CHOSEN commits (source, not dependency); record sha
postload    → debrand + wire + overlay + patches (fail loud on conflict)
migrate     → run pending config/DB migrations
doctor+build→ prove it, then ship
```
You're never *on* upstream — take what you want, re-skin, re-apply overlay + patches,
migrate, verify.

## The elegant part
This machinery is identical whether you fork or build clean. Start-from-scratch just
deletes the `vendor/` + `patches/` layers — the `overlay/` + `migrate` + `postload`
pipeline is unchanged. So you don't have to decide fork-vs-rebuild up front, and you can
start forked then hollow out the vendor layer over time as you replace pieces with your own.

## License note (forks)
Keep the upstream LICENSE + attribution. De-brand the product (names/icons/strings/env),
not the legal notice.
