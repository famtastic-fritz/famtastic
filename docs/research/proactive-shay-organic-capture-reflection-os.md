# Proactive Shay — Organic Capture, Reflection, and Action OS

Date: 2026-06-16
Status: proposed build spec
Owner: Shay-Shay
Scope: current repo only (`~/famtastic`)
No-touch lanes: `~/.shay/SOUL.md`, `~/.shay/PERSONA.md`, identity backups, and any parallel-session identity files Fritz is actively editing.

## 1. What Fritz is actually asking

Fritz is not asking for a better note-taking system.
He is asking for a living process that:

1. captures life/work context organically, without forcing formal documentation,
2. builds Shay’s working model of Fritz over time,
3. recognizes patterns Fritz cannot easily see while inside the pressure,
4. turns reflection into pressure/action rather than archive-only summaries,
5. protects sensitive personal context in a dedicated private lane,
6. changes Shay’s future behavior based on what is learned,
7. feeds morning briefs, project maps, nudges, and prioritization with real human-state context.

The target is not “memory.”
The target is proactive ambient intelligence with disciplined action surfaces.

## 2. Core product thesis

The system must run as:

Capture -> Distill -> Reflect -> Motivate -> Act -> Verify -> Reinforce

The front of the system must be low-friction and organic.
The middle of the system must be structured and disciplined.
The back of the system must generate bounded action, not chaos.

## 3. Non-goals

This build does NOT:

- edit or reinterpret soul/persona/identity files,
- turn every emotional signal into a task,
- auto-message people without explicit user-approved channels/rules,
- flatten deep private context into generic “user is stressed” summaries,
- replace human judgment on spiritually meaningful interpretation,
- introduce a separate parallel memory store when current surfaces can be extended.

## 4. Design rules

1. Messy input is valid input.
   - transcripts, screenshots, pasted dumps, voice-note text, half-formed vents, repo notes, bookmarks, CLI logs.

2. Observation and interpretation stay separate.
   - never collapse “what happened” and “what it means” into one object.

3. Sensitive human-state context gets a protected lane.
   - not ordinary memory soup.

4. Reflection must change behavior.
   - otherwise it is just journaling with extra steps.

5. Not everything becomes a task.
   - some items become protection logic, watch items, timing logic, or seed-bank records.

6. Retrieval must follow a waterfall.
   - session history -> private lane -> repo-root captured transcripts -> vault notes/parses -> existing project memory.

7. Identity lane is read-only unless Fritz explicitly says otherwise.

## 5. Organic input layer

### Accepted source classes

- live chat transcripts
- session compaction memos
- captured full-screen chat transcripts in repo root
- Obsidian notes
- private lane notes
- Telegram / gateway captures
- pasted email excerpts
- screenshots + OCR/transcript outputs
- browser/bookmark captures
- command-center / plan / ledger artifacts

### Intake object (minimal)

Each captured source should normalize to an intake object with:

- `capture_id`
- `source_class`
- `source_path` or `source_pointer`
- `captured_at`
- `sensitivity`: `public | internal | private | highly_private`
- `raw_type`: `chat | transcript | note | screenshot | email | bookmark | artifact | log`
- `ingest_status`: `new | split | distilled | reflected | surfaced | archived`

No heavy form. Provenance first.

## 6. Distillation layer

The distillation pass turns one raw intake into atomic items.

### Atomic item shape

Each item should carry:

- `item_id`
- `capture_id`
- `kind`: `observation | interpretation | task_signal | project_signal | blocker | promise | obligation | idea | decision | emotional_weight | metaphysical_signal`
- `primary_lane`: `shay_platform | income | research | metaphysical | fritz`
- `secondary_tags`: string[]
- `weight`: `low | medium | high | urgent | ambient | recurring`
- `sensitivity`
- `project_hint`
- `actionability`: `taskable | context_only | watch | seed | decision_required`
- `body`
- `source_excerpt`

### Hard rule

One blob may contain multiple distinct concerns.
The system must split them instead of flattening one message into one object.

## 7. Protected private-context lane

This is the missing load-bearing feature.

### Purpose

Hold sensitive human-state context in a structured, retrievable, non-generic form.

### What belongs here

- what Fritz says is deeply going on
- family/relationship pressure context
- silence-weight / promise-weight context
- personal load and support style signals
- spiritually charged personal interpretation notes (with human-led framing)

### What does NOT belong here

- ordinary implementation chatter
- public project tasks
- stale transient logs

### Record shape

- `private_context_id`
- `created_at`
- `source_capture_ids`
- `primary_lane`
- `theme`
- `observation_block`
- `interpretation_block`
- `active_pressures`
- `helpful_response_pattern`
- `harmful_response_pattern`
- `linked_projects`
- `review_state`: `active | cooling | archived`

