// Builds a SINGLE self-contained HTML file for the NCS7 frontend demo.
// Inlines the vendored libs, styles, three-hero, the JSX (pre-compiled with the
// vendored Babel), and the seed content — so the file opens with a double-click
// (file://) with no server, no CDN, no network, no build step.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(HERE, 'frontend');
const read = (p) => fs.readFileSync(path.join(FE, p), 'utf8');
const safe = (js) => js.replace(/<\/script/gi, '<\\/script'); // never break out of <script>

// 1. Pre-compile app.js JSX -> plain JS using the vendored Babel (no network).
globalThis.window = globalThis; // babel-standalone expects a global
await import(path.join(FE, 'vendor', 'babel.min.js'));
const Babel = globalThis.Babel;

// Patch the content loader to prefer an inlined global (no fetch on file://).
let appSrc = read('app.js').replace(
  'async function load() {',
  `async function load() {
      if (window.__NCS7_CONTENT__) { if (alive) { setContent(window.__NCS7_CONTENT__); setSource("standalone · inlined content"); } return; }`
);
const appCompiled = Babel.transform(appSrc, { presets: ['react'] }).code;

// 2. Gather the pieces.
const styles = read('styles.css');
const threeHero = read('three-hero.js');
const viewer3d = read('viewer3d.js');
const react = read('vendor/react.production.min.js');
const reactDom = read('vendor/react-dom.production.min.js');
const three = read('vendor/three.min.js');
const content = read('content.json');

// 3. Assemble. Keep the same script order as index.html (three-hero before app).
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>National CAD Standard — NCS7 (standalone demo)</title>
<style>${styles}</style>
</head>
<body>
  <div id="app"><div class="loading"><div class="spinner"></div></div></div>

  <script>/* react */ ${safe(react)}</script>
  <script>/* react-dom */ ${safe(reactDom)}</script>
  <script>/* three.js r160 (UMD) */ ${safe(three)}</script>
  <script>window.__NCS7_CONTENT__ = ${content};</script>
  <script>/* 3D hero scenes */ ${safe(threeHero)}</script>
  <script>/* 3D CAD viewer */ ${safe(viewer3d)}</script>
  <script>/* app (JSX pre-compiled) */ ${safe(appCompiled)}</script>
</body>
</html>`;

const out = path.join(HERE, 'ncs7-standalone.html');
fs.writeFileSync(out, html);
const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`Wrote ${out} (${kb} KB) — open it directly in any browser, no server needed.`);
