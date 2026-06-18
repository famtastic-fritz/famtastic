// BUILD skill: assembles a part of the NCS7 demo by copying its authored source
// from assets/ncs7/<part> into the built project at projects/ncs7/build/<part>,
// then writes a per-part build manifest. Real file IO = real proof of work.
import { copyDir, exists, listFiles, writeArtifact } from './_lib.js';

const PART_BY_TYPE = {
  'build-frontend': { part: 'frontend', label: 'React + Three.js frontend' },
  'build-cms':      { part: 'cms',      label: 'CMS backend + admin UI' },
  'build-tutor':    { part: 'tutor',    label: 'AI CMS tutor' },
  'build-3d':       { part: 'cad3d',    label: '3D CAD presentation (bonus)' },
};

export async function run(task, { llm }) {
  const map = PART_BY_TYPE[task.type];
  if (!map) throw new Error(`build: unknown build type ${task.type}`);

  const think = await llm.complete({
    system: 'You are a build agent verifying an assembled web artifact.',
    prompt: `Assemble and sanity-check the ${map.label} for the NCS7 demo.`,
    model: task._model.id,
  });

  const srcRel = `assets/ncs7/${map.part}`;
  const destRel = `projects/ncs7/build/${map.part}`;
  let status, copied = 0, files = [];

  if (exists(srcRel)) {
    const res = copyDir(srcRel, destRel);
    copied = res.copied;
    files = listFiles(destRel);
    status = copied > 0 ? 'assembled' : 'empty-source';
  } else {
    // Source not authored yet — stay honest, write a placeholder and report deferred.
    writeArtifact(`${destRel}/PENDING.md`,
      `# ${map.label} — source not yet present\n\nExpected source at \`${srcRel}\`.\n` +
      `Re-run this build task after assets are authored.\n`);
    status = 'deferred-missing-source';
  }

  const manifest = {
    part: map.part,
    label: map.label,
    status,
    files_copied: copied,
    files,
    source: srcRel,
    output: destRel,
    built_at: new Date().toISOString(),
  };
  const artifact = writeArtifact(`${destRel}/BUILD-MANIFEST.json`, JSON.stringify(manifest, null, 2) + '\n');

  return {
    summary: `${map.label}: ${status} (${copied} files)`,
    artifacts: [artifact, ...files.map(f => `${destRel}/${f}`)].slice(0, 50),
    usage: think.usage,
    metrics: { files_copied: copied, status },
  };
}
