# Studio Shay UI Proof — 2026-05-04

**Purpose:** Actual Studio UI proof for Shay-Shay behavior.  
**Tooling:** Playwright browser automation against launchd-managed Studio at
`http://localhost:3334/`. No WebSocket shortcut was used.

## Exact Studio Message

`system status`

## Initial Failures Found

| Failure | What happened | CLI / test workaround | GUI solution |
|---|---|---|---|
| Shay Lite click layer | `#pip-send-btn` was visible, but a `.studio-home-blank` layer intercepted the normal click. | Could have forced the click or posted directly to `/api/shay-shay`, but that would not prove the GUI. | `site-studio/public/css/studio-orb.css` now enables pointer events on `#shay-lite-shell` when the panel is open. |
| PointerEvent sent as message | After the click layer was fixed, clicking the send button sent `[object PointerEvent]` to Shay because the click listener passed the event object as `forcedText`. | Pressing Enter would have avoided the bad click handler, but that would not prove the button path. | `site-studio/public/js/studio-orb.js` now wraps the click handler with `function () { sendDirect(); }`. |

## Final Result

The final Playwright run clicked the Shay orb, entered `system status`, clicked
the send button, observed a real `POST /api/shay-shay` response, and verified
the rendered Shay Lite panel contained capability status text:

```text
Unavailable (missing API key or CLI): openrouter_api, firefly_api
Working: claude_api, gemini_api, openai_api, netlify, imagen, pinecone,
leonardo_api, surgical_editor, revenue_brief, gap_logger, suggestion_logger,
brand_tracker, shay_shay
```

Screenshot proof:
`proofs/shay-shay-system-status-ui-2026-05-04.png`

## Remaining Console Noise

The run still surfaced existing non-blocking console noise:

- Tailwind CDN production warning.
- Unsupported preload `as` value warning.
- `/config/site-config.json` returned 404 and logged `[config] failed to load`.

These did not block the Shay call, but they should be handled in a later
console-health cleanup pass.

