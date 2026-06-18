// Write-boundary enforcement. Everything is rooted at the agent-factory dir.
// Any attempt to resolve a path outside ROOT throws — this is how the sandbox
// guarantees "nothing outside this folder is modified" at the code level.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
export const ROOT = path.resolve(path.dirname(__filename), '..'); // agent-factory/

export function resolveInside(...parts) {
  const p = path.resolve(ROOT, ...parts);
  const rel = path.relative(ROOT, p);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`SANDBOX VIOLATION: refusing path outside ROOT: ${p}`);
  }
  return p;
}

export function ensureDir(...parts) {
  const dir = resolveInside(...parts);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeInside(relPath, data) {
  const p = resolveInside(relPath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
  return p;
}

export function appendInside(relPath, data) {
  const p = resolveInside(relPath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, data);
  return p;
}

export function readInside(relPath) {
  return fs.readFileSync(resolveInside(relPath), 'utf8');
}

export function existsInside(relPath) {
  return fs.existsSync(resolveInside(relPath));
}
