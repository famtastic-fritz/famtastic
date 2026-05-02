# Web Chat Exporter

Exports Claude Web (claude.ai) chats to markdown files the FAMtastic capture flywheel can ingest.

## Why this exists

Per the FAMtastic briefing: the biggest source of leakage is conversations that end without capture. Claude Web has weeks of FAMtastic strategy chats that have never landed in any structured artifact. This tool changes that.

## Three install paths (pick what fits)

### Option A — Bookmarklet (zero install, works everywhere)

1. Open `tools/web-chat-exporter/bookmarklet.html` in your browser
2. Drag the **"Export Claude Chat"** button to your bookmarks bar
3. Open any claude.ai conversation
4. Click the bookmark → a new tab opens with the full chat as markdown
5. Save the new tab's content to `~/famtastic/imports/web-chats/YYYY-MM-DD_<slug>.md`

The bookmarklet is defensive: tries multiple DOM patterns, falls back to grabbing readable text. Won't be perfect for every claude.ai update but gets you 90% there.

### Option B — Userscript (Tampermonkey users)

1. Install Tampermonkey extension if you don't have it
2. Open `tools/web-chat-exporter/userscript.js`
3. Click "Install" in Tampermonkey
4. Visit claude.ai — a small "Export" button appears top-right of the chat
5. Click → downloads `claude-chat-YYYY-MM-DD.md` to your Downloads folder
6. Move to `~/famtastic/imports/web-chats/`

### Option C — Manual paste fallback (when DOM exporters break)

1. In claude.ai, scroll to top of conversation
2. Select all (Cmd+A) → copy
3. Save as `~/famtastic/imports/web-chats/YYYY-MM-DD_<slug>.txt`
4. Run `node tools/web-chat-exporter/normalize.js <file>` to convert to capture-ready markdown

## Format produced

All three options produce markdown with this structure:

```markdown
# Claude Web Chat Export

**Exported:** 2026-05-02T15:30:00Z
**URL:** https://claude.ai/chat/abc-123
**Conversation title:** (if detected)
**Message count:** N
**Source:** bookmarklet | userscript | manual

---

## Human (turn 1)

(message text)

---

## Assistant (turn 1)

(message text)

---

(repeats per turn)
```

This format is what `lib/famtastic/capture/cli.js` expects for ingestion.

## Workflow with the capture tool

```bash
# 1. Export a Claude Web chat (any of the 3 options above)
#    → file lands in ~/famtastic/imports/web-chats/

# 2. Inventory what's queued for capture
node lib/famtastic/capture/cli.js scan

# 3. Scaffold a capture from the export
node lib/famtastic/capture/cli.js scaffold \
  --session "shay-design-conversation" \
  --surface web \
  --source-file imports/web-chats/2026-05-02_shay-design.md

# 4. Open the scaffold, fill in items, mark approved/rejected
# 5. Dry-run to verify
node lib/famtastic/capture/cli.js dry-run docs/captures/2026-05-02_web-shay-design-conversation.md
```

## Status

**MVP (2026-05-02):** Bookmarklet + userscript + manual fallback all built. Tested only on the bookmarklet's general selector strategy; Claude Web DOM may have updated in ways that need tweaking. If something breaks, fall back to Option C.

**Next iteration:** Auto-detection of `claude.ai` updates and self-healing selectors. Possibly a Chrome Manifest V3 extension if the userscript path proves brittle.
