'use strict';

const fs = require('fs');
const path = require('path');

function slugify(value) {
  return String(value || 'note')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'note';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function defaultRoots() {
  const hubRoot = path.resolve(__dirname, '..', '..', '..');
  return {
    dataRoot: path.join(hubRoot, 'data-center'),
    vaultRoot: path.join(hubRoot, 'second-brain'),
  };
}

function yamlScalar(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\n/g, ' ').replace(/"/g, '\\"');
}

function buildCanvas({ job, proof }) {
  const nodes = [
    {
      id: 'job',
      type: 'text',
      text: `Research Job\n${job.title}`,
      x: 0,
      y: 0,
      width: 360,
      height: 140,
    },
    {
      id: 'source',
      type: 'text',
      text: `Source: ${proof.source || job.source || 'unknown'}\nCitations: ${proof.citation_count || 0}\nSearch results: ${proof.search_result_count || 0}`,
      x: 430,
      y: 0,
      width: 360,
      height: 140,
    },
  ];
  const edges = [{ id: 'job-source', fromNode: 'job', toNode: 'source' }];
  const citations = Array.isArray(proof.citations) ? proof.citations.slice(0, 12) : [];
  citations.forEach((url, index) => {
    const id = `citation-${index + 1}`;
    nodes.push({
      id,
      type: 'link',
      url,
      x: 860,
      y: index * 120,
      width: 420,
      height: 100,
    });
    edges.push({ id: `source-${id}`, fromNode: 'source', toNode: id });
  });
  return { nodes, edges };
}

function exportResearchJobToVault(options = {}) {
  const roots = defaultRoots();
  const dataRoot = options.dataRoot || roots.dataRoot;
  const vaultRoot = options.vaultRoot || roots.vaultRoot;
  const jobId = options.jobId;
  if (!jobId) throw new Error('Missing jobId');

  const jobDir = path.join(dataRoot, 'jobs', jobId);
  const job = readJson(path.join(jobDir, 'job.json'));
  if (!job) throw new Error(`Research job not found: ${jobId}`);
  const proof = readJson(path.join(jobDir, 'outputs', 'research-proof.json'), {});
  const safeTitle = job.title || job.id;
  const noteDir = path.join(vaultRoot, 'Research');
  const canvasDir = path.join(vaultRoot, 'Canvases');
  ensureDir(noteDir);
  ensureDir(canvasDir);
  const notePath = path.join(noteDir, `${slugify(safeTitle)}.md`);
  const canvasPath = path.join(canvasDir, `${slugify(safeTitle)}.canvas`);

  const note = [
    '---',
    `type: research_job`,
    `job_id: ${yamlScalar(job.id)}`,
    `source: ${yamlScalar(proof.source || job.source)}`,
    `status: ${yamlScalar(job.status)}`,
    `citation_count: ${proof.citation_count || 0}`,
    `search_result_count: ${proof.search_result_count || 0}`,
    `created_at: ${yamlScalar(job.created_at)}`,
    '---',
    '',
    `# ${safeTitle}`,
    '',
    `[[${safeTitle}]]`,
    '',
    '## Summary',
    '',
    proof.answer_excerpt || 'No answer excerpt captured.',
    '',
    '## Proof Metadata',
    '',
    `- Source: ${proof.source || job.source || 'unknown'}`,
    `- Citations: ${proof.citation_count || 0}`,
    `- Search results: ${proof.search_result_count || 0}`,
    `- Usage: ${proof.usage ? JSON.stringify(proof.usage) : 'n/a'}`,
    '',
    '## Citations',
    '',
    ...(Array.isArray(proof.citations) && proof.citations.length ? proof.citations.map(url => `- ${url}`) : ['- none captured']),
    '',
  ].join('\n');

  fs.writeFileSync(notePath, note, 'utf8');
  fs.writeFileSync(canvasPath, JSON.stringify(buildCanvas({ job, proof }), null, 2) + '\n', 'utf8');
  return { notePath, canvasPath };
}

module.exports = { exportResearchJobToVault };
