// symbols.js — self-contained dream-symbol knowledge.
//
// This is the offline interpreter's vocabulary. Each symbol has:
//   - match:   keywords/aliases to detect in dream text
//   - theme:   a short tag used for pattern tracking
//   - reading: a warm, reflective, NON-deterministic-sounding gloss. Always
//              exploratory ("may point to…"), never a decree.
//
// Keep readings gentle. No doom. No "this means death".

export const SYMBOLS = [
  {
    id: "water",
    match: ["water", "ocean", "sea", "river", "lake", "flood", "rain", "wave", "waves", "drowning", "swim", "swimming"],
    theme: "emotion",
    reading:
      "Water often mirrors the emotional weather we're moving through. Calm water can speak to peace or clarity; rough or rising water can reflect feelings that feel larger than us right now.",
  },
  {
    id: "falling",
    match: ["falling", "fell", "fall", "plummet", "dropping"],
    theme: "control",
    reading:
      "Falling frequently shows up when something feels out of our hands — a loss of footing or control. It can be the mind rehearsing what it means to let go.",
  },
  {
    id: "flying",
    match: ["flying", "flew", "float", "floating", "soaring", "hovering"],
    theme: "freedom",
    reading:
      "Flying tends to carry a sense of release or perspective — rising above something, or a wish for more freedom than waking life currently allows.",
  },
  {
    id: "chase",
    match: ["chased", "chasing", "running from", "pursued", "being followed", "followed"],
    theme: "avoidance",
    reading:
      "Being chased often points to something we'd rather not turn and face — a task, a feeling, a conversation. The thing pursuing us is usually less threatening when looked at directly.",
  },
  {
    id: "teeth",
    match: ["teeth", "tooth", "teeth falling", "losing teeth"],
    theme: "anxiety",
    reading:
      "Teeth — especially loose or falling teeth — commonly surface around worries about how we appear, how we're holding things together, or moments of change.",
  },
  {
    id: "death",
    match: ["death", "dying", "died", "dead", "funeral", "grave"],
    theme: "transformation",
    reading:
      "In dreams, endings rarely read literally. Death more often marks transformation — a chapter closing so another can begin, or a part of ourselves we're ready to release.",
  },
  {
    id: "house",
    match: ["house", "home", "room", "rooms", "building", "apartment", "hallway"],
    theme: "self",
    reading:
      "A house is a familiar stand-in for the self. New or hidden rooms can hint at parts of you you're discovering; a childhood home can pull old feelings forward.",
  },
  {
    id: "naked",
    match: ["naked", "nude", "undressed", "exposed", "no clothes"],
    theme: "vulnerability",
    reading:
      "Being unexpectedly exposed often tracks with feeling vulnerable or unprepared — a worry about being seen before we feel ready.",
  },
  {
    id: "exam",
    match: ["exam", "test", "class", "school", "studying", "unprepared", "late for"],
    theme: "pressure",
    reading:
      "Tests and being late tend to echo a sense of being measured or behind — pressure to perform, or a fear of not having done enough.",
  },
  {
    id: "snake",
    match: ["snake", "snakes", "serpent"],
    theme: "change",
    reading:
      "Snakes are old, layered symbols — they can speak to healing and renewal as much as to something that unsettles us. Often they mark change we're sensing before we can name it.",
  },
  {
    id: "fire",
    match: ["fire", "burning", "flames", "smoke", "burned"],
    theme: "intensity",
    reading:
      "Fire can read as passion, anger, or urgency — an intensity asking for attention. Whether it warms or consumes in the dream tends to matter.",
  },
  {
    id: "baby",
    match: ["baby", "infant", "newborn", "pregnant", "pregnancy"],
    theme: "newness",
    reading:
      "Babies often represent something new and tender in your life — a project, an idea, a fresh start that needs care to grow.",
  },
  {
    id: "road",
    match: ["road", "path", "journey", "highway", "crossroads", "lost", "direction"],
    theme: "direction",
    reading:
      "Roads and paths tend to reflect where we feel we're headed. Forks, dead ends, or being lost can mirror a real decision asking to be made.",
  },
  {
    id: "door",
    match: ["door", "doors", "gate", "key", "locked", "threshold"],
    theme: "opportunity",
    reading:
      "Doors are thresholds — opportunities, choices, transitions. A locked door can speak to something that feels just out of reach; an open one, to readiness.",
  },
  {
    id: "people_known",
    match: ["mother", "father", "mom", "dad", "sister", "brother", "friend", "partner", "ex", "boss"],
    theme: "relationship",
    reading:
      "Familiar people in dreams frequently carry what they represent to us as much as who they literally are — a quality, a tension, or a feeling we associate with them.",
  },
  {
    id: "darkness",
    match: ["dark", "darkness", "night", "shadow", "shadows", "can't see"],
    theme: "uncertainty",
    reading:
      "Darkness often marks the unknown — uncertainty we're moving through, or something not yet brought into the light.",
  },
];

// Detect which symbols appear in a block of dream text.
// Returns an array of matched symbol objects (deduped, in document order).
export function detectSymbols(text) {
  const lower = (text || "").toLowerCase();
  const found = [];
  for (const sym of SYMBOLS) {
    const hit = sym.match.some((kw) => lower.includes(kw));
    if (hit) found.push(sym);
  }
  return found;
}

// Lightweight tag list for storage / pattern tracking.
export function extractTags(text) {
  return detectSymbols(text).map((s) => s.id);
}
