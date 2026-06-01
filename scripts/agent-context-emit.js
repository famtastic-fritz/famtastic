#!/usr/bin/env node
/**
 * agent-context-emit.js — the ONLY emitter for the cross-agent context layer.
 *
 * Reads docs/agent-startup/AGENT-CONTEXT.yaml (the single source of truth) plus
 * live state (plans/registry.json + CHANGELOG.md + optional audit drift), and
 * regenerates marker-bounded regions of:
 *   - docs/agent-startup/AGENT-CONTEXT.generated.md   (full rendered manifest)
 *   - AGENTS.md   (Codex / Cursor / Cowork / Shay sub-agents)
 *   - GEMINI.md   (Gemini CLI — created if absent)
 *   - CLAUDE.md   (a single @-import line region)
 *
 * Marker discipline: only content between
 *   <!-- AGENT-CONTEXT:START --> ... <!-- AGENT-CONTEXT:END -->
 * is touched. Hand-written content outside the markers is byte-preserved.
 *
 * Idempotent: re-running with no source change yields zero diff.
 * Zero npm deps — ships a minimal YAML reader tuned to AGENT-CONTEXT.yaml.
 *
 * Usage:
 *   node scripts/agent-context-emit.js            # emit all surfaces
 *   node scripts/agent-context-emit.js --check     # exit 1 if regen would change anything
 *   node scripts/agent-context-emit.js --stdout    # print the compact block, emit nothing
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "docs", "agent-startup", "AGENT-CONTEXT.yaml");
const GENERATED = path.join(ROOT, "docs", "agent-startup", "AGENT-CONTEXT.generated.md");
const AGENTS = path.join(ROOT, "AGENTS.md");
const GEMINI = path.join(ROOT, "GEMINI.md");
const CLAUDE = path.join(ROOT, "CLAUDE.md");
const REGISTRY = path.join(ROOT, "plans", "registry.json");
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");

const START = "<!-- AGENT-CONTEXT:START -->";
const END = "<!-- AGENT-CONTEXT:END -->";

// ---------------------------------------------------------------------------
// Minimal YAML reader — handles the structure used by AGENT-CONTEXT.yaml:
// nested mappings, lists of scalars, lists of mappings, plain scalars, and
// folded (`>-`) block scalars. Comments and blank lines are ignored. This is
// deliberately not a general YAML parser; it is exactly enough for our file.
// ---------------------------------------------------------------------------
function parseYaml(text) {
  // Tokenize into significant lines with indent + raw content.
  const raw = text.split(/\r?\n/);
  const lines = [];
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    if (line.trim() === "" || /^\s*#/.test(line)) continue;
    const indent = line.length - line.replace(/^\s+/, "").length;
    lines.push({ indent, content: line.slice(indent), n: i });
  }

  let pos = 0;

  function parseBlock(minIndent) {
    // Decide list vs map by the first line at this indent.
    if (pos >= lines.length) return null;
    const first = lines[pos];
    if (first.indent < minIndent) return null;
    if (first.content.startsWith("- ")) return parseList(first.indent);
    return parseMap(first.indent);
  }

  function parseMap(indent) {
    const obj = {};
    while (pos < lines.length) {
      const ln = lines[pos];
      if (ln.indent < indent) break;
      if (ln.indent > indent) break; // shouldn't happen at map start
      const m = ln.content.match(/^([^:]+):\s?(.*)$/);
      if (!m) break;
      const key = m[1].trim();
      let val = m[2];
      pos++;
      if (val === ">-" || val === ">" || val === "|" || val === "|-") {
        obj[key] = parseFolded(indent, val);
      } else if (val === "") {
        // nested block (map or list) at deeper indent, else null
        const child =
          pos < lines.length && lines[pos].indent > indent
            ? parseBlock(indent + 1)
            : null;
        obj[key] = child;
      } else {
        obj[key] = scalar(val);
      }
    }
    return obj;
  }

  function parseList(indent) {
    const arr = [];
    while (pos < lines.length) {
      const ln = lines[pos];
      if (ln.indent < indent || !ln.content.startsWith("- ")) break;
      if (ln.indent > indent) break;
      const after = ln.content.slice(2);
      const kv = after.match(/^([^:]+):\s?(.*)$/);
      if (kv) {
        // list item is a map; the first key sits on the dash line.
        const obj = {};
        obj[kv[1].trim()] = scalar(kv[2]);
        pos++;
        // subsequent keys of the same item are indented past the dash.
        const itemIndent = indent + 2;
        while (pos < lines.length && lines[pos].indent === itemIndent) {
          const sub = lines[pos].content.match(/^([^:]+):\s?(.*)$/);
          if (!sub) break;
          obj[sub[1].trim()] = scalar(sub[2]);
          pos++;
        }
        arr.push(obj);
      } else {
        arr.push(scalar(after));
        pos++;
      }
    }
    return arr;
  }

  function parseFolded(parentIndent, style) {
    const parts = [];
    const bodyIndent = parentIndent + 2;
    while (pos < lines.length && lines[pos].indent >= bodyIndent) {
      parts.push(lines[pos].content);
      pos++;
    }
    if (style.startsWith("|")) return parts.join("\n");
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  function scalar(v) {
    v = v.trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      return v.slice(1, -1);
    }
    return v;
  }

  return parseBlock(0) || {};
}

// ---------------------------------------------------------------------------
// Live state
// ---------------------------------------------------------------------------
function readJSON(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return fallback;
  }
}

function activePlans() {
  const reg = readJSON(REGISTRY, {});
  const ids = Array.isArray(reg.active_parent_ids) ? reg.active_parent_ids : [];
  return ids;
}

function recentSessions(n) {
  let text;
  try {
    text = fs.readFileSync(CHANGELOG, "utf-8");
  } catch {
    return [];
  }
  const titles = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) titles.push(m[1].trim());
    if (titles.length >= n) break;
  }
  return titles;
}

function driftSummary() {
  // Best-effort: ask audit-all.js for a drift count if it exists. The audit
  // exit-code contract is 0=clean, 2=drift. Never throws; falls back to n/a.
  const auditAll = path.join(ROOT, "scripts", "plans", "audit-all.js");
  if (!fs.existsSync(auditAll)) return "n/a (reconciler not yet run)";
  try {
    const res = cp.spawnSync("node", [auditAll, "--json"], {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: 30000,
    });
    if (res.status === 0) return "0 (clean)";
    // try to parse a count out of JSON output
    try {
      const data = JSON.parse(res.stdout);
      const c =
        (data.drift ? data.drift.length : 0) +
        (data.stale ? data.stale.length : 0);
      return `${c} item(s) — run \`node scripts/plans/audit-all.js\``;
    } catch {
      return "drift present — run `node scripts/plans/audit-all.js`";
    }
  } catch {
    return "n/a";
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function renderBody(ctx, state) {
  const sm = ctx.system_map || {};
  const rp = ctx.recall_path || {};
  const rg = ctx.reuse_before_generate || {};
  const out = [];

  out.push("## System map");
  out.push("");
  out.push(sm.identity || "");
  out.push("");
  out.push("Repos:");
  for (const r of sm.repos || []) {
    out.push(`- **${r.name}** (\`${r.path}\`) — ${r.role}`);
  }
  out.push("");
  out.push(`Surfaces: ${(sm.surfaces || []).join(", ")}`);
  out.push("");

  out.push("## Current state (generated — do not hand-edit)");
  out.push("");
  out.push(`Generated at: ${state.generated_at}`);
  out.push(`Active plans (${state.active_plans.length}): ${state.active_plans.join(", ") || "none"}`);
  out.push(`Drift: ${state.drift}`);
  out.push("Recent sessions:");
  for (const s of state.recent_sessions) out.push(`- ${s}`);
  out.push("");

  out.push("## Recall path — how to be context-aware before acting");
  out.push("");
  for (const step of rp.before_acting || []) out.push(`- ${step}`);
  out.push("");
  out.push("Memory homes:");
  for (const h of rp.memory_homes || []) {
    const tool = h.tool ? ` tool=\`${h.tool}\`` : "";
    out.push(`- **${h.name}** (${h.kind}${tool}) — ${h.scope}`);
  }
  out.push("");

  out.push("## Reuse before generate");
  out.push("");
  out.push(rg.doctrine || "");
  out.push("");
  out.push(`Discovery sources: ${(rg.discovery || []).join(", ")}`);

  return out.join("\n").trim() + "\n";
}

/** A compact block for the SessionStart stdout hook (<600 tokens). */
function renderCompact(ctx, state) {
  const sm = ctx.system_map || {};
  const rp = ctx.recall_path || {};
  const rg = ctx.reuse_before_generate || {};
  const out = [];
  out.push("# Agent orientation (from AGENT-CONTEXT.yaml)");
  out.push("");
  out.push("System: " + (sm.identity || "").replace(/\s+/g, " ").trim());
  out.push("");
  out.push(
    "Active plans (" +
      state.active_plans.length +
      "): " +
      (state.active_plans.join(", ") || "none")
  );
  out.push("Drift: " + state.drift);
  out.push("");
  out.push("Before acting:");
  for (const step of (rp.before_acting || []).slice(0, 4)) out.push("- " + step);
  out.push("");
  out.push("Reuse before generate: " + (rg.doctrine || "").replace(/\s+/g, " ").trim());
  return out.join("\n").trim() + "\n";
}

