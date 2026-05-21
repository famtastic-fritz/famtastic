'use strict';

const fs = require('fs');
const path = require('path');

const {
  ensureDataCenter,
  listSourceRecords,
} = require('../data-center');
const { listPostEvalRecords } = require('../post-eval');

function defaultHubRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function defaultRoot() {
  return path.join(defaultHubRoot(), 'data-center');
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function safeIso(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function hoursBetween(later, earlier) {
  const laterDate = new Date(later);
  const earlierDate = new Date(earlier);
  if (Number.isNaN(laterDate.getTime()) || Number.isNaN(earlierDate.getTime())) return null;
  return Math.round(((laterDate.getTime() - earlierDate.getTime()) / 36e5) * 10) / 10;
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => path.join(dir, name));
}

function listJsonlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.jsonl'))
    .sort()
    .map(name => path.join(dir, name));
}

function relativeFromHub(file, hubRoot) {
  return path.relative(hubRoot, file).split(path.sep).join('/');
}

function getLatest(records, dateField) {
  return records.slice().sort((a, b) => String(b[dateField] || '').localeCompare(String(a[dateField] || '')))[0] || null;
}

function isBlockedStatus(status) {
  return ['blocked', 'failed', 'stuck'].includes(String(status || '').toLowerCase());
}

function readJobs(root, now, staleAfterHours, predicate, mapper) {
  const jobsDir = path.join(root, 'jobs');
  if (!fs.existsSync(jobsDir)) return [];
  return fs.readdirSync(jobsDir)
    .sort()
    .map(name => {
      const jobDir = path.join(jobsDir, name);
      if (!fs.statSync(jobDir).isDirectory()) return null;
      const job = readJson(path.join(jobDir, 'job.json'), null);
      if (!job || (predicate && !predicate(job, name))) return null;
      const updatedAt = safeIso(job.updated_at || job.created_at);
      const ageHours = updatedAt ? hoursBetween(now, updatedAt) : null;
      const status = String(job.status || 'unknown');
      const isStale = typeof ageHours === 'number' && ageHours > staleAfterHours && !['succeeded', 'complete', 'completed'].includes(status.toLowerCase());
      const base = {
        id: job.id || name,
        title: job.title || job.id || name,
        status,
        created_at: safeIso(job.created_at),
        updated_at: updatedAt,
        age_hours: ageHours,
        is_stale: isStale,
        is_blocked: isBlockedStatus(status) || Boolean(job.blocker),
        needs_fritz: Boolean(job.needs_fritz || job.requires_human || job.blocker),
        blocker: job.blocker || null,
        path: relativeFromHub(path.join(jobDir, 'job.json'), path.resolve(root, '..')),
      };
      return mapper ? mapper(base, job) : base;
    })
    .filter(Boolean)
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || a.id.localeCompare(b.id));
}

function readResearchJobs(root, now, staleAfterHours) {
  return readJobs(
    root,
    now,
    staleAfterHours,
    job => !['media_generation', 'component_reuse'].includes(String(job.kind || 'research').toLowerCase()),
    (base, job) => ({ ...base, source: job.source || 'unknown' })
  );
}

function readMediaGenerations(root, now, staleAfterHours) {
  return readJobs(
    root,
    now,
    staleAfterHours,
    job => String(job.kind || '').toLowerCase() === 'media_generation',
    (base, job) => ({
      ...base,
      provider: job.provider || 'unknown',
      model: job.model || null,
      media_type: job.media_type || null,
      category: job.category || null,
      dry_run: Boolean(job.dry_run),
      prompt_hash: job.prompt_hash || null,
      research_job_ids: Array.isArray(job.research_job_ids) ? job.research_job_ids : [],
    })
  );
}

function readComponentReuse(root, now, staleAfterHours) {
  return readJobs(
    root,
    now,
    staleAfterHours,
    job => String(job.kind || '').toLowerCase() === 'component_reuse',
    (base, job) => ({
      ...base,
      query_hash: job.query_hash || null,
      selected_component_ids: Array.isArray(job.selected_component_ids) ? job.selected_component_ids : [],
      candidate_count: Number(job.candidate_count || 0),
      reuse_before_build: Array.isArray(job.selected_component_ids) && job.selected_component_ids.length > 0,
    })
  );
}

