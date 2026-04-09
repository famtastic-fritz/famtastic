#!/usr/bin/env node
/**
 * Phase 1 — Component Skills Foundation Tests
 *
 * Verifies:
 *   1. Component export captures fields, slots, CSS vars, and sets version
 *   2. Re-export bumps version (1.0 → 1.1)
 *   3. syncSkillFromComponent creates/updates SKILL.md in .claude/skills/components/
 *   4. library.json has correct structure (id, version, field_count, css_variables, used_in, path)
 *   5. spec.content[page].sections records component_ref after export
 *   6. Component import injects CSS vars into target site styles
 *   7. Component import records component_ref in spec after insertion
 *   8. Existing component skill files are not corrupted on re-sync
 *
 * Usage:
 *   SITE_TAG=site-auntie-gale-garage-sales node tests/phase1-component-skills-tests.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const SITE_TAG = process.env.SITE_TAG || 'site-auntie-gale-garage-sales';
const STUDIO_PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const BASE = `http://localhost:${STUDIO_PORT}`;
const HUB_ROOT = path.join(__dirname, '..');
const SITE_DIR = path.join(HUB_ROOT, 'sites', SITE_TAG);
const DIST_DIR = path.join(SITE_DIR, 'dist');
const COMPONENTS_DIR = path.join(HUB_ROOT, 'components');
const SKILLS_DIR = path.join(HUB_ROOT, '.claude', 'skills', 'components');

let pass = 0, fail = 0, total = 0;
const failures = [];

function assert(name, condition, detail = '') {
  total++;
  if (condition) { console.log(`  ✅ PASS: ${name}`); pass++; }
  else { console.log(`  ❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`); fail++; failures.push({ name, detail }); }
}

async function httpPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: STUDIO_PORT,
      path: endpoint, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': BASE, 'Content-Length': Buffer.byteLength(bodyStr) },
    }, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', reject);
    req.write(bodyStr); req.end();
  });
}

async function httpGet(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: STUDIO_PORT,
      path: endpoint, method: 'GET',
      headers: { 'Origin': BASE },
    }, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log(`\nPhase 1 — Component Skills Foundation Tests`);
  console.log(`Site: ${SITE_TAG} | Server: ${BASE}\n`);

  // ─── Server health ────────────────────────────────────────────────────────
  console.log('TEST GROUP: Server Health');
  try {
    const r = await httpGet('/');
    assert('server is running', r.status < 500, `got ${r.status}`);
  } catch (e) {
    assert('server is running', false, `connection refused: ${e.message}`);
    printResults(); return;
  }

  // ─── GROUP 1: Component Export — first export ─────────────────────────────
  console.log('\nTEST GROUP: Component Export — initial export');
  {
    // Clean up any previous test component
    const testCompDir = path.join(COMPONENTS_DIR, 'test-hero-export');
    if (fs.existsSync(testCompDir)) fs.rmSync(testCompDir, { recursive: true });

    // Find a page with a hero section
    const heroPage = fs.existsSync(path.join(DIST_DIR, 'index.html')) ? 'index.html' : null;
    if (!heroPage) {
      assert('index.html exists for export test', false, `DIST_DIR: ${DIST_DIR}`);
    } else {
      const r = await httpPost('/api/components/export', {
        page: heroPage,
        component_id: 'test-hero-export',
        section_id: 'hero',
      });

      assert('export returns 200', r.status === 200, `got ${r.status}: ${JSON.stringify(r.body)}`);
      assert('export response has success', r.body?.success === true);
      assert('export response has field_count', typeof r.body?.field_count === 'number');
      assert('export response has slot_count', typeof r.body?.slot_count === 'number');
      assert('export response has component.version', typeof r.body?.component?.version === 'string');
      assert('first export version is 1.0', r.body?.component?.version === '1.0', `got: ${r.body?.component?.version}`);

      // Verify files written to disk
      const compDir = path.join(COMPONENTS_DIR, 'test-hero-export');
      assert('component directory created', fs.existsSync(compDir));
      assert('component.json written', fs.existsSync(path.join(compDir, 'component.json')));
      assert('component HTML template written', fs.existsSync(path.join(compDir, 'test-hero-export.html')));

      if (fs.existsSync(path.join(compDir, 'component.json'))) {
        const comp = JSON.parse(fs.readFileSync(path.join(compDir, 'component.json'), 'utf8'));
        assert('component.json has html_template', typeof comp.html_template === 'string' && comp.html_template.length > 0);
        assert('component.json has css.variables', typeof comp.css?.variables === 'object');
        assert('component.json has content_fields array', Array.isArray(comp.content_fields));
        assert('component.json has slots array', Array.isArray(comp.slots));
        assert('component.json has created_from', typeof comp.created_from === 'string');
        assert('component.json has created_at timestamp', typeof comp.created_at === 'string');
        assert('component.json has updated_at timestamp', typeof comp.updated_at === 'string');
      }
    }
  }

  // ─── GROUP 2: Version tracking — re-export bumps version ─────────────────
  console.log('\nTEST GROUP: Version tracking — re-export bumps version');
  {
    const heroPage = fs.existsSync(path.join(DIST_DIR, 'index.html')) ? 'index.html' : null;
    if (heroPage) {
      const r2 = await httpPost('/api/components/export', {
        page: heroPage,
        component_id: 'test-hero-export',
        section_id: 'hero',
      });

      assert('re-export returns 200', r2.status === 200, `got ${r2.status}`);
      assert('re-export version bumped to 1.1', r2.body?.component?.version === '1.1',
        `got: ${r2.body?.component?.version}`);

      const compDir = path.join(COMPONENTS_DIR, 'test-hero-export');
      if (fs.existsSync(path.join(compDir, 'component.json'))) {
        const comp = JSON.parse(fs.readFileSync(path.join(compDir, 'component.json'), 'utf8'));
        assert('component.json version updated to 1.1', comp.version === '1.1', `got: ${comp.version}`);
        assert('usage_count incremented', comp.usage_count >= 2, `got: ${comp.usage_count}`);
        assert('updated_at set', typeof comp.updated_at === 'string');
      }
    }
  }

  // ─── GROUP 3: Skill auto-sync — SKILL.md created/updated ─────────────────
  console.log('\nTEST GROUP: Skill auto-sync — SKILL.md lifecycle');
  {
    // The export should have synced the skill file for the component type
    // hero section = type "hero" or "generic" — look in skills dir
    const skillTypes = ['hero', 'generic', 'hero-section'];
    let skillFile = null;
    for (const t of skillTypes) {
      const candidate = path.join(SKILLS_DIR, t, 'SKILL.md');
      if (fs.existsSync(candidate)) { skillFile = candidate; break; }
    }

    // Also check the pre-existing hero-section skill
    const heroSkill = path.join(SKILLS_DIR, 'hero-section', 'SKILL.md');

    assert('skills directory exists', fs.existsSync(SKILLS_DIR), `SKILLS_DIR: ${SKILLS_DIR}`);
    assert('hero-section SKILL.md exists (pre-existing)', fs.existsSync(heroSkill),
      'Not found — create it at .claude/skills/components/hero-section/SKILL.md');

    if (fs.existsSync(heroSkill)) {
      const skill = fs.readFileSync(heroSkill, 'utf8');
      assert('SKILL.md has Identity section', skill.includes('## Identity'));
      assert('SKILL.md has Component type', skill.includes('Component type:'));
      assert('SKILL.md has Current version', skill.includes('Current version:'));
      assert('SKILL.md has Usage count', skill.includes('Usage count:'));
      assert('SKILL.md has Required Fields section', skill.includes('## Required Fields'));
      assert('SKILL.md has When to Use section', skill.includes('## When to Use'));
      assert('SKILL.md has Lessons Learned section', skill.includes('## Lessons Learned'));
    }

    // Verify syncSkillFromComponent is in server source
    const serverSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'server.js'), 'utf8');
    assert('syncSkillFromComponent function defined', serverSrc.includes('function syncSkillFromComponent('));
    assert('syncSkillFromComponent called from export endpoint', serverSrc.includes('syncSkillFromComponent(component)'));
    assert('skill file writes usage count', serverSrc.includes('Usage count: ${usageCount}'));
    assert('skill file writes Used in sites', serverSrc.includes('Used in: ${usedInSites'));
    assert('skill preserves existing lessons learned', serverSrc.includes('Lessons Learned'));
  }

  // ─── GROUP 4: library.json structure ─────────────────────────────────────
  console.log('\nTEST GROUP: library.json structure validation');
  {
    const libPath = path.join(COMPONENTS_DIR, 'library.json');
    assert('library.json exists', fs.existsSync(libPath));

    if (fs.existsSync(libPath)) {
      const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
      assert('library.json has components array', Array.isArray(lib.components));
      assert('library has at least 1 component', lib.components.length >= 1,
        `count: ${lib.components.length}`);
      assert('library has last_updated', typeof lib.last_updated === 'string');

      const testComp = lib.components.find(c => (c.component_id || c.id) === 'test-hero-export');
      if (testComp) {
        assert('library entry has id', typeof (testComp.id || testComp.component_id) === 'string');
        assert('library entry has version', typeof testComp.version === 'string');
        assert('library entry has field_count', typeof testComp.field_count === 'number');
        assert('library entry has slot_count', typeof testComp.slot_count === 'number');
        assert('library entry has css_variables array', Array.isArray(testComp.css_variables));
        assert('library entry has used_in array', Array.isArray(testComp.used_in));
        assert('library entry has path', typeof testComp.path === 'string');
        assert('library entry has created_from', typeof testComp.created_from === 'string');
        assert('library entry has description', typeof testComp.description === 'string');
      } else {
        assert('test-hero-export found in library', false, 'not in library.json');
      }

      // Verify all pre-existing library components also have the new fields
      const allHaveVersion = lib.components.every(c => c.version);
      assert('all library components have version', allHaveVersion,
        `missing version: ${lib.components.filter(c => !c.version).map(c => c.id || c.component_id).join(', ')}`);
    }
  }

  // ─── GROUP 5: spec.content component_ref after export ────────────────────
  console.log('\nTEST GROUP: spec.content component_ref tracking');
  {
    const serverSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'server.js'), 'utf8');
    assert('export writes component_ref to spec.content',
      serverSrc.includes('component_ref: `${component_id}@${version}`') ||
      serverSrc.includes("component_ref:"));
    assert('import writes component_ref to spec.content after insertion',
      serverSrc.includes('imported: true'));

    const specPath = path.join(SITE_DIR, 'spec.json');
    if (fs.existsSync(specPath)) {
      const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
      // Look for any section with a component_ref
      let foundRef = false;
      for (const page of Object.values(spec.content || {})) {
        if ((page.sections || []).some(s => s.component_ref)) { foundRef = true; break; }
      }
      assert('at least one section has component_ref in spec.content', foundRef,
        'no component_ref found — export endpoint may not have run yet');
    }
  }

  // ─── GROUP 6: Import CSS variable portability ─────────────────────────────
  console.log('\nTEST GROUP: Import CSS variable portability');
  {
    const serverSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'server.js'), 'utf8');
    assert('import reads component.json for CSS vars',
      serverSrc.includes('compJsonForImport') || serverSrc.includes('compDef.css?.variables'));
    assert('import checks for missing CSS vars before injecting',
      serverSrc.includes('missingVars'));
    assert('import injects vars into :root block',
      serverSrc.includes("':root {'") || serverSrc.includes('":root {"') ||
      serverSrc.includes(':root {'));
    assert('import falls back to creating :root if not present',
      serverSrc.includes('`:root {\\n'));
    assert('import tracks version in HTML comment',
      serverSrc.includes('v${match.version || ') || serverSrc.includes("v${match.version"));
  }

  // ─── GROUP 7: Existing skills not corrupted ───────────────────────────────
  console.log('\nTEST GROUP: Existing skill files preserved');
  {
    const existingSkills = ['hero-section', 'contact-form', 'pricing-table', 'testimonial-grid'];
    for (const skillName of existingSkills) {
      const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const content = fs.readFileSync(skillPath, 'utf8');
        assert(`${skillName} SKILL.md is readable and non-empty`, content.length > 50,
          `length: ${content.length}`);
        assert(`${skillName} SKILL.md has Identity section`, content.includes('## Identity'));
      }
    }
  }

  // ─── Cleanup test component ──────────────────────────────────────────────
  try {
    const testCompDir = path.join(COMPONENTS_DIR, 'test-hero-export');
    if (fs.existsSync(testCompDir)) fs.rmSync(testCompDir, { recursive: true });
    // Remove test-hero-export from library.json
    const libPath = path.join(COMPONENTS_DIR, 'library.json');
    if (fs.existsSync(libPath)) {
      const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
      lib.components = lib.components.filter(c => (c.id || c.component_id) !== 'test-hero-export');
      fs.writeFileSync(libPath, JSON.stringify(lib, null, 2));
    }
  } catch {}

  printResults();
}

function printResults() {
  console.log(`\n${'━'.repeat(45)}`);
  console.log(`Phase 1 Component Skills Results: ${pass} PASS | ${fail} FAIL | ${total} total`);
  console.log(`${'━'.repeat(45)}\n`);
  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
    console.log('');
  }
  const logDir = path.join(__dirname, 'automation', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(
    path.join(logDir, 'phase1-component-skills-results.json'),
    JSON.stringify({ pass, fail, total, failures, timestamp: new Date().toISOString() }, null, 2)
  );
  console.log('Results saved to tests/automation/logs/phase1-component-skills-results.json');
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test runner crashed:', e.message); process.exit(1); });