// ---------------------------------------------------------------------------
// Marker-region writing
// ---------------------------------------------------------------------------
function spliceRegion(filePath, header, body, createIfMissing) {
  const region = `${START}\n<!-- Generated by scripts/agent-context-emit.js — do not edit between markers. -->\n\n${body}\n${END}`;
  let existing = "";
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, "utf-8");
  } else if (!createIfMissing) {
    return { changed: false, skipped: true };
  }

  let next;
  if (existing.includes(START) && existing.includes(END)) {
    const pre = existing.slice(0, existing.indexOf(START));
    const post = existing.slice(existing.indexOf(END) + END.length);
    next = pre + region + post;
  } else if (existing.trim() === "") {
    next = (header ? header + "\n\n" : "") + region + "\n";
  } else {
    // append the region to the end, preserving all hand-written content above.
    const sep = existing.endsWith("\n") ? "\n" : "\n\n";
    next = existing + sep + region + "\n";
  }

  const changed = next !== existing;
  if (changed && !globalThis.__CHECK_ONLY__) {
    fs.writeFileSync(filePath, next);
  }
  return { changed, skipped: false };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
/**
 * generated_at is derived from the newest source mtime — NOT wall-clock — so
 * that re-running with no source change yields byte-identical output (the
 * idempotency contract). It only advances when a source file actually changes.
 */
