// patterns.js — connect dots across many dreams over time.

import { SYMBOLS } from "./symbols.js";

const LABEL = Object.fromEntries(SYMBOLS.map((s) => [s.id, s.id.replace(/_/g, " ")]));
const THEME_OF = Object.fromEntries(SYMBOLS.map((s) => [s.id, s.theme]));

// Given all dreams, surface recurring symbols and themes.
export function computePatterns(dreams) {
  const symbolCounts = {};
  const themeCounts = {};
  const lastSeen = {};

  for (const d of dreams) {
    const tags = new Set(d.tags || []);
    for (const tag of tags) {
      symbolCounts[tag] = (symbolCounts[tag] || 0) + 1;
      lastSeen[tag] = Math.max(lastSeen[tag] || 0, d.createdAt || 0);
      const theme = THEME_OF[tag];
      if (theme) themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    }
  }

  const symbols = Object.entries(symbolCounts)
    .map(([id, count]) => ({
      id,
      label: LABEL[id] || id,
      theme: THEME_OF[id] || null,
      count,
      lastSeen: lastSeen[id] || null,
      recurring: count >= 2,
    }))
    .sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen);

  const themes = Object.entries(themeCounts)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count);

  // A few human-readable insight lines for the most recurrent symbols.
  const insights = symbols
    .filter((s) => s.recurring)
    .slice(0, 5)
    .map((s) => `You've dreamed about ${s.label} ${s.count} times.`);

  return { totalDreams: dreams.length, symbols, themes, insights };
}
