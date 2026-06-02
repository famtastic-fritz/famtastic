// Canonical paths + config loading for the autopilot.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const AUTOPILOT_ROOT = path.resolve(HERE, "..");
export const HUB_ROOT = path.resolve(AUTOPILOT_ROOT, "..");
export const REMOTION_ROOT = path.join(HUB_ROOT, "remotion");

export function stateDir(root = AUTOPILOT_ROOT) {
  const dir = path.join(root, "state");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function outDir(root = AUTOPILOT_ROOT) {
  const dir = path.join(root, "out");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function stopFlagPath(root = AUTOPILOT_ROOT) {
  return path.join(root, "STOP");
}

export function loadConfig(root = AUTOPILOT_ROOT) {
  const file = path.join(root, "autopilot.config.json");
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  return cfg;
}
