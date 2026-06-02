'use strict';
/**
 * Idea-backlog collector.
 *
 * Ingests the scattered idea docs, normalizes "N. Name - $price" lines,
 * de-dupes, and separates real opportunities from auto-generated noise.
 *
 * The repo's idea docs are ~90% near-duplicate filler ("Token Optimizer X",
 * "FinceptTerminal Y", "Hermes Z" permutations). Those collapse into a single
 * counted noise bucket instead of pretending to be 1,000 opportunities.
 * Real, grounded opportunities (web studio, NCS, NIBS, Upwork) are scored and
 * surfaced.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const SOURCES = [
  '1000-IDEAS.md',
  'BUSINESS-ARsenal.md',
  'MORNING-EXECUTION-PLAN.md',
  'AUTONOMOUS-REVENUE-PIPELINE.md'
];

// Lines matching these are auto-generated permutation filler, not real
// opportunities. The idea docs are template explosions over a list of repo
// names ("Complete X Tutorial", "X-as-a-Service for SMBs", "X for specific
// industry (Y)", etc.) — all collapse into one counted noise bucket.
const NOISE = /token[\s-]?optimizer|fincept|hermes|openhands|code review graph|complete .+ tutorial|as-a-service for smbs|for specific industry|natural language interface for|chatbot assistant|prompt library|copilot|voice-controlled|monitoring & alerts|resource optimizer|security scanner|setup wizard|configuration generator|template marketplace|api access proxy|managed hosting|docker deployment|migration from legacy/i;

// Where the REAL, grounded opportunities live (curated, dollar-bearing).
const REVENUE_PLANS_DIR = 'revenue-plans';

function parseLine(line) {
  // "12. Some Idea Name - $500-2000" / "- Idea - $99/month"
  const m = line.match(/^\s*(?:\d+\.|[-*])\s*(.+?)\s*[-–—]\s*\$?([\d,]+)(?:\s*-\s*\$?([\d,]+))?(\s*\/\s*(?:mo|month|user|scan|call|template|config))?/i);
  if (!m) return null;
  const name = m[1].trim();
  if (name.length < 4) return null;
  const low = Number((m[2] || '0').replace(/,/g, ''));
  const high = m[3] ? Number(m[3].replace(/,/g, '')) : low;
  const recurring = !!m[4];
  return { name, low, high, recurring };
}

function normalizeKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreIdea(idea) {
  // Curated opportunities from revenue-plans are real by construction.
  let score = idea.curated ? 60 : 0;
  const mid = (idea.low + idea.high) / 2;
  if (mid >= 5000) score += 25;
  else if (mid >= 2000) score += 20;
  else if (mid >= 500) score += 12;
  else if (mid > 0) score += 5;
  if (idea.recurring) score += 15;
  return Math.min(100, score);
}

/**
 * Parse the real, grounded opportunities out of revenue-plans/.
 * Recognizes two shapes:
 *   - Upwork gig blocks:  "### Title" + "**Budget:** $X"
 *   - Pitch docs:         "**Investment:** $X" / "Investment: $X" with a title
 */
function parseRevenuePlans() {
  const dir = path.join(REPO_ROOT, REVENUE_PLANS_DIR);
  const out = [];
  let files;
  try {
    files = walkMd(dir);
  } catch {
    return out;
  }
  for (const abs of files) {
    let text;
    try { text = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    const rel = path.relative(REPO_ROOT, abs);

    // Upwork gig blocks
    const gigRe = /^###\s+(.+)$/gm;
    let m;
    while ((m = gigRe.exec(text))) {
      const title = m[1].trim();
      const after = text.slice(m.index, m.index + 300);
      const b = after.match(/Budget:\*?\*?\s*\$?([\d,]+)/i);
      if (b) {
        const amt = Number(b[1].replace(/,/g, ''));
        out.push({ name: title, low: amt, high: amt, recurring: false, curated: true, source: rel });
      }
    }

    // Pitch-level investment
    const inv = text.match(/Investment:\*?\*?\s*\$?([\d,]+)/i);
    if (inv) {
      const h1 = (text.match(/^#\s+(.+)$/m) || [])[1] || path.basename(abs, '.md');
      const amt = Number(inv[1].replace(/,/g, ''));
      out.push({ name: h1.trim(), low: amt, high: amt, recurring: false, curated: true, source: rel });
    }
  }
  return out;
}

function walkMd(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMd(abs));
    else if (entry.isFile() && entry.name.endsWith('.md')) results.push(abs);
  }
  return results;
}

function collect() {
  const byKey = new Map();
  let noiseCount = 0;
  const filesRead = [];

  for (const rel of SOURCES) {
    const abs = path.join(REPO_ROOT, rel);
    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    filesRead.push(rel);
    for (const line of text.split('\n')) {
      const parsed = parseLine(line);
      if (!parsed) continue;
      if (NOISE.test(parsed.name)) {
        noiseCount++;
        continue;
      }
      const key = normalizeKey(parsed.name);
      if (!byKey.has(key)) byKey.set(key, { ...parsed, sources: new Set([rel]) });
      else byKey.get(key).sources.add(rel);
    }
  }

  // Real, curated opportunities from revenue-plans take priority.
  for (const r of parseRevenuePlans()) {
    const key = normalizeKey(r.name);
    if (byKey.has(key)) {
      const ex = byKey.get(key);
      ex.curated = true;
      ex.low = r.low; ex.high = r.high;
      ex.sources.add(r.source);
    } else {
      byKey.set(key, { ...r, sources: new Set([r.source]) });
    }
  }
  if (parseRevenuePlans().length) filesRead.push(REVENUE_PLANS_DIR + '/*');

  const ideas = [...byKey.values()]
    .map((i) => ({
      name: i.name,
      low: i.low,
      high: i.high,
      recurring: i.recurring,
      curated: !!i.curated,
      sources: [...i.sources],
      score: scoreIdea(i)
    }))
    .sort((a, b) => b.score - a.score);

  return {
    real: ideas.filter((i) => i.score >= 50),
    backlog: ideas.filter((i) => i.score < 50),
    totalUnique: ideas.length,
    noiseCollapsed: noiseCount,
    filesRead
  };
}

module.exports = { collect };
