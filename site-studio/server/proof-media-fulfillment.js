const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const EMPTY_PIXEL = /^data:image\/(?:gif|png);base64,/i;

function attr(attrs, name) {
  const match = attrs.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
  return match ? match[1] : '';
}

function listEmptyImageSlots(html) {
  const slots = [];
  for (const match of String(html).matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = match[1];
    const slotId = attr(attrs, 'data-slot-id');
    const role = attr(attrs, 'data-slot-role') || 'gallery';
    const status = attr(attrs, 'data-slot-status').toLowerCase();
    const src = attr(attrs, 'src');
    if (slotId && (status === 'empty' || !src || EMPTY_PIXEL.test(src))) {
      slots.push({ slotId, role, alt: attr(attrs, 'alt') });
    }
  }
  return slots;
}

function buildPrompt(spec, slot) {
  const brief = spec.client_brief || {};
  const business = spec.site_name || brief.business_name || 'local business';
  const industry = spec.business_type || brief.category || 'professional service';
  const description = brief.business_description || brief.description || '';
  const tone = Array.isArray(brief.tone) ? brief.tone.join(', ') : (brief.tone || 'polished, credible, welcoming');
  const roleInstructions = {
    hero: 'wide website hero photograph with a clear text-safe area, editorial composition',
    service: `website service photograph illustrating ${slot.alt || slot.slotId.replace(/-/g, ' ')}`,
    gallery: 'detailed editorial website photograph showing the work or products',
    team: 'natural environmental portrait of an adult professional',
    testimonial: 'natural environmental portrait of an adult customer',
  };
  return [
    roleInstructions[slot.role] || 'premium editorial website photograph',
    `for a ${industry} business named ${business}`,
    description,
    `${tone} visual direction`,
    'photorealistic, commercially usable composition, natural lighting, no text, no logos, no watermark, no fake storefront signage',
  ].filter(Boolean).join('. ');
}

function replaceSlot(html, slotId, src) {
  const escaped = slotId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`<img([^>]*data-slot-id=["']${escaped}["'][^>]*)>`, 'i'), (_tag, attrs) => {
    let next = attrs;
    next = /\bsrc=["'][^"']*["']/i.test(next)
      ? next.replace(/\bsrc=["'][^"']*["']/i, `src="${src}"`)
      : `${next} src="${src}"`;
    next = /data-slot-status=["'][^"']*["']/i.test(next)
      ? next.replace(/data-slot-status=["'][^"']*["']/i, 'data-slot-status="generated"')
      : `${next} data-slot-status="generated"`;
    return `<img${next}>`;
  });
}

function runFile(command, args, timeout = 120000) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { env: { ...process.env }, timeout },
      (error) => error ? reject(error) : resolve());
  });
}

async function defaultGenerate({ prompt, outputPath, aspectRatio, scriptPath }) {
  const sourcePath = `${outputPath}.source.png`;
  await runFile(scriptPath, ['--prompt', prompt, '--output', sourcePath, '--aspect-ratio', aspectRatio]);
  try {
    await runFile('python3', [path.join(__dirname, '..', 'scripts', 'normalize-proof-image.py'), sourcePath, outputPath], 30000);
  } finally {
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
  }
}

async function fulfillProofMedia({ artifactPath, spec, generator = defaultGenerate, scriptPath }) {
  let html = fs.readFileSync(artifactPath, 'utf8');
  const slots = listEmptyImageSlots(html);
  if (slots.length === 0) return { status: 'not_needed', required: 0, fulfilled: 0, assets: [] };
  if (!process.env.GEMINI_API_KEY && generator === defaultGenerate) {
    throw new Error('Proof media is required, but GEMINI_API_KEY is not configured');
  }

  const assetsDir = path.join(path.dirname(artifactPath), 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  const assets = [];
  for (const slot of slots) {
    const outputPath = path.join(assetsDir, `${slot.slotId}.jpg`);
    const aspectRatio = slot.role === 'hero' ? '16:9' : (slot.role === 'team' || slot.role === 'testimonial' ? '1:1' : '4:3');
    const prompt = buildPrompt(spec, slot);
    await generator({ prompt, outputPath, aspectRatio, scriptPath });
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10_000 || fs.statSync(outputPath).size > 750_000) {
      throw new Error(`Image generation produced an invalid asset for ${slot.slotId}`);
    }
    const relativeSrc = `assets/${path.basename(outputPath)}`;
    html = replaceSlot(html, slot.slotId, relativeSrc);
    assets.push({ slot_id: slot.slotId, role: slot.role, provider: 'imagen4', src: relativeSrc, prompt });
  }

  const remaining = listEmptyImageSlots(html);
  if (remaining.length > 0) throw new Error(`Proof media fulfillment left ${remaining.length} empty slot(s)`);
  fs.writeFileSync(artifactPath, html);
  return { status: 'fulfilled', required: slots.length, fulfilled: assets.length, assets };
}

module.exports = { buildPrompt, fulfillProofMedia, listEmptyImageSlots, replaceSlot };
