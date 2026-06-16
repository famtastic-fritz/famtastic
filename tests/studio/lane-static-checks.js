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

// ── Phase 1 Invariants ──────────────────────────────────────────────

// ── P1-1. The 6 new lib JS files exist and node --check clean ─────
process.stdout.write('\n[P1-1] Phase 1 — 6 new lib JS files exist + node --check\n');
{
  const newLibFiles = [
    'sites-actions.js',
    'media-actions.js',
    'components-actions.js',
    'research-actions.js',
    'think-tank-actions.js',
    'shay-actions.js',
  ];
  for (const name of newLibFiles) {
    const p = path.join(LIB_DIR, name);
    assertExists(`p1-lib-exists:${name}`, p);
    if (fs.existsSync(p)) {
      let ok = false, err = '';
      try {
        execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' });
        ok = true;
      } catch (e) {
        err = (e.stderr || e.message || '').toString().split('\n').slice(0, 2).join(' | ');
      }
      record(`p1-lib-node-check:${name}`, ok, err);
    }
  }
}

// ── P1-2. Global window.* assignments present in source ──────────
process.stdout.write('\n[P1-2] Phase 1 — window.* global assignments in lib sources\n');
{
  const assignments = [
    { file: 'sites-actions.js',       needle: 'window.SitesActions' },
    { file: 'media-actions.js',       needle: 'window.MediaActions' },
    { file: 'components-actions.js',  needle: 'window.ComponentsActions' },
    { file: 'research-actions.js',    needle: 'window.ResearchActions' },
    { file: 'think-tank-actions.js',  needle: 'window.ThinkTankActions' },
    { file: 'shay-actions.js',        needle: 'window.ShayActions' },
  ];
  for (const { file, needle } of assignments) {
    const code = readFile(path.join(LIB_DIR, file)) || '';
    const ok = code.includes(needle);
    record(`p1-global-assign:${needle}`, ok,
      ok ? '' : `substring "${needle}" not found in ${file}`);
  }
}

// ── P1-3. window.CurrentContext.forDensity helper ─────────────────
process.stdout.write('\n[P1-3] Phase 1 — window.CurrentContext.forDensity in current-context.js\n');
{
  const code = readFile(path.join(LIB_DIR, 'current-context.js')) || '';
  record('p1-forDensity-in-source', code.includes('forDensity'),
    code.includes('forDensity') ? '' : 'forDensity not found in current-context.js');
  record('p1-forDensity-on-CurrentContext', code.includes('window.CurrentContext'),
    code.includes('window.CurrentContext') ? '' : 'window.CurrentContext not found in current-context.js');
}

// ── P1-4. appendAsset exported from media-registry.js ────────────
process.stdout.write('\n[P1-4] Phase 1 — appendAsset exported from media-registry.js\n');
{
  const code = readFile(path.join(SERVER_DIR, 'media-registry.js')) || '';
  const hasImpl  = /function appendAsset/.test(code);
  const hasExport = /module\.exports\s*=/.test(code) && /appendAsset/.test(code);
  record('p1-appendAsset-function-defined', hasImpl, hasImpl ? '' : 'function appendAsset not found');
  record('p1-appendAsset-exported', hasExport, hasExport ? '' : 'appendAsset not present in module.exports block');
}

// ── P1-5. POST route handlers in media-routes.js + think-tank-routes.js ──
process.stdout.write('\n[P1-5] Phase 1 — POST route handlers in server modules\n');
{
  const mediaCode = readFile(path.join(SERVER_DIR, 'media-routes.js')) || '';
  record('p1-POST-test-asset-route',
    mediaCode.includes("router.post('/test-asset'") || mediaCode.includes('router.post("/test-asset"'),
    'POST /test-asset handler not found in media-routes.js');

  const ttCode = readFile(path.join(SERVER_DIR, 'think-tank-routes.js')) || '';
  const hasPostCaptures = ttCode.includes("router.post('/captures'") || ttCode.includes('router.post("/captures"');
  const hasPostPromote  = ttCode.includes("router.post('/promote'")  || ttCode.includes('router.post("/promote"');
  record('p1-POST-captures-route',  hasPostCaptures, hasPostCaptures ? '' : 'POST /captures not found in think-tank-routes.js');
  record('p1-POST-promote-route',   hasPostPromote,  hasPostPromote  ? '' : 'POST /promote not found in think-tank-routes.js');
}

