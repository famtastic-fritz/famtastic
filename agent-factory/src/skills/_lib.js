// Helpers shared by skill handlers. All IO stays inside the sandbox.
import fs from 'node:fs';
import path from 'node:path';
import { resolveInside } from '../safepath.js';

export function writeArtifact(relPath, content) {
  const p = resolveInside(relPath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return relPath;
}

export function copyDir(srcRel, destRel) {
  const src = resolveInside(srcRel);
  const dest = resolveInside(destRel);
  if (!fs.existsSync(src)) return { copied: 0, missing: true };
  let copied = 0;
  const walk = (s, d) => {
    fs.mkdirSync(d, { recursive: true });
    for (const e of fs.readdirSync(s, { withFileTypes: true })) {
      const sp = path.join(s, e.name), dp = path.join(d, e.name);
      if (e.isDirectory()) walk(sp, dp);
      else { fs.copyFileSync(sp, dp); copied++; }
    }
  };
  walk(src, dest);
  return { copied, missing: false };
}

export function exists(relPath) { return fs.existsSync(resolveInside(relPath)); }

export function listFiles(relDir) {
  const p = resolveInside(relDir);
  if (!fs.existsSync(p)) return [];
  const out = [];
  const walk = (d, base) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = path.join(base, e.name);
      if (e.isDirectory()) walk(path.join(d, e.name), rel);
      else out.push(rel);
    }
  };
  walk(p, '');
  return out;
}
