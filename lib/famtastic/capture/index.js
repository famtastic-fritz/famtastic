'use strict';

// lib/famtastic/capture/index.js
// FAMtastic Capture Flywheel — Layer 4 of the architecture.
// SHAY V2 (2026-05-02): MVP. Manual extraction for now; LLM-assisted extraction in iteration 3.
//
// Mission: nothing important from any conversation evaporates when the chat closes.
// Reads designated input sources, scaffolds structured proposals, helps Fritz
// review and promote items to canonical files (.wolf/cerebrum.md, gaps.jsonl, etc.).
//
// This is an ECOSYSTEM SERVICE, not a Site-Studio feature. Lives in lib/famtastic/
// per the Separation-Ready Architecture rule.

const fs = require('fs');
const path = require('path');

const FAM_ROOT = path.resolve(process.env.HOME || '/root', 'famtastic');
const IMPORTS_DIR = path.join(FAM_ROOT, 'imports');
const CAPTURES_DIR = path.join(FAM_ROOT, 'docs/captures');
const CEREBRUM_PATH = path.join(FAM_ROOT, '.wolf/cerebrum.md');
const GAPS_PATH = path.join(FAM_ROOT, '.wolf/gaps.jsonl');
const STATE_PATH = path.join(FAM_ROOT, 'FAMTASTIC-STATE.md');
const BUGLOG_PATH = path.join(FAM_ROOT, '.wolf/buglog.json');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function todayLong() {
  return new Date().toISOString().replace('T', '_').replace(/\..*/, '').replace(/:/g, '');
}

// ── INVENTORY: scan input sources ───────────────────────────────────────────

function scanImports() {
  ensureDir(IMPORTS_DIR);
  const out = { web_chats: [], cowork_sessions: [], other: [] };
  for (const sub of ['web-chats', 'cowork-sessions']) {
    const dir = path.join(IMPORTS_DIR, sub);
    ensureDir(dir);
    const entries = fs.readdirSync(dir);
    for (const f of entries) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isFile()) {
        const key = sub.replace(/-/g, '_');
        out[key].push({
          name: f,
          path: full,
          relative: path.relative(FAM_ROOT, full),
          size: stat.size,
          mtime: stat.mtime.toISOString()
        });
      }
    }
  }
  // Also scan loose files at top of imports/
  for (const f of fs.readdirSync(IMPORTS_DIR)) {
    const full = path.join(IMPORTS_DIR, f);
    const stat = fs.statSync(full);
    if (stat.isFile()) {
      out.other.push({
        name: f,
        path: full,
        relative: path.relative(FAM_ROOT, full),
        size: stat.size,
        mtime: stat.mtime.toISOString()
      });
    }
  }
  return out;
}

function scanStudioConversations() {
  // Studio's per-site conversation files — also valid input for capture tool
  const sitesDir = path.join(FAM_ROOT, 'sites');
  if (!fs.existsSync(sitesDir)) return [];
  const out = [];
  for (const tag of fs.readdirSync(sitesDir)) {
    if (tag.startsWith('.')) continue;
    const convoPath = path.join(sitesDir, tag, 'conversation.jsonl');
    if (fs.existsSync(convoPath)) {
      const stat = fs.statSync(convoPath);
      out.push({
        site: tag,
        path: convoPath,
        relative: path.relative(FAM_ROOT, convoPath),
        size: stat.size,
        mtime: stat.mtime.toISOString()
      });
    }
  }
  return out;
}

function listExistingCaptures() {
  ensureDir(CAPTURES_DIR);
  return fs.readdirSync(CAPTURES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      path: path.join(CAPTURES_DIR, f),
      relative: path.relative(FAM_ROOT, path.join(CAPTURES_DIR, f))
    }));
}

// ── SCAFFOLD: create a new capture proposal ──────────────────────────────────

