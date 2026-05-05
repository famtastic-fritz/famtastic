# Shay-Shay Architecture v2

**Status:** APPROVED-IN-PRINCIPLE — pending mockup review
**Date:** 2026-05-02 (ecosystem framing added 2026-05-02b)
**Supersedes:** `docs/shay-shay-architecture.md` (v1, 2026-04-16)
**Reviewer:** Fritz

---

## Ecosystem framing (added 2026-05-02b)

This architecture is designed for the FAMtastic ecosystem of standalone Studios, not just Site Studio. Site Studio is the seed. Future Studios (Media, Brand, Component, Think Tank, etc.) are sibling products — each with its own tools, functions, options, and context awareness — that interact via standardized contracts.

**Every primitive in this doc is ecosystem-first:**
- `ShayContextRegistry`'s page IDs use `<studio>.<page>` namespacing → N Studios register without contention
- Handoff contract's `source_surface`/`destination_surface` support cross-Studio (`media_studio.workshop` etc.) → handoffs route between Studios, not just light↔deep
- Workshop tool rail uses `appliesTo` tags on tool registration → tools filter by active Studio
- Memory layers (per-site / per-Studio / per-ecosystem) live in shared services namespace `lib/famtastic/*`
- Capability manifest extends per-Studio so Shay knows which Studios are available + what each can do

**Implication:** Shay-Shay (light) follows the user across every Studio. Shay's Workshop (deep) hosts a tool rail filtered by which Studio is active. Same Shay, more Studios.

See `docs/famtastic-total-ask-plan.md` Chunk C for the ecosystem substrate roadmap.

---

---

## What changed from v1

V1 described Shay with two surfaces (Lite + Desk). The intent was right; the implementation drifted into six surfaces, three composers, and two parallel naming conventions (per the 2026-05-02 audit). V2 consolidates back to two surfaces with explicit naming, an explicit relationship between them, and an explicit tooling architecture for the deeper surface.

**Key decisions baked into v2:**

- Two surfaces, renamed: **Shay-Shay** (light, always with you) and **Shay's Workshop** (deep, her room with her tools).
- Same identity, different contexts. Not two products, not two assistants. One Shay with more tools available when she's in the Workshop.
- The Workshop is not just a handoff target. It is also Shay's space for regular chat, ideation about new components/apps/features, gap detection and capture, research on tools/MCPs/skills, and the learning loop.
- When Shay is in the Workshop, she docks near the active chat — she's interacting with it, not isolated in another pane.
- The Workshop's tool rail follows the Cowork sidebar pattern — pluggable, reorderable, additive. Tools register; the rail accommodates them.
- Site Studio Chat (the original chat) is preserved. Different routing from Shay — wired to subscriptions, local LLMs, and terminal capability for cheap/local work.
- Page-context capture proves out on Media Studio first.
- The orb has 5 valid states; `SHAY_THINKING` is now part of the official contract.
- Visual redesign of the orb (animation, personality, character) is **deferred** to a later phase. Current placeholder stays until then.

---

## What Shay is — and is not

**Shay is one identity, two contexts.** Both contexts are the same Shay. The split is about *where she shows up and how much room she takes*, not about who she is.

**Shay is not a chatbot.** Every chatbot starts fresh. Shay accumulates context, learns, and remembers. (Carries forward from v1.)

**Shay is not a tab.** A tab is one of the surfaces. The identity transcends the tab. Closing the tab does not close Shay.

**Shay is a multifunctional utility.** A tool that follows the user across every Studio (Site, Media, Brand, future ones) and helps with whatever's in front of them. Some tasks are handled inline. Some are taken to the Workshop. None get rerouted to "go ask the chatbot."

**Shay is named after a real person.** The bar is companion, not assistant.

---

## Shay-Shay (the light context)

**What she is:** Shay, everywhere. Always present, always knows where you are, always knows what you're looking at. The version of Shay you live with day-to-day.

**What she does:**

