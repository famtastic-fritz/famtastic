# Track 1 Review Patch — Multicultural South Florida Market Lane

_Date: 2026-06-11_

## Context

During Track 1 review, the plan treated Spanish-language outreach as a Phase 2 cleanup item: tag Spanish-first leads and revisit later. Fritz pushed back and identified a stronger strategic opportunity:

- South Florida has a large Spanish-speaking population.
- Fritz is Haitian, which creates authentic cultural connection and insight.
- Haitian churches, Haitian-owned businesses, Caribbean ministries, and immigrant community organizations may be an underserved market.
- This may be a better FAMtastic lane than copying the same generic YouTube agency targets.

## Decision

Upgrade this from a cleanup item to a strategic campaign consideration.

Do **not** make full multilingual outreach a launch-blocker, but do not ignore it either.

Add a multicultural market lane to the campaign logic:

```text
Multicultural South Florida Lane
- Spanish-speaking prospects
- Haitian / Haitian Creole (Kreyòl) prospects
- Caribbean churches and ministries
- immigrant-owned local businesses
- community nonprofits
- professional services serving immigrant communities
```

## Recommended Patch

### campaigns.md

Add fields to every campaign config:

```text
language_profile:
  - english_default
  - spanish_candidate
  - haitian_creole_candidate
  - bilingual_candidate
  - multicultural_relevance_score
```

Add a new shared lead signal:

```text
multicultural_market_fit
```

Signals that can raise it:

- Spanish-language website/Facebook posts.
- Haitian Creole / French / Haitian community references.
- Church names indicating Haitian, Caribbean, Latino, Iglesia, Ministerio, Eglise, Tabernacle, Mission, etc.
- Service area in Miami-Dade, Broward, Palm Beach, Treasure Coast.
- Business serving immigrant communities.
- Events, ministries, or community services aimed at Haitian, Caribbean, Latino, or immigrant audiences.

### workflow impact

WF-03 Presence Scan should detect language/community signals and write them as facts, not assumptions.

WF-04 Lead Scoring should include multicultural fit as a scoring dimension.

WF-08 Outreach Send should not automatically translate outreach until the language lane is approved and reviewed.

### v1 rule

```text
English outreach remains default for Sprint Day 1.
Spanish/Haitian Creole are not launch-blocking.
But every lead should be tagged for language/community opportunity from the start.
```

### controlled pilot

After the first English proof batch, run a controlled pilot:

```text
Pilot A: 10 Haitian / Caribbean church or ministry leads
Pilot B: 10 Spanish-speaking church or local business leads
```

Use bilingual/multicultural framing, but do not send machine-translated messages without review.

## Authenticity Rule

FAMtastic should not fake cultural fluency.

For Haitian / Creole / Spanish outreach:

- English-first is acceptable when unsure.
- Bilingual subject lines may be tested later.
- Machine translation must be reviewed before use.
- Cultural references must be grounded in observed facts.
- Haitian/Caribbean outreach should use Fritz's authentic connection, not generic diversity language.

## Why This Matters

This creates a differentiated South Florida strategy:

```text
Generic agency lane:
barbers, landscapers, cleaners

FAMtastic lane:
churches, nonprofits, Haitian/Caribbean communities, Spanish-speaking businesses,
immigrant-owned businesses, professional services, and community organizations
```

This aligns with the FAMtastic definition: standing apart on purpose and manifesting the extraordinary from the ordinary.

## Suggested Doc Updates

Patch these files after review:

- `docs/famtastic-designs/campaigns.md`
- `docs/famtastic-designs/workflows.md`
- `docs/famtastic-designs/roadmap.md`
- `docs/famtastic-designs/review-packet-2026-06-11.md`

## Review Severity

Priority: **P1 strategic patch**

Not launch-blocking, but should be included before the first major campaign scale decision.
