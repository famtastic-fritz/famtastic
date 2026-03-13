const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// --- Config ---
const PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const PREVIEW_PORT = parseInt(process.env.PREVIEW_PORT || '3333', 10);
const TAG = process.env.SITE_TAG || 'site-demo';
const HUB_ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(HUB_ROOT, 'sites', TAG);
const DIST_DIR = path.join(SITE_DIR, 'dist');
const CONVO_FILE = path.join(SITE_DIR, 'conversation.jsonl');
const SPEC_FILE = path.join(SITE_DIR, 'spec.json');

// --- Upload config ---
const UPLOADS_DIR = path.join(DIST_DIR, 'assets', 'uploads');
const ACCEPTED_TYPES = /\.(png|jpe?g|gif|svg|webp)$/i;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_UPLOADS_PER_SITE = 20;

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      // Sanitize: lowercase, strip special chars, add timestamp if duplicate
      let name = file.originalname.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
      if (fs.existsSync(path.join(UPLOADS_DIR, name))) {
        const ext = path.extname(name);
        const base = path.basename(name, ext);
        name = `${base}-${Date.now()}${ext}`;
      }
      cb(null, name);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ACCEPTED_TYPES.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are accepted (.png, .jpg, .gif, .svg, .webp)'));
    }
  },
});

// --- SVG Sanitizer ---
function sanitizeSvg(svgContent) {
  // Whitelist approach: strip dangerous elements and attributes
  let clean = svgContent;
  // Remove <script> tags and content
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<script[^>]*\/>/gi, '');
  // Remove on* event attributes
  clean = clean.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');
  // Remove javascript: URIs
  clean = clean.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
  clean = clean.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
  clean = clean.replace(/xlink:href\s*=\s*"javascript:[^"]*"/gi, 'xlink:href="#"');
  // Remove <foreignObject> (can embed HTML)
  clean = clean.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  // Remove <use> with external references (can load remote content)
  clean = clean.replace(/<use[^>]*href\s*=\s*"https?:[^"]*"[^>]*\/?>(?:<\/use>)?/gi, '');
  return clean;
}

// --- Express app ---
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve spec.json
app.get('/api/spec', (req, res) => {
  if (fs.existsSync(SPEC_FILE)) {
    res.json(JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')));
  } else {
    res.json({ error: 'No spec.json found' });
  }
});

// Serve conversation history
app.get('/api/history', (req, res) => {
  if (!fs.existsSync(CONVO_FILE)) return res.json([]);
  const lines = fs.readFileSync(CONVO_FILE, 'utf8').trim().split('\n').filter(Boolean);
  const messages = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
  res.json(messages);
});

// List assets
app.get('/api/assets', (req, res) => {
  const assetsDir = path.join(DIST_DIR, 'assets');
  if (!fs.existsSync(assetsDir)) return res.json([]);
  const files = fs.readdirSync(assetsDir).filter(f => /\.(svg|png|jpg|gif|ico)$/i.test(f));
  res.json(files.map(f => ({
    name: f,
    path: `/assets/${f}`,
    fullPath: path.join(assetsDir, f),
    type: path.extname(f).slice(1),
    size: fs.statSync(path.join(assetsDir, f)).size,
  })));
});

// Serve asset files directly
app.use('/site-assets', express.static(path.join(DIST_DIR, 'assets')));

// Get site config
app.get('/api/config', (req, res) => {
  res.json({ tag: TAG, previewPort: PREVIEW_PORT, studioPort: PORT });
});

// List available templates
app.get('/api/templates', (req, res) => {
  const templatesDir = path.join(HUB_ROOT, 'config', 'site-templates');
  if (!fs.existsSync(templatesDir)) return res.json([]);
  const templates = fs.readdirSync(templatesDir).filter(d =>
    fs.statSync(path.join(templatesDir, d)).isDirectory() &&
    fs.existsSync(path.join(templatesDir, d, 'index.html'))
  );
  res.json(templates);
});

// Studio state — brief, decisions, files, spec
app.get('/api/studio-state', (req, res) => {
  const spec = fs.existsSync(SPEC_FILE) ? JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')) : {};
  const stateFile = path.join(SITE_DIR, 'state.json');
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};

  // Gather files
  const files = [];
  if (fs.existsSync(DIST_DIR)) {
    const walk = (dir, prefix) => {
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        const rel = prefix ? `${prefix}/${f}` : f;
        if (fs.statSync(full).isDirectory()) {
          walk(full, rel);
        } else {
          files.push({ name: rel, size: fs.statSync(full).size });
        }
      }
    };
    walk(DIST_DIR, 'dist');
  }

  res.json({
    tag: TAG,
    lastUpdated: state.last_build || null,
    brief: spec.design_brief || null,
    decisions: (spec.design_decisions || []).filter(d => d.status === 'approved').slice(-10),
    files,
    spec,
    previewUrl: `http://localhost:${PREVIEW_PORT}`,
  });
});

