# Reporting Density

FAMTastic response/reporting density is configurable at
`config/reporting-preferences.json`.

## Default

The default is `compact`.

Use this shape unless Fritz asks for more detail:

```text
Done. X changed. Y remains blocked. Commit/proof: Z.
```

## Densities

- `compact` — normal completion/status response. Keep it short.
- `standard` — use when a few files, tests, or blockers need to be named.
- `detail` — use only for explicit review, audit, incident/debug, root-cause,
  or "show me everything" requests.

## CLI

```bash
fam-hub report style
fam-hub report style compact
fam-hub report style standard
fam-hub report style detail
```

## Rule

The density controls the final response and status reporting. It does not
lower proof standards, skip tests, or hide blockers.
