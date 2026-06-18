# Running NCS7 locally in Docker (full backend + database)

This runs the **entire stack in one container** — the React 3D front-end, the
Node CMS backend, the admin UI, the AI tutor, the 3D viewer, and a real
**SQLite database** — so you can test the backend without installing Node or
running anything by hand.

## Run it
```bash
cd agent-factory/assets/ncs7
docker compose up --build
```
Then open:
- **Site:**  http://localhost:4178/
- **Admin (CMS):**  http://localhost:4178/admin   (login: any username/password)
- **API:**  http://localhost:4178/api/content
- **3D viewer:**  in-app at `#/viewer`, or http://localhost:4178/cad3d/

Stop with `Ctrl+C`; `docker compose down` to remove the container (the database
volume `ncs7-db` is kept). `docker compose down -v` also deletes the database.

## The database
- The container runs with `DB_DRIVER=sqlite`, so the CMS persists to a real
  SQLite file at `/app/cms/data/cms.db`, stored in the named volume `ncs7-db`
  (survives restarts).
- Inspect it live:
  ```bash
  docker compose exec ncs7 sh -lc 'ls -la /app/cms/data && \
    node -e "const{DatabaseSync}=require(\"node:sqlite\");\
    const db=new DatabaseSync(\"/app/cms/data/cms.db\");\
    console.log(db.prepare(\"select k,length(v) bytes from store\").all())"'
  ```
- Tables: a single `store(k TEXT PRIMARY KEY, v TEXT)` holding `content.json`,
  `products.json`, `pages.json`, `templates.json` (each a JSON document). Create
  a product or a page in the admin, then re-run the inspect command — you'll see
  it persisted.
- Prefer flat files? Set `DB_DRIVER=json` in `docker-compose.yml`.

## "If we put it on GitHub Pages, how do we test the DB?"
You can't — and that's expected. **GitHub Pages is static hosting only**: it
serves HTML/JS/CSS and cannot run Node or a database. On Pages the site still
works, but the "backend" runs as an in-browser localStorage mock (fine for a
visual demo, not a real DB test).

To test the **real** backend + database you need a running server — which is
exactly what this Docker container is for. Path to production later:
1. Local: `docker compose up` (this).
2. Any container host (Fly.io, Render, Railway, a VPS, ECS): push this image.
3. Swap SQLite for Postgres when you need multi-instance — the data layer is
   isolated to three helpers in `cms/server.js` (`readJsonSafe`/`writeJson`/
   `fileExists`), so adding a Postgres adapter is a contained change.

## Moving this to your own repo
`agent-factory/assets/ncs7/` is self-contained (it has its own `package.json`,
`Dockerfile`, and `docker-compose.yml`). Copy that folder to a new repo and it
runs as-is:
```bash
cp -r agent-factory/assets/ncs7  ~/ncs7 && cd ~/ncs7 && docker compose up --build
```
