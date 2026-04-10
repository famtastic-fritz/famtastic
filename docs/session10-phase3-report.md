# Session 10 Phase 3 — Client Interview System MVP

**Date:** 2026-04-10  
**Status:** ✅ Complete — 48/48 tests passing

---

## What Was Built

A structured client interview system that captures brand and content intent before the first site build. The interview runs as a short Q&A session (5 or 10 questions) and synthesizes answers into a `client_brief` object stored in `spec.json`.

---

## Files Created / Modified

| File | Action |
|------|--------|
| `site-studio/lib/client-interview.js` | Created — core interview logic |
| `site-studio/server.js` | Modified — 3 API endpoints + require |
| `tests/session10-phase3-tests.js` | Created — 48 assertions |
| `docs/session10-phase3-report.md` | Created — this report |

---

## Core Module: `lib/client-interview.js`

### Exports

| Function | Purpose |
|----------|---------|
| `startInterview(mode)` | Initializes interview state, returns first question |
| `recordAnswer(state, questionId, answer)` | Advances state, returns next question or brief |
| `getCurrentQuestion(state)` | Reads current question without advancing (for resume) |
| `shouldInterview(spec)` | Returns true if site needs an interview (not built/deployed/completed) |
| `buildClientBrief(state, questions)` | Synthesizes answers → structured brief object |
| `QUICK_QUESTIONS` | 5 high-signal question definitions |
| `DETAILED_QUESTIONS` | 10 question definitions (extends quick set) |

### Modes

| Mode | Questions | Use Case |
|------|-----------|----------|
| `quick` | 5 | Default — covers business, customer, differentiator, CTA, style |
| `detailed` | 10 | Full brand capture — adds services, social proof, geography, urgency, contact |
| `skip` | 0 | Bypasses interview — empty brief, marks `interview_completed: true` immediately |

### State Shape (written to `spec.json` as `interview_state`)

```json
{
  "mode": "quick",
  "started_at": "2026-04-10T14:00:00.000Z",
  "completed_at": null,
  "questions": ["q_business", "q_customer", "q_differentiator", "q_cta", "q_style"],
  "answers": { "q_business": "We do X for Y..." },
  "current_index": 1,
  "completed": false
}
```

### `client_brief` Shape (promoted to spec root on completion)

```json
{
  "generated_at": "...",
  "interview_mode": "quick",
  "business_description": "...",
  "ideal_customer": "...",
  "differentiator": "...",
  "primary_cta": "...",
  "style_notes": "..."
}
```

---

## API Endpoints

### `POST /api/interview/start`
**Body:** `{ mode?: 'quick' | 'detailed' | 'skip' }`

Behavior:
- If interview already completed → returns `{ completed: true, client_brief }`
- If interview in progress → resumes and returns current question
- Otherwise → starts fresh, persists initial state, returns first question

**Response (in-progress):**
```json
{
  "question": {
    "question_id": "q_business",
    "text": "In one or two sentences...",
    "required": true,
    "current": 1,
    "total": 5
  },
  "mode": "quick"
}
```

---

### `POST /api/interview/answer`
**Body:** `{ question_id: string, answer: string }`

Behavior:
- Validates `question_id` matches current expected question
- Stores answer, advances `current_index`
- Returns next question OR `{ completed: true, client_brief }` when done
- Writes updated state to spec.json after every answer

**Response (mid-interview):**
```json
{ "question": { "question_id": "q_customer", "current": 2, "total": 5, ... } }
```

**Response (final answer):**
```json
{ "completed": true, "client_brief": { "business_description": "...", ... } }
```

---

### `GET /api/interview/status`
Returns current interview state snapshot without modifying anything.

```json
{
  "interview_completed": false,
  "client_brief": null,
  "in_progress": true,
  "mode": "quick",
  "current_index": 2,
  "total": 5
}
```

---

## spec.json Integration

When interview completes, two fields are written to spec root:
- `interview_completed: true` — flag checked by `shouldInterview()` and build pipeline
- `client_brief: { ... }` — structured answers for prompt injection

`shouldInterview()` returns `false` when:
- `spec.interview_completed === true`
- `spec.state === 'built'` or `'deployed'` (build already happened before interview was wired)
- `spec` is null/undefined

---

## Test Coverage

| Group | Tests | Assertions |
|-------|-------|------------|
| Module exports | 1 | 7 |
| Quick mode init | 1 | 8 |
| Answer advances state | 1 | 5 |
| Full quick completion | 1 | 6 |
| Skip mode | 1 | 3 |
| shouldInterview logic | 1 | 6 |
| Mismatch error | 1 | 2 |
| Detailed mode | 1 | 4 |
| Server endpoints (start + answer) | 1 | 5 |
| Status endpoint | 1 | 2 |
| **Total** | **10** | **48** |

---

## Known Gaps / Deferred

- Interview not yet auto-triggered on `fam-hub site new` (CLI integration deferred to Phase 4B)
- `client_brief` not yet injected into build prompts (deferred to Phase 5 / Session 11)
- No UI for interview in Studio (intentional — API-first per Addendum C8)
- Detailed mode has no UI exposure — accessible via API only
