'use strict';

// lib/famtastic/capture/extract.js
// SHAY V2 (2026-05-02 iter 3): LLM-assisted extraction.
//
// Takes a transcript (markdown or jsonl), proposes capture items via a structured
// prompt, returns the proposals. Two modes:
//
//   1. With ANTHROPIC_API_KEY — calls the API directly via fetch (no SDK dependency
//      so this module stays pure ecosystem-level).
//   2. Without API key — outputs the prompt + transcript for manual paste into
//      Claude Web. User pastes the response back into the scaffold.
//
// Item types extracted: Decisions, Breakthroughs, Gaps, Lessons, Patterns,
// Contradictions — same taxonomy as the manual capture template.

const fs = require('fs');
const path = require('path');

const FAM_ROOT = path.resolve(process.env.HOME || '/root', 'famtastic');

const EXTRACTION_PROMPT_TEMPLATE = `You are reading a conversation transcript from the FAMtastic project. Your job is to extract structured "capture items" — the kinds of insights, decisions, and gaps that should land in the project's permanent knowledge base.

Read the transcript below carefully. For each insight worth capturing, output one item using this exact format:

### {ID-PREFIX}-{DATE}-XX — {short title}

STATUS: pending
LANDS IN: {destination canonical file}

{body — a few sentences describing the insight}

---

Item types and their ID prefixes:
- D = Decision (was decided in this conversation; lands in .wolf/cerebrum.md (Decision Log))
- B = Breakthrough (a realization that unlocks future work; lands in .wolf/cerebrum.md (Key Learnings))
- G = Gap (a capability missing or broken; lands in .wolf/gaps.jsonl)
- L = Lesson (something learned to apply going forward; lands in .wolf/cerebrum.md (Lessons / Do-Not-Repeat))
- P = Pattern (recurring observation, watch-list candidate; lands in .wolf/cerebrum.md (Patterns))
- C = Contradiction (something that contradicts a prior assumption; lands in .wolf/cerebrum.md (revised Decision Log entry))

Use {DATE} = {{TODAY}} and increment XX for each item.

Be conservative. If the transcript is mostly chitchat, output zero items. If something is genuinely worth permanent capture, write it as one item. Aim for 3-15 items per transcript on average. Each item should be self-contained — a future reader who never saw the original transcript should understand it.

Do not include narrative around the items. Output only the items, separated by --- as shown.

TRANSCRIPT:

{{TRANSCRIPT}}
`;

function buildPrompt(transcriptText) {
  const today = new Date().toISOString().slice(0, 10);
  return EXTRACTION_PROMPT_TEMPLATE
    .replace(/\{\{TODAY\}\}/g, today)
    .replace(/\{\{TRANSCRIPT\}\}/g, transcriptText);
}

async function callAnthropic(prompt, opts) {
  opts = opts || {};
  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const model = opts.model || 'claude-sonnet-4-6';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error('Anthropic API error ' + res.status + ': ' + errBody.slice(0, 500));
  }
  const data = await res.json();
  const text = (data.content || []).map(b => b.text || '').join('\n').trim();
  return { text, usage: data.usage, model: data.model };
}

async function extractFromTranscript(transcriptText, opts) {
  opts = opts || {};
  const prompt = buildPrompt(transcriptText);

  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey || opts.manual) {
    return {
      mode: 'manual',
      prompt: prompt,
      instructions: 'No ANTHROPIC_API_KEY found (or --manual specified). Paste the prompt above into Claude Web. Copy the response back into a scaffold created via `node lib/famtastic/capture/cli.js scaffold`.'
    };
  }

  try {
    const r = await callAnthropic(prompt, opts);
    return {
      mode: 'api',
      items_text: r.text,
      usage: r.usage,
      model: r.model,
      cost_estimate_usd: estimateCost(r.usage, r.model)
    };
  } catch (err) {
    return {
      mode: 'error',
      error: err.message,
      fallback_prompt: prompt
    };
  }
}

function estimateCost(usage, model) {
  if (!usage) return null;
  // Rough rates as of 2026; will need to update when model lineup changes.
  const rates = {
    'claude-sonnet-4-6':   { input: 3.0, output: 15.0 },  // $/M tokens
    'claude-haiku-4-5':    { input: 0.8, output: 4.0 },
    'claude-opus-4-7':     { input: 15.0, output: 75.0 }
  };
  const r = rates[model] || rates['claude-sonnet-4-6'];
  const inCost = (usage.input_tokens || 0) / 1_000_000 * r.input;
  const outCost = (usage.output_tokens || 0) / 1_000_000 * r.output;
  return Number((inCost + outCost).toFixed(6));
}

function readTranscript(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(FAM_ROOT, filePath);
  if (!fs.existsSync(abs)) throw new Error('transcript not found: ' + abs);
  return fs.readFileSync(abs, 'utf8');
}

module.exports = { extractFromTranscript, buildPrompt, readTranscript, callAnthropic };