// --- Upload endpoint ---
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Check upload limit
  const spec = fs.existsSync(SPEC_FILE) ? JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')) : {};
  const existingUploads = spec.uploaded_assets || [];
  if (existingUploads.length >= MAX_UPLOADS_PER_SITE) {
    // Remove the uploaded file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: `Upload limit reached (max ${MAX_UPLOADS_PER_SITE} per site)` });
  }

  // Sanitize SVGs
  if (/\.svg$/i.test(req.file.filename)) {
    const svgContent = fs.readFileSync(req.file.path, 'utf8');
    const sanitized = sanitizeSvg(svgContent);
    fs.writeFileSync(req.file.path, sanitized);
  }

  // Read role from form data (default to 'content')
  const role = req.body.role || 'content';
  const label = req.body.label || '';
  const notes = req.body.notes || '';

  // Determine type from extension
  const ext = path.extname(req.file.filename).toLowerCase();
  let fileType = 'image';
  if (ext === '.svg') fileType = 'logo'; // default SVGs to logo, user can change

  // Store metadata in spec.json
  const asset = {
    filename: req.file.filename,
    type: fileType,
    role,
    label,
    notes,
    uploaded_at: new Date().toISOString(),
  };

  if (!spec.uploaded_assets) spec.uploaded_assets = [];
  spec.uploaded_assets.push(asset);
  fs.writeFileSync(SPEC_FILE, JSON.stringify(spec, null, 2));

  res.json({
    success: true,
    asset,
    path: `/assets/uploads/${req.file.filename}`,
  });
});

// Update asset metadata (role, label, notes)
app.put('/api/upload/:filename', (req, res) => {
  const spec = fs.existsSync(SPEC_FILE) ? JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')) : {};
  const assets = spec.uploaded_assets || [];
  const asset = assets.find(a => a.filename === req.params.filename);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (req.body.role) asset.role = req.body.role;
  if (req.body.label !== undefined) asset.label = req.body.label;
  if (req.body.notes !== undefined) asset.notes = req.body.notes;

  fs.writeFileSync(SPEC_FILE, JSON.stringify(spec, null, 2));
  res.json({ success: true, asset });
});

// List uploaded assets
app.get('/api/uploads', (req, res) => {
  const spec = fs.existsSync(SPEC_FILE) ? JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')) : {};
  const assets = (spec.uploaded_assets || []).map(a => ({
    ...a,
    url: `/assets/uploads/${a.filename}`,
    exists: fs.existsSync(path.join(UPLOADS_DIR, a.filename)),
  }));
  res.json(assets);
});

// Serve uploaded files (images only — never execute)
app.use('/assets/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res, filePath) => {
    res.set('X-Content-Type-Options', 'nosniff');
    // Force SVGs to be served as images, not executed
    if (filePath.endsWith('.svg')) {
      res.set('Content-Type', 'image/svg+xml');
    }
  },
}));

