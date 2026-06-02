'use strict';

/**
 * data.js — keyless OHLC data loader for the finance-agents paper-trading sim.
 *
 * Primary source: Stooq daily CSV (https://stooq.com/q/d/l/?s=<sym>&i=d).
 *   - No API key required.
 *   - Returns full daily history as CSV: Date,Open,High,Low,Close,Volume
 *
 * Caching: successful fetches are written to ./.cache/<sym>.csv so repeat runs
 *   do not hammer the source.
 *
 * Offline fallback: if the network is blocked (sandbox / no connectivity) and
 *   no cache exists, we load the bundled fixtures in ./sample-data/. These are
 *   CLEARLY-LABELED SYNTHETIC SAMPLE prices — NOT real market data. The
 *   `source` field on every series records exactly where the numbers came
 *   from so the report can be honest.
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '.cache');
const SAMPLE_DIR = path.join(__dirname, 'sample-data');

// Display name -> Stooq symbol -> sample-data filename.
const BASKET = [
  { display: 'SPY', stooq: 'spy.us', file: 'spy.us.csv', kind: 'etf' },
  { display: 'QQQ', stooq: 'qqq.us', file: 'qqq.us.csv', kind: 'etf' },
  { display: 'AAPL', stooq: 'aapl.us', file: 'aapl.us.csv', kind: 'stock' },
  { display: 'NVDA', stooq: 'nvda.us', file: 'nvda.us.csv', kind: 'stock' },
  { display: 'TSLA', stooq: 'tsla.us', file: 'tsla.us.csv', kind: 'stock' },
  { display: 'BTC-USD', stooq: 'btcusd', file: 'btcusd.csv', kind: 'crypto' },
];

const FETCH_TIMEOUT_MS = 15000;

function parseCsv(text) {
  // Stooq header: Date,Open,High,Low,Close,Volume
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;
  const header = lines[0].toLowerCase();
  if (!header.startsWith('date,')) return null;
  const bars = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',');
    if (c.length < 5) continue;
    const bar = {
      date: c[0],
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: c[5] ? parseInt(c[5], 10) : null,
    };
    if (!Number.isFinite(bar.open) || !Number.isFinite(bar.close)) continue;
    bars.push(bar);
  }
  // Stooq returns ascending by date already; ensure it.
  bars.sort((a, b) => (a.date < b.date ? -1 : 1));
  return bars.length ? bars : null;
}

async function fetchStooq(sym) {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(sym)}&i=d`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // Stooq returns "Host not in allowlist" / "No data" as a tiny body.
    if (text.trim().length < 40 || !text.toLowerCase().startsWith('date,')) {
      throw new Error(`bad body: ${text.trim().slice(0, 40)}`);
    }
    return text;
  } finally {
    clearTimeout(t);
  }
}

function readCache(file) {
  const p = path.join(CACHE_DIR, file);
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return null;
}

function writeCache(file, text) {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, file), text);
}

function readSample(file) {
  const p = path.join(SAMPLE_DIR, file);
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return null;
}

/**
 * Load OHLC history for one basket member.
 * Order of preference: live Stooq -> cache -> bundled sample.
 * Returns { display, symbol, kind, source, bars } or null if nothing works.
 */
async function loadSeries(member, opts = {}) {
  const { preferLive = true } = opts;
  let text = null;
  let source = null;

  if (preferLive) {
    try {
      text = await fetchStooq(member.stooq);
      source = 'LIVE:stooq.com';
      writeCache(member.file, text);
    } catch (err) {
      text = null;
      // fall through
      process.stderr.write(
        `  [data] live fetch failed for ${member.display} (${err.message}); trying cache/sample\n`,
      );
    }
  }

  if (!text) {
    const cached = readCache(member.file);
    if (cached) {
      text = cached;
      source = 'CACHE:stooq.com';
    }
  }

  if (!text) {
    const sample = readSample(member.file);
    if (sample) {
      text = sample;
      source = 'SAMPLE:synthetic (NOT real market data)';
    }
  }

  if (!text) return null;
  const bars = parseCsv(text);
  if (!bars) return null;
  return {
    display: member.display,
    symbol: member.stooq,
    kind: member.kind,
    source,
    bars,
  };
}

/**
 * Load the whole basket.
 * Returns { asOf, dataSource, series: [...] }
 *   - asOf: the latest date common to all series (the "session" we trade).
 *   - dataSource: 'LIVE' | 'CACHE' | 'SAMPLE' | 'MIXED'
 */
async function loadBasket(opts = {}) {
  const series = [];
  for (const m of BASKET) {
    const s = await loadSeries(m, opts);
    if (s) series.push(s);
  }
  if (!series.length) {
    throw new Error('No data available from any source (live, cache, or sample).');
  }

  // Determine overall data-source label.
  const kinds = new Set(series.map((s) => s.source.split(':')[0]));
  let dataSource;
  if (kinds.size === 1) dataSource = [...kinds][0];
  else dataSource = 'MIXED';

  // Latest session = the most recent date present in EVERY series, so all
  // agents trade the same day.
  const dateSets = series.map((s) => new Set(s.bars.map((b) => b.date)));
  const allDates = [...dateSets[0]].filter((d) => dateSets.every((set) => set.has(d)));
  allDates.sort();
  const asOf = allDates[allDates.length - 1];

  return { asOf, dataSource, series };
}

module.exports = { loadBasket, loadSeries, parseCsv, BASKET };
