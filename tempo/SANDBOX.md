# SANDBOX

This folder (`tempo/`) is a fully self-contained sandbox.

## Isolation guarantees
- **Nothing outside this folder is modified** by the app or its build process.
- All source, data, tests, and docs live under `tempo/`.
- The app stores its data in `tempo/data/` (a local JSON file). It never reads
  or writes anything outside this directory.
- **Zero runtime dependencies.** The app uses only the Node.js standard library
  (`http`, `fs`, `path`, `node:test`). There is no `npm install` step, no
  network access required, and no `node_modules/`.

## Reconciliation note
The autonomous-build brief asked for "its own git repo." The delivery harness
for this session requires committing to an existing feature branch of the
parent repository (`claude/autonomous-app-builder-2srry7`). To honor both, the
app is kept entirely inside this isolated folder but is version-controlled as a
subdirectory of the parent repo rather than as a separate nested `.git`. A
nested repo would have prevented pushing to the required remote/branch.
Isolation of *files* (nothing outside `tempo/` is touched) is fully preserved.
