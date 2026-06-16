# Slice 1 Execution Substrate

**Status:** Slice 1 setup pass complete  
**Purpose:** Define the repo-native object contracts and fixtures that let future Studio slices continue toward MBSH V2 proof-readiness without stopping for Fritz approval unless a hard blocker occurs.

This folder is planning/runtime contract work only. It does not implement Studio UI, server behavior, MBSH V2, the shipping company site, or logo/site work.

## Contracts

- `intelligence-brief.contract.json`
- `recipe-decision.contract.json`
- `capability-truth.contract.json`
- `run-ledger.contract.json`
- `proof-packet.contract.json`
- `learning-candidate.contract.json`

Each contract defines:

- purpose
- required fields
- optional fields
- allowed status values where relevant
- relationship to Studio layer
- relationship to agent role
- proof/validation expectations
- example fixture path

## Fixtures

The fixtures model a realistic FAMtastic Studio path toward MBSH V2 proof-readiness:

- `fixtures/intelligence-brief.example.json`
- `fixtures/recipe-decision.example.json`
- `fixtures/capability-truth.example.json`
- `fixtures/run-ledger.example.json`
- `fixtures/proof-packet.example.json`
- `fixtures/learning-candidate.example.json`

## Slice 1 Boundary

Slice 1 creates contracts and fixtures only. It must not:

- modify UI files
- modify `site-studio/server.js`
- start MBSH V2 implementation
- start shipping company site work
- start logo/site work
- run paid/cloud actions
- touch unrelated `.wolf/anatomy.md`

## Continuation Rule

Future slices should continue automatically when validation passes, proof is recorded, cost remains under `$50`, and no hard blocker appears.

