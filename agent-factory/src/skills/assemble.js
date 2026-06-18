// ASSEMBLE skill: ties the built parts together into a single runnable demo —
// aggregates per-part manifests, writes a top-level manifest, and a landing page.
import fs from 'node:fs';
import { resolveInside } from '../safepath.js';
import { writeArtifact, exists, listFiles } from './_lib.js';

export async function run(task, { llm }) {
  await llm.complete({
    system: 'You are an integration agent.',
    prompt: 'Assemble the NCS7 demo parts into one runnable deliverable.',
    model: task._model.id,
  });

  const parts = ['frontend', 'cms', 'tutor', 'cad3d'];
  const summary = {};
  for (const part of parts) {
    const mp = `projects/ncs7/build/${part}/BUILD-MANIFEST.json`;
    if (exists(mp)) {
      try { summary[part] = JSON.parse(fs.readFileSync(resolveInside(mp), 'utf8')); }
      catch { summary[part] = { part, status: 'manifest-unreadable' }; }
    } else {
      summary[part] = { part, status: 'not-built', files: listFiles(`projects/ncs7/build/${part}`) };
    }
  }

  const top = {
    project: 'NCS7 modernization demo',
    assembled_at: new Date().toISOString(),
    parts: summary,
    run: {
      cms_server: 'node projects/ncs7/build/cms/server.js',
      default_url: 'http://localhost:4178',
      admin_url: 'http://localhost:4178/admin',
      cad3d: 'open projects/ncs7/build/cad3d/index.html',
    },
  };
  const manifest = writeArtifact('projects/ncs7/build/MANIFEST.json', JSON.stringify(top, null, 2) + '\n');

  const land = `<!doctype html><html><head><meta charset="utf-8">
<title>NCS7 Demo — Build Index</title>
<style>body{font:16px/1.6 system-ui;margin:40px auto;max-width:760px;color:#0b2545;background:#f3f6fb}
h1{color:#13315c}a{color:#1d6fb8}code{background:#e6eef7;padding:2px 6px;border-radius:4px}
.card{background:#fff;border:1px solid #d6e2f0;border-radius:10px;padding:16px 20px;margin:14px 0}</style></head>
<body><h1>NCS7 Modernization — Demo Build</h1>
<p>Assembled by the agent factory. Parts:</p>
${parts.map(p => `<div class="card"><b>${p}</b> — status: <code>${summary[p].status}</code>,
 files: ${summary[p].files ? summary[p].files.length : (summary[p].files_copied ?? '?')}</div>`).join('\n')}
<div class="card"><b>Run the CMS + site + admin + tutor:</b><br>
<code>node projects/ncs7/build/cms/server.js</code><br>
then open <a href="http://localhost:4178">http://localhost:4178</a> ·
admin <a href="http://localhost:4178/admin">/admin</a></div>
<div class="card"><b>Bonus 3D CAD view:</b> open <code>projects/ncs7/build/cad3d/index.html</code></div>
</body></html>`;
  const landing = writeArtifact('projects/ncs7/build/index.html', land);

  return {
    summary: `Assembled NCS7 demo: ${parts.filter(p => /assembled/.test(summary[p].status)).length}/${parts.length} parts built`,
    artifacts: [manifest, landing],
    usage: { input_tokens: 50, output_tokens: 40 },
    metrics: { parts: parts.length },
  };
}
