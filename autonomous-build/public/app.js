// MetaMint client. Talks to /api/generate, renders previews, tags, validation,
// and the share image. PNG export rasterizes the SVG via canvas (browser-side).
'use strict';

const $ = (id) => document.getElementById(id);
const FIELDS = ['title', 'description', 'url', 'siteName', 'author', 'type', 'twitterCard', 'themeColor', 'imageUrl'];
let activeTab = 'google';
let last = null;
let debounce;
let appConfig = { mode: 'server', features: { watermark: true }, urlCrawl: false, brand: {} };
let engine = null; // loaded lazily in static mode

const DEMO = {
  title: 'MetaMint — perfect social previews in 30 seconds',
  description: 'Generate correct Open Graph and Twitter meta tags plus a 1200×630 share image, with faithful live previews. No login. Private by design.',
  url: 'https://metamint.app/',
  siteName: 'MetaMint',
  author: '@metamint',
  type: 'website',
  twitterCard: 'summary_large_image',
  themeColor: '#7c3aed',
  imageUrl: '',
};

function readInput() {
  const o = {};
  for (const f of FIELDS) o[f] = $(f).value;
  return o;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1600);
}

function counters() {
  const setC = (id, val, max) => {
    const el = $(id);
    el.textContent = `${val}/${max}`;
    el.classList.toggle('over', val > max);
  };
  setC('c-title', $('title').value.trim().length, 60);
  setC('c-desc', $('description').value.trim().length, 155);
}

