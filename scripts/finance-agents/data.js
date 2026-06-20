'use strict';

/**
 * data.js — keyless OHLC data loader for the finance-agents paper-trading sim.
 *
 * Primary source: Yahoo Finance chart endpoint (keyless).
 *   https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?period1=<unix>&period2=<unix>&interval=1d
 *
 *   - No API key required.
 *   - Returns JSON: chart.result[0].timestamp[] + chart.result[0].indicators.quote[0].{open,high,low,close,volume}[]
 *   - 95-day lookback window covers the strategies that need 20-bar history (SMA10/20, 20-day breakout).
 *
 * History note: an earlier version used Stooq daily CSV
 * (https://stooq.com/q/d/l/?s=<sym>&i=d). Stooq has since added a JavaScript
 * proof-of-work browser-verification wall that returns an HTML challenge page
 * instead of CSV to any non-browser client. Plain Node fetch cannot pass it.
 * Stooq was removed; Yahoo chart is the new primary.
 *
 * Caching: successful Yahoo fetches are written to ./.cache/<sym>.json so repeat
 *   runs do not hammer the source.
 *
 * Offline fallback: if the network is blocked and no cache exists, we load the
 *   bundled fixtures in ./sample-data/ (CSV format). These are CLEARLY-LABELED
 *   SYNTHETIC SAMPLE prices — NOT real market data. The `source` field on every
 *   series records exactly where the numbers came from so the report can be honest.
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '.cache');
const SAMPLE_DIR = path.join(__dirname, 'sample-data');

// Display name -> Yahoo ticker -> cache filename -> sample-data CSV filename.
const BASKET = [
  { display: 'SPY',     yahoo: 'SPY',      cacheFile: 'SPY.json',     sampleFile: 'spy.us.csv',  kind: 'etf' },
  { display: 'QQQ',     yahoo: 'QQQ',      cacheFile: 'QQQ.json',     sampleFile: 'qqq.us.csv',  kind: 'etf' },
  { display: 'AAPL',    yahoo: 'AAPL',     cacheFile: 'AAPL.json',    sampleFile: 'aapl.us.csv', kind: 'stock' },
  { display: 'NVDA',    yahoo: 'NVDA',     cacheFile: 'NVDA.json',    sampleFile: 'nvda.us.csv', kind: 'stock' },
  { display: 'TSLA',    yahoo: 'TSLA',     cacheFile: 'TSLA.json',    sampleFile: 'tsla.us.csv', kind: 'stock' },
  { display: 'BTC-USD', yahoo: 'BTC-USD',  cacheFile: 'BTC-USD.json', sampleFile: 'btcusd.csv', kind: 'crypto' },
];

const FETCH_TIMEOUT_MS = 15000;
const LOOKBACK_DAYS = 95;

/**
 * Parse a Stooq-style CSV (Date,Open,High,Low,Close,Volume) into bars.
 * Retained for reading bundled sample-data fixtures.
 */
function parseCsv(text) {
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
  bars.sort((a, b) => (a.date < b.date ? -1 : 1));
  return bars.length ? bars : null;
}

/**
 * Fetch a Yahoo chart result for a ticker. Returns the raw `chart.result[0]`
 * object (with timestamp + indicators.quote[0] arrays). Throws on any failure.
 */
async function fetchYahoo(sym) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 86400 * LOOKBACK_DAYS;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${start}&period2=${now}&interval=1d`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (FAMtastic-Finance-Agents/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const err = json?.chart?.error;
    if (err) throw new Error(`Yahoo error: ${err.code} — ${err.description}`);
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('No chart result in Yahoo response');
    return result;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Convert a Yahoo chart result object into the same bar shape as parseCsv:
 * { date: 'YYYY-MM-DD', open, high, low, close, volume }.
 * Date is the UTC calendar date of the bar (Yahoo timestamps are second-resolution UTC).
 */
function yahooResultToBars(result) {
  const ts = result.timestamp || [];
  const q = (result.indicators?.quote || [{}])[0] || {};
  const opens = q.open || [];
  const highs = q.high || [];
  const lows = q.low || [];
  const closes = q.close || [];
  const volumes = q.volume || [];

  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const close = closes[i];
    if (close == null || !Number.isFinite(close)) continue;
    const d = new Date(ts[i] * 1000);
    const date = d.toISOString().slice(0, 10); // YYYY-MM-DD UTC
    bars.push({
      date,
      open: opens[i] != null ? opens[i] : null,
      high: highs[i] != null ? highs[i] : null,
      low: lows[i] != null ? lows[i] : null,
      close,
      volume: volumes[i] != null ? Math.round(volumes[i]) : null,
    });
  }
  bars.sort((a, b) => (a.date < b.date ? -1 : 1));
  return bars.length ? bars : null;
}

function readJsonCache(file) {
  const p = path.join(CACHE_DIR, file);
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

function writeJsonCache(file, result) {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, file), JSON.stringify(result));
}

function readSampleCsv(file) {
  const p = path.join(SAMPLE_DIR, file);
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return null;
}

/**
 * Load OHLC history for one basket member.
 * Order of preference: live Yahoo chart -> JSON cache -> bundled sample CSV.
 * Returns { display, symbol, kind, source, bars } or null if nothing works.
 */
async function loadSeries(member, opts = {}) {
  const { preferLive = true } = opts;
  let bars = null;
  let source = null;

  if (preferLive) {
    try {
      const result = await fetchYahoo(member.yahoo);
      bars = yahooResultToBars(result);
      if (!bars) throw new Error('Yahoo returned no usable bars');
      source = 'LIVE:yahoo.com';
      writeJsonCache(member.cacheFile, result);
    } catch (err) {
      bars = null;
      process.stderr.write(
        `  [data] live Yahoo fetch failed for ${member.display} (${err.message}); trying cache/sample\n`,
      );
    }
  }

  if (!bars) {
    const cached = readJsonCache(member.cacheFile);
    if (cached) {
      const parsed = yahooResultToBars(cached);
      if (parsed) {
        bars = parsed;
        source = 'CACHE:yahoo.com';
      }
    }
  }

  if (!bars) {
    const sampleText = readSampleCsv(member.sampleFile);
    if (sampleText) {
      const parsed = parseCsv(sampleText);
      if (parsed) {
        bars = parsed;
        source = 'SAMPLE:synthetic (NOT real market data)';
      }
    }
  }

  if (!bars) return null;
  return {
    display: member.display,
    symbol: member.yahoo,
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

module.exports = { loadBasket, loadSeries, parseCsv, yahooResultToBars, BASKET };
