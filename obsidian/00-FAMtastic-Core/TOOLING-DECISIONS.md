# Shay Ecosystem — Tooling Decisions (Phase 0 research, 2026-06-07)

> Produced by a 6-agent cheap research swarm (Sonnet) with adversarial fact-checking.
> This is the seed for the new repo's `docs/TOOLING-DECISIONS.md` — the build agent
> starts with the stack chosen instead of researching first. Confidence note at the end:
> several exact benchmark figures came from search snippets (some sources 403'd direct
> fetch) — treat numbers as directional, conclusions as solid (consistent across sources).

## The coherent stack (one-glance)
| Layer | Pick | Why |
|---|---|---|
| **CLI + TUI** | **Python — Typer/Click + Textual** | zero language boundary with the Python agent runtime |
| **Desktop shell** | **Tauri v2** | 3–10 MB vs Electron's 85–150 MB; thin Rust over a web frontend |
| **Local serving** | **Ollama 0.19+ (MLX backend)** | easiest OpenAI-compat server; ~2× faster on MLX |
| **Embeddings** | **nomic-embed-text** (via Ollama) / fastembed (Python) | $0, on-device, 8192-ctx, served by the Ollama you already run |
| **Vector store** | **LanceDB** (embedded, Python SDK) | in-process, no server, multi-language SDK |
| **Plugins** | **Obsidian model** — flat manifest + `onload(app)` | simplest contract that still scales |
| **Update** | **Tauri updater** (desktop) + `shay update` GH-release (CLI) | static JSON feed, no update server |
| **Source-sync** | **git remote + reviewed cherry-pick** | take chosen upstream fixes, no hard dependency |

**Language reconciliation:** keep the core **Python** end-to-end (CLI, agent, memory
indexing). LanceDB ships a Python SDK and embeddings run through Ollama's
`nomic-embed-text` endpoint (or `fastembed` Python) — so the memory layer does NOT pull
in a Node runtime. The only web tech is the Tauri *frontend* (TS/JS in a webview), which
is unavoidable and fine. One language for logic, web only for the glass.

---

## 1. Desktop shell → **Tauri v2**
- **Pick:** Tauri v2 — your app is a thin HTTP client (chat + dashboards), so the Rust
  backend is near-invisible and you get 3–10 MB bundles / ~30–50 MB idle RAM vs
  Electron's 85–150 MB / 200–400 MB.
- **Runner-up:** Electron — if you hit a missing-Tauri-plugin wall, need byte-perfect
  cross-platform CSS, or want a co-located Node backend. Decade of hardening (VS Code, Figma).
- **Skip:** packaged PWA — macOS Safari PWA support is second-class (no tray, no native
  dialogs, no real auto-update).
