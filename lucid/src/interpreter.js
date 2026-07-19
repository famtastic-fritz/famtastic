// interpreter.js — the elicit -> clarify -> interpret core.
//
// interpret() is the clean interface. By default it uses the offline local
// interpreter (no network, no keys). If INTERPRETER_PROVIDER is set in the
// environment, it routes to a real provider instead — that path is stubbed
// here so you can wire in your key later without touching the UI or server.

import { detectSymbols } from "./symbols.js";

// ---- elicit/clarify -------------------------------------------------------

// Generate up to two gentle follow-up questions based on what we DON'T yet
// know about the dream. The clarify step makes interpretation feel like a
// conversation rather than a one-shot box.
export function clarifyQuestions(dream) {
  const qs = [];
  const p = dream.prompts || {};

  if (!p.feeling || !String(p.feeling).trim()) {
    qs.push({
      key: "feeling",
      text: "When you woke from this, what feeling was left behind — even faintly?",
    });
  }

  const symbols = detectSymbols(dream.text);
  if (symbols.length && qs.length < 2) {
    const s = symbols[0];
    qs.push({
      key: "standout",
      text: `The ${s.id.replace(/_/g, " ")} stood out to me. Was there a moment in the dream that felt most vivid or charged?`,
    });
  }

  if (qs.length === 0) {
    qs.push({
      key: "standout",
      text: "What part of the dream are you still thinking about now?",
    });
  }

  return qs.slice(0, 2);
}

// ---- interpret ------------------------------------------------------------

// Public interface. Returns { source, body, themes, symbols }.
export async function interpret(dream) {
  const provider = process.env.INTERPRETER_PROVIDER;
  if (provider && process.env.INTERPRETER_API_KEY) {
    return interpretWithProvider(dream, provider);
  }
  return localInterpret(dream);
}

// STUB: real LLM path. Wire your provider call in here. Until a key is present
// this is never reached, so the app runs fully offline. Kept intentionally
// thin and clearly marked.
async function interpretWithProvider(dream, provider) {
  // Example shape (left unimplemented on purpose — no network in the sandbox):
  //
  //   const res = await fetch(providerEndpoint(provider), {
  //     method: "POST",
  //     headers: { authorization: `Bearer ${process.env.INTERPRETER_API_KEY}` },
  //     body: JSON.stringify({ model: process.env.INTERPRETER_MODEL, prompt: buildPrompt(dream) }),
  //   });
  //   const json = await res.json();
  //   return { source: provider, body: json.text, themes: [], symbols: [] };
  //
  // For now, fall back to the local interpreter but label the source so the UI
  // can show that a provider was configured.
  const local = localInterpret(dream);
  return { ...local, source: `${provider} (stub → local fallback)` };
}

// The real, offline interpreter. Composes a warm, reflective reading from the
// detected symbols, the dreamer's stated feeling, and the clarify answers.
export function localInterpret(dream) {
  const symbols = detectSymbols(dream.text);
  const p = dream.prompts || {};
  const c = dream.clarifications || {};
  const feeling = (c.feeling || p.feeling || "").trim();

  const parts = [];

  // 1) Opening reflection — anchored to the feeling if we have one.
  if (feeling) {
    parts.push(
      `There's a thread of *${feeling.toLowerCase()}* running through this dream, and that's worth holding onto — the feeling a dream leaves behind is often a truer guide than its plot.`,
    );
  } else {
    parts.push(
      "Let's sit with this one gently. Dreams rarely mean just one thing; they tend to hand us a feeling and a few images and let us find the thread.",
    );
  }

  // 2) Symbol readings.
  if (symbols.length === 0) {
    parts.push(
      "No single well-worn symbol jumps out, which is its own kind of signal — this may be your mind processing the ordinary texture of your days rather than working on one big knot.",
    );
  } else {
    const shown = symbols.slice(0, 3);
    for (const s of shown) {
      parts.push(s.reading);
    }
    if (symbols.length > 3) {
      parts.push(
        "There's more layered in here than any one reading can hold — these are starting points, not verdicts.",
      );
    }
  }

  // 3) Weave in the standout moment if given.
  if (c.standout && String(c.standout).trim()) {
    parts.push(
      `You named *${String(c.standout).trim()}* as the charged moment — that's likely where the dream is pointing most directly. Notice what that image asks of you.`,
    );
  }

  // 4) Gentle closing question to sit with.
  const closers = [
    "Sitting with it now: where in your waking life does this feeling already live?",
    "What would it mean to give this image a little attention today, rather than explaining it away?",
    "If the dream were trying to protect or prepare you for something, what might that be?",
  ];
  const closer = closers[(dream.text || "").length % closers.length];
  parts.push(closer);

  return {
    source: "local",
    body: parts.join("\n\n"),
    themes: [...new Set(symbols.map((s) => s.theme))],
    symbols: symbols.map((s) => s.id),
  };
}