function readWitnessChecks(root, now, staleAfterHours) {
  return listJsonlFiles(path.join(root, 'witness')).map(file => {
    const records = readJsonl(file);
    const latest = getLatest(records, 'issuedAt');
    if (!latest) return null;
    const issuedAt = safeIso(latest.issuedAt);
    const ageHours = issuedAt ? hoursBetween(now, issuedAt) : null;
    const capability = latest.capability || path.basename(file, '.jsonl');
    return {
      capability,
      id: capability,
      status: latest.status || 'unknown',
      issued_at: issuedAt,
      age_hours: ageHours,
      duration_ms: latest.durationMs,
      is_passing: latest.status === 'pass',
      is_stale: typeof ageHours === 'number' && ageHours > staleAfterHours,
      command: latest.metadata && latest.metadata.command ? latest.metadata.command : null,
      path: relativeFromHub(file, path.resolve(root, '..')),
    };
  }).filter(Boolean)
    .sort((a, b) => String(b.issued_at || '').localeCompare(String(a.issued_at || '')) || a.capability.localeCompare(b.capability));
}

function readClaims(root) {
  return listJsonFiles(path.join(root, 'claims')).map(file => {
    const claim = readJson(file, null);
    if (!claim) return null;
    return {
      claim_id: claim.claim_id,
      id: claim.claim_id,
      statement: claim.statement || '',
      status: claim.status || 'draft',
      confidence: claim.confidence,
      tags: Array.isArray(claim.tags) ? claim.tags : [],
      updated_at: safeIso(claim.updated_at || claim.created_at),
      path: relativeFromHub(file, path.resolve(root, '..')),
    };
  }).filter(Boolean)
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || String(a.claim_id).localeCompare(String(b.claim_id)));
}

function readDecisions(root) {
  return listJsonFiles(path.join(root, 'decisions')).map(file => {
    const decision = readJson(file, null);
    if (!decision) return null;
    return {
      decision_id: decision.decision_id,
      id: decision.decision_id,
      title: decision.title || 'Untitled decision',
      status: decision.status || 'proposed',
      claim_ids: Array.isArray(decision.claim_ids) ? decision.claim_ids : [],
      source_ids: Array.isArray(decision.source_ids) ? decision.source_ids : [],
      spec_ids: Array.isArray(decision.spec_ids) ? decision.spec_ids : [],
      updated_at: safeIso(decision.updated_at || decision.created_at),
      path: relativeFromHub(file, path.resolve(root, '..')),
    };
  }).filter(Boolean)
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || String(a.decision_id).localeCompare(String(b.decision_id)));
}

function readLedgers(root) {
  const records = [];
  for (const file of listJsonlFiles(path.join(root, 'ledgers'))) {
    const ledger = path.basename(file, '.jsonl');
    for (const record of readJsonl(file)) {
      records.push({ ledger, ...record, path: relativeFromHub(file, path.resolve(root, '..')) });
    }
  }
  return records.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
}

function readProofs(root, hubRoot, ledgers) {
  const proofs = [];
  for (const job of fs.existsSync(path.join(root, 'jobs')) ? fs.readdirSync(path.join(root, 'jobs')).sort() : []) {
    const outputs = path.join(root, 'jobs', job, 'outputs');
    if (!fs.existsSync(outputs)) continue;
    for (const name of fs.readdirSync(outputs).sort()) {
      const file = path.join(outputs, name);
      if (!fs.statSync(file).isFile()) continue;
      proofs.push({
        kind: 'job_output',
        id: `${job}/${name}`,
        job_id: job,
        title: name,
        status: 'available',
        path: relativeFromHub(file, hubRoot),
      });
    }
  }

  for (const event of ledgers) {
    if (event.proof_id || event.ledger === 'proof-ledger' || /proof/i.test(String(event.event || ''))) {
      proofs.push({
        kind: 'ledger_proof',
        id: event.proof_id || event.id || `${event.ledger}:${event.ts}`,
        title: event.title || event.event || event.proof_id || 'ledger proof',
        status: event.status || 'available',
        path: event.path || null,
        ts: event.ts || null,
      });
    }
  }

  return proofs.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')) || String(a.id).localeCompare(String(b.id)));
}

function readRawCaptureInbox(hubRoot) {
  const inboxDir = path.join(hubRoot, 'captures', 'inbox');
  if (!fs.existsSync(inboxDir)) return { total: 0, samples: [] };
  const files = fs.readdirSync(inboxDir)
    .filter(name => !name.startsWith('.'))
    .sort()
    .map(name => path.join(inboxDir, name))
    .filter(file => fs.statSync(file).isFile());
  return {
    total: files.length,
    samples: files.slice(0, 10).map(file => relativeFromHub(file, hubRoot)),
  };
}

function buildNeedsFritz(jobs, ledgers) {
  const items = [];
  for (const job of jobs) {
    if (job.needs_fritz) {
      items.push({ kind: 'research_job', id: job.id, title: job.title, reason: job.blocker || job.status, path: job.path });
    }
  }
  for (const event of ledgers) {
    const eventName = String(event.event || event.type || '');
    if (/human|fritz|approval|decision|required|requested/i.test(eventName) || event.needs_fritz === true) {
      items.push({
        kind: 'ledger_event',
        id: event.id || event.job_id || event.ts,
        event: eventName,
        reason: event.question || event.reason || event.summary || null,
        path: event.path,
      });
    }
  }
  return items;
}

