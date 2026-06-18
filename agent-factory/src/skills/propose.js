// PROPOSE skill: turn discovery + audit into a concrete business-automation
// proposal (scope, selling points, pricing, backend assumptions). Real artifact.
import { writeArtifact, exists } from './_lib.js';

export async function run(task, { llm }) {
  const think = await llm.complete({
    system: 'You are a solutions architect writing a tight commercial proposal.',
    prompt: 'Propose a React + 3D + simple CMS + AI tutor rebuild for a legacy PDF-standards seller (NCS7). ' +
      'Include selling points, scope, backend assumptions, pricing tiers, and a bonus 3D CAD render upsell.',
    model: task._model.id,
  });

  const haveDiscovery = exists('docs/ncs7/01-discovery.md');
  const haveAudit = exists('docs/ncs7/02-audit.md');

  const md = `# NCS7 — Business Automation Proposal

> From the agent factory's \`propose\` skill. Builds on
> ${haveDiscovery ? '`01-discovery.md`' : '(discovery pending)'} and
> ${haveAudit ? '`02-audit.md`' : '(audit pending)'}.

## The pitch in one line
Turn a 30-year-old "list of PDFs" into a modern, **3D-immersive** standards portal
that the owner can **run themselves** through a dead-simple CMS — with an **AI tutor**
that teaches them how, and an optional **3D CAD presentation** that makes the product
worth more than a download.

## Selling points (in priority order)
1. **Visual wow on first paint** — React + Three.js immersive hero and 3D layer.
   The site *feels* like something a normal agency would not ship.
2. **A CMS a non-technical owner actually controls** — edit any page, create pages
   from reusable **templates**, manage the standard's chapters as products.
3. **AI CMS tutor** — an in-product assistant that teaches the owner each task
   ("how do I add a chapter?", "how do I publish?"). Lowers handoff risk to ~zero.
4. **Bonus upsell — 3D CAD render** — present the CAD drawings as an explorable,
   exploded 3D model instead of a flat PDF. Higher perceived value, harder to pirate,
   justifies subscription pricing.

## Scope (what ships in the demo)
- React SPA recreating NCS7 (Home, About, Standards/Products, Pricing, Resources, Contact).
- Three.js immersive effect (hero scene + scroll/mouse-reactive blueprint layer).
- CMS backend: pages CRUD, **page templates → instantiate**, products CRUD, content API.
- Admin UI (simple, no build step) + stub auth.
- AI tutor over a CMS knowledge base (offline retrieval now, LLM-pluggable later).
- 3D CAD presentation prototype (pdf.js + Three.js, layered drawing).

## Backend assumptions (derived from the frontend)
The frontend is **content-driven**, so the backend must expose exactly what the UI
consumes. Assumptions made (documented for the client to confirm):
- **Content store:** JSON files now (\`content.json\`, \`pages.json\`, \`templates.json\`,
  \`products.json\`) → trivially swappable to Postgres/SQLite later. Frontend reads
  \`GET /api/content\`; admin writes via \`PUT/POST\`.
- **Pages model:** \`{ slug, title, template, blocks[] }\`; templates define block schema
  so "create page from template" is fill-in-the-blanks for the owner.
- **Products model:** \`{ id, title, summary, price, pdf, preview, chapters[] }\` — maps a
  CAD-standard chapter to a sellable item with a 3D/preview hook.
- **Auth:** stubbed (any creds) for the demo → JWT/session + roles later.
- **Tutor:** \`POST /api/tutor {question}\` → retrieval over \`knowledge.json\`; same
  endpoint accepts a real LLM key later with no frontend change.
- **Payments:** out of scope for the sandbox (no money movement) → Stripe later at
  the product page + subscription tier.

## Pricing (illustrative — no charges in the sandbox)
| Tier | What | One-time | Monthly |
|---|---|---|---|
| Rebuild | React site + CMS + tutor | $9–14k | — |
| Care | hosting, updates, tutor model | — | $300–600 |
| 3D CAD add-on | per-drawing 3D presentation pipeline | $2–4k setup | usage |

## Rollout
1. Demo (this) → 2. Content migration of real chapters → 3. Auth + payments →
4. Real LLM tutor → 5. 3D CAD pipeline for live drawings.

---
*LLM pass:* ${think.mode} (${think.usage.input_tokens}→${think.usage.output_tokens} tok)
`;

  const artifact = writeArtifact('docs/ncs7/03-proposal.md', md);
  return {
    summary: 'Commercial proposal with scope, selling points, backend assumptions',
    artifacts: [artifact],
    usage: think.usage,
    metrics: { selling_points: 4, tiers: 3 },
  };
}
