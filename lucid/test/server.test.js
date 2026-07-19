// Integration tests: boot the real server, exercise the API end-to-end.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import { server } from "../server.js";
import { store } from "../src/store.js";

let base;

before(async () => {
  store._reset();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

after(() => {
  server.close();
  store._reset();
});

async function post(path, body) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return { status: res.status, json: await res.json() };
}

test("health endpoint reports offline defaults", async () => {
  const res = await fetch(base + "/api/health");
  const json = await res.json();
  assert.equal(json.ok, true);
  assert.equal(json.interpreter, "local");
});

test("rejects empty dream", async () => {
  const { status } = await post("/api/dreams", { text: "" });
  assert.equal(status, 400);
});

test("full flow: create -> clarify -> interpret -> journal -> patterns", async () => {
  // create
  const created = await post("/api/dreams", {
    text: "I kept falling toward dark water",
    prompts: { feeling: "uneasy" },
  });
  assert.equal(created.status, 201);
  assert.ok(created.json.dream.id);
  assert.ok(created.json.clarify.length >= 1);
  assert.deepEqual([...created.json.dream.tags].sort(), ["darkness", "falling", "water"]);

  const id = created.json.dream.id;

  // interpret
  const interp = await post(`/api/dreams/${id}/interpret`, {
    clarifications: { standout: "the moment before hitting the water" },
  });
  assert.equal(interp.status, 200);
  assert.ok(interp.json.interpretation.body.length > 80);
  assert.ok(interp.json.interpretation.symbols.includes("falling"));

  // journal lists it
  const list = await (await fetch(base + "/api/dreams")).json();
  assert.equal(list.dreams.length, 1);
  assert.ok(list.dreams[0].interpretation, "interpretation should be persisted");

  // a second dream sharing 'water' creates a pattern
  await post("/api/dreams", { text: "calm water again", prompts: {} });
  const patterns = await (await fetch(base + "/api/patterns")).json();
  assert.equal(patterns.totalDreams, 2);
  const water = patterns.symbols.find((s) => s.id === "water");
  assert.equal(water.count, 2);
  assert.ok(patterns.insights.some((l) => l.toLowerCase().includes("water")));
});

test("transcribe returns graceful unavailable when no provider", async () => {
  const res = await fetch(base + "/api/transcribe", { method: "POST", body: "fake-audio" });
  const json = await res.json();
  assert.equal(json.ok, false);
  assert.ok(json.message.length > 0);
});

test("delete removes a dream", async () => {
  const created = await post("/api/dreams", { text: "a fleeting snake" });
  const id = created.json.dream.id;
  const del = await fetch(base + `/api/dreams/${id}`, { method: "DELETE" });
  assert.equal(del.status, 200);
  const got = await fetch(base + `/api/dreams/${id}`);
  assert.equal(got.status, 404);
});
