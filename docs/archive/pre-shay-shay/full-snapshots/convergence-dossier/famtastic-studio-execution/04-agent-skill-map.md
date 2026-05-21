# FAMtastic Studio Intelligence Run - Agent Skill Map

**Status:** complete
**Purpose:** Map required agent roles and skills to Studio layers, proof expectations, and stop rules.

## Core Orchestrator

**Role:** Medium-brain orchestrator
**Owns:** Run plan, delegation, stop/continue decisions, cost threshold, ledger updates.
**Layer:** Control Layer.
**Proof:** Run ledger, pass closeouts, updated coverage matrix.
**Stops when:** cost over $50, destructive/secret/DNS/payment action, same failure twice, missing proof, scope drift.

## Research Strategist

**Owns:** Competitive scan, source map, evidence scoring, question bank.
**Layer:** Intelligence Layer.
**Skills:** source ranking, provenance, gap discovery.
**Proof:** source IDs, source confidence, research summary, contradictions logged.
**Output:** Intelligence Brief, Opportunity Map, Research Screen state.

## Recipe Architect

**Owns:** Dynamic recipe resolution, similarity scoring, module compatibility, capability binding.
**Layer:** Intelligence + Control.
**Skills:** recipe fingerprinting, registry lookup, V1/V2 classification.
**Proof:** selected recipe, rejected alternatives, reason code, capability requirements.

## Prompt Strategist

**Owns:** Prompt objects, prompt-to-asset lineage, negative constraints, regeneration critique.
**Layer:** Intelligence + Creation.
**Skills:** research-to-prompt translation, asset prompt QA, variant strategy.
**Proof:** prompt object with research basis and slot target.

## Media Director

**Owns:** Media Library, generated variants, cleanup/compression, mobile crops, usage tracking.
**Layer:** Creation.
**Skills:** image QA, alpha checks, format optimization, asset lifecycle.
**Proof:** approved asset object, QA results, fallback asset.

## Component Architect

**Owns:** Component Studio lifecycle, slot compatibility, component metadata, installer contract.
**Layer:** Creation.
**Skills:** component contract design, sandbox review, slot injection planning.
**Proof:** component metadata, sandbox preview, QA gate results, install plan.

## Build Runner

**Owns:** Controlled build passes, local commands, branch state, test/lint/build attempts.
**Layer:** Control + Creation.
**Skills:** safe mutation, targeted QA, rollback preparation.
**Proof:** commands run, files changed, test output, failure log.

## QA Critic

**Owns:** QA gates, visual/mobile/accessibility/performance/proof review.
**Layer:** Control.
**Skills:** defect classification, launch readiness, regression detection.
**Proof:** QA Board entries and pass/fail evidence.

## Deploy Manager

**Owns:** deploy readiness, provider status, DNS/domain proof, rollback note.
**Layer:** Control.
**Skills:** Netlify/GitHub/provider verification, smoke tests.
**Proof:** deploy URL, smoke results, provider health, rollback path.

## Security / Capability Auditor

**Owns:** Capability Truth, secret exposure, production artifact checks, source map/debug checks.
**Layer:** Control.
**Skills:** security gate design, secret scanning, provider probe interpretation.
**Proof:** capability status records and deploy blockers/non-blockers.

## Learning Curator

**Owns:** closeout learning, registry nomination, V1/V2 classification, training/readback.
**Layer:** Intelligence + Guide.
**Skills:** extracting durable lessons, avoiding duplicate patterns, writing training modules.
**Proof:** learning candidates, registry nominations, readback checklist.

## Shay Guide

**Owns:** Explain run state, summarize blockers, ask only necessary questions, route handoffs.
**Layer:** Guide.
**Skills:** operator briefing, task explanation, memory candidates, next-action clarity.
**Proof:** Shay readback with source links, proof links, decisions needed.

## Mapping Summary

| Studio layer | Primary roles | Required proof |
| --- | --- | --- |
| Intelligence | Research Strategist, Recipe Architect, Prompt Strategist, Learning Curator | Source map, recipe decision, prompt objects, learning candidates |
| Control | Orchestrator, Build Runner, QA Critic, Deploy Manager, Security Auditor | Run ledger, trace, capability probes, QA results, cost gates |
| Creation | Media Director, Component Architect, Build Runner | asset registry, component metadata, slot install proof |
| Guide | Shay Guide, Learning Curator | readback, handoff, training/checklists |
