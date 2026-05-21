// TEMPORARY STUB — pending restoration of original implementation.
// The original module was never committed and is missing from the working tree.
// This stub preserves the call surface used by server.js so Studio can boot.
// Calling editImage() or generateImage() returns a clear error rather than
// silently failing — OpenAI image generation is non-functional until the real
// adapter is restored. The Google/Imagen path is unaffected.
//
// Surface required by server.js (~line 11341):
//   pickProvider(requested, configured) -> 'openai' | 'imagen4'
//   editImage({ prompt, referenceImages, size, transparent, model, savePath })
//   generateImage({ prompt, size, transparent, model, savePath })
//   DEFAULT_MODEL — model id string
//
// See SITE-LEARNINGS.md "Known Gaps" for restoration tracking.

const DEFAULT_MODEL = 'gpt-image-1';

function pickProvider(requested, configured) {
  const norm = (v) => String(v || '').trim().toLowerCase();
  const r = norm(requested);
  if (r === 'openai' || r === 'gpt-image-1' || r === 'gpt-image-2') return 'openai';
  if (r === 'imagen4' || r === 'google' || r === 'imagen' || r === 'imagen-4') return 'imagen4';
  const c = norm(configured);
  if (c === 'openai' || c === 'gpt-image-1' || c === 'gpt-image-2') return 'openai';
  return 'imagen4';
}

function _stubFail() {
  throw new Error(
    'openai-image-adapter is a temporary stub — original implementation missing. ' +
    'OpenAI image generation is unavailable until the real adapter is restored. ' +
    'Use the Google/Imagen provider instead.'
  );
}

async function editImage(_opts) { _stubFail(); }
async function generateImage(_opts) { _stubFail(); }

module.exports = { pickProvider, editImage, generateImage, DEFAULT_MODEL };
