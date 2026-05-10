#!/usr/bin/env node
// Lane G — Static-only invariants for the Functional Workspace Run.
// Pure-Node script. No browser, no network. Executes all checks and prints
// PASS/FAIL per assertion. Exits 0 on full pass, 1 otherwise.
//
// Usage:
//   cd /sessions/eager-epic-mccarthy/mnt/famtastic-convergence-dossier
//   node tests/studio/lane-static-checks.js

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const STUDIO = path.join(REPO, 'site-studio');
const PUB_STUDIO = path.join(STUDIO, 'public', 'studio');
const SRC_DIR = path.join(PUB_STUDIO, 'src');
const SCREENS_DIR = path.join(SRC_DIR, 'screens');
const LIB_DIR = path.join(SRC_DIR, 'lib');
const SERVER_DIR = path.join(STUDIO, 'server');

let passCount = 0;
let failCount = 0;
const failures = [];

function record(label, ok, detail) {
  if (ok) {
    passCount++;
    process.stdout.write(`  PASS  ${label}\n`);
  } else {
    failCount++;
    failures.push({ label, detail: detail || '' });
    process.stdout.write(`  FAIL  ${label}${detail ? '  -- ' + detail : ''}\n`);
  }
}

function assertExists(label, p) {
  record(label, fs.existsSync(p), 'missing path: ' + p);
}

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); }
  catch (e) { return null; }
}

// ── 1. @babel/parser availability + JSX parses ───────────────────────
process.stdout.write('\n[1] @babel/parser load + JSX parsing\n');
let babelParser = null;
try {
  const parserPath = require.resolve('@babel/parser', {
    paths: [STUDIO, path.join(STUDIO, 'node_modules')],
  });
  babelParser = require(parserPath);
  record('babel-parser-loaded', !!babelParser);
} catch (e) {
  record('babel-parser-loaded', false, e.message);
}

function walkJsx(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile() && full.endsWith('.jsx')) out.push(full);
    }
  }
  return out;
}

if (babelParser) {
  const jsxFiles = walkJsx(SRC_DIR).sort();
  record('jsx-files-found', jsxFiles.length >= 12, `count=${jsxFiles.length}`);
  for (const f of jsxFiles) {
    const code = readFile(f);
    let ok = false, err = '';
    try {
      babelParser.parse(code, { sourceType: 'script', plugins: ['jsx'] });
      ok = true;
    } catch (e) {
      err = e.message.split('\n')[0];
    }
    const rel = path.relative(REPO, f);
    record(`jsx-parse:${rel}`, ok, err);
  }
}

// ── 2. node --check on lib/*.js ──────────────────────────────────────
process.stdout.write('\n[2] node --check on lib/*.js (browser scripts; sloppy mode acceptable)\n');
function listJs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.endsWith('.js'))
    .map(d => path.join(dir, d.name)).sort();
}

for (const f of listJs(LIB_DIR)) {
  let ok = false, err = '';
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    ok = true;
  } catch (e) {
    err = (e.stderr || e.message || '').toString().split('\n').slice(0, 2).join(' | ');
  }
  record(`node-check:${path.relative(REPO, f)}`, ok, err);
}

// ── 3. node --check on server modules ────────────────────────────────
process.stdout.write('\n[3] node --check on server/*.js\n');
for (const f of listJs(SERVER_DIR)) {
  let ok = false, err = '';
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    ok = true;
  } catch (e) {
    err = (e.stderr || e.message || '').toString().split('\n').slice(0, 2).join(' | ');
  }
  record(`node-check:${path.relative(REPO, f)}`, ok, err);
}

// ── 4. node --check on server.js ─────────────────────────────────────
process.stdout.write('\n[4] node --check on server.js\n');
{
  const f = path.join(STUDIO, 'server.js');
  let ok = false, err = '';
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    ok = true;
  } catch (e) {
    err = (e.stderr || e.message || '').toString().split('\n').slice(0, 2).join(' | ');
  }
  record('node-check:site-studio/server.js', ok, err);
}

