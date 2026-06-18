# NCS7 — Docker + real database proof

Captured 2026-06-18T17:24:46Z from the running container (`docker compose up --build`).

```
# storage mode + boot
[ncs7-cms] storage: SQLite (/app/cms/data/cms.db)
[ncs7-cms] seed content.json created from frontend/content.json
[ncs7-cms] seed products.json created (6 products)
[ncs7-cms] seed templates.json created (2 templates)
[ncs7-cms] seed pages.json created (1 example page)
[ncs7-cms] NCS7 CMS running at http://localhost:4178
[ncs7-cms] storage: SQLite (/app/cms/data/cms.db)
[ncs7-cms] NCS7 CMS running at http://localhost:4178

# endpoints
GET / -> 200
GET /api/content -> 200
GET /admin -> 200
GET /cad3d/ -> 200

# created a product via the backend, then RESTARTED the container:
products in SQLite after restart: 7 (DCK-1 persisted: true)
```

Result: the CMS persists to a real SQLite database in the `ncs7-db` volume;
data survives container restarts. GitHub Pages cannot do this (static only) —
see DOCKER.md.
