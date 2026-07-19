// Unit tests for the offline core: symbols, interpreter, patterns.
import { test } from "node:test";
import assert from "node:assert/strict";

import { detectSymbols, extractTags } from "../src/symbols.js";
import { localInterpret, clarifyQuestions } from "../src/interpreter.js";
import { computePatterns } from "../src/patterns.js";

test("detectSymbols finds known symbols in text", () => {
  const syms = detectSymbols("I was drowning in the ocean and then flying away");
  const ids = syms.map((s) => s.id);
  assert.ok(ids.includes("water"), "should detect water");
  assert.ok(ids.includes("flying"), "should detect flying");
});

test("detectSymbols returns empty for plain text", () => {
  assert.equal(detectSymbols("I ate breakfast and read a book").length, 0);
});

test("extractTags returns symbol ids", () => {
  const tags = extractTags("a snake by the door");
  assert.deepEqual([...tags].sort(), ["door", "snake"]);
});

test("clarifyQuestions always returns 1-2 questions", () => {
  const q1 = clarifyQuestions({ text: "water everywhere", prompts: {} });
  assert.ok(q1.length >= 1 && q1.length <= 2);
  const q2 = clarifyQuestions({ text: "nothing notable", prompts: { feeling: "calm" } });
  assert.ok(q2.length >= 1);
});

test("clarifyQuestions skips feeling question when feeling already given", () => {
  const qs = clarifyQuestions({ text: "water", prompts: { feeling: "anxious" } });
  assert.ok(!qs.some((q) => q.key === "feeling"));
});

test("localInterpret returns a real body, themes, and symbols", () => {
  const dream = {
    text: "I was being chased through a dark house",
    prompts: { feeling: "afraid" },
    clarifications: {},
  };
  const r = localInterpret(dream);
  assert.equal(r.source, "local");
  assert.ok(r.body.length > 80, "body should be substantive");
  assert.ok(r.symbols.includes("chase"));
  assert.ok(r.themes.length > 0);
  // warm tone: should weave in the stated feeling
  assert.match(r.body.toLowerCase(), /afraid/);
});

test("localInterpret handles symbol-less dreams gracefully", () => {
  const r = localInterpret({ text: "I made tea", prompts: {}, clarifications: {} });
  assert.ok(r.body.length > 40);
  assert.deepEqual(r.symbols, []);
});

test("computePatterns counts recurrence across dreams", () => {
  const dreams = [
    { createdAt: 1, tags: ["water", "house"] },
    { createdAt: 2, tags: ["water"] },
    { createdAt: 3, tags: ["snake"] },
  ];
  const p = computePatterns(dreams);
  assert.equal(p.totalDreams, 3);
  const water = p.symbols.find((s) => s.id === "water");
  assert.equal(water.count, 2);
  assert.equal(water.recurring, true);
  assert.ok(p.insights.some((line) => line.includes("water") && line.includes("2")));
});
