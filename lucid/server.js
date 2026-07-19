// server.js — Lucid. Zero-dependency Node HTTP server.
// Serves the static UI and a small JSON API. One command: `npm start`.

import { createServer } from "node:http";
import { readFileSync, existsSync, createReadStream, statSync } from "node:fs";
import { dirname, join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { store } from "./src/store.js";
import { extractTags } from "./src/symbols.js";
import { interpret, clarifyQuestions } from "./src/interpreter.js";
import { transcribe } from "./src/transcriber.js";
import { computePatterns } from "./src/patterns.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");

// --- tiny .env loader (no dependency) -------------------------------------
(function loadEnv() {
  const envPath = join(__dirname, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = val;
  }
})();

const PORT = process.env.PORT || 4317;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function readJson(req) {
  const buf = await readBody(req);
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return {};
  }
}

function serveStatic(req, res, urlPath) {
  let rel = urlPath === "/" ? "/index.html" : urlPath;
  // prevent path traversal
  const safe = normalize(rel).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    return send(res, 404, { error: "not found" });
  }
  const type = MIME[extname(filePath)] || "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  try {
    // ---- API ----
    if (path === "/api/health" && method === "GET") {
      return send(res, 200, {
        ok: true,
        interpreter: process.env.INTERPRETER_PROVIDER ? "provider" : "local",
        transcriber: process.env.TRANSCRIBER_PROVIDER ? "provider" : "off",
      });
    }

    if (path === "/api/dreams" && method === "GET") {
      return send(res, 200, { dreams: store.list() });
    }

    if (path === "/api/dreams" && method === "POST") {
      const body = await readJson(req);
      const text = (body.text || "").trim();
      if (!text) return send(res, 400, { error: "Dream text is required." });
      const tags = extractTags(text);
      const dream = store.create({ text, prompts: body.prompts || {}, tags });
      return send(res, 201, { dream, clarify: clarifyQuestions(dream) });
    }

    // /api/dreams/:id  and /api/dreams/:id/interpret
    const dreamMatch = path.match(/^\/api\/dreams\/([^/]+)(\/interpret)?$/);
    if (dreamMatch) {
      const dreamId = dreamMatch[1];
      const isInterpret = !!dreamMatch[2];
      const existing = store.get(dreamId);
      if (!existing) return send(res, 404, { error: "Dream not found." });

      if (isInterpret && method === "POST") {
        const body = await readJson(req);
        const clarifications = body.clarifications || {};
        store.update(dreamId, { clarifications });
        const fresh = store.get(dreamId);
        const interpretation = await interpret(fresh);
        const saved = store.update(dreamId, { interpretation });
        return send(res, 200, { dream: saved, interpretation });
      }

      if (!isInterpret && method === "GET") return send(res, 200, { dream: existing });
      if (!isInterpret && method === "DELETE") {
        store.remove(dreamId);
        return send(res, 200, { ok: true });
      }
    }

    if (path === "/api/patterns" && method === "GET") {
      return send(res, 200, computePatterns(store.list()));
    }

    if (path === "/api/transcribe" && method === "POST") {
      const audio = await readBody(req);
      const result = await transcribe(audio);
      return send(res, result.ok ? 200 : 200, result);
    }

    if (path.startsWith("/api/")) {
      return send(res, 404, { error: "Unknown API route." });
    }

    // ---- static ----
    if (method === "GET") return serveStatic(req, res, path);

    return send(res, 405, { error: "Method not allowed." });
  } catch (err) {
    return send(res, 500, { error: "Something went wrong.", detail: String(err && err.message) });
  }
});

// Only listen when run directly (so tests can import without binding a port).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  server.listen(PORT, () => {
    console.log(`\n  🌙  Lucid is awake at http://localhost:${PORT}\n`);
    console.log(`      interpreter: ${process.env.INTERPRETER_PROVIDER ? "provider" : "local (offline)"}`);
    console.log(`      transcriber: ${process.env.TRANSCRIBER_PROVIDER ? "provider" : "off (type to capture)"}\n`);
  });
}

export { server };
