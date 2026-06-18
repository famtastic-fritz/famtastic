# NCS7 — CMS Backend Proof (live transcript)

> Captured by running the CMS server (`node cms/server.js`) and exercising every
> API. Pure Node built-ins, no external deps. Re-run: `node assets/ncs7/cms/server.js`
> then replay these requests. Generated 2026-06-18T10:51:58Z.

## Server start
```
  [ncs7-cms] NCS7 CMS running at http://localhost:4181
  [ncs7-cms]   Frontend:  http://localhost:4181/
  [ncs7-cms]   Admin:     http://localhost:4181/admin
  [ncs7-cms]   API:       http://localhost:4181/api/content
```

## 1. Login (stub auth)
```
POST /api/login {"username":"demo","password":"x"}
{
  "ok": true,
  "token": "demo-token",
  "stub": true
}
```

## 2. Public content API (drives the React site)
```
GET /api/content (summary)
site: National CAD Standard | United States · Version 7
nav: Home | About | NCS Content | Order | Downloads & FAQ | Contact
products(6): NCS-ADM Foreword & Administration; NCS-AIA AIA CAD Layer Guidelines; NCS-UDS Uniform Drawing System (8 Modules); NCS-BIM BIM Implementation; NCS-PLOT Plotting Guidelines; NCS-APX Appendixes & Data Files
```

## 3. Products — list, create, update, delete (CRUD)
```
GET /api/products -> count
6 products
POST /api/products (create)
created id: prod-mqjdrc8d-ezvfm
PUT /api/products/prod-mqjdrc8d-ezvfm (update price->99)
  http 200
DELETE /api/products/prod-mqjdrc8d-ezvfm
  http 200
GET /api/products -> count (back to baseline)
6 products
```

## 4. Page templates -> create a page from a template
```
GET /api/templates
tpl-standard-content: Standard Content Page
tpl-landing: Landing Page
POST /api/pages/from-template (tpl-standard-content)
created page id: page-mqjdrcdf-dezhi | slug: proof-page | blocks: 4
DELETE /api/pages/page-mqjdrcdf-dezhi (cleanup)
  http 200
```

## 5. AI CMS tutor (offline retrieval over knowledge base)
```
POST /api/tutor {"question":"how do I create a page from a template"}
  -> Here's the full step-by-step:
POST /api/tutor {"question":"how do I add a product"}
  -> Products are your CAD standard PDFs for sale. To add one:
POST /api/tutor {"question":"how do I publish a page"}
  -> Publishing makes a page visible to visitors. Unpublishing hides it again.
```

## Result
All endpoints respond correctly: stub login, content API mirrors the frontend,
full product CRUD, template-driven page creation, and offline tutor retrieval —
with zero external dependencies.
