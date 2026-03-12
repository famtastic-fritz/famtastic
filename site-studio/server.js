const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- Config ---
const PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const PREVIEW_PORT = parseInt(process.env.PREVIEW_PORT || '3333', 10);
const TAG = process.env.SITE_TAG || 'site-demo';
const HUB_ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(HUB_ROOT, 'sites', TAG);
const DIST_DIR = path.join(SITE_DIR, 'dist');
const CONVO_FILE = path.join(SITE_DIR, 'conversation.jsonl');
const SPEC_FILE = path.join(SITE_DIR, 'spec.json');

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

      // Send acknowledgment
      ws.send(JSON.stringify({ type: 'status', content: 'Thinking...' }));

      // Determine what to do based on message content
      const lowerMsg = userMessage.toLowerCase();

      // Detect asset generation requests
      const assetMatch = lowerMsg.match(/(?:create|make|generate|design|draw)\s+(?:a\s+|an\s+|the\s+)?(?:new\s+)?(logo|icon|favicon|hero|banner|divider|illustration)/);

      if (assetMatch) {
        const assetType = assetMatch[1];
        ws.send(JSON.stringify({ type: 'status', content: `Generating ${assetType}...` }));
        runAssetGenerate(ws, assetType, userMessage);
      } else if (lowerMsg.match(/\buse\s+(the\s+)?(event|business|portfolio|landing)\s+template\b/) || lowerMsg.match(/\bapply\s+(the\s+)?(event|business|portfolio|landing)\s+template\b/)) {
        // Apply a specific template
        const templateMatch = lowerMsg.match(/(event|business|portfolio|landing)/);
        const template = templateMatch[1];
        ws.send(JSON.stringify({ type: 'status', content: `Applying ${template} template...` }));
        runOrchestratorSite(ws, template);
      } else if (lowerMsg.match(/\b(build|rebuild)\s+(the\s+)?site\b/) || lowerMsg.match(/\b(generate|create|make)\s+(the\s+)?site\b/)) {
        // Trigger a full site build — check if a template is mentioned
        const templateMatch = lowerMsg.match(/\b(event|business|portfolio|landing)\b/);
        const template = templateMatch ? templateMatch[1] : null;
        ws.send(JSON.stringify({ type: 'status', content: template ? `Building with ${template} template...` : 'Building site...' }));
        runOrchestratorSite(ws, template);
      } else if (lowerMsg.includes('preview')) {
        ws.send(JSON.stringify({ type: 'assistant', content: `Preview is running at http://localhost:${PREVIEW_PORT}. Check the right panel.` }));
        appendConvo({ role: 'assistant', content: `Preview available at http://localhost:${PREVIEW_PORT}`, at: new Date().toISOString() });
      } else if (lowerMsg.match(/\bdeploy\b/) && !lowerMsg.match(/\bhow\s+to\s+deploy\b/)) {
        // Deploy the site
        const isProd = lowerMsg.includes('prod') || lowerMsg.includes('production') || lowerMsg.includes('live');
        ws.send(JSON.stringify({ type: 'status', content: `Deploying ${isProd ? '(production)' : '(draft preview)'}...` }));
        runDeploy(ws, isProd);
      } else if (lowerMsg.match(/\blist\s+assets\b/) || lowerMsg.match(/\bshow\s+assets\b/) || lowerMsg.match(/\bwhat\s+assets\b/)) {
        // List current assets
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
      } else if (lowerMsg.match(/\b(template|templates)\b/) && lowerMsg.match(/\b(list|show|what|which|available)\b/)) {
        // List available templates
        const templatesDir = path.join(HUB_ROOT, 'config', 'site-templates');
        const templates = fs.existsSync(templatesDir)
          ? fs.readdirSync(templatesDir).filter(d => fs.statSync(path.join(templatesDir, d)).isDirectory())
          : [];
        const msg = templates.length
          ? `Available templates:\n${templates.map(t => `  - **${t}** — say "use ${t} template" to apply`).join('\n')}`
          : 'No templates available yet.';
        ws.send(JSON.stringify({ type: 'assistant', content: msg }));
        appendConvo({ role: 'assistant', content: msg, at: new Date().toISOString() });
      } else {
        // General chat — use Claude to process the request and potentially update the site
        handleChatMessage(ws, userMessage);
      }
    }

    if (msg.type === 'generate-asset') {
      // Direct asset generation via asset-generate script
      const assetType = msg.assetType || 'logo';
      const description = msg.description || '';
      ws.send(JSON.stringify({ type: 'status', content: `Generating ${assetType}...` }));
      runAssetGenerate(ws, assetType, description);
    }

    if (msg.type === 'update-spec') {
      // Update spec.json with new values
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

// --- Chat handler: call Claude for site refinement ---
function handleChatMessage(ws, userMessage) {
  const spec = fs.existsSync(SPEC_FILE) ? fs.readFileSync(SPEC_FILE, 'utf8') : '{}';
  const currentHtml = fs.existsSync(path.join(DIST_DIR, 'index.html'))
    ? fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8')
    : '';

  const prompt = `You are a website builder assistant. The user is building a website with this spec:
${spec}

The current HTML of the site is:
${currentHtml}

The user says: "${userMessage}"

Based on their request, do ONE of the following:
1. If they're asking to CHANGE the website (layout, colors, text, sections, etc.), output the COMPLETE updated HTML file. Start your response with "HTML_UPDATE:" on the first line, followed by the complete HTML.
2. If they're asking to CREATE an SVG asset (logo, icon, divider), output the SVG. Start with "SVG_ASSET:<filename>" on the first line (e.g., SVG_ASSET:logo.svg), followed by the complete SVG code.
3. If they're asking a question or making conversation, just respond normally as text.

Important: When outputting HTML, include the FULL file (not a diff). Use Tailwind CSS via CDN. Keep it responsive and modern.`;

  const claudeCli = path.join(HUB_ROOT, 'scripts', 'claude-cli');

  const child = spawn('bash', ['-c', `cd "${HUB_ROOT}" && echo "${escapeForShell(prompt)}" | ./scripts/claude-cli`], {
    env: { ...process.env, MODEL: 'claude-sonnet-4-20250514' },
    cwd: HUB_ROOT,
  });

  let response = '';

  child.stdout.on('data', (chunk) => {
    response += chunk.toString();
    // Stream partial responses
    ws.send(JSON.stringify({ type: 'stream', content: chunk.toString() }));
  });

  child.stderr.on('data', (chunk) => {
    console.error('[claude]', chunk.toString());
  });

  child.on('close', (code) => {
    if (code !== 0 || !response.trim()) {
      const fallback = "I couldn't process that request right now. Try being more specific about what you'd like to change, or say 'build the site' to regenerate from the spec.";
      ws.send(JSON.stringify({ type: 'assistant', content: fallback }));
      appendConvo({ role: 'assistant', content: fallback, at: new Date().toISOString() });
      return;
    }

    response = response.trim();

    if (response.startsWith('HTML_UPDATE:')) {
      // Extract and write updated HTML
      const html = response.replace(/^HTML_UPDATE:\s*/, '');
      fs.mkdirSync(DIST_DIR, { recursive: true });
      fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html);
      ws.send(JSON.stringify({ type: 'assistant', content: 'Site updated! Check the preview.' }));
      ws.send(JSON.stringify({ type: 'reload-preview' }));
      appendConvo({ role: 'assistant', content: 'Updated site HTML based on request: ' + userMessage, at: new Date().toISOString() });
    } else if (response.startsWith('SVG_ASSET:')) {
      // Extract filename and SVG content
      const firstNewline = response.indexOf('\n');
      const header = response.substring(0, firstNewline);
      const filename = header.replace('SVG_ASSET:', '').trim();
      const svg = response.substring(firstNewline + 1);
      const assetPath = path.join(DIST_DIR, 'assets', filename);
      fs.mkdirSync(path.join(DIST_DIR, 'assets'), { recursive: true });
      fs.writeFileSync(assetPath, svg);
      ws.send(JSON.stringify({ type: 'assistant', content: `Created asset: ${filename}. Check the preview.` }));
      ws.send(JSON.stringify({ type: 'asset-created', filename, path: `/assets/${filename}` }));
      ws.send(JSON.stringify({ type: 'reload-preview' }));
      appendConvo({ role: 'assistant', content: `Created SVG asset: ${filename}`, at: new Date().toISOString() });
    } else {
      // Plain text response
      ws.send(JSON.stringify({ type: 'assistant', content: response }));
      appendConvo({ role: 'assistant', content: response, at: new Date().toISOString() });
    }
  });
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
    // Try to extract URL from output
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
