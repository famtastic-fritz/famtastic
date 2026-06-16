// site-studio/server/visual-refinement.js
//
// Lane F — Visual Refinement Tooling.
//
// Provides a "no production mutation" guarantee: all visual tweaks are
// applied to a working copy under sites/<tag>/.refinement/<runId>/ which
// is gitignored and ephemeral. The live sites/<tag>/dist/ is never
// modified by this module.
//
// Public API:
//   prepareWorkingCopy(siteDir, runId)
//   applyTweak(workingDir, tweak)
//   captureBeforeAfter(workingDir, page)
//   discardWorkingCopy(workingDir)
//   ALLOWED_VAR_PREFIXES
//   ALLOWED_CLASS_TOGGLES

'use strict';

const fs = require('fs');
const path = require('path');

const ALLOWED_VAR_PREFIXES = ['--fam-', '--op-'];

const ALLOWED_CLASS_TOGGLES = new Set([
  'fam-refinement-trial',
  'fam-spacing-tight',
  'fam-spacing-loose',
]);

function isAllowedVarName(name) {
  if (typeof name !== 'string') return false;
  return ALLOWED_VAR_PREFIXES.some((p) => name.startsWith(p));
}

function containsScriptInjection(value) {
  if (value == null) return false;
  const v = String(value).toLowerCase();
  return v.includes('<script') || v.includes('javascript:');
}

function copyDirRecursive(src, dst) {
  let count = 0;
  if (!fs.existsSync(src)) return count;
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) {
      count += copyDirRecursive(s, d);
    } else if (e.isFile()) {
      fs.copyFileSync(s, d);
      count += 1;
    }
  }
  return count;
}

function prepareWorkingCopy(siteDir, runId) {
  if (!siteDir || typeof siteDir !== 'string') {
    throw new Error('siteDir required');
  }
  if (!runId || typeof runId !== 'string') {
    throw new Error('runId required');
  }
  const distDir = path.join(siteDir, 'dist');
  const workingDir = path.join(siteDir, '.refinement', runId);
  if (!fs.existsSync(distDir)) {
    return { workingDir: null, copiedFiles: 0, note: 'no dist to copy' };
  }
  fs.mkdirSync(path.dirname(workingDir), { recursive: true });
  if (fs.existsSync(workingDir)) {
    fs.rmSync(workingDir, { recursive: true, force: true });
  }
  const copiedFiles = copyDirRecursive(distDir, workingDir);
  return { workingDir, copiedFiles };
}

