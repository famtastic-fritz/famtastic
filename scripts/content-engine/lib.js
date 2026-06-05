'use strict';

/**
 * lib.js — shared helpers for the content engine: config + owner-profile
 * loading, slugify, frontmatter parse/serialize, HTML escaping, and the
 * BrainInterface loader that degrades gracefully when network/SDK is absent.
 *
 * Zero third-party dependencies — Node built-ins only.
 */

const fs = require('fs');
const path = require('path');

const ENGINE_DIR = __dirname;
const HUB_ROOT = path.resolve(ENGINE_DIR, '..', '..');

function loadConfig() {
  const raw = fs.readFileSync(path.join(ENGINE_DIR, 'config.json'), 'utf8');
  return JSON.parse(raw);
}

/**
 * Load the canonical owner profile (platform/config/owner-profile.json).
 * Returns a safe default if the file is missing so the engine never crashes.
 */
function loadOwnerProfile() {
  const p = path.join(HUB_ROOT, 'platform', 'config', 'owner-profile.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {
      owner: { display_name: 'The Editor', legal_name: '', email: '' },
      payment: {},
    };
  }
}

/** URL-safe slug from a string. */
function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Escape a string for safe insertion into HTML text/attributes. */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Count words in a plain-text or markdown string (strips markdown syntax). */
function wordCount(text) {
  const plain = String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_>`\-|]/g, ' ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/<[^>]+>/g, ' ');
  const words = plain.split(/\s+/).filter(Boolean);
  return words.length;
}

/**
 * Serialize an article object to a markdown file with YAML-ish frontmatter.
 * body is raw markdown.
 */
function toMarkdownFile(meta, body) {
  const fm = ['---'];
  for (const [k, v] of Object.entries(meta)) {
    if (Array.isArray(v)) {
      fm.push(`${k}: [${v.map((x) => JSON.stringify(x)).join(', ')}]`);
    } else if (typeof v === 'string' && (v.includes(':') || v.includes('#'))) {
      fm.push(`${k}: ${JSON.stringify(v)}`);
    } else {
      fm.push(`${k}: ${v}`);
    }
  }
  fm.push('---');
  return fm.join('\n') + '\n\n' + body.trim() + '\n';
}

/** Parse a markdown file with frontmatter back into { meta, body }. */
function parseMarkdownFile(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!mm) continue;
    let val = mm[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      try { val = JSON.parse(val.replace(/'/g, '"')); } catch { /* keep string */ }
    } else if (val.startsWith('"') && val.endsWith('"')) {
      try { val = JSON.parse(val); } catch { /* keep */ }
    }
    meta[mm[1]] = val;
  }
  return { meta, body: m[2].trim() };
}

/**
 * Attempt to load BrainInterface. This is the SANCTIONED production LLM path.
 * It pulls in adapters that may require network/SDK availability, so we load
 * it lazily inside try/catch. Returns null when unavailable (e.g. firewalled
 * container) — the caller then falls back to the deterministic generator.
 */
function tryLoadBrainInterface() {
  try {
    const { BrainInterface } = require(path.join(
      HUB_ROOT, 'site-studio', 'lib', 'brain-interface.js'
    ));
    return BrainInterface;
  } catch (err) {
    return null;
  }
}

/** Build the Amazon affiliate URL for a search term, tagged with the associates ID. */
function amazonAffiliateLink(searchTerm, tag) {
  const q = encodeURIComponent(searchTerm);
  return `https://www.amazon.com/s?k=${q}&tag=${encodeURIComponent(tag)}`;
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = {
  ENGINE_DIR,
  HUB_ROOT,
  loadConfig,
  loadOwnerProfile,
  slugify,
  escapeHtml,
  wordCount,
  toMarkdownFile,
  parseMarkdownFile,
  tryLoadBrainInterface,
  amazonAffiliateLink,
  todayStamp,
};
