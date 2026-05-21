# Decision Log: Wave 4 Mission Control Observability

## Decision 1 — Reader-only Mission Control

Status: accepted

Mission Control will remain a deterministic reader over Data Center and existing proof/capture outputs for this wave. It will not introduce a second knowledge store or alter raw capture inbox files.

## Decision 2 — CLI before UI

Status: accepted

The first useful observability slice ships as a library plus CLI report. A later Desktop/Mission Control cockpit can consume the same `buildMissionControlSnapshot()` object without changing the Data Center canonical model.

## Decision 3 — Staleness as projection metadata

Status: accepted

Stale/blocked status is computed in the reader from existing timestamps/status fields and a configurable `staleAfterHours` threshold. The reader does not write derived stale flags back into Data Center records.