// --- Request Classifier ---
// Classifies user intent. Returns one of:
// new_site, major_revision, restyle, layout_update, content_update, bug_fix, asset_import, build, deploy, query
function classifyRequest(message, spec) {
  const lower = message.toLowerCase();
  const hasBrief = spec && spec.design_brief && spec.design_brief.approved;
  const hasHtml = fs.existsSync(path.join(DIST_DIR, 'index.html'));

  // Precedence: new_site > major_revision > restyle > layout_update > content_update > bug_fix > asset_import

  // Explicit commands first
  if (lower.match(/\bdeploy\b/) && !lower.match(/\bhow\s+to\s+deploy\b/)) return 'deploy';
  if (lower.match(/\b(build|rebuild)\s+(the\s+)?site\b/) || lower.match(/\b(generate|create|make)\s+(the\s+)?site\b/)) return 'build';
  if (lower.match(/\buse\s+(the\s+)?(event|business|portfolio|landing)\s+template\b/) || lower.match(/\bapply\s+(the\s+)?(event|business|portfolio|landing)\s+template\b/)) return 'build';
  if (lower.match(/\b(list|show|what)\s+(assets|templates)\b/) || lower.includes('preview')) return 'query';

  // Asset generation
  if (lower.match(/(?:create|make|generate|design|draw)\s+(?:a\s+|an\s+|the\s+)?(?:new\s+)?(logo|icon|favicon|hero|banner|divider|illustration)/)) return 'asset_import';

  // New site — no brief exists yet (HTML may exist from fallback template)
  if (!hasBrief) return 'new_site';

  // Major revision signals
  if (lower.match(/\b(start\s+over|from\s+scratch|completely\s+different|total(ly)?\s+(re)?do|scrap\s+(it|this|everything))\b/)) return 'major_revision';
  if (lower.match(/\b(i('m|\s+am)\s+not\s+feeling|hate\s+(it|this)|this\s+(isn't|is\s+not)\s+what|wrong\s+direction)\b/)) return 'major_revision';

  // Restyle signals — about overall vibe, not specific elements
  if (lower.match(/\b(make\s+it\s+(more|less)\s+\w+|change\s+the\s+(whole|entire|overall)\s+(vibe|feel|look|style|aesthetic))\b/)) return 'restyle';
  if (lower.match(/\b(more\s+(premium|minimal|bold|elegant|modern|playful|professional|corporate|clean|edgy))\b/) && !lower.match(/\b(header|footer|button|section|nav|hero|card)\b/)) return 'restyle';

  // Bug fix signals
  if (lower.match(/\b(broken|bug|fix|doesn't\s+work|not\s+working|wrong|misaligned|overlapping|overflow)\b/)) return 'bug_fix';

  // Content update signals — text/copy changes without layout
  if (lower.match(/\b(change|update|replace|edit)\s+(the\s+)?(text|copy|phone|email|address|name|title|heading|paragraph|description|hours|price)\b/)) return 'content_update';

  // Layout update — structural changes to specific elements
  if (lower.match(/\b(add|remove|move|swap|rearrange|reorder)\s+(a\s+|the\s+)?(section|column|row|card|button|form|nav|header|footer|sidebar|testimonial|feature|grid)\b/)) return 'layout_update';
  if (lower.match(/\b(make\s+the\s+(header|footer|hero|nav|button|section)\s+\w+)\b/)) return 'layout_update';

  // Default: if classifier confidence is low, use least destructive path
  return 'layout_update';
}

// --- Curated Prompt Builder ---
function buildPromptContext(requestType, spec, userMessage) {
  const brief = spec.design_brief || null;
  const decisions = (spec.design_decisions || []).filter(d => d.status === 'approved').slice(-5);
  const htmlPath = path.join(DIST_DIR, 'index.html');
  const currentHtml = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';

  // Build HTML context based on request type
  let htmlContext = '';
  if (requestType === 'bug_fix' || requestType === 'content_update') {
    // Full source needed for precise edits
    htmlContext = currentHtml;
  } else if (requestType === 'layout_update' || requestType === 'restyle') {
    // Structural summary + key sections
    if (currentHtml.length > 3000) {
      htmlContext = summarizeHtml(currentHtml);
    } else {
      htmlContext = currentHtml;
    }
  } else {
    // Build / new — summary only
    htmlContext = currentHtml ? summarizeHtml(currentHtml) : '(no site generated yet)';
  }

  // Build brief context
  let briefContext = '';
  if (brief) {
    briefContext = `\nDESIGN BRIEF (approved):
- Goal: ${brief.goal || 'not set'}
- Audience: ${brief.audience || 'not set'}
- Tone: ${Array.isArray(brief.tone) ? brief.tone.join(', ') : brief.tone || 'not set'}
- Visual direction: ${JSON.stringify(brief.visual_direction || {}, null, 0)}
- Content priorities: ${(brief.content_priorities || []).join(', ') || 'not set'}
- Must-have sections: ${(brief.must_have_sections || []).join(', ') || 'not set'}
- AVOID: ${(brief.avoid || []).join('; ') || 'none specified'}`;
  }

  // Build decisions context
  let decisionsContext = '';
  if (decisions.length > 0) {
    decisionsContext = '\nACTIVE DESIGN DECISIONS:\n' + decisions.map(d =>
      `- [${d.category}] ${d.decision}`
    ).join('\n');
  }

  // Uploaded assets context
  let assetsContext = '';
  const uploadedAssets = spec.uploaded_assets || [];
  if (uploadedAssets.length > 0) {
    assetsContext = '\nUPLOADED ASSETS:\n' + uploadedAssets.map(a => {
      let desc = `- ${a.filename} [role: ${a.role}]`;
      if (a.label) desc += ` "${a.label}"`;
      if (a.notes) desc += ` (${a.notes})`;
      desc += ` → /assets/uploads/${a.filename}`;
      return desc;
    }).join('\n');
    assetsContext += '\nIMPORTANT: "inspiration" assets show the VIBE the user wants, not content to copy literally. "content" assets should be used directly. "brand_asset" assets (logos, etc.) should be referenced in the HTML.';
  }

  // Core anti-cookie-cutter rules
  const systemRules = `RULES:
- Never default to a generic business template layout
- Preserve approved design decisions unless the user explicitly changes them
- Interpret the site as a coherent brand system, not isolated sections
- Avoid filler copy and stock structure unless justified
- Every section should feel intentional for THIS specific business/project
- If the user's request conflicts with the brief, flag it — don't silently override`;

  return { htmlContext, briefContext, decisionsContext, systemRules, assetsContext };
}

function summarizeHtml(html) {
  // Extract structural summary: sections, key elements, approximate layout
  const sections = [];
  const sectionMatch = html.match(/<(?:section|header|footer|nav|main|div)\s[^>]*(?:id|class)="[^"]*"/g) || [];
  sectionMatch.slice(0, 15).forEach(s => sections.push(s));

  const headings = html.match(/<h[1-6][^>]*>([^<]+)</g) || [];
  const headingText = headings.slice(0, 10).map(h => h.replace(/<h[1-6][^>]*>/, ''));

  const lineCount = html.split('\n').length;

  return `[HTML SUMMARY: ${lineCount} lines]
Sections found: ${sections.length > 0 ? sections.join(', ') : 'none identified'}
Headings: ${headingText.length > 0 ? headingText.join(' | ') : 'none'}
Full source available if needed for precise edits.

FULL HTML:
${html}`;
}

// --- Planning Handler ---
function handlePlanning(ws, userMessage, spec) {
  ws.send(JSON.stringify({ type: 'status', content: 'Analyzing your vision...' }));

  const existingBrief = spec.design_brief ? JSON.stringify(spec.design_brief, null, 2) : 'none';

  const prompt = `You are a design strategist for a website builder called FAMtastic Site Studio.

The user has described what they want. Your job is to create a structured design brief — NOT to generate HTML.

USER'S MESSAGE:
"${userMessage}"

EXISTING BRIEF (if any): ${existingBrief}
EXISTING SPEC: ${JSON.stringify({ site_name: spec.site_name, business_type: spec.business_type, colors: spec.colors, tone: spec.tone }, null, 2)}

Create a design brief with this EXACT format. Start your response with "BRIEF:" on the first line, then output valid JSON:

BRIEF:
{
  "goal": "What this site should accomplish",
  "audience": "Who it's for",
  "tone": ["adjective1", "adjective2", "adjective3"],
  "visual_direction": {
    "layout": "description of layout approach",
    "typography": "font style and hierarchy",
    "color_usage": "how colors should be applied",
    "motion": "animation/transition approach",
    "density": "content density — spacious, balanced, or dense"
  },
  "content_priorities": ["what must be emphasized first", "second priority"],
  "must_have_sections": ["hero", "about", etc.],
  "avoid": ["specific things NOT to do"],
  "open_questions": ["only questions that BLOCK a meaningful design decision — max 2, skip if you have enough signal"]
}

Be specific and opinionated. The avoid list is critical — name specific anti-patterns.
Do not generate HTML. Do not be vague. Extract real intent from what the user said.`;

  ws.send(JSON.stringify({ type: 'status', content: 'Creating design brief...' }));

  const child = spawn('bash', ['-c', `cd "${HUB_ROOT}" && echo "${escapeForShell(prompt)}" | ./scripts/claude-cli`], {
    env: { ...process.env, MODEL: 'claude-sonnet-4-20250514' },
    cwd: HUB_ROOT,
  });

  let response = '';

  child.stdout.on('data', (chunk) => {
    response += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    console.error('[planning]', chunk.toString());
  });

  child.on('close', (code) => {
    if (code !== 0 || !response.trim()) {
      ws.send(JSON.stringify({ type: 'error', content: 'Failed to create brief. Try describing your site again.' }));
      return;
    }

    response = response.trim();

    // Extract brief JSON from response
    let briefJson = null;
    const briefStart = response.indexOf('BRIEF:');
    if (briefStart !== -1) {
      const jsonStr = response.substring(briefStart + 6).trim();
      // Find the JSON object
      const firstBrace = jsonStr.indexOf('{');
      if (firstBrace !== -1) {
        let depth = 0;
        let end = firstBrace;
        for (let i = firstBrace; i < jsonStr.length; i++) {
          if (jsonStr[i] === '{') depth++;
          if (jsonStr[i] === '}') depth--;
          if (depth === 0) { end = i + 1; break; }
        }
        try {
          briefJson = JSON.parse(jsonStr.substring(firstBrace, end));
        } catch (e) {
          console.error('[planning] Failed to parse brief JSON:', e.message);
        }
      }
    }

    if (briefJson) {
      briefJson.approved = false;
      // Save brief to spec
      const currentSpec = fs.existsSync(SPEC_FILE) ? JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')) : {};
      currentSpec.design_brief = briefJson;
      fs.writeFileSync(SPEC_FILE, JSON.stringify(currentSpec, null, 2));

      ws.send(JSON.stringify({ type: 'brief', brief: briefJson }));
      appendConvo({ role: 'assistant', content: `Design brief created`, brief: briefJson, at: new Date().toISOString() });
    } else {
      // Couldn't parse — send raw response as text
      ws.send(JSON.stringify({ type: 'assistant', content: response }));
      appendConvo({ role: 'assistant', content: response, at: new Date().toISOString() });
    }
  });
}

// --- Enhanced Chat Handler ---
function handleChatMessage(ws, userMessage, requestType, spec) {
  ws.send(JSON.stringify({ type: 'status', content: 'Reading site spec...' }));

  const { htmlContext, briefContext, decisionsContext, systemRules, assetsContext } = buildPromptContext(requestType, spec, userMessage);

  ws.send(JSON.stringify({ type: 'status', content: `Classified as: ${requestType}` }));

  // Build mode-specific prompt
  let modeInstruction = '';
  switch (requestType) {
    case 'content_update':
      modeInstruction = 'The user wants to change TEXT CONTENT only. Preserve all layout, styling, and structure. Only modify the specific text they mentioned.';
      break;
    case 'layout_update':
      modeInstruction = 'The user wants to change LAYOUT or add/remove SECTIONS. Preserve the overall design language and approved decisions. Make targeted structural changes.';
      break;
    case 'bug_fix':
      modeInstruction = 'The user is reporting a BUG or visual issue. Fix only the specific problem. Do not change design direction or content.';
      break;
    case 'restyle':
      modeInstruction = 'The user wants a VISUAL RESTYLE. Change the aesthetic feel while preserving content and core structure. Update the design language holistically.';
      break;
    default:
      modeInstruction = 'Process the user request and update the site accordingly.';
  }

  const prompt = `You are a premium website builder assistant for FAMtastic Site Studio.

${systemRules}

REQUEST TYPE: ${requestType}
MODE: ${modeInstruction}
${briefContext}
${decisionsContext}
${assetsContext}

SITE SPEC:
${JSON.stringify({ site_name: spec.site_name, business_type: spec.business_type, colors: spec.colors, tone: spec.tone, fonts: spec.fonts }, null, 2)}

CURRENT SITE:
${htmlContext}

USER REQUEST: "${userMessage}"

RESPOND WITH ONE OF THESE FORMATS:

1. To UPDATE the site HTML:
First line: HTML_UPDATE:
Then: the complete updated HTML file
Then on a new line: CHANGES:
Then: 2-4 bullet points explaining what changed and why

2. To CREATE an SVG asset:
First line: SVG_ASSET:<filename>
Then: complete SVG code

3. To ask a question or respond conversationally:
Just respond as text.

IMPORTANT:
- When outputting HTML, include the FULL complete file (not a diff)
- Use Tailwind CSS via CDN
- Keep it responsive and modern
- The CHANGES summary is required after every HTML_UPDATE`;

  ws.send(JSON.stringify({ type: 'status', content: 'Sending to Claude...' }));

  const child = spawn('bash', ['-c', `cd "${HUB_ROOT}" && echo "${escapeForShell(prompt)}" | ./scripts/claude-cli`], {
    env: { ...process.env, MODEL: 'claude-sonnet-4-20250514' },
    cwd: HUB_ROOT,
  });

  let response = '';
  let firstChunk = true;

  child.stdout.on('data', (chunk) => {
    response += chunk.toString();
    if (firstChunk) {
      ws.send(JSON.stringify({ type: 'status', content: 'Claude is generating...' }));
      firstChunk = false;
    }
    ws.send(JSON.stringify({ type: 'stream', content: chunk.toString() }));
  });

  child.stderr.on('data', (chunk) => {
    console.error('[claude]', chunk.toString());
  });

  child.on('close', (code) => {
    if (code !== 0 || !response.trim()) {
      const fallback = "I couldn't process that request right now. Try being more specific about what you'd like to change, or say 'build the site' to regenerate.";
      ws.send(JSON.stringify({ type: 'assistant', content: fallback }));
      appendConvo({ role: 'assistant', content: fallback, at: new Date().toISOString() });
      return;
    }

    response = response.trim();

    if (response.startsWith('HTML_UPDATE:')) {
      ws.send(JSON.stringify({ type: 'status', content: 'Writing updated HTML...' }));

      // Split HTML and change summary
      const afterPrefix = response.replace(/^HTML_UPDATE:\s*/, '');
      let html = afterPrefix;
      let changeSummary = '';

      const changesIdx = afterPrefix.lastIndexOf('CHANGES:');
      if (changesIdx !== -1) {
        html = afterPrefix.substring(0, changesIdx).trim();
        changeSummary = afterPrefix.substring(changesIdx + 8).trim();
      }

      // Strip markdown fences if present
      html = html.replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');

      fs.mkdirSync(DIST_DIR, { recursive: true });
      fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html);

      // Extract and log design decisions from change summary
      if (changeSummary) {
        extractDecisions(spec, changeSummary, requestType);
      }

      const msg = changeSummary
        ? `Site updated!\n\n${changeSummary}`
        : 'Site updated! Check the preview.';
      ws.send(JSON.stringify({ type: 'assistant', content: msg }));
      ws.send(JSON.stringify({ type: 'reload-preview' }));
      appendConvo({ role: 'assistant', content: msg, at: new Date().toISOString() });
    } else if (response.startsWith('SVG_ASSET:')) {
      const firstNewline = response.indexOf('\n');
      const header = response.substring(0, firstNewline);
      const filename = header.replace('SVG_ASSET:', '').trim();
      let svg = response.substring(firstNewline + 1);
      // Strip markdown fences if present
      svg = svg.replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```\s*$/, '');

      const assetPath = path.join(DIST_DIR, 'assets', filename);
      fs.mkdirSync(path.join(DIST_DIR, 'assets'), { recursive: true });
      fs.writeFileSync(assetPath, svg);
      ws.send(JSON.stringify({ type: 'assistant', content: `Created asset: ${filename}` }));
      ws.send(JSON.stringify({ type: 'asset-created', filename, path: `/assets/${filename}` }));
      ws.send(JSON.stringify({ type: 'reload-preview' }));
      appendConvo({ role: 'assistant', content: `Created SVG asset: ${filename}`, at: new Date().toISOString() });
    } else {
      ws.send(JSON.stringify({ type: 'assistant', content: response }));
      appendConvo({ role: 'assistant', content: response, at: new Date().toISOString() });
    }
  });
}

// --- Design Decisions Extraction ---
function extractDecisions(spec, changeSummary, requestType) {
  // Only log durable decisions from restyle, layout_update, and build
  if (!['restyle', 'layout_update', 'build', 'major_revision'].includes(requestType)) return;

  const currentSpec = fs.existsSync(SPEC_FILE) ? JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')) : {};
  if (!currentSpec.design_decisions) currentSpec.design_decisions = [];

  // Parse bullet points from change summary as potential decisions
  const bullets = changeSummary.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
  const ts = new Date().toISOString();

  for (const bullet of bullets.slice(0, 3)) {
    const text = bullet.replace(/^[\s\-*]+/, '').trim();
    if (text.length < 10 || text.length > 200) continue;

    // Categorize based on keywords
    let category = 'structure';
    if (text.match(/\b(color|palette|accent|gradient|contrast)\b/i)) category = 'color';
    else if (text.match(/\b(font|typography|heading|text\s+size|weight)\b/i)) category = 'typography';
    else if (text.match(/\b(layout|grid|column|row|spacing|margin|padding|flex)\b/i)) category = 'layout';
    else if (text.match(/\b(copy|text|content|heading|title|description)\b/i)) category = 'content';
    else if (text.match(/\b(animation|transition|hover|motion|scroll)\b/i)) category = 'interaction';

    currentSpec.design_decisions.push({
      timestamp: ts,
      category,
      decision: text,
      status: 'approved',
    });
  }

  // Prune: keep last 20 approved + all superseded in file, but only show 10 active
  fs.writeFileSync(SPEC_FILE, JSON.stringify(currentSpec, null, 2));
}

// --- HTTP + WebSocket server ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[studio] Client connected');

  ws.on('message', async (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    if (msg.type === 'chat') {
      const userMessage = msg.content;
      const ts = new Date().toISOString();

      // Log user message
      appendConvo({ role: 'user', content: userMessage, at: ts });

      // Load spec
      const spec = fs.existsSync(SPEC_FILE) ? JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')) : {};

      // Classify request
      ws.send(JSON.stringify({ type: 'status', content: 'Classifying request...' }));
      const requestType = classifyRequest(userMessage, spec);
      console.log(`[classify] "${userMessage.substring(0, 60)}..." → ${requestType}`);

      // Route based on classification
      switch (requestType) {
        case 'new_site':
        case 'major_revision':
        case 'restyle':
          handlePlanning(ws, userMessage, spec);
          break;

        case 'deploy': {
          const isProd = userMessage.toLowerCase().includes('prod') || userMessage.toLowerCase().includes('production') || userMessage.toLowerCase().includes('live');
          ws.send(JSON.stringify({ type: 'status', content: `Deploying ${isProd ? '(production)' : '(draft)'}...` }));
          runDeploy(ws, isProd);
          break;
        }

        case 'build': {
          const lowerMsg = userMessage.toLowerCase();
          const templateMatch = lowerMsg.match(/\b(event|business|portfolio|landing)\b/);
          const template = templateMatch ? templateMatch[1] : null;
          ws.send(JSON.stringify({ type: 'status', content: template ? `Building with ${template} template...` : 'Building site...' }));
          runOrchestratorSite(ws, template);
          break;
        }

        case 'asset_import': {
          const lowerMsg = userMessage.toLowerCase();
          const assetMatch = lowerMsg.match(/(?:create|make|generate|design|draw)\s+(?:a\s+|an\s+|the\s+)?(?:new\s+)?(logo|icon|favicon|hero|banner|divider|illustration)/);
          const assetType = assetMatch ? assetMatch[1] : 'logo';
          ws.send(JSON.stringify({ type: 'status', content: `Generating ${assetType}...` }));
          runAssetGenerate(ws, assetType, userMessage);
          break;
        }

        case 'query':
          handleQuery(ws, userMessage);
          break;

        default:
          // content_update, layout_update, bug_fix — go to enhanced chat
          handleChatMessage(ws, userMessage, requestType, spec);
          break;
      }
    }

    if (msg.type === 'approve-brief') {
      // User approved the brief — mark it and trigger build
      const spec = fs.existsSync(SPEC_FILE) ? JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')) : {};
      if (spec.design_brief) {
        spec.design_brief.approved = true;
        fs.writeFileSync(SPEC_FILE, JSON.stringify(spec, null, 2));
        ws.send(JSON.stringify({ type: 'status', content: 'Brief approved! Building site...' }));
        appendConvo({ role: 'system', content: 'Design brief approved', at: new Date().toISOString() });
        // Build using the brief context
        handleChatMessage(ws, `Build this site based on the approved design brief. Follow it precisely. Site name: ${spec.site_name || TAG}`, 'build', spec);
      }
    }

    if (msg.type === 'edit-brief') {
      // User wants to edit the brief
      ws.send(JSON.stringify({ type: 'assistant', content: 'Tell me what you\'d like to change about the brief. I\'ll update it.' }));
    }

    if (msg.type === 'skip-brief') {
      // User wants to skip planning and build directly
      const spec = fs.existsSync(SPEC_FILE) ? JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')) : {};
      ws.send(JSON.stringify({ type: 'status', content: 'Skipping brief, building directly...' }));
      runOrchestratorSite(ws, null);
    }

    if (msg.type === 'upload-role-update') {
      // Update role/label for an uploaded asset
      const spec = fs.existsSync(SPEC_FILE) ? JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')) : {};
      const asset = (spec.uploaded_assets || []).find(a => a.filename === msg.filename);
      if (asset) {
        if (msg.role) asset.role = msg.role;
        if (msg.label !== undefined) asset.label = msg.label;
        fs.writeFileSync(SPEC_FILE, JSON.stringify(spec, null, 2));
        ws.send(JSON.stringify({ type: 'assistant', content: `Updated ${msg.filename}: role → ${msg.role || asset.role}` }));
      }
    }

    if (msg.type === 'generate-asset') {
      const assetType = msg.assetType || 'logo';
      const description = msg.description || '';
      ws.send(JSON.stringify({ type: 'status', content: `Generating ${assetType}...` }));
      runAssetGenerate(ws, assetType, description);
    }

    if (msg.type === 'update-spec') {
      try {
        const currentSpec = JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8'));
        const updated = { ...currentSpec, ...msg.updates };
        fs.writeFileSync(SPEC_FILE, JSON.stringify(updated, null, 2));
        ws.send(JSON.stringify({ type: 'spec-updated', spec: updated }));
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', content: 'Failed to update spec: ' + e.message }));
      }
    }
  });

  ws.on('close', () => console.log('[studio] Client disconnected'));
});

// --- Query handler (list assets, templates, preview) ---
function handleQuery(ws, userMessage) {
  const lowerMsg = userMessage.toLowerCase();

  if (lowerMsg.match(/\b(list|show|what)\s+assets\b/)) {
    const assetsDir = path.join(DIST_DIR, 'assets');
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir).filter(f => /\.(svg|png|jpg|gif)$/i.test(f));
      if (files.length) {
        ws.send(JSON.stringify({ type: 'assistant', content: `Current assets:\n${files.map(f => `  - ${f}`).join('\n')}` }));
      } else {
        ws.send(JSON.stringify({ type: 'assistant', content: 'No assets yet. Try "create a logo" or "make a favicon".' }));
      }
    } else {
      ws.send(JSON.stringify({ type: 'assistant', content: 'No assets directory yet. Generate something first!' }));
    }
    appendConvo({ role: 'assistant', content: 'Listed assets', at: new Date().toISOString() });
  } else if (lowerMsg.match(/\b(template|templates)\b/)) {
    const templatesDir = path.join(HUB_ROOT, 'config', 'site-templates');
    const templates = fs.existsSync(templatesDir)
      ? fs.readdirSync(templatesDir).filter(d => fs.statSync(path.join(templatesDir, d)).isDirectory())
      : [];
    const content = templates.length
      ? `Available templates:\n${templates.map(t => `  - ${t} — say "use ${t} template" to apply`).join('\n')}`
      : 'No templates available yet.';
    ws.send(JSON.stringify({ type: 'assistant', content }));
    appendConvo({ role: 'assistant', content, at: new Date().toISOString() });
  } else if (lowerMsg.includes('preview')) {
    ws.send(JSON.stringify({ type: 'assistant', content: `Preview is running at http://localhost:${PREVIEW_PORT}. Check the right panel.` }));
    appendConvo({ role: 'assistant', content: `Preview at http://localhost:${PREVIEW_PORT}`, at: new Date().toISOString() });
  }
}

// --- Run orchestrator-site ---
function runOrchestratorSite(ws, template) {
  const templateFlag = template ? ` --template ${template}` : '';
  const child = spawn('bash', ['-c', `cd "${HUB_ROOT}" && ./scripts/orchestrator-site "${TAG}"${templateFlag}`], {
    env: process.env,
    cwd: HUB_ROOT,
  });

  let output = '';

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
    ws.send(JSON.stringify({ type: 'status', content: chunk.toString().trim() }));
  });

  child.stderr.on('data', (chunk) => {
    console.error('[orchestrator]', chunk.toString());
  });

  child.on('close', (code) => {
    if (code === 0) {
      ws.send(JSON.stringify({ type: 'assistant', content: 'Site built successfully! Preview is updating.' }));
      ws.send(JSON.stringify({ type: 'reload-preview' }));
      appendConvo({ role: 'assistant', content: 'Site built via orchestrator-site', at: new Date().toISOString() });
    } else {
      ws.send(JSON.stringify({ type: 'error', content: 'Build failed. Check the logs.' }));
    }
  });
}

// --- Run site-deploy ---
function runDeploy(ws, isProd) {
  const prodFlag = isProd ? '--prod' : '';
  const child = spawn('bash', ['-c', `cd "${HUB_ROOT}" && ./scripts/site-deploy "${TAG}" ${prodFlag}`], {
    env: process.env,
    cwd: HUB_ROOT,
  });

  let output = '';

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
    ws.send(JSON.stringify({ type: 'status', content: chunk.toString().trim() }));
  });

  child.stderr.on('data', (chunk) => {
    console.error('[deploy]', chunk.toString());
  });

  child.on('close', (code) => {
    const urlMatch = output.match(/https:\/\/[^\s]+/);
    if (code === 0 && urlMatch) {
      ws.send(JSON.stringify({ type: 'assistant', content: `Site deployed!\n\nURL: ${urlMatch[0]}\n\nUse "fam-hub site domain ${TAG} yourdomain.com" to connect a custom domain.` }));
    } else if (code === 0) {
      ws.send(JSON.stringify({ type: 'assistant', content: 'Deploy completed. Check the output above for the URL.' }));
    } else {
      ws.send(JSON.stringify({ type: 'error', content: 'Deploy failed. You may need to run "netlify login" first.' }));
    }
    appendConvo({ role: 'assistant', content: `Deploy ${code === 0 ? 'succeeded' : 'failed'}: ${urlMatch ? urlMatch[0] : 'see logs'}`, at: new Date().toISOString() });
  });
}