function buildStaleOrBlocked(jobs, witnessChecks) {
  const items = [];
  for (const job of jobs) {
    if (job.is_stale || job.is_blocked) {
      items.push({ kind: 'research_job', id: job.id, title: job.title, status: job.status, is_stale: job.is_stale, is_blocked: job.is_blocked, path: job.path });
    }
  }
  for (const check of witnessChecks) {
    if (check.is_stale || !check.is_passing) {
      items.push({ kind: 'witness_check', id: check.capability, status: check.status, is_stale: check.is_stale, is_blocked: !check.is_passing, path: check.path });
    }
  }
  return items;
}

function countWhere(items, predicate) {
  return items.filter(predicate).length;
}

function summarizePostEval(records) {
  return {
    total: records.length,
    opportunities: records.reduce((sum, record) => sum + (Array.isArray(record.opportunities) ? record.opportunities.length : 0), 0),
    high_priority: records.reduce((sum, record) => sum + (Array.isArray(record.opportunities) ? record.opportunities.filter(item => item.priority === 'high').length : 0), 0),
  };
}

function buildMissionControlSnapshot(options = {}) {
  const hubRoot = path.resolve(options.hubRoot || defaultHubRoot());
  const root = path.resolve(options.root || defaultRoot());
  const now = safeIso(options.now || new Date().toISOString());
  const staleAfterHours = Number.isFinite(options.staleAfterHours) ? options.staleAfterHours : 48;
  ensureDataCenter({ root });

  const researchJobs = readResearchJobs(root, now, staleAfterHours);
  const mediaGenerations = readMediaGenerations(root, now, staleAfterHours);
  const componentReuse = readComponentReuse(root, now, staleAfterHours);
  const witnessChecks = readWitnessChecks(root, now, staleAfterHours);
  const claims = readClaims(root);
  const decisions = readDecisions(root);
  const ledgers = readLedgers(root);
  const postEval = listPostEvalRecords({ root }).map(record => ({
    evaluation_id: record.evaluation_id,
    id: record.evaluation_id,
    run: record.run,
    created_at: safeIso(record.created_at),
    summary: record.summary,
    opportunities: Array.isArray(record.opportunities) ? record.opportunities : [],
    gaps: Array.isArray(record.gaps) ? record.gaps : [],
  }));
  const needsFritz = buildNeedsFritz(researchJobs, ledgers);
  const staleOrBlocked = buildStaleOrBlocked(researchJobs, witnessChecks);
  const proofs = readProofs(root, hubRoot, ledgers);
  const sources = listSourceRecords({ root });

  return {
    generated_at: now,
    data_center: {
      root,
      hub_root: hubRoot,
      canonical: true,
      note: 'Mission Control is a reader/projection over Data Center and capture/proof outputs; it does not create a second knowledge store.',
    },
    summary: {
      research_jobs: {
        total: researchJobs.length,
        blocked: countWhere(researchJobs, job => job.is_blocked),
        stale: countWhere(researchJobs, job => job.is_stale),
      },
      media_generations: {
        total: mediaGenerations.length,
        dry_run: countWhere(mediaGenerations, job => job.dry_run),
        blocked: countWhere(mediaGenerations, job => job.is_blocked),
        stale: countWhere(mediaGenerations, job => job.is_stale),
      },
      component_reuse: {
        total: componentReuse.length,
        reuse_before_build: countWhere(componentReuse, job => job.reuse_before_build),
        blocked: countWhere(componentReuse, job => job.is_blocked),
        stale: countWhere(componentReuse, job => job.is_stale),
      },
      witness_checks: {
        total: witnessChecks.length,
        passing: countWhere(witnessChecks, check => check.is_passing),
        failing: countWhere(witnessChecks, check => !check.is_passing),
        stale: countWhere(witnessChecks, check => check.is_stale),
      },
      claims: { total: claims.length },
      decisions: { total: decisions.length },
      needs_fritz: { total: needsFritz.length },
      stale_or_blocked: { total: staleOrBlocked.length },
      proofs: { total: proofs.length },
      sources: { total: sources.length },
      post_eval: summarizePostEval(postEval),
    },
    research_jobs: researchJobs,
    media_generations: mediaGenerations,
    component_reuse: componentReuse,
    witness_checks: witnessChecks,
    claims,
    decisions,
    post_eval: postEval,
    needs_fritz: needsFritz,
    stale_or_blocked: staleOrBlocked,
    proofs,
    raw_capture_inbox: readRawCaptureInbox(hubRoot),
  };
}

module.exports = {
  buildMissionControlSnapshot,
  render: { readJsonl },
};
