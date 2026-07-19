// store.js — tiny local JSON store. No DB server, no dependencies.
// All dream data lives in data/dreams.json inside the sandbox.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DATA_FILE = join(DATA_DIR, "dreams.json");

function ensureFile() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, JSON.stringify({ dreams: [] }, null, 2));
}

function readAll() {
  ensureFile();
  try {
    const raw = readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.dreams) ? parsed.dreams : [];
  } catch {
    return [];
  }
}

function writeAll(dreams) {
  ensureFile();
  writeFileSync(DATA_FILE, JSON.stringify({ dreams }, null, 2));
}

function id() {
  return "d_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const store = {
  list() {
    // newest first
    return readAll().sort((a, b) => b.createdAt - a.createdAt);
  },

  get(dreamId) {
    return readAll().find((d) => d.id === dreamId) || null;
  },

  create({ text, prompts = {}, tags = [] }) {
    const dreams = readAll();
    const dream = {
      id: id(),
      createdAt: Date.now(),
      text: text || "",
      prompts, // { who, where, feeling, vividness, recurring }
      tags, // symbol ids
      clarifications: {}, // answers to clarify questions
      interpretation: null, // filled after /interpret
    };
    dreams.push(dream);
    writeAll(dreams);
    return dream;
  },

  update(dreamId, patch) {
    const dreams = readAll();
    const idx = dreams.findIndex((d) => d.id === dreamId);
    if (idx === -1) return null;
    dreams[idx] = { ...dreams[idx], ...patch };
    writeAll(dreams);
    return dreams[idx];
  },

  remove(dreamId) {
    const dreams = readAll().filter((d) => d.id !== dreamId);
    writeAll(dreams);
    return true;
  },

  // For tests: wipe everything.
  _reset() {
    writeAll([]);
  },
};