// ── P1-6. 6 new lib script tags in studio.html ────────────────────
process.stdout.write('\n[P1-6] Phase 1 — 6 action lib <script> tags in studio.html\n');
{
  const html = readFile(path.join(STUDIO, 'public', 'studio.html')) || '';
  const actionLibs = [
    'sites-actions.js',
    'media-actions.js',
    'components-actions.js',
    'research-actions.js',
    'think-tank-actions.js',
    'shay-actions.js',
  ];
  for (const name of actionLibs) {
    const rx = new RegExp(`<script[^>]+src="[^"]*\\/lib\\/${name.replace('.', '\\.')}"`);
    record(`p1-html-action-script:${name}`, rx.test(html), '');
  }
}

// ── P1-7. server.js mount block — no growth beyond Phase 0 +2 ────
process.stdout.write('\n[P1-7] Phase 1 — server.js mount block not grown; all 6 mounts still present\n');
{
  const code = readFile(path.join(STUDIO, 'server.js')) || '';
  const lines = code.split('\n');

  function findLine2(rx) {
    for (let i = 0; i < lines.length; i++) {
      if (rx.test(lines[i])) return i + 1;
    }
    return -1;
  }

  const intel      = findLine2(/app\.use\(['"]\/api\/intelligence['"]/);
  const comp       = findLine2(/app\.use\(['"]\/api\/components['"]/);
  const research   = findLine2(/app\.use\(['"]\/api\/research['"]/);
  const tt         = findLine2(/app\.use\(['"]\/api\/think-tank['"]/);
  const media      = findLine2(/app\.use\(['"]\/api\/media['"]/);
  const refinement = findLine2(/app\.use\(['"]\/api\/refinement['"]/);

  record('p1-mount:/api/intelligence still present', intel > 0, `line=${intel}`);
  record('p1-mount:/api/components still present',   comp > 0,  `line=${comp}`);
  record('p1-mount:/api/research still present',     research > 0, `line=${research}`);
  record('p1-mount:/api/think-tank still present',   tt > 0,    `line=${tt}`);
  record('p1-mount:/api/media still present',        media > 0, `line=${media}`);
  record('p1-mount:/api/refinement still present',   refinement > 0, `line=${refinement}`);

  // No new mount lines added beyond the Phase 0 set
  // Count lines that match app.use('/api/... between the first and last of the known 6
  if (intel > 0 && media > 0 && refinement > 0) {
    const minL = Math.min(intel, comp, research, tt, media, refinement);
    const maxL = Math.max(intel, comp, research, tt, media, refinement);
    const blockLines = lines.slice(minL - 1, maxL);
    const mountCount = blockLines.filter(l => /^\s*app\.use\(/.test(l)).length;
    // Phase 0 introduced 6 mounts; allow up to 8 in case intelligence-actions straddles
    record('p1-mount:no-phantom-extra-mounts', mountCount <= 8,
      `found ${mountCount} app.use() lines in mount block span (allowed ≤8)`);
  }
}

// ── P1-8. recipes.js — every node has inputs, outputs, next_action, proof ──
process.stdout.write('\n[P1-8] Phase 1 — recipes.js every node has inputs/outputs/next_action/proof\n');
{
  const recipesCode = readFile(path.join(LIB_DIR, 'recipes.js'));
  if (!recipesCode) {
    record('p1-recipes-readable', false, 'could not read recipes.js');
  } else {
    // Evaluate in a sandbox: stub window, run the code, inspect window.STUDIO_RECIPES
    let sandboxOk = false;
    let sandboxErr = '';
    let recipeResult = null;
    try {
      const vm = require('vm');
      const sandbox = { window: {} };
      vm.createContext(sandbox);
      vm.runInContext(recipesCode, sandbox);
      recipeResult = sandbox.window.STUDIO_RECIPES;
      sandboxOk = true;
    } catch (e) {
      sandboxErr = e.message;
    }
    record('p1-recipes-vm-eval', sandboxOk, sandboxErr);

    if (sandboxOk && recipeResult && typeof recipeResult === 'object') {
      const recipeIds = Object.keys(recipeResult);
      record('p1-recipes-count>=5', recipeIds.length >= 5, `found ${recipeIds.length} recipes`);
      let totalNodes = 0;
      let allHaveKeys = true;
      const missingList = [];
      for (const rid of recipeIds) {
        const recipe = recipeResult[rid];
        const nodes = (recipe && Array.isArray(recipe.nodes)) ? recipe.nodes : [];
        for (const node of nodes) {
          totalNodes++;
          const missing = [];
          if (!Array.isArray(node.inputs))   missing.push('inputs');
          if (!Array.isArray(node.outputs))  missing.push('outputs');
          if (!node.next_action)             missing.push('next_action');
          if (!Array.isArray(node.proof))    missing.push('proof');
          if (missing.length > 0) {
            allHaveKeys = false;
            missingList.push(`${rid}/${node.id}: missing [${missing.join(',')}]`);
          }
        }
      }
      record('p1-recipes-total-nodes>=30', totalNodes >= 30, `total=${totalNodes}`);
      record('p1-recipes-all-nodes-have-4-keys', allHaveKeys,
        allHaveKeys ? '' : missingList.slice(0, 5).join('; '));
    } else if (sandboxOk) {
      record('p1-recipes-STUDIO_RECIPES-defined', false, 'window.STUDIO_RECIPES not set after eval');
    }
  }
}

// ── P1-9. Mission Control drift trip-wire (Phase 1 regression) ────
process.stdout.write('\n[P1-9] Phase 1 — Mission Control drift trip-wire (regression check)\n');
{
  const code = readFile(path.join(SCREENS_DIR, 'mission-control.jsx')) || '';
  const noRecipe       = !/<RecipeSelector\b/.test(code);
  const noSitesList    = !/<ScreenSites\b/.test(code)     && !/sites-api/.test(code);
  const noCompList     = !/<ScreenComponentStudio\b/.test(code) && !/components-api/.test(code);
  const noMediaList    = !/<ScreenMediaLibrary\b/.test(code)    && !/media-api/.test(code);
  record('p1-mc-no-RecipeSelector',   noRecipe);
  record('p1-mc-no-Sites-content',    noSitesList);
  record('p1-mc-no-Component-content', noCompList);
  record('p1-mc-no-Media-content',    noMediaList);
}

// ── Phase 2 Invariants ───────────────────────────────────────────────

// ── P2-1. site-settings-api.js exists + window.SiteSettingsAPI present ──
process.stdout.write('\n[P2-1] Phase 2 — site-settings-api.js exists + window.SiteSettingsAPI\n');
{
  const apiFile = path.join(LIB_DIR, 'site-settings-api.js');
  assertExists('p2-site-settings-api-exists', apiFile);
  const code = readFile(apiFile) || '';
  record('p2-site-settings-api-window-global',
    code.includes('window.SiteSettingsAPI'),
    code.includes('window.SiteSettingsAPI') ? '' : 'window.SiteSettingsAPI substring not found');
  // node --check
  if (fs.existsSync(apiFile)) {
    let ok = false, err = '';
    try {
      execFileSync(process.execPath, ['--check', apiFile], { stdio: 'pipe' });
      ok = true;
    } catch (e) {
      err = (e.stderr || e.message || '').toString().split('\n').slice(0, 2).join(' | ');
    }
    record('p2-site-settings-api-node-check', ok, err);
  }
}

// ── P2-2. server/site-settings-schema.js exports 5 expected names ────
process.stdout.write('\n[P2-2] Phase 2 — site-settings-schema.js exports\n');
{
  const schemaFile = path.join(SERVER_DIR, 'site-settings-schema.js');
  assertExists('p2-site-settings-schema-exists', schemaFile);
  const code = readFile(schemaFile) || '';
  // node --check
  if (fs.existsSync(schemaFile)) {
    let ok = false, err = '';
    try {
      execFileSync(process.execPath, ['--check', schemaFile], { stdio: 'pipe' });
      ok = true;
    } catch (e) {
      err = (e.stderr || e.message || '').toString().split('\n').slice(0, 2).join(' | ');
    }
    record('p2-site-settings-schema-node-check', ok, err);
  }
  const expectedExports = [
    'SCHEMA_VERSION', 'ALLOWED_OVERRIDE_KEYS', 'ALLOWED_VALUES', 'validate', 'emptyOverrides',
  ];
  for (const name of expectedExports) {
    record(`p2-schema-exports:${name}`, code.includes(name),
      code.includes(name) ? '' : `"${name}" not found in site-settings-schema.js`);
  }
}

// ── P2-3. server/site-settings-routes.js exports createSiteSettingsRouter ──
process.stdout.write('\n[P2-3] Phase 2 — site-settings-routes.js exports createSiteSettingsRouter\n');
{
  const routesFile = path.join(SERVER_DIR, 'site-settings-routes.js');
  assertExists('p2-site-settings-routes-exists', routesFile);
  const code = readFile(routesFile) || '';
  if (fs.existsSync(routesFile)) {
    let ok = false, err = '';
    try {
      execFileSync(process.execPath, ['--check', routesFile], { stdio: 'pipe' });
      ok = true;
    } catch (e) {
      err = (e.stderr || e.message || '').toString().split('\n').slice(0, 2).join(' | ');
    }
    record('p2-site-settings-routes-node-check', ok, err);
  }
  record('p2-site-settings-routes-exports-fn',
    code.includes('createSiteSettingsRouter'),
    code.includes('createSiteSettingsRouter') ? '' : 'createSiteSettingsRouter not found');
}

// ── P2-4. server.js /api/site-settings mount present (total 9 modular mounts) ──
process.stdout.write('\n[P2-4] Phase 2 — server.js has /api/site-settings mount\n');
{
  const code = readFile(path.join(STUDIO, 'server.js')) || '';
  const lines = code.split('\n');

  function findLineP2(rx) {
    for (let i = 0; i < lines.length; i++) {
      if (rx.test(lines[i])) return i + 1;
    }
    return -1;
  }

  const siteSettings = findLineP2(/app\.use\(['"]\/api\/site-settings['"]/);
  record('p2-mount:/api/site-settings present', siteSettings > 0, `line=${siteSettings}`);

  // Verify all 9 modular mounts are present:
  // Phase 0: intelligence, intelligence/actions, components, media, refinement (5)
  // Phase 1: research, think-tank (2)
  // Phase 2: site-settings (1)
  // Total = 8 unique mounts (intelligence + intelligence/actions count separately)
  const mountPatterns = [
    /app\.use\(['"]\/api\/intelligence['"]/,
    /app\.use\(['"]\/api\/intelligence\/actions['"]/,
    /app\.use\(['"]\/api\/components['"]/,
    /app\.use\(['"]\/api\/media['"]/,
    /app\.use\(['"]\/api\/refinement['"]/,
    /app\.use\(['"]\/api\/research['"]/,
    /app\.use\(['"]\/api\/think-tank['"]/,
    /app\.use\(['"]\/api\/site-settings['"]/,
  ];
  const foundMounts = mountPatterns.filter(rx => lines.some(l => rx.test(l))).length;
  record('p2-mount:all-8-modular-mounts-present', foundMounts === 8,
    `found ${foundMounts}/8 modular /api/* mounts`);
}

// ── P2-5. media-registry.js countByApproval covers all 7 buckets ────
process.stdout.write('\n[P2-5] Phase 2 — media-registry.js countByApproval covers 7 buckets\n');
{
  const code = readFile(path.join(SERVER_DIR, 'media-registry.js')) || '';
  // Find the countByApproval function body
  const fnStart = code.indexOf('function countByApproval');
  const fnEnd = fnStart >= 0 ? code.indexOf('\nfunction ', fnStart + 1) : -1;
  const fnBody = fnStart >= 0 ? code.slice(fnStart, fnEnd > 0 ? fnEnd : undefined) : '';
  const buckets = ['auto', 'pending', 'approved', 'deferred', 'draft', 'rejected', 'used'];
  for (const bucket of buckets) {
    record(`p2-countByApproval:${bucket}`, fnBody.includes(bucket),
      fnBody.includes(bucket) ? '' : `bucket "${bucket}" not found in countByApproval`);
  }
}

// ── P2-6. component-routes.js POST /insert + GET /insertions ─────────
process.stdout.write('\n[P2-6] Phase 2 — component-routes.js POST /insert + GET /insertions\n');
{
  const code = readFile(path.join(SERVER_DIR, 'component-routes.js')) || '';
  record('p2-component-routes-POST-insert',
    code.includes("router.post('/insert'") || code.includes('router.post("/insert"'),
    'POST /insert handler not found in component-routes.js');
  record('p2-component-routes-GET-insertions',
    code.includes("router.get('/insertions'") || code.includes('router.get("/insertions"'),
    'GET /insertions handler not found in component-routes.js');
}

// ── P2-7. component-inventory.js stagedInsert + listInsertions exported ──
process.stdout.write('\n[P2-7] Phase 2 — component-inventory.js stagedInsert + listInsertions\n');
{
  const code = readFile(path.join(SERVER_DIR, 'component-inventory.js')) || '';
  record('p2-inventory-stagedInsert-defined',
    /function stagedInsert/.test(code),
    'function stagedInsert not found in component-inventory.js');
  record('p2-inventory-listInsertions-defined',
    /function listInsertions/.test(code),
    'function listInsertions not found in component-inventory.js');
  record('p2-inventory-stagedInsert-exported',
    /module\.exports\s*=/.test(code) && code.includes('stagedInsert'),
    'stagedInsert not found in module.exports block');
  record('p2-inventory-listInsertions-exported',
    /module\.exports\s*=/.test(code) && code.includes('listInsertions'),
    'listInsertions not found in module.exports block');
}

// ── P2-8. sites-actions.js _dispatch helper + setTimeout reference ────
process.stdout.write('\n[P2-8] Phase 2 — sites-actions.js _dispatch helper + setTimeout race fix\n');
{
  const code = readFile(path.join(LIB_DIR, 'sites-actions.js')) || '';
  record('p2-sites-actions-_dispatch-present',
    code.includes('function _dispatch') || code.includes('_dispatch ='),
    '_dispatch helper not found in sites-actions.js');
  record('p2-sites-actions-setTimeout-present',
    code.includes('setTimeout'),
    'setTimeout not found in sites-actions.js (race fix missing)');
}

// ── P2-9. index.html postMessage listener gated to studio-embedded class ──
process.stdout.write('\n[P2-9] Phase 2 — index.html studio-shell postMessage listener + guard\n');
{
  const code = readFile(path.join(STUDIO, 'public', 'index.html')) || '';
  record('p2-index-html-studio-embedded-class',
    code.includes("'studio-embedded'") || code.includes('"studio-embedded"'),
    'studio-embedded class reference not found in index.html');
  record('p2-index-html-addEventListener-message',
    code.includes("addEventListener('message'") || code.includes('addEventListener("message"'),
    'addEventListener(\'message\'...) not found in index.html');
  record('p2-index-html-early-return-guard',
    code.includes("classList.contains('studio-embedded')") ||
    code.includes('classList.contains("studio-embedded")'),
    'early-return guard (classList.contains studio-embedded) not found in index.html');
}

// ── P2-10. index.html non-embedded early-return check ────────────────
process.stdout.write('\n[P2-10] Phase 2 — index.html IIFE early-returns when not embedded\n');
{
  const code = readFile(path.join(STUDIO, 'public', 'index.html')) || '';
  // The IIFE must check for studio-embedded class and return early if absent
  const hasGuard = /if\s*\(!document\.documentElement\.classList\.contains\(['"]studio-embedded['"]\)\)\s*return/.test(code);
  record('p2-index-html-not-embedded-early-return', hasGuard,
    hasGuard ? '' : 'if (!document.documentElement.classList.contains("studio-embedded")) return not found in index.html');
}

// ── P2-11. recipes.js bindRecipeStatuses + window.STUDIO_RECIPES_BIND ──
process.stdout.write('\n[P2-11] Phase 2 — recipes.js bindRecipeStatuses + window.STUDIO_RECIPES_BIND\n');
{
  const code = readFile(path.join(LIB_DIR, 'recipes.js')) || '';
  record('p2-recipes-bindRecipeStatuses-defined',
    /function bindRecipeStatuses/.test(code),
    'function bindRecipeStatuses not found in recipes.js');
  record('p2-recipes-STUDIO_RECIPES_BIND-window',
    code.includes('window.STUDIO_RECIPES_BIND'),
    'window.STUDIO_RECIPES_BIND not found in recipes.js');
}

// ── P2-12. recipe-flow.jsx fetches /api/intelligence/runs ────────────
process.stdout.write('\n[P2-12] Phase 2 — recipe-flow.jsx fetches /api/intelligence/runs\n');
{
  const code = readFile(path.join(SRC_DIR, 'recipe-flow.jsx')) || '';
  record('p2-recipe-flow-fetches-runs',
    code.includes('/api/intelligence/runs'),
    '/api/intelligence/runs substring not found in recipe-flow.jsx');
}

// ── P2-13. intelligence-reader.js updated_at + spec.json fallback ─────
process.stdout.write('\n[P2-13] Phase 2 — intelligence-reader.js updated_at + spec.json mtime\n');
{
  const code = readFile(path.join(SERVER_DIR, 'intelligence-reader.js')) || '';
  record('p2-intelligence-reader-updated_at',
    code.includes('updated_at'),
    'updated_at not found in intelligence-reader.js');
  record('p2-intelligence-reader-spec-json-fallback',
    code.includes('spec.json'),
    'spec.json fallback not found in intelligence-reader.js');
}

// ── P2-14. sites.jsx relativeTime function defined ────────────────────
process.stdout.write('\n[P2-14] Phase 2 — sites.jsx relativeTime function\n');
{
  const code = readFile(path.join(SCREENS_DIR, 'sites.jsx')) || '';
  record('p2-sites-jsx-relativeTime-defined',
    /function relativeTime/.test(code),
    'function relativeTime not found in sites.jsx');
}

// ── P2-15. studio.html has site-settings-api.js script tag ───────────
process.stdout.write('\n[P2-15] Phase 2 — studio.html <script> tag for site-settings-api.js\n');
{
  const html = readFile(path.join(STUDIO, 'public', 'studio.html')) || '';
  const rx = /site-settings-api\.js/;
  record('p2-studio-html-site-settings-api-script', rx.test(html),
    rx.test(html) ? '' : 'site-settings-api.js <script> tag not found in studio.html');
}

// ── P2-16. Mission Control drift trip-wire regression (Phase 2) ───────
process.stdout.write('\n[P2-16] Phase 2 — Mission Control drift trip-wire (Phase 2 regression)\n');
{
  const code = readFile(path.join(SCREENS_DIR, 'mission-control.jsx')) || '';
  const noRecipe       = !/<RecipeSelector\b/.test(code);
  const noSitesList    = !/<ScreenSites\b/.test(code)     && !/sites-api/.test(code);
  const noCompList     = !/<ScreenComponentStudio\b/.test(code) && !/components-api/.test(code);
  const noMediaList    = !/<ScreenMediaLibrary\b/.test(code)    && !/media-api/.test(code);
  record('p2-mc-no-RecipeSelector',    noRecipe);
  record('p2-mc-no-Sites-content',     noSitesList);
  record('p2-mc-no-Component-content', noCompList);
  record('p2-mc-no-Media-content',     noMediaList);
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