- Sees the current page and current artifact (image, prompt, draft, plan, build result)
- Answers contextual questions about what's in front of you ("which of these images looks warmest?", "why did this build fail?")
- Performs inline actions on what she sees (regenerate, refine, save, compare, navigate)
- Runs **"show me how"** routines — actually navigates the UI on the user's behalf using the Cowork pattern. She doesn't describe; she does it on the screen and hands control back.
- Captures gaps when she can't help and offers to take the work to the Workshop
- Takes a task to the Workshop when work outgrows the inline space

**What she does NOT do:**

- Take over the screen
- Run multi-step jobs that need a focused workspace
- Replace the user's primary work surface

**Trigger model:** always-on, contextual. No "open" gesture required. She is where you are.

**Surface footprint:** a compact, persistent surface. The current floating orb is a placeholder for the final form. Final form will be animated, responsive, action-oriented, with personality. That work is deferred to a later visual phase. Position is user-controlled (drag, snap, dock).

### The "show me how" routine

This is the load-bearing capability that makes Shay-Shay genuinely useful vs. a chat-window-with-extra-steps.

**Example flow:** user types in chat: *"I don't know how to change the site domain, can you show me where?"*

Shay-Shay's routine:

1. Recognizes the intent (`show_me_how:settings.domain`)
2. Navigates to Settings → Domain (visible to the user — no silent navigation)
3. Highlights the relevant field with a callout
4. Optionally fills the value the user mentioned
5. Hands control back: *"You can confirm and save."*

