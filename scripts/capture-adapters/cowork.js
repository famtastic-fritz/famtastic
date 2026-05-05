/**
 * capture-adapter: cowork — reads a cowork status JSONL log
 * (e.g. handoffs/cowork-ops-execution-status.jsonl) and turns checkpoint /
 * commit / blocker / done events into capture extracts.
 */

const fs = require('fs');
const path = require('path');

async function extract({ inputPath, captureId, now }) {
  const raw = fs.readFileSync(inputPath, 'utf8').trim();
  if (!raw) {
    return {
      summary: `Cowork status log was empty (${path.basename(inputPath)}).`,
      extracted: [],
      timestampRange: { start: null, end: now },
      openGaps: ['Cowork session produced no observable status events; ghost-session pattern.'],
    };
  }

  const lines = raw.split('\n').filter(Boolean);
  const events = [];
  for (const line of lines) {
    try { events.push(JSON.parse(line)); } catch (_) { /* skip malformed */ }
  }

  const extracted = [];
  let n = 0;

  for (const ev of events) {
    if (ev.event === 'blocker' || ev.event === 'human_help_needed') {
      extracted.push({
        extract_id: `x_${++n}`,
        type: 'gap',
        text: `Cowork blocker on ${ev.workstream || ev.phase || 'unknown'}: ${ev.blocker || ev.summary || ''}`.slice(0, 200),
        rationale: ev.summary || ev.blocker || JSON.stringify(ev),
        evidence: [`source:${path.basename(inputPath)}`, `ts:${ev.ts}`],
        facets: ['agents', 'cowork', `surface:cowork`],
        confidence: 0.85,
        candidate_id: `gap/cowork-${(ev.workstream || 'blocker').replace(/[^a-z0-9-]/gi, '-').toLowerCase()}-${Date.now()}`,
      });
    } else if (ev.event === 'done') {
      extracted.push({
        extract_id: `x_${++n}`,
        type: 'learning',
        text: `Cowork completed: ${ev.summary || 'session done'}`.slice(0, 200),
        rationale: ev.summary || JSON.stringify(ev),
        evidence: [`source:${path.basename(inputPath)}`, `commits:${(ev.commits || []).join(',')}`],
        facets: ['agents', 'cowork'],
        confidence: 0.78,
        candidate_id: null,
      });
    } else if (ev.event === 'stop') {
      extracted.push({
        extract_id: `x_${++n}`,
        type: 'bug-pattern',
        text: `Cowork stop: ${ev.summary || ev.blocker || 'unknown reason'}`.slice(0, 200),
        rationale: ev.summary || JSON.stringify(ev),
        evidence: [`source:${path.basename(inputPath)}`],
        facets: ['agents', 'cowork'],
        confidence: 0.85,
        candidate_id: `bug-pattern/cowork-stop-${Date.now()}`,
      });
    }
  }

  // Special case: zero events but log existed
  if (events.length === 0) {
    extracted.push({
      extract_id: 'x_1',
      type: 'bug-pattern',
      text: 'Cowork ghost-session: handshake never landed, status log stayed empty',
      rationale: `Status log file existed but contained no JSON events. Cowork may have spun up but skipped the handshake protocol or worked silently in a different worktree. Today's MBSH/Ops cowork run exhibited this pattern.`,
      evidence: [`source:${path.basename(inputPath)}`, 'observed:2026-05-05'],
      facets: ['agents', 'cowork', 'surface:cowork'],
      confidence: 0.9,
      candidate_id: 'bug-pattern/cowork-handshake-silent-failure',
    });
  }

  return {
    summary: `Cowork status capture from ${path.basename(inputPath)}: ${events.length} events, ${extracted.length} extracts.`,
    extracted,
    timestampRange: events.length
      ? { start: events[0].ts, end: events[events.length - 1].ts }
      : { start: null, end: now },
    openGaps: [],
  };
}

module.exports = { extract };