// ── 5. Lane E publish hooks on 7 screens ─────────────────────────────
process.stdout.write('\n[5] Lane E currentContext publish hooks (7 screens)\n');
const PUBLISH_SCREENS = [
  'home.jsx', 'sites.jsx', 'site-settings.jsx', 'research.jsx',
  'think-tank.jsx', 'media-library.jsx', 'settings.jsx',
];
const PUBLISH_RX = /__studioPublishContext\s*\?\.\s*\(/;
for (const name of PUBLISH_SCREENS) {
  const p = path.join(SCREENS_DIR, name);
  const code = readFile(p);
  const ok = !!(code && PUBLISH_RX.test(code));
  record(`publish-hook:${name}`, ok, ok ? '' : 'no __studioPublishContext call found');
}

// ── 6. Lane F RecipeSelector mounts ─────────────────────────────────
process.stdout.write('\n[6] Lane F RecipeSelector mounts (home.jsx, research.jsx)\n');
for (const name of ['home.jsx', 'research.jsx']) {
  const p = path.join(SCREENS_DIR, name);
  const code = readFile(p);
  const ok = !!(code && /<RecipeSelector\b/.test(code));
  record(`recipe-mount:${name}`, ok, ok ? '' : 'no <RecipeSelector ... in file');
}

// ── 7. server.js mount block growth ─────────────────────────────────
process.stdout.write('\n[7] server.js mount block (4 mounts ordered, ±20 lines, plus media+refinement still present)\n');
{
  const code = readFile(path.join(STUDIO, 'server.js')) || '';
  const lines = code.split('\n');

  function findLine(rx) {
    for (let i = 0; i < lines.length; i++) {
      if (rx.test(lines[i])) return i + 1; // 1-indexed
    }
    return -1;
  }

  const intel = findLine(/app\.use\(['"]\/api\/intelligence['"]/);
  const comp = findLine(/app\.use\(['"]\/api\/components['"]/);
  const research = findLine(/app\.use\(['"]\/api\/research['"]/);
  const tt = findLine(/app\.use\(['"]\/api\/think-tank['"]/);
  const media = findLine(/app\.use\(['"]\/api\/media['"]/);
  const refinement = findLine(/app\.use\(['"]\/api\/refinement['"]/);

  record('mount:/api/intelligence present', intel > 0, `line=${intel}`);
  record('mount:/api/components present', comp > 0, `line=${comp}`);
  record('mount:/api/research present', research > 0, `line=${research}`);
  record('mount:/api/think-tank present', tt > 0, `line=${tt}`);
  record('mount:/api/media still present', media > 0, `line=${media}`);
  record('mount:/api/refinement still present', refinement > 0, `line=${refinement}`);

  const ordered = (intel > 0 && comp > intel && research > comp && tt > research);
  record('mount:order intel<components<research<think-tank', ordered,
    `intel=${intel} comp=${comp} research=${research} tt=${tt}`);

  const minLine = Math.min(intel, comp, research, tt);
  const maxLine = Math.max(intel, comp, research, tt);
  record('mount:within-20-lines', maxLine - minLine <= 20, `span=${maxLine - minLine}`);
}

// ── 8. studio.html script tags for 9 lib files ──────────────────────
process.stdout.write('\n[8] studio.html lib <script> tags (9 lane libs)\n');
{
  const html = readFile(path.join(STUDIO, 'public', 'studio.html')) || '';
  const expected = [
    'site-context.js', 'sites-api.js', 'media-api.js', 'components-api.js',
    'research-api.js', 'think-tank-api.js', 'current-context.js',
    'recipes.js', 'memory-tail.js',
  ];
  for (const name of expected) {
    const rx = new RegExp(`<script[^>]+src="[^"]*\\/lib\\/${name.replace('.', '\\.')}"`);
    record(`html-lib-script:${name}`, rx.test(html), '');
  }
}

// ── 9. Forbidden-edit files: presence-only check ────────────────────
process.stdout.write('\n[9] Forbidden-edit files (presence check)\n');
{
  // Files we are 100% sure exist in this repo and must not be edited.
  const mustExist = [
    'site-studio/public/css/operator.css',
    'site-studio/public/js/operator.js',
    'site-studio/public/js/operator-actions.js',
    'site-studio/server/intelligence-routes.js',
    'site-studio/server/intelligence-actions.js',
    'site-studio/server/intelligence-writer.js',
    'site-studio/server/intelligence-reader.js',
  ];
  for (const rel of mustExist) {
    assertExists(`exists:${rel}`, path.join(REPO, rel));
  }

  // Brief listed these but they don't exist in this repo. Soft-check
  // (informational only — record as PASS with note).
  const optional = [
    'site-studio/lib/fam-motion.js',
    'site-studio/lib/fam-shapes.css',
    'site-studio/lib/character-branding.js',
  ];
  for (const rel of optional) {
    const p = path.join(REPO, rel);
    const exists = fs.existsSync(p);
    // Always pass (informational): if it exists, we expect it untouched;
    // if it does not exist, that is the baseline reality of this repo.
    record(`optional-presence:${rel}`, true,
      exists ? 'present' : 'absent in this repo (informational; brief listed it)');
  }
}

// ── 10. server.js HUB_ROOT defined in first 100 lines ───────────────
process.stdout.write('\n[10] server.js HUB_ROOT bound in first 100 lines\n');
{
  const code = readFile(path.join(STUDIO, 'server.js')) || '';
  const head = code.split('\n').slice(0, 100).join('\n');
  const hubBound = /\bHUB_ROOT\s*=/.test(head);
  const resolveCall = /path\.resolve\(__dirname,\s*['"]\.\.['"]\)/.test(head);
  record('server.js:HUB_ROOT bound in head', hubBound, '');
  record('server.js:path.resolve(__dirname, "..") in head', resolveCall, '');
}

// ── 11. Drift trip-wire: Mission Control screen content ─────────────
process.stdout.write('\n[11] Drift trip-wire — Mission Control hosts only run-centric content\n');
{
  const code = readFile(path.join(SCREENS_DIR, 'mission-control.jsx')) || '';
  const noRecipe = !/<RecipeSelector\b/.test(code);
  const noSitesList = !/<ScreenSites\b/.test(code) && !/sites-api/.test(code);
  const noComponentList = !/<ScreenComponentStudio\b/.test(code) && !/components-api/.test(code);
  const noMediaList = !/<ScreenMediaLibrary\b/.test(code) && !/media-api/.test(code);
  record('mission-control:no-RecipeSelector', noRecipe);
  record('mission-control:no-Sites-content', noSitesList);
  record('mission-control:no-Component-content', noComponentList);
  record('mission-control:no-Media-content', noMediaList);
}

// ── 12. RecipeFlow contains "5 recipes" eyebrow text marker ─────────
process.stdout.write('\n[12] RecipeFlow Eyebrow contains "{ids.length} recipes" marker\n');
{
  const code = readFile(path.join(SRC_DIR, 'recipe-flow.jsx')) || '';
  const ok = /Visual workflow · \{ids\.length\} recipes/.test(code) ||
             /Visual workflow.*recipes/.test(code);
  record('recipe-flow:eyebrow-marker', ok);
}

// ── Summary ─────────────────────────────────────────────────────────
const total = passCount + failCount;
process.stdout.write(`\nSTATIC: ${passCount} PASS / ${failCount} FAIL  (total=${total})\n`);
if (failCount > 0) {
  process.stdout.write('\nFailures:\n');
  for (const f of failures) {
    process.stdout.write(`  - ${f.label}${f.detail ? '  ' + f.detail : ''}\n`);
  }
}
process.exit(failCount === 0 ? 0 : 1);