This is not a help-doc. This is a tool that does the thing. Implementation-wise, it leverages the Cowork pattern (the same pattern this very tool uses to operate the user's screen): see the page, identify the target, perform the action, return control.

---

## Shay's Workshop (the deep context)

**What it is:** Shay's room. Themed as a workbench. When work moves here, the user sees it sitting on the bench, ready to be worked on. Tools that aren't worth surfacing in the inline experience are available here.

### Themes and zones

- **Workbench (center):** the active artifact sits here — the image being refined, the spec being analyzed, the build being planned
- **Tool rail (side):** Cowork-style pluggable sidebar of tools available for the current task. Reorderable, additive, tool-by-task discovery.
- **Chat thread (docked alongside the bench):** Shay is here, interacting with the conversation. Not isolated in a separate panel. The chat is the dialog about the work on the bench.
- **Job queue (bottom or collapsible drawer):** what's running, what's queued, what just finished
- **Result preview / outputs panel:** what just came out of the workshop

### What happens here (more than handoffs)

1. **Handoffs from Shay-Shay.** Work too big for inline arrives with full context via the handoff payload.
2. **Regular chat with Shay.** Ideation about new components, new apps, new features, new logs to capture. The Workshop is also where Shay and Fritz think out loud about what to build next.
3. **Gap recognition + capture.** Shay detects when a capability is missing and logs it (per the v1 gap-capture pattern). Three categories preserved: NOT_BUILT, NOT_CONNECTED, BROKEN. Naming the gap → frequency tracking → backlog promotion.
4. **Research and tool evaluation.** Shay actively researches new tools / MCPs / skills / frameworks that could improve Site Studio's capabilities, and surfaces findings for review. The Workshop is the natural home for "look what I found that might help us" conversations.
5. **The learning loop.** Every Workshop session feeds the memory layers (episodic → semantic → procedural). Outcomes are scored. Patterns are promoted. The Workshop is the surface where the learning loop is most visible to the user.

### Tooling within the Workshop (initial set + roadmap)

The tool rail is designed to grow. Below is the starting set and the planning order. Each tool is a Cowork-style sidebar item with its own panel. Tools register with the Workshop on load; the rail accommodates them.

**Phase 1 (build with the Workshop):**

- **Active job tracker** — what Shay is doing right now on the bench
- **Memory inspector** — what does Shay know? (episodic / semantic / procedural views)
- **Capability manifest viewer** — what can she actually do right now? (live status of every capability)
- **Brain selector** — which model is handling this? Switch on demand.

**Phase 2 (add as needs arise):**

- **MCP / Skill / Plugin marketplace browser** — browse, evaluate, install
- **Web research tool** — Bright Data MCP or equivalent, integrated
- **Code surgery** — open file, propose diff, apply (mediated by approval gate)
- **Job submitter** — queue work for later
- **Cost tracker** — live spend on the active task; cumulative for the session
- **Diff / preview pane** — see proposed changes before applying

**Phase 3 (when patterns demand them):**

- **Terminal pane** — for cheap local execution (subprocess, local LLM, etc.)
- **Gap log viewer** — review captured gaps, promote to backlog
- **Build backlog editor** — manage the human-approved work queue
- **Promotion log** — see what patterns Shay has promoted to semantic memory

**Tool registration contract** (proposed):

```js
ShayWorkshop.registerTool({
  id: 'memory-inspector',
  name: 'Memory',
  icon: '...',
  panel: () => <MemoryInspectorPanel />,
  appliesTo: ['handoff', 'chat', 'gap-capture'],
  costTier: 'free'
});
```

Tools declare what kinds of Workshop sessions they apply to. The rail filters dynamically.

### Surface footprint

Currently: a tab pane in the canvas tab bar. Future: TBD based on mockup review. Candidates:

- Stay-as-tab (current; lowest disruption)
- Side-by-side workspace (Workshop alongside Site Studio Chat)
- Takeover overlay (full focus when work demands it)

This decision is deferred to the mockup phase.

### Trigger model

The Workshop has three entry paths, all of equal status:

- **Handoff from Shay-Shay** (most common: "Take this to the Workshop")
- **Direct entry** via the rail icon (when the user knows they want the Workshop)
- **Auto-trigger on detected gap** (Shay says "I want to take this to the Workshop, OK?")

---

## The handoff (Shay-Shay → Workshop)

The handoff payload is the contract for one of three Workshop entry triggers. It's not the only way to enter the Workshop — but when work flows from Shay-Shay → Workshop, this is what travels with it.

### Payload schema

```json
{
  "handoff_id": "hf_2026-05-02_a3f9",
  "source_surface": "shay-shay",
  "destination_surface": "workshop",
  "originated_at": "2026-05-02T14:23:00Z",

  "source_page": {
    "studio": "media_studio",
    "page_id": "image_grid",
    "url": "/studios/media/image-grid"
  },

  "current_artifact": {
    "type": "image_set",
    "id": "img_set_2026-05-02_001",
    "items": [
      { "id": "img_001", "uri": "...", "prompt": "..." },
      { "id": "img_002", "uri": "...", "prompt": "..." }
    ],
    "selected": "img_002"
  },

  "user_intent": "regenerate with warmer sunset feel; current is too bright",

  "user_context": {
    "recent_actions": ["selected img_002", "clicked Compare", "asked Shay-Shay: which looks best"],
    "prior_attempts": 2,
    "frustration_signal": false
  },

  "success_criteria": [
    "image matches warm sunset description",
    "user approves in <= 3 attempts"
  ],

  "expected_outputs": [
    { "type": "image", "name": "final_image_uri" },
    { "type": "string", "name": "final_prompt" },
    { "type": "log", "name": "decision_log" }
  ],

  "follow_up_jobs": [
    { "type": "save_to_assets", "trigger": "on_user_approve" },
    { "type": "log_prompt_pattern", "trigger": "on_completion" }
  ],

  "return_path": {
    "to_surface": "shay-shay",
    "as_message": "Done. New image saved. Want to see it on the page?"
  }
}
```

### Contract guarantees

- **Shay-Shay never sends the Workshop less than this.** Unknown fields are `null`, never omitted.
- **The Workshop never asks the user something Shay-Shay already knew.** If `user_intent` is in the payload, the Workshop does not open with "what would you like me to do?"
- **Every Workshop session ends with a return message to Shay-Shay.** Even on failure — Shay-Shay needs to know so the next page-context interaction reflects what just happened.
- **Follow-up jobs are queued via the existing `lib/job-queue.js`.** Not a parallel queue.

### Where this lives in code

- Handoff schema: `site-studio/lib/shay/handoff-contract.js` (new)
- Shay-Shay → Workshop trigger: extend `studio-orb.js`
- Workshop receiver: new `site-studio/lib/shay/workshop-receiver.js`
- Return-path messenger: extend `studio-events.js`

---

## The page-context data model

This is what Shay-Shay needs in order to *see* the page she's on. Without it she's a chatbot with a fixed prompt — exactly the current state.

### Per-page context shape

```json
{
  "studio": "media_studio",
  "page_id": "image_grid",
  "page_title": "Generated Images",
  "captured_at": "2026-05-02T14:23:00Z",

  "visible_artifacts": [
    {
      "type": "image",
      "id": "img_001",
      "uri": "...",
      "metadata": { "prompt": "...", "generated_by": "imagen", "cost_usd": 0.004 },
      "user_state": { "selected": false, "approved": false, "dismissed": false }
    }
  ],

  "selected_item": "img_002",

  "recent_actions": [
    { "action": "selected", "target": "img_002", "at": "..." },
    { "action": "regenerated", "target": "img_001", "at": "..." }
  ],

  "pending_state": {
    "in_flight_requests": ["regen_002"],
    "blocked_on": null
  },

  "available_actions": [
    { "id": "regenerate",       "label": "Regenerate",        "applies_to": "image" },
    { "id": "refine_prompt",    "label": "Refine prompt",     "applies_to": "image" },
    { "id": "save_to_assets",   "label": "Save",              "applies_to": "image" },
    { "id": "compare",          "label": "Compare",           "applies_to": "image_set" },
    { "id": "take_to_workshop", "label": "Take to Workshop",  "applies_to": "any" }
  ]
}
```

### How pages declare context

Each Studio page registers a context provider with Shay-Shay on mount:

```js
ShayShay.registerContext({
  page_id: 'media_studio.image_grid',
  getContext: () => ({ /* current snapshot */ }),
  onAction: (action_id, payload) => { /* execute action */ }
});
```

Context is **pulled by Shay-Shay, not pushed by the page.** This means Shay always has fresh state when the user asks her something — no stale data.

### Migration plan (Media Studio first)

- **Step 1:** Implement the context registry on ONE Media Studio page (image grid)
- **Step 2:** Prove Shay-Shay can see + act on it (test: ask "which image is selected?" and "regenerate img_002")
- **Step 3:** Roll out to remaining Media Studio pages
- **Step 4:** Roll out to Site Studio pages
- **Step 5:** Document the pattern; new pages register on creation

### Where this lives in code

- Provider registry: `site-studio/lib/shay/context-registry.js` (new)
- Per-page registration: in each page's existing init code (small additions)
- Action executor: extend `studio-actions.js`

---

## Site Studio Chat (preserved)

The original chat stays. Different routing from Shay:

- **Owned by:** Site Studio (not Shay)
- **Routes to:** subscriptions, local LLMs, terminal capability — not just API calls
- **Use case:** cheap/quick build interactions; iteration on the build pipeline
- **Settings:** multiple options + per-tool configuration. Designed for low cost on simple tasks.

Shay sits *above* this chat, not as a replacement. The user can use the original chat for direct build commands; they ask Shay-Shay when they want intelligence, context, or routine help.

The two coexist with clear separation. Visual mockups will distinguish them so the user always knows which they're talking to.

**Future thought:** as routing options expand (subscriptions, local LLMs, terminal cap), the per-tool settings UI may grow large enough to warrant its own settings panel. Deferred — flagged for future thinking.

---

## The orb's 5 valid states

The original `ORB_STATE_MACHINE` rule (`.wolf/cerebrum.md`, 2026-04-20) documented 4 states. A 5th, `SHAY_THINKING`, was added in code but not in the contract. V2 makes it official.

| State | When | Visual cue (current placeholder) |
|---|---|---|
| `IDLE` | No active task | Slow gentle float |
| `BRIEF_PROGRESS` | Brief is being captured | Pulse rhythm |
| `BRAINSTORM_ACTIVE` | Brainstorm session in progress | Particle motion |
| `REVIEW_ACTIVE` | Reviewing a build / result | Steady glow |
| `SHAY_THINKING` | Active reasoning, mid-response | Concentrated motion (TBD on visual phase) |

State machine and transitions are managed by `setOrbState()` in `studio-orb.js`. **Direct writes to `#pip-dynamic-area` outside this function remain prohibited** (preserves the v1 rule).

---

## Migration from current state

The audit found 6 Shay surfaces, 3 composers, and 2 parallel naming systems. Consolidation:

| Current surface | Disposition |
|---|---|
| Star icon in left rail | **Keep** — primary entry to Shay-Shay |
| Sidebar pane "Open Shay Desk" CTA | **Remove** — Shay-Shay is always present; doesn't need a sidebar pane |
| Sidebar nav row labeled "Shay" | **Remove** — duplicate of rail button |
| Shay Desk full tab pane | **Repurpose** as Shay's Workshop (rename, restructure to tool rail + bench + chat) |
| Shay Lite floating shell, 3 identity modes | **Consolidate** to ONE Shay-Shay surface; identity modes become user prefs, not separate surfaces |
| Media-Studio Shay Dock × 6 | **Replace** with unified Shay-Shay registered as a context provider on those pages |

**Composer disposition:**

- `#chat-input` (Site Studio Chat) — keep
- `#shay-desk-input` (Workshop) — keep, rename `#shay-workshop-input`
- `#pip-direct-input` (Shay-Shay) — keep, rename `#shay-shay-input`

Three composers, three distinct contexts. The current confusion isn't the count — it's that they look similar and the user doesn't know which feeds which. Visual mockup phase makes the distinctions obvious.

**Naming retirement schedule:**

- `pip-*` (legacy) → retired over the next 2 sessions
- Replacement: `shay-shay-*` (light) and `shay-workshop-*` (deep)
- `data-pane="shay"` references update to be Workshop-specific or Shay-Shay-specific explicitly

---

## What's in scope for this proposal

- The two-surface model (Shay-Shay + Workshop) under one identity
- The handoff contract spec (one of three Workshop entry triggers)
- The page-context data model
- The Workshop tool rail architecture (Cowork-style, pluggable, additive)
- The migration path from 6 surfaces to 2
- The retirement schedule for legacy `pip-*` naming
- The official 5-state orb contract

## What's out of scope for this proposal

- The visual / character / personality redesign of the orb (Phase 4)
- The Workshop's surface treatment decision (mockup phase informs this)
- The brand color scheme (gold acknowledged as placeholder; redesign separately)
- The actual code implementation (this is the architecture, not the diff)
- The Site Studio Chat settings UI redesign (flagged for future thinking)

---

## How this doc relates to other docs

- **`shay-shay-architecture.md` (v1)** — superseded. On approval, v1 moves to `docs/archive/shay-shay-architecture-v1.md` and v2 takes its place as `shay-shay-architecture.md`.
- **`SHAY_CONTEXT.md`** — unchanged.
- **`site-studio/shay-shay/instructions.md`** — minor update needed: reference Shay-Shay + Workshop, the handoff contract, and the page-context model.
- **`SITE-LEARNINGS.md`** — gets an entry when the migration ships, not now.
- **`FAMTASTIC-STATE.md`** — gets a regenerate when the first migration phase ships.
- **`.wolf/cerebrum.md`** — `ORB_STATE_MACHINE` rule updated to 5 states on approval.

---

## The FAMtastic test

Does this architecture pass the FAMtastic test (Fearless deviation, Lego not puzzle, compounds)?

**Fearless deviation:** No production AI assistant ships with a real handoff contract between a peripheral surface and a focused workspace, AND a workshop where the assistant ideates with the user, captures gaps, and evaluates new tools. Most ship a chatbot in a corner. This is uncommon. ✅

**Lego not puzzle:** Tool rail is pluggable. New tools register; the rail accommodates them. Page-context providers register; Shay-Shay sees new pages without rewrites. Handoff payload routes to any focused workspace. Adding a new Studio is a config-and-register change, not a redesign. ✅

**Compounds:** Page-context capture + handoff contracts + Workshop sessions all feed the memory layers. Each Workshop session improves routing for future ones. Each Studio added makes Shay smarter at handoffs across all of them. The learning loop is wired through every entry path. ✅

---

*Proposal document: 2026-05-02*
*Next action: review proposal + visual mockups → approve → archive v1 → promote v2 → proceed to implementation phases.*