function newestSourceMtime() {
  let newest = 0;
  for (const p of [SRC, REGISTRY, CHANGELOG]) {
    try {
      const m = fs.statSync(p).mtimeMs;
      if (m > newest) newest = m;
    } catch {}
  }
  return newest ? new Date(newest).toISOString() : new Date(0).toISOString();
}

function buildState() {
  return {
    generated_at: newestSourceMtime(),
    active_plans: activePlans(),
    drift: driftSummary(),
    recent_sessions: recentSessions(3),
  };
}

function main() {
  const argv = process.argv.slice(2);
  const checkOnly = argv.includes("--check");
  const stdoutOnly = argv.includes("--stdout");
  globalThis.__CHECK_ONLY__ = checkOnly;

  const ctx = parseYaml(fs.readFileSync(SRC, "utf-8"));
  const state = buildState();

  if (stdoutOnly) {
    process.stdout.write(renderCompact(ctx, state));
    return 0;
  }

  const body = renderBody(ctx, state);

  // 1. Full rendered manifest (whole-file generated; carries its own marker).
  const manifestHeader = "# AGENT-CONTEXT (generated)\n\n> Generated by `scripts/agent-context-emit.js` from `AGENT-CONTEXT.yaml`. Do not hand-edit.";
  const results = {};
  results.generated = spliceRegion(GENERATED, manifestHeader, body, true);

  // 2. AGENTS.md — region only, preserve hand-written rules outside markers.
  results.agents = spliceRegion(AGENTS, "# AGENTS.md", body, true);

  // 3. GEMINI.md — created if absent (Gemini dialect = same body).
  const geminiHeader =
    "# GEMINI.md\n\nOrientation for Gemini CLI sessions in this repo. " +
    "See `docs/agent-startup/AGENT-CONTEXT.generated.md` for the full manifest.";
  results.gemini = spliceRegion(GEMINI, geminiHeader, body, true);

  // 4. CLAUDE.md — a single @-import line region (does not duplicate the body).
  const importLine =
    "Standing cross-agent orientation is generated into `AGENT-CONTEXT.generated.md`:\n\n@docs/agent-startup/AGENT-CONTEXT.generated.md";
  results.claude = spliceRegion(CLAUDE, null, importLine, true);

  const anyChanged = Object.values(results).some((r) => r.changed);

  for (const [name, r] of Object.entries(results)) {
    const tag = r.skipped ? "skip" : r.changed ? "wrote" : "ok";
    process.stderr.write(`[agent-context-emit] ${tag}: ${name}\n`);
  }

  if (checkOnly && anyChanged) {
    process.stderr.write("[agent-context-emit] --check: regeneration WOULD change files\n");
    return 1;
  }
  return 0;
}

process.exit(main());
