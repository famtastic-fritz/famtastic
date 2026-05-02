'use strict';

// lib/famtastic/capture/patterns.js
// SHAY V2 (2026-05-02 iter 3): Pattern detection across captures.
//
// Scans all docs/captures/*.md, looks at the titles of items (the "—" portion
// after the ID prefix), and reports clusters where the same insight has been
// captured 3+ times across different captures. Those clusters are candidates
// for promotion to a standing rule in cerebrum.md.
//
// Heuristic for now: title similarity via shared keyword count (>= 60% overlap
// of significant words). Iteration 4 can swap in embeddings if needed.

const fs = require('fs');
const path = require('path');
const cap = require('./index.js');

const STOPWORDS = new Set([
  'a','an','the','and','or','but','for','of','in','on','at','to','from','by',
  'is','are','was','were','be','been','being','it','its','this','that','these',
  'those','as','if','then','so','with','without','vs','via','about','than',
  'has','have','had','do','does','did','will','would','should','can','could',
  'not','no','yes','new','old','more','less','too','also','only','just','very'
]);

function tokenize(s) {
  return String(s || '').toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const inter = [...setA].filter(x => setB.has(x)).length;
  const uni = new Set([...setA, ...setB]).size;
  return uni === 0 ? 0 : inter / uni;
}

function readAllItems() {
  const captures = cap.listExistingCaptures();
  const items = [];
  for (const c of captures) {
    let content;
    try { content = fs.readFileSync(c.path, 'utf8'); } catch (e) { continue; }
    const blocks = content.split(/\n---\n/);
    for (const block of blocks) {
      const idMatch = block.match(/^###\s+([A-Z]-[\w-]+)\s*[—-]\s*(.+?)$/m);
      if (!idMatch) continue;
      const id = idMatch[1];
      const title = idMatch[2].trim();
      items.push({
        id,
        title,
        capture_file: c.name,
        type_prefix: id.split('-')[0],
        tokens: tokenize(title)
      });
    }
  }
  return items;
}

function clusterByTitleSimilarity(items, threshold) {
  threshold = threshold == null ? 0.55 : threshold;
  const clusters = [];
  const used = new Set();
  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    const seed = items[i];
    const cluster = [seed];
    used.add(i);
    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      // Only cluster items of the same type
      if (items[j].type_prefix !== seed.type_prefix) continue;
      const sim = jaccard(seed.tokens, items[j].tokens);
      if (sim >= threshold) {
        cluster.push(items[j]);
        used.add(j);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

function detectAcrossCaptures(opts) {
  opts = opts || {};
  const threshold = opts.promotionThreshold || 3;
  const captures = cap.listExistingCaptures();
  const items = readAllItems();
  const clusters = clusterByTitleSimilarity(items, opts.titleSimilarityThreshold);
  const patterns = clusters
    .filter(c => {
      const distinctCaptures = new Set(c.map(it => it.capture_file)).size;
      return c.length >= threshold && distinctCaptures >= Math.min(threshold, 2);
    })
    .map(c => ({
      signature: c[0].title,
      type_prefix: c[0].type_prefix,
      count: c.length,
      distinct_captures: new Set(c.map(it => it.capture_file)).size,
      instances: c.map(it => it.id + ' (' + it.capture_file + '): ' + it.title)
    }))
    .sort((a, b) => b.count - a.count);

  return {
    captures_scanned: captures.length,
    items_scanned: items.length,
    threshold,
    patterns
  };
}

module.exports = { detectAcrossCaptures, readAllItems, clusterByTitleSimilarity };
