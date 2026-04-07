# Adobe MCP Integration (adb-mcp)

## Overview

adb-mcp provides MCP control of Adobe Photoshop, Premiere Pro, InDesign,
AfterEffects, and Illustrator from Claude Desktop and Claude Code. Uses
Fritz's existing Creative Cloud desktop apps — no API keys needed.

Source: https://github.com/mikechambers/adb-mcp
Location: `~/famtastic/tools/adb-mcp/`

## Architecture

```
Claude Desktop/Code <-> MCP Server (Python) <-> Proxy Server (Node) <-> UXP Plugin <-> Adobe App
```

## Components

| Component | Location | Status |
|-----------|----------|--------|
| Proxy server (Node) | `tools/adb-mcp/adb-proxy-socket/` | Installed (`npm install` done) |
| MCP servers (Python) | `tools/adb-mcp/mcp/` | BLOCKED — needs Python 3.10+ (system has 3.9.6) |
| UXP plugins | `tools/adb-mcp/uxp/` | Not yet loaded into Adobe apps |
| CEP plugins (AE/AI) | `tools/adb-mcp/cep/` | Not yet symlinked |

## Unblocking Step: Python Upgrade

The MCP server requires Python 3.10+ (pydantic-core dependency). Current
system Python is 3.9.6. To unblock:

```bash
# Option 1: Install via Homebrew
brew install python@3.12

# Option 2: Install via pyenv
pyenv install 3.12
pyenv global 3.12

# Then install MCP servers
cd ~/famtastic/tools/adb-mcp/mcp
uv run mcp install --with fonttools --with python-socketio --with mcp \
  --with requests --with websocket-client --with numpy ps-mcp.py
```

## Setup Steps (after Python upgrade)

### 1. Install MCP servers
```bash
cd ~/famtastic/tools/adb-mcp/mcp

# Photoshop
uv run mcp install --with fonttools --with python-socketio --with mcp \
  --with requests --with websocket-client --with numpy ps-mcp.py

# Premiere Pro
uv run mcp install --with fonttools --with python-socketio --with mcp \
  --with requests --with websocket-client --with pillow pr-mcp.py
```

### 2. Start proxy server
```bash
cd ~/famtastic/tools/adb-mcp/adb-proxy-socket
node proxy.js
# Should print: "adb-mcp Command proxy server running on ws://localhost:3001"
```

### 3. Load UXP plugins into Adobe apps
1. Open **UXP Developer Tools** from Creative Cloud
2. Enable developer mode when prompted
3. File > Add Plugin > navigate to:
   - Photoshop: `~/famtastic/tools/adb-mcp/uxp/ps/manifest.json`
   - Premiere: `~/famtastic/tools/adb-mcp/uxp/pr/manifest.json`
4. Click **Load**
5. In the Adobe app, open the plugin panel and click **Connect**

### 4. Claude Desktop config
After Python upgrade and MCP install, the config at
`~/Library/Application Support/Claude/claude_desktop_config.json`
will be auto-updated by `uv run mcp install`. The final config
should include `ps-mcp` and/or `pr-mcp` alongside the existing
codex servers.

### 5. Claude Code (if supported)
```bash
claude mcp add ps-mcp -s user -- uv run \
  --with fonttools --with python-socketio --with mcp \
  --with requests --with websocket-client --with numpy \
  ~/famtastic/tools/adb-mcp/mcp/ps-mcp.py
```

## Pipeline Integration

```
Google Imagen/Veo generates raw assets
    -> Adobe Photoshop MCP post-processes (resize, enhance, composite)
    -> Studio assembles into site pages
    -> Firefly web app for style reference coherence (manual)
```

## Available Tools per App

### Photoshop
- Create/resize documents
- Add/edit layers (image, text, shape)
- Apply filters and effects
- Import/export images
- Font management
- Layer manipulation

### Premiere Pro
- Create/manage sequences
- Add clips to timeline
- Apply transitions and effects
- Audio management
- Export/render

### InDesign, AfterEffects, Illustrator
- Similar MCP control via UXP (InDesign) or CEP (AE/AI) plugins
- AfterEffects and Illustrator use ExtendScript for full API access

## Troubleshooting

- **MCP won't run:** Check Python version (needs 3.10+)
- **Plugin won't connect:** Ensure proxy server is running, check UXP Developer Tools debug console
- **Slow responses:** Start a new chat to clear context
- **Plugin must be reloaded** every time you restart the Adobe app