async function generateData(input) {
  // Fork 1, configurable: in `static` mode run the engine in-browser (no
  // backend round-trip); otherwise call the server API.
  if (appConfig.mode === 'static') {
    if (!engine) engine = await import('/engine/index.js');
    return engine.generateAll(input, { ...appConfig, features: appConfig.features });
  }
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

async function generate() {
  counters();
  const input = readInput();
  let data;
  try {
    data = await generateData(input);
  } catch (e) {
    $('issues').innerHTML = `<li class="sev-error"><span class="ico">●</span> Generation failed: ${esc(e.message || e)}.</li>`;
    return;
  }
  last = data;
  renderScore(data.summary);
  renderTags(data.html);
  renderIssues(data.issues);
  renderOgImage(data);
  renderPreview();
}

function renderScore(summary) {
  $('score').innerHTML = `${summary.score}<small>/100</small>`;
  const c = summary.counts;
  const b = [];
  if (summary.ok) b.push(`<span class="badge ok">✓ ready to ship</span>`);
  if (c.error) b.push(`<span class="badge err">${c.error} error${c.error > 1 ? 's' : ''}</span>`);
  if (c.warning) b.push(`<span class="badge warn">${c.warning} warning${c.warning > 1 ? 's' : ''}</span>`);
  if (c.info) b.push(`<span class="badge info">${c.info} note${c.info > 1 ? 's' : ''}</span>`);
  $('badges').innerHTML = b.join(' ');
}

function highlight(html) {
  // Tiny HTML token highlighter for the tag block.
  return esc(html)
    .replace(/(&lt;\/?[a-z]+)/g, '<span class="tok-tag">$1</span>')
    .replace(/([a-z:-]+)=(&quot;)/g, '<span class="tok-attr">$1</span>=$2')
    .replace(/(&quot;.*?&quot;)/g, '<span class="tok-str">$1</span>');
}

function renderTags(html) {
  $('tags').innerHTML = highlight(html || '');
}

function renderIssues(issues) {
  if (!issues.length) {
    $('issues').innerHTML = `<li class="sev-info"><span class="ico">✓</span> No issues found. Nicely done.</li>`;
    return;
  }
  const ico = { error: '●', warning: '▲', info: 'ℹ' };
  $('issues').innerHTML = issues
    .map(
      (i) => `<li class="sev-${i.severity}">
        <span class="ico">${ico[i.severity]}</span>
        <span><strong>${esc(cap(i.severity))}</strong> · <span class="field-name">${esc(i.field)}</span><br>${esc(i.message)}</span>
      </li>`,
    )
    .join('');
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function currentImageSrc(data) {
  // Prefer an explicit image URL; otherwise the generated SVG data URI.
  return data.input.imageUrl || data.ogImageDataUri;
}

function renderOgImage(data) {
  $('og-holder').innerHTML = `<img class="card-img" style="border-radius:14px" alt="Generated share image" src="${currentImageSrc(data)}">`;
}

function imgOrPlaceholder(data) {
  const src = currentImageSrc(data);
  if (!src) return `<div class="noimg">no og:image — add one for a rich card</div>`;
  return `<img class="card-img" alt="share image" src="${esc(src)}">`;
}

function renderPreview() {
  if (!last) return;
  const p = last.preview;
  const stage = $('stage');
  const img = imgOrPlaceholder(last);

  if (activeTab === 'google') {
    stage.innerHTML = `<div class="g-card">
      <div class="g-url">${esc(p.host || 'example.com')}</div>
      <div class="g-bread">${esc(p.google.breadcrumb)}</div>
      <div class="g-title">${esc(p.google.title)}</div>
      <div class="g-desc">${esc(p.google.description)}</div>
    </div>`;
  } else if (activeTab === 'twitter') {
    stage.innerHTML = `<div class="tw-card">
      ${img}
      <div class="tw-meta">
        <div class="tw-host">${esc(p.host || 'example.com')}</div>
        <div class="tw-title">${esc(p.twitter.title)}</div>
        <div class="tw-desc">${esc(p.twitter.description)}</div>
      </div>
    </div>`;
  } else if (activeTab === 'facebook') {
    stage.innerHTML = `<div class="fb-card">
      ${img}
      <div class="fb-meta">
        <div class="fb-host">${esc(p.facebook.host || 'EXAMPLE.COM')}</div>
        <div class="fb-title">${esc(p.facebook.title)}</div>
        <div class="fb-desc">${esc(p.facebook.description)}</div>
      </div>
    </div>`;
  } else if (activeTab === 'slack') {
    stage.innerHTML = `<div class="sl-card">
      <div class="sl-bar"></div>
      <div class="sl-body">
        <div class="sl-site">${esc(p.slack.siteName)}</div>
        <div class="sl-title">${esc(p.slack.title)}</div>
        <div class="sl-desc">${esc(p.slack.description)}</div>
        <div class="sl-img">${img}</div>
      </div>
    </div>`;
  } else if (activeTab === 'imessage') {
    stage.innerHTML = `<div class="im-card">
      ${img}
      <div class="im-bar">
        <div class="im-title">${esc(p.imessage.title)}</div>
        <div class="im-host">${esc(p.imessage.host || 'example.com')}</div>
      </div>
    </div>`;
  }
}

// --- Downloads ---
function download(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function downloadSvg() {
  if (!last) return;
  download('metamint-og.svg', new Blob([last.ogImageSvg], { type: 'image/svg+xml' }));
  toast('SVG downloaded');
}

function downloadPng() {
  if (!last) return;
  const svg = last.ogImageSvg;
  const img = new Image();
  const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 1200, 630);
    canvas.toBlob((blob) => {
      download('metamint-og.png', blob);
      toast('PNG downloaded');
    }, 'image/png');
  };
  img.onerror = () => toast('PNG export failed — SVG still works');
  img.src = url;
}

async function copyTags() {
  if (!last) return;
  try {
    await navigator.clipboard.writeText(last.html);
    toast('Tags copied to clipboard');
  } catch {
    toast('Copy failed — select the text manually');
  }
}

// --- URL import (Fork 3) — only wired when the feature is enabled ---
async function importFromUrl() {
  const urlBox = $('crawl-url');
  const url = (urlBox.value || '').trim();
  if (!url) return;
  $('crawl-btn').disabled = true;
  $('crawl-btn').textContent = 'Reading…';
  try {
    const res = await fetch('/api/crawl?url=' + encodeURIComponent(url));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'crawl failed');
    const m = data.meta || {};
    const map = { title: 'title', description: 'description', url: 'url', siteName: 'siteName', author: 'author', imageUrl: 'imageUrl' };
    for (const [k, field] of Object.entries(map)) if (m[k]) $(field).value = m[k];
    if (m.twitterCard) $('twitterCard').value = m.twitterCard === 'summary' ? 'summary' : 'summary_large_image';
    if (m.type) $('type').value = m.type === 'article' ? 'article' : 'website';
    toast('Imported existing tags');
    generate();
  } catch (e) {
    toast('Import failed: ' + (e.message || e));
  } finally {
    $('crawl-btn').disabled = false;
    $('crawl-btn').textContent = 'Import';
  }
}

function mountUrlImport() {
  if (!appConfig.urlCrawl || document.getElementById('crawl-row')) return;
  const panel = document.querySelector('.layout .panel');
  const row = document.createElement('div');
  row.className = 'field';
  row.id = 'crawl-row';
  row.innerHTML = `<label for="crawl-url">Import from a live URL</label>
    <div style="display:flex;gap:8px">
      <input id="crawl-url" type="url" placeholder="https://example.com/page" autocomplete="off" style="flex:1">
      <button class="action primary" id="crawl-btn" type="button">Import</button>
    </div>`;
  panel.insertBefore(row, panel.children[1]);
  $('crawl-btn').addEventListener('click', importFromUrl);
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) appConfig = await res.json();
  } catch { /* keep defaults */ }
}

// --- Wire up ---
async function init() {
  await loadConfig();
  mountUrlImport();
  for (const f of FIELDS) {
    $(f).addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(generate, 120);
    });
    $(f).addEventListener('change', generate);
  }
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      activeTab = t.dataset.tab;
      renderPreview();
    });
  });
  $('dl-svg').addEventListener('click', downloadSvg);
  $('dl-png').addEventListener('click', downloadPng);
  $('copy-tags').addEventListener('click', copyTags);

  // Seed with a demo so the page is alive on first paint.
  for (const f of FIELDS) if (DEMO[f] != null) $(f).value = DEMO[f];
  generate();
}

document.addEventListener('DOMContentLoaded', init);
