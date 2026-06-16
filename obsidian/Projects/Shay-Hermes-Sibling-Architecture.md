---
title: Shay-Hermes-Sibling-Architecture
type: note
permalink: famtastic/projects/shay-hermes-sibling-architecture
---

# Shay-Shay & Hermes: Sibling Architecture

## Philosophy

**Hermes stays. Shay-Shay is a sibling, not a replacement.**

They serve different roles:
- **Hermes** = CLI-first, terminal-native, text-only. Your coding companion, git wrangler, file surgeon. Stays minimal.
- **Shay-Shay** = Ambient, context-aware, multi-modal (Desktop + CLI + Voice). Your AI Boss, orchestrator, systems operator. Expansive.

Trying to merge them into one codebase guarantees both suck. Keep them distinct, let them share via IPC and shared state.

## Separation of Concerns

| Concern | Hermes | Shay-Shay |
|---------|--------|-----------|
| Interface | CLI only | Desktop + CLI + Voice |
| Context | Explicit (what you feed it) | Implicit (ambient awareness) |
| Agents | Single-threaded | Multi-agent, parallel swarms |
| Memory | Per-session | Persistent, cross-session |
| Personality | Helpful assistant | AI Boss, takes charge |
| Updates | Homebrew formula | Independent desktop app |
| Site Studio | No | Yes (integrates with FAMtastic) |
| Obsidian | Basic | Deep integration |
| Agent OS | No | Yes (orchestration layer) |

## Shared Infrastructure

Both can mount the same runtime layer without conflict:

```
~/.shay/
├── hermes/          # Hermes state, history, config
│   ├── history/
│   ├── config.yaml
│   └── sessions/
├── shay-shay/       # Shay-Shay state
│   ├── context/     # Ambient snapshots
│   ├── agents/      # Running agent processes
│   ├── orchestration/  # Agent OS state
│   └── config.yaml
├── shared/          # Shared between both
│   ├── checkpoint/  # Session checkpoints (new system)
│   ├── obsidian/    # Obsidian vault integration
│   └── state/       # Cross-system state
└── tools/           # Both can use
    ├── checkpoint_save.py
    ├── desktop_diagnostic.py
    └── ambient_reporter.py
```

## Communication Protocol

Hermes and Shay-Shay communicate via:

1. **Shared state files** in `~/.shay/shared/state/` (JSON, atomic writes)
2. **IPC socket** at `~/.shay/shared/hermes-shay.sock`
3. **Obsidian vault** as human-readable audit log

```
# Hermes can see Shay-Shay context
shay context --peek    # Read ambient snapshot
shay agent --list      # See running agents
shay session --status  # Check checkpoint state

# Shay-Shay can delegate to Hermes
hermes --task "fix git merge conflict"
hermes --task "refactor this function"
```

## Update Strategy

**Independent release cycles.**

- Hermes: Homebrew formula, rapid CLI updates
- Shay-Shay: Desktop app auto-updater, quarterly releases
- Shared layer: Versioned, both declare dependency range

## Desktop Fix: Office Tab

The Office tab in Shay Desktop loads Claw3D at `http://localhost:3000/office`.
Problem: Desktop tries to **spawn** Claw3D on Office tab click, but Claw3D already runs independently.

**Fix options:**
1. **Detect running** — Check port 3000 before spawning. If alive, just navigate tab. ✓ Fastest
2. **Dedicated port** — Move Claw3D to port 3001, desktop spawns on 3000. ✓ Clean isolation
3. **Embed as webview** — Don't spawn server, embed Claw3D build. ✓ Most robust

Chosen: **Option 1 for now** (patch desktop's office handler to detect port first).

## Migration Path

Current state: Partial rebrand. References to `hermes` still in IPC handlers.

Steps:
1. Fix remaining `hermes` binary references in desktop ✓ (done today)
2. Make IPC handlers use dedicated `shay-desktop` config namespace
3. Extract shared runtime into `~/.shay/shared/`
4. Create `shay-cli` binary that wraps shay-py but with shay-shay branding
5. Keep `hermes` binary as thin shim: `hermes = legacy mode, shay = full mode`

## Vision: The Dual-Agent Stack

```
┌─────────────────────────────────────────────┐
│            FAMtastic Ecosystem              │
│   Site Studio    Media Studio    Agent OS   │
├─────────────────────────────────────────────┤
│              Shay-Shay Layer                │
│  Desktop App + Ambient Agent + Orchestrator │
│  Context-aware, multi-agent, visual-first   │
├─────────────────────────────────────────────┤
│              Hermes Layer                   │
│  CLI-only, fast, terminal-native            │
│  Coding, git, file ops, simple queries      │
├─────────────────────────────────────────────┤
│              Shared Runtime                 │
│  Checkpoints, Obsidian, State, Config       │
└─────────────────────────────────────────────┘
```

**Hermes is your terminal whisperer. Shay-Shay is your AI Boss.** Both exist, both serve you, neither replaces the other.