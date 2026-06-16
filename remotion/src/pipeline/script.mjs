// Script generation. Produces { title, scenes:[{text, kind}], source }.
//
// If OPENAI_API_KEY (or ANTHROPIC_API_KEY) is set we ask an LLM for a
// punchy faceless-video script. With no key we fall back to a structured
// template that is genuinely usable: hook → 3 beats → CTA. The fallback
// is intentionally not lorem ipsum — it reads like a real short.

const SYSTEM_PROMPT = `You write scripts for short faceless social videos (YouTube Shorts, TikTok, Reels).
Rules:
- Open with a 1-sentence hook that creates curiosity or stakes.
- Then 3 to 5 short beats, one idea each, plain spoken language, no fluff.
- End with a single call-to-action line.
- Each line is ONE spoken sentence, max ~18 words. No emojis, no stage directions, no numbering.
Return ONLY valid JSON: {"title": string, "scenes": [{"text": string}]}.`;

export async function generateScript(topic, opts = {}) {
  const sceneTarget = opts.scenes || 5;
  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    try {
      return await viaOpenAI(topic, sceneTarget, openai);
    } catch (err) {
      console.error(`[script] OpenAI failed (${err.message}); using template.`);
    }
  }
  return templateScript(topic, sceneTarget);
}

async function viaOpenAI(topic, sceneTarget, key) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SCRIPT_MODEL || "gpt-4o-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Topic: ${topic}\nWrite ${sceneTarget} scenes total (hook + beats + CTA).`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  const scenes = (parsed.scenes || [])
    .map((s) => ({ text: (typeof s === "string" ? s : s.text || "").trim() }))
    .filter((s) => s.text);
  if (!scenes.length) throw new Error("empty script");
  scenes[0].kind = "hook";
  scenes[scenes.length - 1].kind = "cta";
  return {
    title: parsed.title || topic,
    scenes,
    source: "openai",
  };
}

// Deterministic, key-free fallback. Builds a real short-form structure
// around the topic. Good enough to render a watchable proof and to seed
// manual editing.
export function templateScript(topic, sceneTarget = 5) {
  const t = String(topic).trim().replace(/\.$/, "");
  const beats = [
    `Here's what almost nobody tells you about ${t}.`,
    `Most people get ${t} wrong because they skip the fundamentals.`,
    `The first thing that actually moves the needle is consistency, not intensity.`,
    `The second is starting smaller than feels comfortable, then compounding it daily.`,
    `And the third is measuring one number that matters instead of chasing ten.`,
    `Do that for thirty days and ${t} stops feeling like luck.`,
  ];
  const scenes = [{ text: `Stop overthinking ${t}.`, kind: "hook" }];
  const body = beats.slice(0, Math.max(1, sceneTarget - 2));
  for (const text of body) scenes.push({ text, kind: "body" });
  scenes.push({
    text: `Follow for more on ${t} — your future self will thank you.`,
    kind: "cta",
  });
  return {
    title: titleCase(t),
    scenes,
    source: "template",
  };
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
