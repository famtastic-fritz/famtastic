# Bug Encyclopedia
# Format: [symptom] → [root cause] → [fix applied] → [date]

- Zero-byte spawnClaude output → CLAUDE.md in cwd triggers OpenWolf instructions that --tools "" cannot execute → cwd = os.tmpdir() → 2026-03-26
- Nav width shifts across pages → wide content stretches body layout width → main { max-width: 90% } → 2026-03-26
- Session summaries write to wrong site → endSession() not awaited before TAG change → await endSession() in switch-site and new-site → 2026-03-30
- currentMode persists across reconnects → not reset on new WS connection → currentMode = 'build' in wss.on('connection') → 2026-03-31
- Zombie subprocesses on WS disconnect → child reference not accessible to ws.on('close') → store as ws.currentChild, kill on close → 2026-03-31
- Server unresponsive after 10K+ input → no length cap before classifier → msg.content.length > 10000 early return → 2026-03-31
- Message flood: 0/20 responses → no in-flight guard → added per-connection in-flight flag → 2026-03-31