function scaffoldCapture(opts) {
  opts = opts || {};
  const sessionLabel = opts.session || `session-${Date.now()}`;
  const surface = opts.surface || 'cowork';
  const operator = opts.operator || 'Fritz';
  const sourceFile = opts.source_file || null;

  ensureDir(CAPTURES_DIR);

  // Determine filename
  const date = isoToday();
  const slug = sessionLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const filename = `${date}_${surface}-${slug}.md`;
  const fullPath = path.join(CAPTURES_DIR, filename);

  if (fs.existsSync(fullPath) && !opts.overwrite) {
    return { ok: false, error: 'capture already exists at ' + fullPath, path: fullPath };
  }

  const tmplPath = path.join(__dirname, 'template.md');
  let tmpl = fs.readFileSync(tmplPath, 'utf8');
  tmpl = tmpl
    .replace(/\{\{DATE\}\}/g, date)
    .replace(/\{\{SURFACE\}\}/g, surface)
    .replace(/\{\{OPERATOR\}\}/g, operator)
    .replace(/\{\{SESSION_LABEL\}\}/g, sessionLabel)
    .replace(/\{\{SOURCE_FILE\}\}/g, sourceFile || '(manual entry)');

  fs.writeFileSync(fullPath, tmpl, 'utf8');
  return { ok: true, path: fullPath, relative: path.relative(FAM_ROOT, fullPath) };
}

// ── PROMOTE: read approved items from a capture and append to canonical files ─
// Items in a capture marked with "STATUS: approved" get promoted.
// Items marked "STATUS: rejected" or "STATUS: pending" are skipped.
// Each approved item must declare its destination file via "LANDS IN: <path>".

function readCapture(capturePath) {
  if (!fs.existsSync(capturePath)) {
    return { ok: false, error: 'capture not found: ' + capturePath };
  }
  return { ok: true, content: fs.readFileSync(capturePath, 'utf8'), path: capturePath };
}

function parseApprovedItems(captureContent) {
  // Items follow format:
  //   ### ITEM-ID — Title
  //   STATUS: approved
  //   LANDS IN: .wolf/cerebrum.md (Decision Log)
  //   ...content...
  //   ---
  const items = [];
  const blocks = captureContent.split(/\n---\n/);
  for (const block of blocks) {
    const idMatch = block.match(/^###\s+([A-Z]-[\w-]+)\s*[—-]\s*(.+?)$/m);
    const statusMatch = block.match(/^STATUS:\s*(\w+)/m);
    const landsMatch = block.match(/^LANDS IN:\s*(.+?)$/m);
    if (idMatch && statusMatch && statusMatch[1].toLowerCase() === 'approved' && landsMatch) {
      items.push({
        id: idMatch[1],
        title: idMatch[2].trim(),
        destination: landsMatch[1].trim(),
        body: block.trim()
      });
    }
  }
  return items;
}

function dryRunPromote(capturePath) {
  const r = readCapture(capturePath);
  if (!r.ok) return r;
  const items = parseApprovedItems(r.content);
  return { ok: true, capture: capturePath, items_to_promote: items.length, items };
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────

function summary() {
  const imports = scanImports();
  const studio = scanStudioConversations();
  const captures = listExistingCaptures();
  return {
    timestamp: new Date().toISOString(),
    famtastic_root: FAM_ROOT,
    imports: {
      web_chats: imports.web_chats.length,
      cowork_sessions: imports.cowork_sessions.length,
      other: imports.other.length
    },
    studio_conversations: studio.length,
    existing_captures: captures.length,
    canonical_files: {
      cerebrum: fs.existsSync(CEREBRUM_PATH),
      gaps: fs.existsSync(GAPS_PATH),
      buglog: fs.existsSync(BUGLOG_PATH),
      state: fs.existsSync(STATE_PATH)
    }
  };
}

module.exports = {
  // paths (also exported for tooling)
  FAM_ROOT, IMPORTS_DIR, CAPTURES_DIR,
  CEREBRUM_PATH, GAPS_PATH, STATE_PATH, BUGLOG_PATH,

  // inventory
  scanImports, scanStudioConversations, listExistingCaptures, summary,

  // scaffold
  scaffoldCapture,

  // promote
  readCapture, parseApprovedItems, dryRunPromote
};
