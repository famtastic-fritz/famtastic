# scripts/odysseus

Helpers for running **Odysseus** — the self-hosted AI workspace
(https://github.com/pewdiepie-archdaemon/odysseus) — alongside FAMtastic.

See `docs/odysseus/ODYSSEUS-WRITEUP.md` for what it is and why it's here.

## `install-odysseus.sh`

Idempotent installer for Fritz's Mac. Clones (or fast-forward-updates) the repo,
seeds a private `.env`, and prints start commands. Never touches launchd, never
exposes a port beyond loopback unless you opt in.

```bash
bash scripts/odysseus/install-odysseus.sh            # clone/update + setup
bash scripts/odysseus/install-odysseus.sh --start    # …and launch (Apple Silicon native)

# overrides
ODYSSEUS_DIR=~/tools/odysseus bash scripts/odysseus/install-odysseus.sh
ODYSSEUS_PORT=7001            bash scripts/odysseus/install-odysseus.sh
ODYSSEUS_LAN=1                bash scripts/odysseus/install-odysseus.sh   # bind 0.0.0.0 (VPN only!)
```

| Mode | Command | URL | First password |
|---|---|---|---|
| Native (Apple Silicon, GPU Cookbook) | `./start-macos.sh` | http://127.0.0.1:7860 | printed in terminal |
| Docker (no Metal GPU) | `docker compose up -d --build` | http://localhost:7000 | `docker compose logs odysseus` |
| Mac app wrapper | `./build-macos-app.sh` | clickable | — |

## Safety

- Loopback by default. `AUTH_ENABLED=true` always. Only bind `0.0.0.0` over a
  trusted VPN (Tailscale) — never the public internet.
- Rotate the first-run temp admin password immediately (Settings).
- The Agent feature has shell access by design — scope its tools like Claude Code.

## Shay's copy

Shay installs her own instance via `shay-agent-os/odysseus/install-odysseus-shay.sh`
(see `shay-agent-os/odysseus/INSTALL-FOR-SHAY.md`). Two instances, one per
operator, is intentional — Fritz's is interactive; Shay's is headless/agentic.
