# Server Modularization Proof - Initial Setup Inspection

**Status:** complete for research phase  
**Date:** 2026-05-08

## Setup Checks Attempted

| Check | Result |
| --- | --- |
| Locate package files | Found `package.json`, `site-studio/package.json`, `mcp-server/package.json` |
| Locate test config | Found `site-studio/vitest.config.js` |
| Inspect Studio scripts | Found `start`, `dev`, `studio`, `test`, `test:watch` |
| Count server lines | `site-studio/server.js` = 20,150 lines; `mcp-server/server.js` = 505 lines |
| Scan route/function markers | Confirmed mixed responsibilities in `site-studio/server.js` |

## No Paid / Risky Actions

No installs, cloud calls, deploys, or provider API calls were executed. The setup pass stayed local and read-only except for writing research artifacts.

## Proof Summary

The scan proves that server modularization is a V1 technical foundation track. The current file is not just large; it concentrates unrelated domains that future agents are likely to touch concurrently.

## Next Proof Needed

Before the first extraction:

1. Capture baseline app-start command output.
2. Capture baseline route smoke checks.
3. Capture WebSocket connect proof if applicable.
4. Extract one low-risk helper module.
5. Rerun the same checks.