- **Key tradeoff:** WKWebView (Apple's engine) vs Chromium consistency. Real quirks: a
  window-resize bug (#14843), 60fps rAF cap pre-macOS-26, no native Playwright. Manageable
  for chat+dashboards, not theoretical.
- **DON'T:** assume notarization is free — Tauri needs the **same $99/yr Apple Developer
  account + notarization** as Electron; budget a day for first signing. (Personal-only
  self-updates can defer it; see §6.)

## 2. CLI + TUI → **Python (Typer/Click + Textual)**
- **Pick:** Python — the agent is Python, so CLI↔agent is one import, not a subprocess/RPC.
  Textual gives a themeable TUI (7 built-in themes, CSS vars) for the **settings screen**
  (replacing the command-sprawl). `uv` covers install/lock/build; PyInstaller → `.app`.
- **Runner-up:** Go (Cobra + Bubble Tea) if single-static-binary distribution outweighs
  tight agent coupling — but you then write a Python subprocess bridge.
- **Key tradeoff:** Go wins distribution + startup; Python wins zero-impedance with the
  agent. Tight CLI↔agent coupling (streaming, shared state, tool registration) makes the
  subprocess boundary a future re-architecture.
- **DON'T:** ship Textual's `Trogon` auto-TUI as the polished settings screen unprovetested
  (its own README calls it early-stage). Plugins: use `entry_points` + `click-plugins`
  (the pip/pytest pattern), not a bespoke loader.

## 3. Local model serving → **Ollama 0.19+ (MLX backend)**
- **Pick:** Ollama — easiest install, OpenAI-compat `/v1/chat/completions` out of the box,
  hot model-switch; v0.19 moved to MLX (~2× decode). For 4–10 *loosely-coupled* agents,
  set `OLLAMA_NUM_PARALLEL=4`, `OLLAMA_MAX_QUEUE=8` and go.
- **THE caveat (adversarially verified):** `OLLAMA_NUM_PARALLEL` **queues, it does not
  batch** — each request is its own forward pass; aggregate throughput at 4 ≈ serialized.
  You get lower per-agent wait (interleaving), NOT a throughput multiplier.
- **Runner-up:** **oMLX** (real continuous batching, 1.3–1.4× at concurrency 4) if your
  agents fire in tight simultaneous bursts; **llama-server** for 40k+ contexts (MLX
  collapses on long context).
- **Concurrency reality:** unified memory is the ceiling. ~14B Q4 ≈ 9 GB + ~15–25%/slot
  KV. On 64 GB: 4 slots comfortable, ~10 the practical limit before p99 collapses. One GPU
  die — no hardware fan-out. (This confirms what we already knew: Ollama isn't
  rate-limited; it's a single-Mac throughput ceiling — design the swarm around ~4 parallel.)
- **DON'T:** run upstream vLLM on Mac (CPU-only, 10–20× slower); don't use LM Studio's GUI
  server for unattended swarm work; don't raise NUM_PARALLEL past your memory budget.

## 4. Memory / RAG → **nomic-embed-text (via Ollama) + LanceDB**
- **Embedder:** nomic-embed-text-v1.5 — 768-dim (Matryoshka-truncatable), **8192-token
  context** (embeds full notes, no destructive chunking), CPU-only. Run it through Ollama
  (`ollama pull nomic-embed-text`) so it shares the runtime you already have; or `fastembed`
  (Python, BAAI/bge-small) as the lighter backup.
- **Vector store:** **LanceDB** — embedded/in-process (no server, no Docker), local
  columnar files, hybrid vector+FTS+SQL, git-style table versioning, Python SDK. Steepest
  mindshare growth among embedded stores.
- **Runner-up store:** sqlite-vec — dead simple, but **brute-force only (no ANN index yet)**
  → fine under ~20K notes, a latency wall above that. Pick it for tiny vaults; LanceDB scales.
- **Tiered-memory pattern (= the fix for the 99% wall):** a tiny **hot cache** of 8–20
  curated/recency-promoted items as a YAML block always in the prompt (~400–800 tok, zero
  retrieval), PLUS everything else (vault, session notes, cerebrum) in LanceDB, fetched
  on-demand top-3–5 (~150 tok each). This is the production pattern (Letta core+archival, Mem0).
- **DON'T:** Chroma (server process, Python-first friction, no embedded ANN); FAISS (a
  library, not a DB — you'd rebuild persistence/metadata); all-MiniLM (256-tok window
  shreds long notes); any cloud embedding API (violates $0/no-key).

## 5. Plugin / extension architecture → **Obsidian's model**
- **Pattern:** flat `plugin.json` co-located with the entry, a single `onload(app)` hook,
  folder-convention discovery (`plugins/<id>/`), automatic cleanup via `onunload()`. No
  registry server, no `contributes` schema.
- **Minimal manifest:** `id, name, version, minHostVersion, description, [entry],
  [capabilities[]]` (e.g. `["network","fs:read","cli:commands"]`).
- **Hook:** `interface Plugin { onload(app: HostAPI): void|Promise; onunload?(): ... }`.
  `HostAPI` is your **stable, narrow** surface (registerCommand, registerRoute, emitEvent,
  readConfig) — never expose internal state.
- **Key tradeoff:** in-process (Obsidian/VS Code/Raycast all do this — simple, zero IPC, a
  rogue plugin can destabilize) vs subprocess isolation (safer, 5–10× cost). **Start
  in-process behind a narrow HostAPI; add a subprocess wrapper later — the contract doesn't change.**
- **DON'T:** build a VS Code-style `contributes` schema (maintenance hell solo — let
  `onload()` calling `app.registerCommand(...)` BE the declaration); no central registry
  server (folder convention + optional install); no plugin→plugin direct imports (route via
  HostAPI events).

## 6. Self-update → **Tauri updater + `shay update` + cherry-pick source-sync**
- **Desktop:** Tauri updater plugin — point at a GitHub Release / static `update.json` (no
  server). Mandatory Ed25519 signature (separate from Apple). **Notarization is required for
  any artifact a *second* Mac opens; pure self-to-self over the programmatic updater works
  unsigned-in-practice but is fragile across OS updates.**
- **CLI:** a built-in `shay update` that hits the GH Releases API → downloads the darwin-arm64
  artifact → verifies SHA256 → atomic rename over itself. Binaries fetched programmatically
  (curl/HTTP client) **don't get `com.apple.quarantine`** (Homebrew formulae confirm this) →
  CLI self-update needs no notarization (ad-hoc `codesign -s -` if you use entitlements).
- **Upstream source-sync:** `git remote add source <hermes-repo>` → `git fetch source` →
  review `git log source/main --not main` → **reviewed `git cherry-pick <sha>`**. Lands as
  YOUR commits, no runtime dependency, clear "did we take this fix?" history.
- **DON'T:** `git pull` as an update mechanism; Electron autoUpdater unsigned (silently
  fails); `git submodule`/`subtree` for source-sync (creates the hard dependency you're
  avoiding); Gatekeeper kill-switches (`--allow-unsigned`).

---

## Confidence & caveats
- **Solid (multi-source agreement):** Tauri≪Electron footprint; Python-for-Python-agent;
  Ollama NUM_PARALLEL queues-not-batches; LanceDB embedded + nomic 8192-ctx; Obsidian
  in-process + flat-manifest; cherry-pick > submodule for source-sync; macOS notarization is
  the same tax for Tauri and Electron.
- **Directional (snippet-sourced, some 403s):** exact MB/RAM/tok-s figures, oMLX/vllm-mlx
  throughput multipliers, nomic MTEB score. Don't quote them as lab results.
- **Unverified to re-check before relying:** Textual `Trogon` maturity; Raycast's exact
  process-isolation model; vllm-mlx production-stability (41 open issues — watch, don't run).
</content>
