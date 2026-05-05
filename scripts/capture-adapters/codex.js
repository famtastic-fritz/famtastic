/**
 * capture-adapter: codex — reads a codex-bridge transcript dump and extracts
 * findings. Codex sessions tend to produce structured adversarial reviews,
 * so we look for verdict markers and review rounds specifically.
 */

const fs = require('fs');
const path = require('path');
const manual = require('./manual');

async function extract(args) {
  const { inputPath } = args;
  const raw = fs.readFileSync(inputPath, 'utf8');

  // Codex review pattern: rounds + verdict + section headers
  const verdictRe = /\b(?:Final )?Verdict[: ]\s*(ship-as-is|amend(?:-again)?|reject(?:-and-rethink)?)/gi;
  const roundRe = /\bRound\s+(\d+)\b/gi;

  const verdicts = [...raw.matchAll(verdictRe)].map((m) => m[1].toLowerCase());
  const rounds = [...raw.matchAll(roundRe)].map((m) => parseInt(m[1], 10));

  // Defer to the manual adapter for the bulk of pattern extraction
  const base = await manual.extract(args);

  // Add a learning entry summarizing the codex review if rounds detected
  if (rounds.length > 0 || verdicts.length > 0) {
    const maxRound = rounds.length ? Math.max(...rounds) : 1;
    const finalVerdict = verdicts[verdicts.length - 1] || 'unknown';
    base.extracted.unshift({
      extract_id: 'x_review_meta',
      type: 'learning',
      text: `Codex adversarial review: ${maxRound} rounds, final verdict "${finalVerdict}"`,
      rationale: `Detected codex review pattern. Useful for adversarial-loop telemetry and tuning the loop's stop conditions.`,
      evidence: [`source:${path.basename(inputPath)}`, `rounds:${maxRound}`, `verdict:${finalVerdict}`],
      facets: ['agents', 'governance', 'surface:codex'],
      confidence: 0.92,
      candidate_id: null,
    });
  }

  // Confidence boost — Codex output is structured + adversarial
  base.extracted = base.extracted.map((e) => ({
    ...e,
    confidence: Math.min(1.0, e.confidence + 0.04),
    evidence: [...(e.evidence || []), 'surface:codex'],
  }));
  base.summary = `Codex session — ${rounds.length} rounds, ${base.extracted.length} extracts. ${base.summary}`;
  return base;
}

module.exports = { extract };
