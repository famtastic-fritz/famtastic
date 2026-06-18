# SANDBOX

This directory (`./autonomous-build/`) is a **self-contained, isolated sandbox**.

## Isolation contract

- **Nothing outside this folder may be created, modified, or deleted** by the
  autonomous build agent. All work — code, tests, docs, git history — lives here.
- This folder has **its own git repository** (`./autonomous-build/.git`),
  independent of the parent `famtastic` repo. Commits are made per phase.
- The "node env" for this sandbox is **zero-dependency**: it uses only the Node.js
  standard library (`node:http`, `node:test`, `node:assert`). There is no
  `node_modules`, no network install step, and nothing to download. This keeps the
  sandbox fully offline-capable and free of paid/external tooling.

## Why zero-dependency

The execution rules require free/local tooling, no paid signups, and no live
deploys. Node 22's built-in `node:test` runner and `node:http` server let us ship
a real, runnable product with **no `npm install`** at all — the lowest-risk path
that still produces genuinely functional code.

## How to run / test

```bash
node server.js        # start the app on http://localhost:4317
node --test           # run the test suite
```

## Phases (tracked in PROGRESS.md)

1. CONCEPT  → CONCEPT.md
2. BUILD    → working v1 (server.js, src/, public/)
3. TEST     → tests/, test results logged
4. PRODUCTIZE → landing + pricing page, name + tagline
5. GO-TO-MARKET → MARKETING.md
6. PACKAGE  → SHIP.md + final summary

Each phase ends with an entry appended to PROGRESS.md and a git commit.
