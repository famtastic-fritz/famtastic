/**
 * capture-adapter: manual — paste any text/markdown/transcript file.
 * Reuses the bucket-pattern logic of scripts/capture-insights.js but emits
 * the v0.2 capture-packet shape used by session-capture.js.
 */

const fs = require('fs');
const path = require('path');

// Pattern buckets — same intent as capture-insights.js but emitting v0.2 types.
// Each bucket maps to a canonical `type` from memory/TAXONOMY.md.
const PATTERNS = [
  { type: 'decision',     re: /(?:we (?:decided|chose|picked)|decision[: ]|chose .* over)/i,  facets: [], baseConfidence: 0.78 },
  { type: 'rule',         re: /(?:must (?:not |never )?|always |never |non[- ]negotiable|rule[: ])/i, facets: [], baseConfidence: 0.72 },
  { type: 'do-not-repeat',re: /(?:do[- ]not[- ]repeat|never (?:do |use )|don'?t (?:do |use ))/i, facets: [], baseConfidence: 0.85 },
  { type: 'vendor-fact',  re: /(?:netlify|godaddy|cpanel|resend|stripe|github|openai|anthropic|gemini)\b.{0,80}(?:cannot|does not|requires|only|api)/i, facets: [], baseConfidence: 0.88 },
  { type: 'bug-pattern',  re: /(?:bug[: ]|root cause[: ]|fix[: ]|fixed by|broke because|silent failure|race condition)/i, facets: [], baseConfidence: 0.85 },
  { type: 'gap',          re: /(?:still (?:missing|blocked)|known gap|TODO[: ]|gap[: ]|not yet)/i, facets: [], baseConfidence: 0.7 },
  { type: 'preference',   re: /(?:prefer |preferred|favorite|like (?:to|when)|don'?t like)/i, facets: [], baseConfidence: 0.65 },
  { type: 'anti-pattern', re: /(?:anti[- ]pattern|looks right but|don'?t do this|over[- ]engineer)/i, facets: [], baseConfidence: 0.75 },
  { type: 'learning',     re: /(?:learned|learning[: ]|turns out|discovered|insight[: ]|takeaway)/i, facets: [], baseConfidence: 0.7 },
];

const VENDOR_FACETS = ['netlify', 'godaddy', 'cpanel', 'resend', 'stripe', 'github', 'openai', 'anthropic', 'gemini', 'adobe', 'figma'];
const DOMAIN_FACETS = ['platform', 'site-execution', 'deploy', 'ui-shell', 'ledgers', 'agents', 'ops', 'shay-shay', 'governance', 'memory', 'capture'];

function deriveFacets(text) {
  const t = text.toLowerCase();
  const facets = [];
  for (const v of VENDOR_FACETS) {
    if (t.includes(v)) facets.push(`vendor:${v}`);
  }
  for (const d of DOMAIN_FACETS) {
    if (t.includes(d)) facets.push(d);
  }
  return Array.from(new Set(facets));
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function* paragraphs(text) {
  const lines = text.split(/\n{2,}/);
  for (const block of lines) {
    const trimmed = block.trim();
    if (trimmed.length > 20) yield trimmed;
  }
}

async function extract({ inputPath, captureId, now }) {
  const text = fs.readFileSync(inputPath, 'utf8');
  const stat = fs.statSync(inputPath);

  const extracted = [];
  let n = 0;
  for (const para of paragraphs(text)) {
    for (const pat of PATTERNS) {
      if (pat.re.test(para)) {
        const facets = deriveFacets(para);
        const titleSeed = para.split(/[.!?]/)[0].slice(0, 100);
        const slug = slugify(titleSeed);
        extracted.push({
          extract_id: `x_${++n}`,
          type: pat.type,
          text: titleSeed,
          rationale: para.length > 200 ? para.slice(0, 500) : para,
          evidence: [`source:${path.basename(inputPath)}`],
          facets,
          confidence: pat.baseConfidence,
          candidate_id: slug ? `${pat.type}/${slug}` : null,
        });
        break; // one type per paragraph
      }
    }
  }

  return {
    summary: `Manual capture of ${path.basename(inputPath)} (${stat.size} bytes). ${extracted.length} extracts found across ${PATTERNS.length} type patterns.`,
    extracted,
    timestampRange: { start: stat.mtime.toISOString(), end: now },
    openGaps: extracted.length === 0 ? ['No patterns matched — input may need a different adapter or richer transcript.'] : [],
  };
}

module.exports = { extract };
