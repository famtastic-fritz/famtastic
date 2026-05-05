/**
 * capture-adapter: claude-code — Claude Code session transcript.
 *
 * Accepts either:
 *   - A raw transcript text/markdown file (treated like manual)
 *   - A JSON file with shape { messages: [{role, content}, ...] }
 *
 * Produces v0.2 extracts using the manual adapter's pattern engine
 * but with surface-aware confidence boosts (Claude Code sessions tend to
 * make explicit decisions, so we trust them slightly more).
 */

const fs = require('fs');
const path = require('path');
const manual = require('./manual');

async function extract(args) {
  const { inputPath } = args;
  const raw = fs.readFileSync(inputPath, 'utf8');

  let normalizedText = raw;
  let messages = null;

  // Try JSON parse first
  if (inputPath.endsWith('.json') || raw.trimStart().startsWith('{') || raw.trimStart().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.messages)) {
        messages = parsed.messages;
      } else if (Array.isArray(parsed)) {
        messages = parsed;
      }
    } catch (_) { /* fall through to text */ }
  }

  if (messages) {
    // Reduce to text: alternating speaker blocks
    normalizedText = messages
      .map((m) => {
        const role = (m.role || m.speaker || 'unknown').toUpperCase();
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return `### ${role}\n\n${content}`;
      })
      .join('\n\n');

    // Write a normalized temp file for manual.extract to parse
    const tmpPath = inputPath + '.normalized.tmp.md';
    fs.writeFileSync(tmpPath, normalizedText);
    const result = await manual.extract({ ...args, inputPath: tmpPath });
    try { fs.unlinkSync(tmpPath); } catch (_) {}

    // Confidence boost — Claude Code transcripts have higher signal density
    result.extracted = result.extracted.map((e) => ({
      ...e,
      confidence: Math.min(1.0, e.confidence + 0.05),
      evidence: [...(e.evidence || []), `surface:claude-code`, `messages:${messages.length}`],
    }));
    result.summary = `Claude Code session — ${messages.length} messages. ${result.extracted.length} extracts.`;
    return result;
  }

  // Fall back to manual adapter on raw text
  const result = await manual.extract(args);
  result.extracted = result.extracted.map((e) => ({
    ...e,
    confidence: Math.min(1.0, e.confidence + 0.03),
    evidence: [...(e.evidence || []), `surface:claude-code`],
  }));
  result.summary = `Claude Code session (raw) — ${path.basename(inputPath)}. ${result.extracted.length} extracts.`;
  return result;
}

module.exports = { extract };
