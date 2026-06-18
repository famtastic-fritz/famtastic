# SETUP

Tempo is intentionally dependency-free, so setup is trivial.

## Prerequisites
- Node.js 18 or newer (`node --version`).

## Install
No install required. There are **no third-party packages**, no `npm install`,
and no `node_modules/`. `npm start` and `npm test` work immediately after
cloning.

## Run
```bash
cd tempo
npm start          # serves http://localhost:4321
PORT=8080 npm start  # custom port
```

## Data
- Stored at `tempo/data/tempo.json`, created automatically on first write.
- Delete that file to reset all tasks and sessions.
- The file is git-ignored so your personal data is never committed.

## Credentials / external services
**None.** Tempo uses no API keys, no databases, no cloud services, and makes
no outbound network calls. There is nothing to stub and no secret to provide.

If you later add an integration that needs a key (e.g. calendar sync), the
convention would be: read it from an environment variable, document it here,
and fall back to a local-only no-op when the key is absent — so the app still
runs with zero credentials.
