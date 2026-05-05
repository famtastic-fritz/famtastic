# Memory Taxonomy

The canonical type + facet vocabulary for FAMtastic memory entries. Used by capture adapters to tag extracts, by the promoter to validate, by the retriever to filter, and by the Memory tab to render type tabs.

## Type (mutually exclusive — every entry has exactly one)

| Type | Glyph | Color | Definition | Promotion gate |
|---|---|---|---|---|
| `decision` | ◇ | indigo | We chose A over B with rationale; the decision is durable until reversed. | human |
| `rule` | ⊘ | red | A do or don't that the system honors as a hard constraint. | human |
| `learning` | 💡 | yellow | Observation that's true but not yet actionable. | human |
| `bug-pattern` | 🐛 | coral | A failure signature paired with its fix. | **auto-allowlist** |
| `gap` | △ | orange | Known incomplete thing. May convert to a task. | human |
| `preference` | ✦ | violet | User taste/style standard. | human |
| `vendor-fact` | 🏭 | slate | What a third-party API/tool actually does (often surprising). | **auto-allowlist** |
| `anti-pattern` | ⚠ | amber | Looks right but isn't; the inverse of a rule. | human |
| `do-not-repeat` | 🚫 | red | Codifies a past mistake as a hard avoid (special case of `rule`). | **auto-allowlist** |

## Facet (multi-tag, free-but-curated)

Facets describe what the entry is *about*. An entry can have any number. New facets are allowed but must be reviewed before becoming canonical.

### Domain facets

`platform`, `site-execution`, `deploy`, `ui-shell`, `ledgers`, `agents`, `ops`, `shay-shay`, `governance`, `cost`, `security`, `media`, `research`, `capture`, `memory`

### Vendor facets

`vendor:netlify`, `vendor:godaddy`, `vendor:cpanel`, `vendor:resend`, `vendor:openai`, `vendor:anthropic`, `vendor:gemini`, `vendor:adobe`, `vendor:figma`, `vendor:github`, `vendor:stripe`

### Workspace facets

`workspace:build`, `workspace:plan`, `workspace:components`, `workspace:media`, `workspace:research`, `workspace:deploy`, `workspace:ops`

### Site facets

Use the canonical site tag: `site:mbsh-reunion`, `site:auntie-gale-garage-sales`, etc.

### Surface facets

`surface:claude-code`, `surface:cowork`, `surface:codex`, `surface:cli`, `surface:browser`

## Auto-promote allowlist

A capture extract auto-promotes (bypasses the human review gate) when **all** of:

1. `confidence >= 0.85`
2. `type` is in: `vendor-fact`, `do-not-repeat`, `bug-pattern`
3. `canonical_id` does not already exist (auto-promote never overwrites)
4. The capture passed at least one round of the adversarial review loop (if enabled)

Auto-promotions are flagged in `memory/usage.jsonl` as `event: auto_promoted` and surfaced in the next weekly digest for retroactive human review.

## Lifecycle

| State | Meaning | Surfaced to Shay? |
|---|---|---|
| `candidate` | Pattern seen 3+ times by digest, not yet human-promoted | as soft hint |
| `active` | Approved canonical entry | yes — `rule` and `do-not-repeat` enforced as hard constraints |
| `stale` | No `surfaced` event in 60d (digest flag, not auto-applied) | yes, with stale badge |
| `retired` | Manually retired; kept for history | no |
| `superseded` | Replaced by a newer entry; `references` points to successor | no |

## Confidence

A 0–1 score reflecting how strongly the source supports the claim.

| Range | Meaning |
|---|---|
| 0.95–1.0 | Direct quote / explicit decision in transcript |
| 0.85–0.94 | Strong implication, multiple corroborating signals |
| 0.7–0.84 | Reasonable inference; needs review before promotion |
| < 0.7 | Speculative; surface as discussion point, not entry |

Adapters compute confidence; the promoter uses it for the auto-promote gate.

## ID format

`<type>/<kebab-case-slug>`

Examples:
- `vendor-fact/netlify-cannot-link-git-via-api`
- `rule/sites-never-commit-to-studio-history`
- `decision/site-promotion-single-netlify-project`
- `do-not-repeat/never-mix-process-env-site-tag-with-tag`
- `bug-pattern/cowork-handshake-silent-failure`

The slug should be human-readable and stable. Renames create a `superseded` entry pointing to the new id.

## Schema version

Current: **0.2.0**. All new captures + promotions emit this version.

v0.1 (implicit, what `capture-insights.js` produces today) is migrated on read by the promoter.
