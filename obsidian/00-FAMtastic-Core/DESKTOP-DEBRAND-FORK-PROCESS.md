---
title: DESKTOP-DEBRAND-FORK-PROCESS
type: note
permalink: famtastic/00-famtastic-core/desktop-debrand-fork-process
---

# Desktop — Fork-and-Debrand: the repeatable process

> Plain and simple. An "exact copy of the hermes desktop, unbranded, in a new repo" is a
> **fork + a scripted de-brand**, NOT a rebuild. Rebuilding can't reproduce all that
> functionality; forking does. The key is making the de-brand a re-runnable SCRIPT so you
> can refresh from a newer upstream anytime. No conceptual rabbit-holes — this is mechanical.

## THE PROCESS (each step re-runnable)
1. **New repo + vendor the source.** Create `shay-desktop` (your name). Copy the latest
   hermes desktop source in as **your own code** — no upstream *runtime* dependency. Add
   upstream only as a `source` git remote for later cherry-picks. Commit as your baseline.
   **KEEP the upstream LICENSE + attribution** — you de-brand the *product* (name/icons/UI),
   never the legal notice. (Hermes repos are OSS — likely MIT/Apache; verify the license.)
2. **Brand as data.** One file, `brand.json`:
   `{ name, shortName, productName, appId, bundleId, envPrefix, accent, iconPaths }`.
   That file IS your identity — change it, re-run the script, done.
3. **The de-brand script** (`scripts/debrand.mjs`) — the repeatable core. Reads
   `brand.json` and transforms the vendored tree: product/window titles + strings, swap
   icons, set `appId`/`bundleId` **in source (or an electron-builder `afterPack`)** so the
   rename doesn't orphan the wired bundle (per the desktop review's W1 finding), and rename
   the `HERMES_*` env prefix → your prefix. **Idempotent** — `npm run debrand` any time.
4. **Wire to the core.** Point the (renamed) env vars at your gateway/home. The desktop is
   already a zero-fork env client — this is config, not surgery. `doctor` verifies it.
5. **Extend — the agent-management seam (your priority).** Add the plugin contract from the
   tooling research (Obsidian model: flat `plugin.json` manifest + `onload(app)`, in-process
   behind a **narrow HostAPI**). Expose an **`agents` surface** in HostAPI (register agent
   type / controls / status) so you grow agent management **without forking core**.
6. **Build + install.** `npm install && npm run build` → the app. A `shay init` / installer
   script is the **new-user install flow** (clone → debrand → wire → build, one command).

## TO REFRESH FROM A NEWER UPSTREAM (the repeat)
`git fetch source` → review → **cherry-pick the commits you want** → `npm run debrand` →
rebuild. You're never *on* upstream — you take what you want and re-skin it. That's the
whole repeatable loop, and it's the "source, not dependency" decision in action.

## THE CLI (more flexibility — but keep `--help`)
- **Own it: Python Typer** (per the tooling decision). `--help` is auto-generated for every
  command for free. Same gateway/home as the desktop. Keep daily verbs small; settings live
  in the TUI/config, not a command sprawl.
- Or keep the existing `shay` CLI, de-branded by the same script. Either way: **fully
  connected to the same core as the desktop** (one brain, one home).

## THE ONE MUST-DO (honest)
Respect the upstream license. De-branding the **product** (name, icons, window titles,
env prefix) is fine and normal for a fork. **Keep `LICENSE` + the copyright/attribution.**
You're re-skinning and owning the operation — not erasing authorship.

## OUT OF SCOPE (your call)
Android. And no conceptual detours — values are settled; this is execution.