function applyCssVarTweak(workingDir, tweak) {
  const target = tweak.target || 'tokens.css';
  const filePath = path.join(workingDir, target);
  if (!isAllowedVarName(tweak.name)) {
    throw new Error('var_not_allowlisted');
  }
  if (containsScriptInjection(tweak.value) || containsScriptInjection(tweak.name)) {
    throw new Error('script_injection_blocked');
  }
  let original = '';
  if (fs.existsSync(filePath)) {
    original = fs.readFileSync(filePath, 'utf8');
  } else {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const decl = `${tweak.name}: ${tweak.value};`;
  let next;
  // Try to update an existing :root rule if present
  const rootMatch = original.match(/:root\s*\{([\s\S]*?)\}/);
  if (rootMatch) {
    const inner = rootMatch[1];
    const varRegex = new RegExp(
      `(${tweak.name.replace(/[-]/g, '\\-')})\\s*:\\s*[^;]+;`,
      'g'
    );
    let newInner;
    if (varRegex.test(inner)) {
      newInner = inner.replace(varRegex, decl);
    } else {
      newInner = inner.replace(/\s*$/, '') + `\n  ${decl}\n`;
    }
    next = original.replace(rootMatch[0], `:root {${newInner}}`);
  } else {
    next = original + (original && !original.endsWith('\n') ? '\n' : '') +
      `:root {\n  ${decl}\n}\n`;
  }
  const before_excerpt = original.slice(0, 400);
  fs.writeFileSync(filePath, next, 'utf8');
  const after_excerpt = next.slice(0, 400);
  return { applied: true, file_touched: filePath, before_excerpt, after_excerpt };
}

function applyClassToggleTweak(workingDir, tweak) {
  const target = tweak.target || 'index.html';
  if (!ALLOWED_CLASS_TOGGLES.has(tweak.name)) {
    throw new Error('class_not_allowlisted');
  }
  if (containsScriptInjection(tweak.name) || containsScriptInjection(tweak.value)) {
    throw new Error('script_injection_blocked');
  }
  const filePath = path.join(workingDir, target);
  if (!fs.existsSync(filePath)) {
    throw new Error(`target_not_found:${target}`);
  }
  const original = fs.readFileSync(filePath, 'utf8');
  const bodyRegex = /<body([^>]*)>/i;
  const m = original.match(bodyRegex);
  if (!m) {
    throw new Error('body_tag_not_found');
  }
  const attrs = m[1];
  let newOpen;
  const classAttrRegex = /class\s*=\s*"([^"]*)"/i;
  if (classAttrRegex.test(attrs)) {
    const newAttrs = attrs.replace(classAttrRegex, (whole, classes) => {
      const list = classes.split(/\s+/).filter(Boolean);
      if (!list.includes(tweak.name)) list.push(tweak.name);
      return `class="${list.join(' ')}"`;
    });
    newOpen = `<body${newAttrs}>`;
  } else {
    newOpen = `<body${attrs} class="${tweak.name}">`;
  }
  const next = original.replace(m[0], newOpen);
  const before_excerpt = original.slice(0, 400);
  fs.writeFileSync(filePath, next, 'utf8');
  const after_excerpt = next.slice(0, 400);
  return { applied: true, file_touched: filePath, before_excerpt, after_excerpt };
}

function applyTweak(workingDir, tweak) {
  if (!workingDir || !fs.existsSync(workingDir)) {
    throw new Error('working_dir_missing');
  }
  if (!tweak || typeof tweak !== 'object') {
    throw new Error('tweak_invalid');
  }
  if (containsScriptInjection(tweak.value) || containsScriptInjection(tweak.name)) {
    throw new Error('script_injection_blocked');
  }
  if (tweak.kind === 'css_var') {
    return applyCssVarTweak(workingDir, tweak);
  }
  if (tweak.kind === 'class_toggle') {
    return applyClassToggleTweak(workingDir, tweak);
  }
  throw new Error('tweak_kind_unknown');
}

function captureBeforeAfter(workingDir, page) {
  if (!workingDir || !page) {
    throw new Error('working_dir_and_page_required');
  }
  // The working copy was rooted at sites/<tag>/.refinement/<runId>/, and dist
  // lives at sites/<tag>/dist/. Derive the dist path from the working dir.
  const refinementDir = path.dirname(workingDir); // sites/<tag>/.refinement
  const siteDir = path.dirname(refinementDir);    // sites/<tag>
  const distFile = path.join(siteDir, 'dist', page);
  const workFile = path.join(workingDir, page);
  const before = fs.existsSync(distFile)
    ? fs.readFileSync(distFile, 'utf8')
    : '';
  const after = fs.existsSync(workFile)
    ? fs.readFileSync(workFile, 'utf8')
    : '';
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  let changed = 0;
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < max; i++) {
    if (beforeLines[i] !== afterLines[i]) changed += 1;
  }
  const dom_excerpt_before = before.slice(0, 600);
  const dom_excerpt_after = after.slice(0, 600);
  return {
    before: dom_excerpt_before,
    after: dom_excerpt_after,
    diff_summary: { changed_lines: changed, before_lines: beforeLines.length, after_lines: afterLines.length },
  };
}

function discardWorkingCopy(workingDir) {
  if (!workingDir) return { removed: false };
  if (!fs.existsSync(workingDir)) return { removed: false };
  fs.rmSync(workingDir, { recursive: true, force: true });
  return { removed: true };
}

module.exports = {
  ALLOWED_VAR_PREFIXES,
  ALLOWED_CLASS_TOGGLES,
  prepareWorkingCopy,
  applyTweak,
  captureBeforeAfter,
  discardWorkingCopy,
};
