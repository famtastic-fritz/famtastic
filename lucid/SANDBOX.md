# SANDBOX

This folder (`lucid/`) is a self-contained sandbox app.

- **Behaviorally isolated:** nothing outside `lucid/` is created, modified, or
  deleted by the app at runtime. All app data lives in `data/dreams.json` inside
  this folder.
- **Tracked on the feature branch:** unlike a throwaway local sandbox, `lucid/`
  is committed to the repo so it persists across cloud/ephemeral containers and
  can be pulled to any machine. (An earlier build kept it as a private nested
  git repo and it was lost when the container was reclaimed — lesson learned.)
- **No network, no paid services, no real credentials** are required to run.
  External AI / speech calls are stubbed behind clean interfaces and only
  activate if you add your own keys to `.env` later (see `SETUP.md`).

Zero npm dependencies. Pure Node.js standard library. One command to run:
`npm start`.
