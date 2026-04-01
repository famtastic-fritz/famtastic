# Anti-Patterns — Do Not Repeat

- NEVER set overflow-x: hidden on html or body — clips hero breakout
- NEVER use echo for Claude prompts — use printf '%s' (echo corrupts backslash sequences)
- NEVER set cwd to HUB_ROOT in spawnClaude — causes CLAUDE.md to be read with --tools "" active, producing 0-byte output
- NEVER run reapplySlotMappings before extractAndRegisterSlots — slots must exist before mappings are applied
- NEVER let currentMode persist across WS connections — reset to 'build' on every new connection
- NEVER put revenue or business operations data into spec.json — spec.json is a build artifact, not a portfolio ledger. Business data belongs in SQLite.
- NEVER increment innerCompleted in both timeout handler and close event — kill() triggers close, which handles completion
- NEVER allow GET /api/settings to return raw API keys — use safeSettings()
- NEVER add new CSS to the <style> block in index.html — use the appropriate file in site-studio/public/css/ instead
- NEVER add new app logic JavaScript as an inline <script> block in index.html — use site-studio/public/js/ instead
- NEVER add a css/ or js/ file without immediately linking it in index.html — unlinked files are invisible to the browser and create confusing debugging sessions
- CDN links for external libraries ARE acceptable in index.html <head>
