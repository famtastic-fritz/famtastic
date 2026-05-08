# FAMtastic Component Studio Lifecycle

**Status:** planning/spec only  
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)  
**Purpose:** define Component Studio, Component Library, and Component Installer.

## A. Definitions

### Component Studio

Where components are created, edited, previewed, tested, and proofed.

### Component Library

Where approved reusable components live.

### Component Installer

The system that installs approved components into site/page slots.

## B. Lifecycle

```text
local component
-> candidate
-> sandboxed
-> proofed
-> approved
-> library component
-> installed component
```

## C. Component Metadata

Every component needs:

- id
- name
- type
- version
- status
- owner workspace
- allowed slots
- required props/data
- required assets
- dependencies
- variants
- responsive behavior
- accessibility notes
- QA gates
- proof links
- install method
- fallback component
- usage history

## D. Sandbox-First Review

Risky visual/component systems should be built in sandbox first, reviewed, then propagated.

Sandbox-first is required when:

- the component changes navigation
- the component changes main visual language
- the component affects every page
- the component introduces animation or runtime behavior
- the component has mobile layout risk
- the component replaces an existing proven component

## E. Promotion Rules

Components do not enter the library without:

- proof
- QA
- approval
- usage metadata
- fallback strategy

Promotion records:

- source project
- proof links
- rejected alternatives
- known limits
- reusable pattern justification

## F. Integration With Build Mutation System

Component Studio creates/tests. Component Library stores/reuses. Component Installer injects.

The Build Mutation system decides when a request should use:

- component replacement
- component variant
- slot injection
- layout restructure
- new component creation

## G. Examples

- Final Reel Footer
- Where-Next Reel Rail
- Harry Info Slide
- Site Assistant Bubble
- RSVP Form Block
- Archival Filmstrip
- Spotify Embed

## Status Vocabulary

- local
- candidate
- sandboxed
- proofed
- approved
- library
- installed
- deprecated

## Must Not Drift

- Do not use Component Studio as a loose design playground without proof.
- Do not put unproofed components in the Component Library.
- Do not install components without slot compatibility.
- Do not confuse public Site Assistant components with Shay.
- Do not skip fallback strategy for reusable components.

## Acceptance Criteria

- Component Studio, Library, and Installer have separate roles.
- Lifecycle states are explicit.
- Promotion requires proof and QA.
- Examples from MBSH map cleanly into the lifecycle.

## Not Yet / Out Of Scope

- No component code.
- No Component Studio UI.
- No installer implementation.
- No registry updates.
