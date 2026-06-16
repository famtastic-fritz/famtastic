# FAMtastic Studio Intelligence Run - Proof and Checklist System

**Status:** complete  
**Purpose:** Define proof requirements that make autonomous execution trustworthy.

## Proof Principle

FAMtastic does not mark work done because an agent says it is done. Work is done when the relevant proof exists, the stop conditions did not trigger, and the closeout explains what changed, what is still open, and what was learned.

## Universal Proof Packet

Every serious pass should emit:

- pass id
- objective
- branch/commit
- files changed or docs created
- commands run
- outputs/results
- screenshots or logs when relevant
- capability probes used
- cost estimate/actual if applicable
- decisions made
- blockers
- non-blockers
- fallback used
- learning candidates
- next action

## Research Proof Checklist

- Source map exists.
- Every major claim has source ID or is marked as inference.
- Source type and confidence are recorded.
- Competing/conflicting evidence is surfaced.
- Findings are mapped to Studio layers.
- V1/V2 classification exists.
- Shay readback can summarize research in plain English.

## Recipe Proof Checklist

- Enhanced brief exists.
- Recipe fingerprint exists.
- Existing recipe lookup performed.
- Similarity score recorded.
- Reuse/extend/hybrid/new/deprecate decision recorded.
- Capability requirements mapped.
- QA gates bound.
- Decision log updated.

## Media Proof Checklist

- Prompt object exists.
- Research basis recorded.
- Generated variants listed.
- Cleanup/compression status recorded.
- Mobile crop checked.
- Accessibility/contrast relevance checked when used behind text.
- Allowed slots recorded.
- Usage locations recorded.
- Fallback asset recorded.

## Component Proof Checklist

- Component metadata exists.
- Allowed slots declared.
- Required data/assets/dependencies declared.
- Sandbox preview exists for risky visual systems.
- QA gates pass.
- Fallback component exists.
- Installer path documented.
- Usage history updated.

## Build Run Proof Checklist

- Full-run plan exists before serious execution.
- Stop/continue rules declared.
- Run ledger updated.
- Build trace includes commands/prompts/files/tests.
- Coverage matrix updated.
- Failures retried or logged.
- Cost threshold checked.
- Pass closeout written.

## Deploy Proof Checklist

- Capability Truth says provider is working or lists blocker.
- Secrets are vault/config references, not raw committed values.
- Production source maps/debug artifacts checked.
- Build/test/smoke result recorded.
- Domain/API URL proof recorded.
- Rollback plan exists.
- Production deploy approval exists.

## Security Proof Checklist

- Secret scan/push protection not bypassed silently.
- Source maps/debug artifacts reviewed before production.
- Public assets checked for unintended sensitive info.
- External tool actions scoped.
- Package/install actions logged.
- Destructive, DNS, payment, or secret actions route to Approval Center.

## Learning Proof Checklist

- What this fixed/added/proved is stated.
- Reusable patterns nominated.
- Duplicate registry check performed.
- V1/V2 backlog classified.
- Training/readback module updated or deferred.

