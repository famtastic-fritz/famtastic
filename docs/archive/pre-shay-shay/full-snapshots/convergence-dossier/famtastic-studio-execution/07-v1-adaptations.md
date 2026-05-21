# FAMtastic Studio Intelligence Run - V1 Adaptations

**Status:** complete
**Purpose:** Identify what should influence the first implementation slice after the Studio redesign specs are reviewed.

## V1 Adaptation 1: Intelligence Brief Before Build

Create the minimum product path for a build to begin with:

- enhanced brief
- research depth
- opportunity summary
- target user
- positioning
- source map
- open questions
- recipe fingerprint

This is required before MBSH V2 refinement or shipping-company full build tests.

## V1 Adaptation 2: Capability Truth Layer

Before autonomous build actions, Studio must know what is working:

- local build/test commands
- image generation lane
- provider API keys
- Netlify/GitHub/deploy status
- DB/email capability
- cost tier
- approval requirement
- last proof

Declared config is not enough.

## V1 Adaptation 3: Run Ledger and Pass Closeouts

Every serious run needs:

- objective
- plan
- current pass
- stop/continue conditions
- proof
- blockers/non-blockers
- "fixed / added / proved" closeout

This directly addresses plan confusion and "what did that prove?"

## V1 Adaptation 4: Media Library as Active Registry

Even before full Media Studio, approved assets need:

- prompt object ID
- source/provider
- variants
- allowed slots
- cleanup/compression/mobile crop QA
- fallback
- usage locations

## V1 Adaptation 5: Component/Slot Mutation Protocol

Implementers should not rewrite pages when a slot replacement is enough.

Minimum V1 behavior:

- classify change
- locate slot/component
- check registry
- choose smallest safe mutation
- run targeted QA
- record reusable learning

## V1 Adaptation 6: Server Responsibility Map

Before adding major backend behavior to `site-studio/server.js`, produce:

- responsibility map
- extraction order
- smoke proof per extraction
- route/service/module ownership

The local scan found `site-studio/server.js` at 20,150 lines with mixed concerns. This is V1 foundation work, not cleanup polish.

## V1 Adaptation 7: Shay Findable Domain

Shay must have visible Studio presence:

- Shay Home/Domain
- Shay Bubble
- Shay Desk
- Shay Tasks/Memory/Training/Skills/Handoffs/Settings

Do not reduce Shay to a floating widget.

## V1 Adaptation 8: Cost Gate

Cheap/local lane is default. Anything projected above $50 must stop for Fritz approval.

## V1 Adaptation 9: Deploy Proof Gate

Before production deploy:

- provider capability proof
- secret scan proof
- sourcemap/debug artifact check
- smoke result
- rollback path
- production approval

## Recommended First Implementation Slice

After spec review, implement the smallest slice that proves the loop:

1. Intelligence Brief object/view.
2. Run Ledger object/view.
3. Capability Truth probe records.
4. Pass closeout packet.
5. Learning candidate capture.