### Retrieval behavior

Private context is not injected blindly.
It is surfaced when:
- the new session/topic overlaps semantically,
- the user opens with a human-state check-in,
- related projects/people/themes recur,
- morning brief generation requests active-life context.

## 8. Reflection classes

### R1. State Reflection
Question: What is true about Fritz right now?
Output examples:
- active pressures
- energy pattern
- overload pattern
- needed support mode

### R2. Pattern Reflection
Question: What is repeating?
Output examples:
- recurring blockers
- silence stress loops
- promise-weight accumulation
- money fog patterns
- utility-vs-vanity pattern in Shay/platform work

### R3. Identity Reflection
Question: What should Shay learn about serving Fritz?
Output examples:
- tone adjustments
- brevity/pressure mode
- when to push vs when to simplify
- what kinds of context must never be flattened

Note: this reflection informs behavior steering, not soul/persona file edits.

### R4. Action Reflection
Question: What should happen now because of this?
Output examples:
- brief items
- project stubs
- follow-up nudges
- decision checkpoints
- communication drafts
- ranked next moves

## 9. Motivation/action-force layer

Every meaningful reflection should create one bounded force:

- `push`    -> act now
- `pull`    -> show in next brief when timing fits
- `watch`   -> monitor for recurrence
- `protect` -> modify Shay behavior toward Fritz
- `seed`    -> preserve without activating

This is the bridge from reflection to movement.

## 10. Action surfaces

### A. Morning brief surface
Inject:
- top fires
- top unresolved decisions
- top silence-weight communication
- one protect-the-source item
- one momentum move
- one seed watch item

### B. Project map surface
If a reflection reveals a bounded initiative, create or attach:
- lane
- project
- canonical plan
- blockers
- first-next actions

### C. Private-context surface
Update protected human-state context records.

### D. Behavior-steering surface
Generate a machine-readable steering block for future Shay behavior, e.g.:
- response mode: ultra_brief / normal / architecture
- ask_threshold: low / medium / high
- pushback_level: gentle / direct / hard
- prioritization_bias: protect_source / revenue / execution / relief

### E. Triggered follow-through surface
Bounded rules only. Examples:
- if silence-weight repeats 3 times, draft a short truth-based update
- if cruise recurs without hard numbers, generate a decision checkpoint item
- if income ambiguity recurs, elevate monetization ranking into the next brief

## 11. Retrieval waterfall

When asked about prior deep/private context, use this order:

1. session transcript recall
2. protected private-context records
3. repo-root captured transcript files
4. Obsidian parse/reference notes that point back to transcripts
5. broader memory/decision/reference surfaces

### Alias normalization requirements

Retrieval must normalize variants like:
- `agent two` <-> `agent2`
- `deep dive` <-> `deep-dive`
- `convo` <-> `conversation`
- number words <-> numeric digits

This is a direct fix from the miss on `deep dive convo agent2.md`.

## 12. Existing surfaces to extend

Grounded in current repo reality:

- `obsidian/Shay-Memory/_system/reflect.py`
  - current nightly generative/extractive reflection engine
- `command-center/briefing.md`
  - current daily briefing artifact shape
- `lib/shay/memory-context.js`
  - current relevant-memory injection surface
- `docs/operating-rules/memory-lifecycle.md`
  - current capture/promote lifecycle rules
- `scripts/memory-digest.js`
  - current digest surface
- `scripts/memory-promote.js`
  - current promotion surface

## 13. Proposed build slices

### Slice 1 — Retrieval and source-class hardening
Goal: stop missing the real source.

Build:
- retrieval waterfall utility
- alias normalization utility
- source-class registry
- transcript/reference-link following
- tests for repo-root transcript discovery and alias matching

Likely touch/create:
- new utility under `lib/shay/` or `scripts/`
- tests near `tests/test_shay_memory_reflect.py` or new JS tests

### Slice 2 — Organic intake registry
Goal: normalize messy source artifacts without demanding forms.

Build:
- intake object schema
- source-class-specific adapters
- file-backed intake queue for new captures

Likely touch/create:
- `captures/inbox/` compatible schema or new `obsidian/Shay-Memory/_system/runtime/` ledger
- new parser scripts under `scripts/`

### Slice 3 — Distillation engine
Goal: split blended context into atomic items with lanes, weight, and sensitivity.

Build:
- atomic-item schema
- observation vs interpretation split
- lane assignment
- weight classification
- project hint extraction

Likely touch/create:
- extend `reflect.py` or add companion distiller script
- tests for multi-concern splitting

### Slice 4 — Private-context lane
Goal: preserve sensitive human-state context with discipline.

