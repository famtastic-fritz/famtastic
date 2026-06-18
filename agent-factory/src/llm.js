// OpenRouter-style model client. LIVE when OPENROUTER_API_KEY is set; otherwise
// a deterministic offline STUB that makes zero network calls and never spends.
// Either way it returns { text, usage:{input_tokens,output_tokens}, mode }.
import { loadEnv } from './util.js';

loadEnv();

function approxTokens(s) { return Math.max(1, Math.ceil((s || '').length / 4)); }

// Deterministic offline completion. It is intentionally simple — the point of the
// factory is the orchestration, not the model. It echoes task-shaped guidance so
// downstream skills can still produce real artifacts offline.
function stubComplete({ system, prompt, model }) {
  const input_tokens = approxTokens(system) + approxTokens(prompt);
  const seedText =
    `[stub:${model}] ` +
    `Handled prompt deterministically offline. ` +
    `Key points extracted: ${(prompt || '').split(/\s+/).slice(0, 12).join(' ')}...`;
  const output_tokens = approxTokens(seedText) + 40; // pretend a bit of reasoning
  return { text: seedText, usage: { input_tokens, output_tokens }, mode: 'stub' };
}

async function liveComplete({ system, prompt, model }) {
  const base = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const usage = {
    input_tokens: data.usage?.prompt_tokens ?? approxTokens(system) + approxTokens(prompt),
    output_tokens: data.usage?.completion_tokens ?? approxTokens(text),
  };
  return { text, usage, mode: 'live' };
}

export function isLive() {
  return Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim());
}

export async function complete(opts) {
  return isLive() ? liveComplete(opts) : stubComplete(opts);
}

export default { complete, isLive };
