# 🌙 Lucid

A private, single-user **dream interpretation app**. Log a dream — by typing,
guided prompts, or voice — and Lucid reflects it back in a warm, gentle voice,
then remembers it so it can surface the symbols and themes that recur across
your nights.

Calm and nocturnal by design. No accounts, no cloud, no keys required to run.
Everything stays on your machine.

---

## Run it (one command)

```bash
npm start
```

Then open **http://localhost:4317**.

That's it — no `npm install`, no build step, no database to set up. Lucid is
pure Node.js standard library (Node 18+).

Run the tests:

```bash
npm test
```

---

## How it works

Lucid has three tabs:

### 1. Capture
Get the dream down before it fades. Three ways, layered:
- **Type** — the always-works core.
- **Guided prompts** — optional nudges (who / where / feeling / vividness /
  recurring). Fill what helps, skip the rest.
- **Record** — a real mic button. Audio is sent to `POST /api/transcribe`.
  Until you configure a speech provider (see `SETUP.md`), it gracefully tells
  you to type what you said — the flow never breaks.

### 2. The reflection (capture → clarify → interpret)
After you capture a dream, Lucid doesn't dump a one-shot answer. It:
1. **Elicits** — takes your dream and detects its symbols.
2. **Clarifies** — asks one or two short follow-ups (the feeling it left, the
   most charged moment).
3. **Interprets** — composes a warm, reflective reading: the emotional thread,
   what the symbols might be pointing at, and a gentle question to sit with.
   It explores ("this may point to…"); it never decrees.

The interpretation is produced by a **self-contained offline interpreter**, so
it works with zero setup. Add an LLM key later (see `SETUP.md`) and the same
flow upgrades to a live model — no UI changes.

### 3. Journal & Patterns
- **Journal** — every dream and its interpretation, newest first, searchable.
- **Patterns** — recurring symbols across all your dreams
  ("You've dreamed about water 5 times"), with recurring symbols highlighted.

---

## Where your data lives

In `data/dreams.json` inside this folder. Nothing leaves your machine. Delete
the file to start fresh; delete the folder to remove Lucid entirely. See
`SANDBOX.md` for the full isolation guarantee.

---

## Project layout

```
lucid/
├── server.js            zero-dependency HTTP server + JSON API
├── src/
│   ├── store.js         local JSON persistence
│   ├── symbols.js       dream-symbol knowledge + detection
│   ├── interpreter.js   elicit → clarify → interpret (offline + provider seam)
│   ├── transcriber.js   voice → text seam (stubbed until a provider is set)
│   └── patterns.js      recurrence across dreams
├── public/              UI (index.html, css/, js/)
├── test/                unit + integration tests (node --test)
├── data/                local dream store (gitignored)
├── SETUP.md             optional real AI / speech keys
├── SANDBOX.md           isolation guarantee
└── PROGRESS.md          build log
```

---

## Optional upgrades

Lucid is fully functional offline. To plug in real services later, copy
`.env.example` to `.env` and fill in keys — details in **`SETUP.md`**.
