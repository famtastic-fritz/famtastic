# SPEC — Lucid (working name)

A private, single-user dream interpretation app. You log a dream, it interprets
it conversationally in a warm reflective voice, and it remembers past dreams so
it can surface recurring symbols and themes over time.

> Working name is **Lucid**. Easy to change — say the word.

---

## 1. Core purpose

Help **one person (you)** make sense of your dreams. Three jobs, layered:

1. **Capture** a dream fast before it fades.
2. **Interpret** it through a gentle back-and-forth that unpacks meaning.
3. **Connect patterns** across many dreams over time (recurring symbols,
   people, settings, emotions).

All three matter. Capture is the always-works floor; interpretation is the
emotional payoff; pattern is the long-game reward that grows as the journal grows.

## 2. Who it's for

You. Single user, private, local. No accounts, no signups, no onboarding for
strangers. The app can be opinionated and tuned to one person.

## 3. Must-have features (v1)

### A. Layered dream capture
- **Type** — the always-works core. Free-text dream entry.
- **Guided prompts** — optional, skippable nudges on the capture screen:
  *Who was there? Where were you? What did you feel? How vivid? Recurring?*
- **Voice → text** — real mic button + recording UI. Transcription call is
  **stubbed behind a clean interface** (`transcribe()`), enabled later with a
  `.env` key. Runs end-to-end today without a live speech API (falls back to
  "type what you said").

### B. Conversational interpretation
- A real chat flow, not a one-shot box: **elicit → clarify → interpret**.
  - *Elicit*: takes the captured dream.
  - *Clarify*: asks 1–2 short follow-up questions (feelings, standout image).
  - *Interpret*: produces a warm, reflective reading — themes, symbols,
    emotional throughline, a gentle question to sit with.
- The AI call is **stubbed behind a clean interface** (`interpret()`) with a
  `.env` key you fill later. Until then a deterministic local "interpreter"
  returns a real, themed response so the whole flow works offline.

### C. Journal + pattern view
- Every dream + its interpretation is saved (local store).
- **Journal**: reverse-chronological list, searchable.
- **Patterns**: extracted symbols/tags across all dreams, with simple
  "you've dreamed about *water* 5 times" recurrence surfacing.

## 4. Vibe / brand

- **Calm & nocturnal** base: deep midnight indigo/violet, soft glow, generous
  whitespace, hushed. Feels like a quiet dark bedroom.
- **Subtle mystical accents**: a moon, a scatter of stars — present, not costume-y.
- **Interpretation voice**: warm, reflective, lightly symbolic. Explores
  ("this might be pointing at…"), never decrees. No doom, no fortune-telling.

## 5. Data it handles

- Dream text, timestamps, guided-prompt answers, extracted tags/symbols,
  interpretations, and the clarify-conversation.
- **Stored locally** in the sandbox (JSON file / lightweight local DB). Private
  by default. Nothing leaves the machine except (later, opt-in) the stubbed
  AI/transcription calls once you add real keys.

## 6. Explicitly OUT of scope for v1

- No multi-user accounts, auth, or login.
- No cloud sync, no hosting, no deploy.
- No social/sharing features.
- No real AI or speech keys required to run (stubs ship working; real keys are
  documented in `SETUP.md` for later).
- No mobile-native app — responsive web that works on a phone browser is enough.
- No dream-dictionary scraping / external symbol databases in v1 (the
  interpreter's symbol knowledge is self-contained).

## 7. Tech approach (free / local)

- Single Node.js app: small Express server + static front-end. One-command run
  (`npm start`). No build step, no framework lock-in.
- Local JSON store (no DB server to install).
- Clean stub interfaces for `interpret()` and `transcribe()` so a real provider
  drops in via `.env` with zero UI changes.
- Themed, responsive UI matching the calm-nocturnal brand.

## 8. Success criteria / proof

- `npm install && npm start` → app runs at a local URL, no keys needed.
- I can capture a dream (type, guided, or voice-UI), get a multi-turn
  interpretation, and see it saved in the journal.
- Logging a second dream with an overlapping symbol shows a recurrence in Patterns.
- Basic tests pass. README + SETUP + SUMMARY present.

---

**Build this? (yes / adjust)**
