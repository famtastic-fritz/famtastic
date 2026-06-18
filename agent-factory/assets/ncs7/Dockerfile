# NCS7 demo — full stack in one container: React frontend + Node CMS + SQLite DB
# + AI tutor + 3D CAD viewer. No external npm dependencies (Node 22 built-ins only).
FROM node:22-alpine

WORKDIR /app
COPY . /app

# Persist the database across container restarts.
VOLUME ["/app/cms/data"]

ENV NODE_ENV=production \
    PORT=4178 \
    DB_DRIVER=sqlite

EXPOSE 4178

# Simple healthcheck against the content API.
HEALTHCHECK --interval=30s --timeout=4s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:4178/api/content >/dev/null 2>&1 || exit 1

CMD ["node", "cms/server.js"]
