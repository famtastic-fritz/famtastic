#!/usr/bin/env node
/**
 * scripts/plans/lib/trace-graph.js — the ONLY place that builds trace-graph
 * nodes, asserts edges, derives status, and runs the drift detectors.
 *
 * One node type with a `kind`, one edge type with a `rel`. Nodes carry a stable
 * content-derived TRACE ID so re-runs are idempotent (dynamic-CRUD rule). Status
 * is DERIVED, never stored (single derivation, no parallel copies).
 *
 * Sources (read-only):
 *   - Shay kanban boards   ~/.shay/kanban/boards/<slug>/kanban.db   (tasks)
 *   - Shay plans           ~/.shay/plans/*.md                       (front-matter)
 *   - famtastic registry   ~/famtastic/plans/registry.json          (active plans)
 *   - famtastic tasks      ~/famtastic/tasks/tasks.jsonl
 *   - ADOPT-NOW recs       capability-map + impact-map (vault research notes)
 *   - builds               git log / proof ledger (mined by W-number / id)
 *
 * Detectors:
 *   1. owed-plan-no-task        — active/owed plan that dead-ends with no build task
 *   2. ADOPT-NOW-never-tasked   — capability flagged ADOPT-NOW with no fulfilling task
 *   3. built-but-triage         — task in non-terminal status with completion evidence
 *
 * No npm deps. node:sqlite (Node >=22) with a `sqlite3` CLI fallback.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const cp = require("node:child_process");

const HOME = os.homedir();
const FAMTASTIC = path.join(HOME, "famtastic");
const SHAY_HOME = path.join(HOME, ".shay");
const KANBAN_DIR = path.join(SHAY_HOME, "kanban", "boards");
const SHAY_PLANS_DIR = path.join(SHAY_HOME, "plans");
const REGISTRY = path.join(FAMTASTIC, "plans", "registry.json");
const FAM_TASKS = path.join(FAMTASTIC, "tasks", "tasks.jsonl");
const VAULT_RESEARCH = path.join(
  FAMTASTIC,
  "obsidian",
  "Shay-Memory",
  "research"
);
const CAPABILITY_MAP = path.join(VAULT_RESEARCH, "capability-map-2026-05-31.md");
const IMPACT_MAP = path.join(
  VAULT_RESEARCH,
  "missed-capabilities-impact-map-2026-05-31.md"
);

const TERMINAL_KANBAN = new Set(["done", "cancelled", "archived"]);
const NONTERMINAL_KANBAN = new Set(["triage", "todo", "ready", "blocked", "running"]);

// ---------------------------------------------------------------------------
// sqlite access — node:sqlite preferred, sqlite3 CLI fallback.
// ---------------------------------------------------------------------------
let DatabaseSync = null;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch {
  DatabaseSync = null;
}

function queryDb(dbPath, sql) {
  if (DatabaseSync) {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      return db.prepare(sql).all();
    } finally {
      db.close();
    }
  }
  // Fallback: sqlite3 CLI in -json mode.
  try {
    const out = cp.execFileSync("sqlite3", ["-json", dbPath, sql], {
      encoding: "utf-8",
    });
    return out.trim() ? JSON.parse(out) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// TRACE ID — stable, content-derived. We use the natural keys from the design.
// ---------------------------------------------------------------------------
function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Extract a W-number token (e.g. "W5", "W1.2") from a title, or null. */
function wNumber(title) {
  const m = String(title || "").match(/\bW[-\s]?(\d+(?:\.\d+)?)\b/i);
  return m ? "w" + m[1] : null;
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------
function readKanban() {
  const nodes = [];
  if (!fs.existsSync(KANBAN_DIR)) return nodes;
  for (const board of fs.readdirSync(KANBAN_DIR)) {
    const db = path.join(KANBAN_DIR, board, "kanban.db");
    if (!fs.existsSync(db)) continue;
    let rows;
    try {
      rows = queryDb(
        db,
        "SELECT id, title, status, completed_at, started_at, created_at, result FROM tasks"
      );
    } catch {
      continue;
    }
    for (const r of rows) {
      // A card whose title is the plan-authoring step ("... author ... plan",
      // "... port plan") is a PLAN node, not a build task. This is the W5 case:
      // the agentos board holds one `done` card that authored the Shay-OS port
      // plan but never spawned build tasks — Detector 1 must see W5 as an owed
      // plan with no fulfilling build task, not as a completed task.
      const isPlanCard = /\b(author|authored|writing|write)\b[^.]*\bplan\b|\bport plan\b/i.test(
        r.title
      );
      if (isPlanCard) {
        nodes.push({
          trace_id: `plan:${board}:${r.id}`,
          kind: "plan",
          title: r.title,
          source: `kanban:${board}`,
          ref: r.id,
          board,
          // The plan is owed/active even though its authoring card is `done` —
          // authoring the plan does not fulfil the plan. Mark active so
          // Detector 1 evaluates it for missing build tasks.
          status_raw: "active",
          wnum: wNumber(r.title),
          links: [],
        });
        continue;
      }
      nodes.push({
        trace_id: `task:${board}:${r.id}`,
        kind: "task",
        title: r.title,
        source: `kanban:${board}`,
        ref: r.id,
        board,
        status_raw: r.status,
        wnum: wNumber(r.title),
        completed_at: r.completed_at || null,
        result: r.result || null,
      });
    }
  }
  return nodes;
}

function readShayPlans() {
  const nodes = [];
  if (!fs.existsSync(SHAY_PLANS_DIR)) return nodes;
  for (const f of fs.readdirSync(SHAY_PLANS_DIR)) {
    if (!f.endsWith(".md")) continue;
    const fp = path.join(SHAY_PLANS_DIR, f);
    let text;
    try {
      text = fs.readFileSync(fp, "utf-8");
    } catch {
      continue;
    }
    const status = (text.match(/^status:\s*(.+)$/m) || [])[1];
    const links = [];
    const linkLine = (text.match(/^link:\s*\[(.+)\]\s*$/m) || [])[1];
    if (linkLine)
      for (const l of linkLine.split(","))
        links.push(l.trim().replace(/^["']|["']$/g, ""));
    nodes.push({
      trace_id: `plan:shay:${slug(f.replace(/\.md$/, ""))}`,
      kind: "plan",
      title: f.replace(/\.md$/, ""),
      source: "shay-plans",
      ref: f,
      status_raw: status ? status.trim() : null,
      wnum: wNumber(f),
      links,
    });
  }
  return nodes;
}

function readFamtasticPlans() {
  const nodes = [];
  let reg;
  try {
    reg = JSON.parse(fs.readFileSync(REGISTRY, "utf-8"));
  } catch {
    return nodes;
  }
  for (const id of reg.active_parent_ids || []) {
    nodes.push({
      trace_id: `plan:fam:${id}`,
      kind: "plan",
      title: id,
      source: "famtastic-registry",
      ref: id,
      status_raw: "active",
      wnum: wNumber(id),
      links: [],
    });
  }
  return nodes;
}

function readFamtasticTasks() {
  const nodes = [];
  if (!fs.existsSync(FAM_TASKS)) return nodes;
  for (const line of fs.readFileSync(FAM_TASKS, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    let t;
    try {
      t = JSON.parse(line);
    } catch {
      continue;
    }
    if (!t.task_id) continue;
    nodes.push({
      trace_id: `task:fam:${t.task_id}`,
      kind: "task",
      title: t.title || t.task_id,
      source: "famtastic-tasks",
      ref: t.task_id,
      plan_id: t.plan_id || null,
      status_raw: t.status || null,
      wnum: wNumber(t.title),
    });
  }
  return nodes;
}

/**
 * ADOPT-NOW recommendation nodes. The capability-map rows are category-level
 * (e.g. "MEMORY → TencentDB, TurboVec, graphify | ADOPT-NOW"). We split each
 * ADOPT-NOW row into individual repo/tool recommendation nodes so per-item
 * drift (the 6 silently-dropped items) is detectable. The impact-map's named
 * drops are used to seed/confirm the high-priority set.
 */
function readRecommendations() {
  const nodes = [];
  if (!fs.existsSync(CAPABILITY_MAP)) return nodes;
  const text = fs.readFileSync(CAPABILITY_MAP, "utf-8");
  for (const line of text.split("\n")) {
    if (!/ADOPT-NOW/i.test(line)) continue;
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    // | category | candidates | verdict | desc | gaps |
    if (cells.length < 4) continue;
    const category = cells[1].replace(/\*/g, "").trim();
    const candidates = cells[2];
    const verdict = cells[3];
    if (!/ADOPT-NOW/i.test(verdict)) continue;
    // Split candidate list on commas; each "owner/repo" or named tool is a rec.
    for (let cand of candidates.split(",")) {
      cand = cand.trim().replace(/\*/g, "");
      if (!cand) continue;
      // Use the repo basename / tool name as the item slug.
      const name = cand.includes("/") ? cand.split("/").pop() : cand;
      const itemSlug = slug(name);
      if (!itemSlug) continue;
      nodes.push({
        trace_id: `rec:capability-map-2026-05-31#${itemSlug}`,
        kind: "recommendation",
        title: cand,
        source: "capability-map",
        ref: cand,
        category,
        verdict: "ADOPT-NOW",
        item_slug: itemSlug,
        // Heuristic edges match ONLY on the distinctive item name (repo
        // basename / tool name) — NOT the category descriptor — so a rec is
        // never falsely "tasked" by an unrelated task that happens to share a
        // generic category word ("long", "context", "memory", "ui").
        tokens: tokenize(name),
      });
    }
  }
  // De-dupe by trace_id (categories can repeat a tool).
  const seen = new Set();
  return nodes.filter((n) => {
    if (seen.has(n.trace_id)) return false;
    seen.add(n.trace_id);
    return true;
  });
}

function tokenize(s) {
  return new Set(
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3)
  );
}

// ---------------------------------------------------------------------------
// Build nodes
// ---------------------------------------------------------------------------
function buildNodes() {
  return [
    ...readRecommendations(),
    ...readShayPlans(),
    ...readFamtasticPlans(),
    ...readKanban(),
    ...readFamtasticTasks(),
  ];
}

// ---------------------------------------------------------------------------
// Edge assertion
//   explicit  — plan front-matter `link:` lines + famtastic task.plan_id
//   heuristic — shared W-number, or rec-token overlap with a task/plan title
//   git-mined — a commit message naming a task id / W-number → build→task edge
// ---------------------------------------------------------------------------
function gitCommitsTouching(maxCount) {
  try {
    const out = cp.execFileSync(
      "git",
      ["log", `-n${maxCount}`, "--format=%h%x1f%s%x1f%b%x1e"],
      { cwd: FAMTASTIC, encoding: "utf-8", timeout: 15000 }
    );
    return out
      .split("\x1e")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const [sha, subject, body] = c.split("\x1f");
        return { sha, text: (subject || "") + " " + (body || "") };
      });
  } catch {
    return [];
  }
}

function buildEdges(nodes) {
  const edges = [];
  const at = new Date().toISOString();
  const byKind = (k) => nodes.filter((n) => n.kind === k);
  const tasks = byKind("task");
  const plans = byKind("plan");
  const recs = byKind("recommendation");

  const push = (from, to, rel, asserted_by, confidence) =>
    edges.push({ from, to, rel, asserted_by, confidence, at });

  // explicit: famtastic task.plan_id → its plan node
  for (const t of tasks) {
    if (t.plan_id) {
      const planNode = plans.find(
        (p) => p.ref === t.plan_id || p.trace_id === `plan:fam:${t.plan_id}`
      );
      if (planNode) push(planNode.trace_id, t.trace_id, "fulfilled_by", "explicit", 1.0);
    }
  }
  // explicit: shay plan front-matter link: [...]
  for (const p of plans) {
    for (const l of p.links || []) {
      const target = nodes.find((n) => n.trace_id === l);
      if (target) push(p.trace_id, target.trace_id, "fulfilled_by", "explicit", 1.0);
    }
  }

  // heuristic: shared W-number, plan ↔ task
  for (const p of plans) {
    if (!p.wnum) continue;
    for (const t of tasks) {
      if (t.wnum === p.wnum)
        push(p.trace_id, t.trace_id, "fulfilled_by", "heuristic", 0.7);
    }
  }

  // heuristic: rec token-overlap with a task or plan title (rec → plan|task)
  for (const r of recs) {
    for (const t of tasks) {
      if (tokenOverlap(r.tokens, t.title))
        push(r.trace_id, t.trace_id, "fulfilled_by", "heuristic", 0.5);
    }
    for (const p of plans) {
      if (tokenOverlap(r.tokens, p.title))
        push(r.trace_id, p.trace_id, "fulfilled_by", "heuristic", 0.5);
    }
  }

  // git-mined: commit naming a task id / W-number → build → task edge
  const commits = gitCommitsTouching(300);
  for (const c of commits) {
    const lc = c.text.toLowerCase();
    for (const t of tasks) {
      const idHit = t.ref && lc.includes(String(t.ref).toLowerCase());
      const wHit = t.wnum && new RegExp("\\b" + t.wnum + "\\b").test(lc);
      if (idHit || wHit) {
        const buildId = `build:famtastic:${c.sha}`;
        push(buildId, t.trace_id, "evidence_for", "git-mined", idHit ? 0.8 : 0.4);
      }
    }
  }

  return edges;
}

// Generic words that appear in many rec names AND in unrelated task titles —
// never sufficient on their own to assert a fulfilling edge.
const GENERIC_TOKENS = new Set([
  "agent",
  "agents",
  "memory",
  "high",
  "intelligence",
  "context",
  "long",
  "skill",
  "skills",
  "model",
  "models",
  "code",
  "coding",
  "research",
  "infra",
  "tool",
  "tools",
]);

function tokenOverlap(recTokens, title) {
  // Match ONLY on a distinctive proper-name token (the repo/tool name, length
  // >= 4, not a generic descriptor). This prevents "Adopt X" research cards or
  // unrelated tasks from falsely fulfilling a recommendation via shared
  // category words like "agent" or "memory".
  const tt = tokenize(title);
  for (const tok of recTokens) {
    if (tok.length >= 4 && !GENERIC_TOKENS.has(tok) && tt.has(tok)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Build graph
// ---------------------------------------------------------------------------
function buildGraph() {
  const nodes = buildNodes();
  const edges = buildEdges(nodes);
  const byId = new Map(nodes.map((n) => [n.trace_id, n]));
  const out = new Map(); // from -> [edge]
  for (const e of edges) {
    if (!out.has(e.from)) out.set(e.from, []);
    out.get(e.from).push(e);
  }
  return { nodes, edges, byId, out };
}

/** Children of a node by relation. */
function children(graph, traceId, rel) {
  return (graph.out.get(traceId) || [])
    .filter((e) => !rel || e.rel === rel)
    .map((e) => graph.byId.get(e.to))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Detectors
// ---------------------------------------------------------------------------
function isOwedPlan(p) {
  // famtastic-registry plans are owned by audit.js, which correctly accounts
  // for closeout packets + historical tasks. Detector 1 covers the SHAY
  // universe (kanban plan-cards + shay-plans) that audit.js cannot see, so we
  // do NOT re-flag famtastic plans here (avoids contradicting audit.js).
  if (p.source === "famtastic-registry") return false;
  const s = (p.status_raw || "").toLowerCase();
  return s === "active" || s === "live" || s === "in-progress";
}

/** Detector 1 — owed plan with no fulfilling (build) task. */
function detectOwedPlanNoTask(graph) {
  const out = [];
  for (const p of graph.nodes.filter((n) => n.kind === "plan")) {
    if (!isOwedPlan(p)) continue;
    const taskKids = children(graph, p.trace_id, "fulfilled_by").filter(
      (n) => n.kind === "task"
    );
    if (taskKids.length === 0) {
      out.push({
        plan: p.trace_id,
        title: p.title,
        source: p.source,
        reason: "owed plan has no fulfilling task",
      });
      continue;
    }
    // Has tasks, but all dead-end in a non-terminal status with no build evidence.
    const anyProgressing = taskKids.some((t) => {
      const buildKids = children(graph, t.trace_id); // evidence edges target task; check reverse
      const hasBuild = graph.edges.some(
        (e) => e.to === t.trace_id && e.rel === "evidence_for"
      );
      const terminal = TERMINAL_KANBAN.has((t.status_raw || "").toLowerCase());
      return terminal || hasBuild;
    });
    if (!anyProgressing) {
      out.push({
        plan: p.trace_id,
        title: p.title,
        source: p.source,
        reason: "all child tasks non-terminal with no build evidence",
      });
    }
  }
  return out;
}

/** Detector 2 — ADOPT-NOW recommendation never tasked. */
function detectAdoptNowNeverTasked(graph) {
  const out = [];
  for (const r of graph.nodes.filter((n) => n.kind === "recommendation")) {
    if (!/ADOPT-NOW/i.test(r.verdict || "")) continue;
    const kids = children(graph, r.trace_id, "fulfilled_by");
    const reachesTask = kids.some((n) => n.kind === "task");
    const reachesPlanWithTask = kids
      .filter((n) => n.kind === "plan")
      .some((p) => children(graph, p.trace_id, "fulfilled_by").some((n) => n.kind === "task"));
    if (!reachesTask && !reachesPlanWithTask) {
      out.push({
        rec: r.trace_id,
        item: r.title,
        category: r.category,
        reason: "ADOPT-NOW with no fulfilling task",
      });
    }
  }
  return out;
}

/**
 * Cerebrum completion evidence. Returns the lowercased text of the most recent
 * "UI sprint" / build entries from .wolf/cerebrum.md, used as probabilistic
 * (proposes-not-disposes) completion evidence for Detector 3.
 */
function cerebrumEvidenceText() {
  const cerebrum = path.join(FAMTASTIC, ".wolf", "cerebrum.md");
  try {
    return fs.readFileSync(cerebrum, "utf-8").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Does cerebrum assert this card shipped? We require a distinctive title token
 * (length >= 4, e.g. "models", "soul", "interview", "inbox") to co-occur with a
 * completion verb ("built", "shipped", "minted", "mounted", "wired", "fixed")
 * in the cerebrum text. Conservative on purpose — a wrong proposal is a 1-click
 * dismiss, but the reconciler PROPOSES, it never auto-completes.
 */
function cerebrumSaysBuilt(title, cere) {
  if (!cere) return false;
  const COMPLETION = /(built|shipped|minted|mounted|wired|fixed|complete|landed|render-spine)/;
  if (!COMPLETION.test(cere)) return false;
  for (const tok of tokenize(title)) {
    if (tok.length < 4) continue;
    if (
      ["model", "models", "soul", "interview", "inbox", "chat", "skill", "skills", "screen", "registry"].includes(
        tok
      ) &&
      cere.includes(tok)
    ) {
      return true;
    }
  }
  return false;
}

/** Detector 3 — built-but-triage: non-terminal task with completion evidence. */
function detectBuiltButTriage(graph) {
  const out = [];
  const cere = cerebrumEvidenceText();
  for (const t of graph.nodes.filter((n) => n.kind === "task")) {
    const status = (t.status_raw || "").toLowerCase();
    if (!["triage", "todo", "ready"].includes(status)) continue;
    // completion evidence: a git-mined build edge, a non-empty result, or a
    // cerebrum sprint entry asserting the work shipped.
    const hasBuild = graph.edges.some(
      (e) => e.to === t.trace_id && e.rel === "evidence_for"
    );
    const hasResult = t.result && String(t.result).trim().length > 0;
    const cereBuilt = cerebrumSaysBuilt(t.title, cere);
    if (hasBuild || hasResult || cereBuilt) {
      let evidence;
      if (hasBuild) evidence = "git commit names this task";
      else if (hasResult) evidence = "task has a result";
      else evidence = "cerebrum UI-sprint entry asserts it shipped";
      out.push({
        task: t.trace_id,
        title: t.title,
        board: t.board,
        status,
        evidence,
        confidence: hasBuild ? "high" : hasResult ? "high" : "heuristic",
        suggestion: t.board
          ? `shay kanban --board ${t.board} complete ${t.ref}`
          : null,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function reconcile() {
  const graph = buildGraph();
  return {
    graph,
    owedPlanNoTask: detectOwedPlanNoTask(graph),
    adoptNowNeverTasked: detectAdoptNowNeverTasked(graph),
    builtButTriage: detectBuiltButTriage(graph),
  };
}

/** Write nodes.jsonl + edges.jsonl idempotently (content-sorted). */
function writeLedger(traceDir) {
  const { nodes, edges } = buildGraph();
  fs.mkdirSync(traceDir, { recursive: true });
  // Strip volatile fields (tokens Set, derived) and sort for idempotency.
  const nodeLines = nodes
    .map((n) => {
      const { tokens, ...rest } = n;
      return rest;
    })
    .sort((a, b) => a.trace_id.localeCompare(b.trace_id))
    .map((n) => JSON.stringify(n));
  // Edges: drop the volatile `at` timestamp from the persisted form so the
  // ledger is byte-stable across runs (idempotent).
  const edgeLines = edges
    .map(({ at, ...rest }) => rest)
    .sort((a, b) =>
      (a.from + a.to + a.rel).localeCompare(b.from + b.to + b.rel)
    )
    .map((e) => JSON.stringify(e));
  fs.writeFileSync(path.join(traceDir, "nodes.jsonl"), nodeLines.join("\n") + "\n");
  fs.writeFileSync(path.join(traceDir, "edges.jsonl"), edgeLines.join("\n") + "\n");
  return { nodeCount: nodeLines.length, edgeCount: edgeLines.length };
}

module.exports = {
  buildGraph,
  reconcile,
  writeLedger,
  detectOwedPlanNoTask,
  detectAdoptNowNeverTasked,
  detectBuiltButTriage,
  TRACE_DIR: path.join(
    FAMTASTIC,
    "obsidian",
    "Shay-Memory",
    "_system",
    "trace"
  ),
};
