// Affiliate offer catalog + matcher. Links use a placeholder tag
// (AFFILIATE_TAG env or "YOURTAG") so the system runs now and starts paying
// the moment you drop in real program IDs — no code change.
//
// Edit/extend this catalog freely; the matcher scores by keyword overlap
// between the concept's niche/topic and each offer's tags.

const TAG = process.env.AFFILIATE_TAG || "YOURTAG";

export const CATALOG = [
  { id: "budgeting-app", title: "budgeting app free trial", tags: ["finance", "money", "budget", "save", "wealth"], url: `https://example.com/go/budget?ref=${TAG}` },
  { id: "investing-course", title: "beginner investing course", tags: ["finance", "invest", "stocks", "wealth", "compound"], url: `https://example.com/go/invest?ref=${TAG}` },
  { id: "notion-template", title: "productivity planner template", tags: ["productivity", "focus", "habits", "planning"], url: `https://example.com/go/planner?ref=${TAG}` },
  { id: "ai-tools-kit", title: "AI tools starter kit", tags: ["tech", "ai", "tools", "tips", "software"], url: `https://example.com/go/aitools?ref=${TAG}` },
  { id: "meal-prep-guide", title: "meal prep guide", tags: ["health", "cooking", "food", "habits", "diet"], url: `https://example.com/go/mealprep?ref=${TAG}` },
  { id: "side-hustle-pack", title: "side hustle starter pack", tags: ["side", "hustle", "money", "business", "income"], url: `https://example.com/go/hustle?ref=${TAG}` },
  { id: "sleep-supplement", title: "better-sleep routine kit", tags: ["health", "sleep", "habits", "psychology"], url: `https://example.com/go/sleep?ref=${TAG}` },
];

export function matchOffers(niche, topic, limit = 1) {
  const hay = `${niche} ${topic}`.toLowerCase();
  const scored = CATALOG.map((offer) => {
    const score = offer.tags.reduce((s, t) => (hay.includes(t) ? s + 1 : s), 0);
    return { offer, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return [CATALOG[0]]; // always have one link
  return scored.slice(0, limit).map((x) => x.offer);
}