Build:
- protected record schema
- selective retrieval rules
- storage path separate from generic memory records
- surfacing rules into briefing and behavior steering only when relevant

Likely touch/create:
- private-context folder under Shay-Memory or dedicated runtime ledger
- new retrieval helpers

### Slice 5 — Reflection-to-action engine
Goal: produce movement, not archive-only summaries.

Build:
- reflection class outputs (R1-R4)
- action-force mapping (`push/pull/watch/protect/seed`)
- brief injection block
- behavior-steering block
- optional project-stub proposal output

Likely touch/create:
- `reflect.py`
- command-center briefing generator inputs
- maybe `lib/shay/memory-context.js` for steering injection

### Slice 6 — Reinforcement loop
Goal: teach the system what actually helps.

Build:
- outcome ledger
- nudge usefulness scoring
- false-positive suppression
- recurrence threshold tuning

Likely touch/create:
- runtime JSONL ledger
- digest/report script updates

## 14. State machine

```text
NEW_CAPTURE
  -> NORMALIZED
  -> ATOMIC_SPLIT
  -> DISTILLED
  -> ROUTED
      -> PRIVATE_CONTEXT
      -> PROJECT_SIGNAL
      -> TASK_SIGNAL
      -> WATCH_SIGNAL
      -> SEED_SIGNAL
  -> REFLECTED
  -> ACTION_FORCED
      -> PUSH
      -> PULL
      -> WATCH
      -> PROTECT
      -> SEED
  -> SURFACED
      -> BRIEF
      -> PROJECT_MAP
      -> BEHAVIOR_STEERING
      -> PRIVATE_CONTEXT_UPDATE
  -> VERIFIED
  -> REINFORCED
```

## 15. Red-team risks and controls

### Risk 1: Over-triggering / noisy pseudo-proactivity
Control:
- confidence thresholds
- recurrence thresholds
- bounded action-force types
- no auto-human-outreach without explicit enablement

### Risk 2: Flattening intimate context into generic summaries
Control:
- dedicated private-context schema
- explicit observation/interpretation separation
- retrieval waterfall that prioritizes original transcripts and protected records

### Risk 3: Identity drift / accidental modification of persona lane
Control:
- identity files marked read-only for this initiative
- identity reflection writes behavior steering, not persona file edits

### Risk 4: Taskification of everything
Control:
- `context_only`, `watch`, and `seed` remain first-class outputs

### Risk 5: Reflection hallucinating meaning
Control:
- explicit provenance links back to source captures
- metaphysical interpretation stays human-led where meaning is high-stakes

## 16. Lessons learned from this session

1. Retrieval strategy matters as much as memory quality.
2. Repo-root transcript captures are a real first-class source and must not be skipped.
3. Generic “stress” recall is not enough; structured human-context recall is the actual bar.
4. The current system is stronger at pattern hinting than at protected deep-context precision.
5. Behavior-steering is the safest place for identity-adjacent learning right now because it avoids touching soul/persona files.

## 17. Known gaps

- no current alias-normalized retrieval layer for repo-root transcript artifacts
- no dedicated protected private-context schema/ledger
- no explicit action-force layer tying reflections to briefing/project/behavior surfaces
- current reflection path still risks over-summarizing human-state nuance
- current briefing surface is plan-centric and not yet fully human-context aware

## 18. Recommended execution order

1. Slice 1 — retrieval and source-class hardening
2. Slice 4 — protected private-context lane
3. Slice 3 — distillation engine
4. Slice 5 — reflection-to-action engine
5. Slice 2 — organic intake registry improvements
6. Slice 6 — reinforcement loop

Reason:
First stop missing the right source.
Then protect the sensitive lane.
Then distill.
Then cause action.
Then widen intake.
Then tune the loop.

## 19. Verification plan

Verification must prove behavior, not just code existence.

### Retrieval tests
- finds `deep dive convo agent2.md` when asked with `agent two`
- follows parse-note references back to source transcript
- prefers protected records over generic summaries when overlap exists

### Distillation tests
- one mixed transcript splits into multiple atomic items
- observation and interpretation are emitted separately
- private/highly_private items route correctly

### Reflection tests
- human-state reflections preserve specific active pressures
- action reflections emit bounded force types only
- no action generated for low-signal/noise captures

### Briefing tests
- brief can include a protect-the-source item and a silence-weight item without turning them into generic plan spam

### Safety tests
- no reads/writes to soul/persona lane in this initiative
- no secrets included in persisted reflection artifacts

## 20. Next implementation move

Immediate move:
Build Slice 1 first.

Why:
Because the system cannot be proactive if it fails to find the right source artifact in the first place.
That is the cleanest, safest first win, and it does not require touching identity files.