// --- Run asset-generate script ---
function runAssetGenerate(ws, assetType, description) {
  const args = [`"${TAG}"`, `"${assetType}"`];
  if (description) args.push(`"${escapeForShell(description)}"`);

  const child = spawn('bash', ['-c', `cd "${HUB_ROOT}" && ./scripts/asset-generate ${args.join(' ')}`], {
    env: process.env,
    cwd: HUB_ROOT,
  });

  let output = '';

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
    ws.send(JSON.stringify({ type: 'status', content: chunk.toString().trim() }));
  });

  child.stderr.on('data', (chunk) => {
    console.error('[asset]', chunk.toString());
  });

  child.on('close', (code) => {
    if (code === 0) {
      const filename = `${assetType}.svg`;
      ws.send(JSON.stringify({ type: 'assistant', content: `${assetType} generated! Check the preview.` }));
      ws.send(JSON.stringify({ type: 'asset-created', filename, path: `/assets/${filename}` }));
      ws.send(JSON.stringify({ type: 'reload-preview' }));
      appendConvo({ role: 'assistant', content: `Generated ${assetType} asset`, at: new Date().toISOString() });
    } else {
      ws.send(JSON.stringify({ type: 'error', content: `Failed to generate ${assetType}. Check logs.` }));
    }
  });
}

// --- Helpers ---
function appendConvo(entry) {
  fs.mkdirSync(SITE_DIR, { recursive: true });
  const line = JSON.stringify({ ...entry, tag: TAG }) + '\n';
  fs.appendFileSync(CONVO_FILE, line);
}

function escapeForShell(str) {
  return str.replace(/'/g, "'\\''").replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// --- Start ---
server.listen(PORT, () => {
  console.log(`[site-studio] Chat UI at http://localhost:${PORT}`);
  console.log(`[site-studio] Site tag: ${TAG}`);
  console.log(`[site-studio] Preview at: http://localhost:${PREVIEW_PORT}`);
});
