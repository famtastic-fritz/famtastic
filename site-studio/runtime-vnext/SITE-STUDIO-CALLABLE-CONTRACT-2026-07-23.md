Title: Site Studio callable contract packet
Purpose: Freeze the external callable contract for Site Studio so other systems can use it safely while internal decomposition continues.
Goal: Define the exact request gates, payload shapes, response schema, artifact paths, and failure modes for the live runtime-vnext build endpoints.
Status: complete
Started: 2026-07-23

Endpoints:

1. POST /api/vnext-build
Purpose:
- Accept a caller-supplied build request and run the runtime-vnext deterministic build pipeline.

Request gate:
- Required header: Origin must start with one of:
  - http://localhost:3334
  - http://127.0.0.1:3334
- Without an allowed Origin/Referer on a mutating request, the server returns:
  - 403 {"error":"Cross-origin request blocked"}
- This gate is enforced by the global CSRF middleware in server.js before route handling.

Accepted body shapes:
- Canonical body (passes through unchanged when it has top-level site_tag and business)
- Legacy flat body (normalized by runtime-vnext/legacy-compat.js)

Minimal legacy-compatible request that is proven live:
```json
{
  "siteTag": "eta-probe",
  "siteName": "ETA Probe",
  "industry": "Testing",
  "description": "Baseline verification request for runtime-vnext contract.",
  "audience": "Internal QA",
  "cta": "Verify build path",
  "mood": "professional",
  "about": "Baseline verification request for runtime-vnext contract.",
  "pages": ["home"]
}
```

Canonical request shape:
```json
{
  "site_tag": "site-tag",
  "site_type": "single-page or multi-page",
  "architecture_preference": "single-page or multi-page",
  "architecture_constraints": {
    "required_pages": ["services", "about", "contact"],
    "rejected_patterns": []
  },
  "business": {
    "name": "Business Name",
    "industry": "Industry",
    "description": "What the business does",
    "location": "City or region",
    "public_contact": "Public phone/email/contact",
    "tagline": "Optional tagline"
  },
  "brand": {
    "mood": "professional",
    "color_hint": null,
    "typography": null
  },
  "content_inputs": {
    "services": [],
    "testimonials": [],
    "team_members": [],
    "about_text": ""
  },
  "positioning": {
    "target_audience": "Ideal customer",
    "desired_outcome": "Primary CTA or desired action",
    "differentiators": []
  },
  "deploy": {
    "staging_deploy": false,
    "prod_deploy": false,
    "netlify_site_id": null,
    "custom_domains": []
  },
  "assets_available": {},
  "custom_pages": ["home"],
  "rejected_patterns": []
}
```

Successful response schema:
```json
{
  "status": "published",
  "run_id": "run-ca3111b07bce",
  "dist_dir": "/absolute/path/to/dist",
  "workspace_root": "/absolute/path/to/runs/run-...",
  "proof_report_path": "/absolute/path/to/reports/proof-report.json",
  "gap_log_path": "/absolute/path/to/reports/gap-log.json",
  "proof_report": {
    "site_tag": "eta-probe",
    "business_name": "ETA Probe",
    "run_id": "run-ca3111b07bce",
    "build_path": "/absolute/path/to/outputs",
    "qa_lanes": [
      { "lane": "structural", "status": "green", "summary": "..." },
      { "lane": "content", "status": "green", "summary": "..." },
      { "lane": "browser", "status": "green", "summary": "..." },
      { "lane": "seo", "status": "complete", "summary": "" }
    ],
    "overall_status": "green",
    "total_issues": 0,
    "error_count": 0,
    "warning_count": 0,
    "pages_built": 1,
    "seo_pages": 1,
    "screenshots": [
      { "page_id": "home", "viewport": "desktop", "path": "/absolute/path/to/png" },
      { "page_id": "home", "viewport": "mobile", "path": "/absolute/path/to/png" }
    ],
    "deferred_items": []
  },
  "gap_log": {
    "site_tag": "eta-probe",
    "run_id": "run-ca3111b07bce",
    "total_gaps": 1,
    "blocking": 0,
    "deferred": 1,
    "gaps": [
      {
        "category": "media",
        "severity": "info",
        "id": "hero-image",
        "description": "Ideal media asset missing — using placeholder",
        "deferred": true
      }
    ]
  },
  "error": null
}
```

Observed successful live proof:
- Request target: POST http://127.0.0.1:3334/api/vnext-build
- Required Origin used: http://127.0.0.1:3334
- Live successful run_id: run-ca3111b07bce
- proof_report_path:
  - /Users/famtasticfritz/famtastic/site-studio/sites/eta-probe/runs/run-ca3111b07bce/reports/proof-report.json
- gap_log_path:
  - /Users/famtasticfritz/famtastic/site-studio/sites/eta-probe/runs/run-ca3111b07bce/reports/gap-log.json

Failure modes observed or defined in code:
- 403 Cross-origin request blocked
  - Cause: Origin/Referer missing or not localhost/127.0.0.1 studio port
- 400 BuildRequest body required
  - Cause: body missing or not an object
- 500 {"error":"..."}
  - Cause: runtime-vnext build threw an exception

2. POST /api/rebuild-runtime-vnext
Purpose:
- Rebuild the currently selected active site from the live spec loaded by readSpec().
- Caller does not provide the build payload directly; the server derives it from the spec via deriveRuntimeVnextRequestFromSpec().

Request gate:
- Same mutating-request Origin/Referer gate as /api/vnext-build
- Required Origin must start with:
  - http://localhost:3334
  - http://127.0.0.1:3334

Request body:
- No meaningful caller payload required for the live path used in verification.
- Verified live request body: {}

Server-side derivation from current spec:
- pages are derived from spec.pages or design_brief.must_have_sections fallback
- tone comes from design_brief.tone or client_brief.style_notes
- primary goal and desired outcome derive from positioning/client_brief/design_brief fields
- result is normalized into the same BuildRequest family used by /api/vnext-build

Successful response schema:
- Same response shape as /api/vnext-build

Observed successful live proof:
- Request target: POST http://127.0.0.1:3334/api/rebuild-runtime-vnext
- Required Origin used: http://127.0.0.1:3334
- Live successful run_id: run-9d344a7eb90a
- Site rebuilt: site-jj-ba-transport
- proof_report_path:
  - /Users/famtasticfritz/famtastic/site-studio/sites/site-jj-ba-transport/runs/run-9d344a7eb90a/reports/proof-report.json
- gap_log_path:
  - /Users/famtasticfritz/famtastic/site-studio/sites/site-jj-ba-transport/runs/run-9d344a7eb90a/reports/gap-log.json
- Live proof summary:
  - overall_status: green
  - pages_built: 4
  - total_issues: 0
  - blocking gaps: 0

Failure modes observed or defined in code:
- 403 Cross-origin request blocked
  - Cause: Origin/Referer missing or disallowed
- 400 Current site spec not found
  - Cause: readSpec() did not return an object
- 500 {"error":"..."}
  - Cause: runtime-vnext rebuild threw an exception; a websocket error broadcast is also attempted

Callable guidance for Shay or other studios:
- If you are acting as an external local caller, send an allowed Origin header that matches the active studio port.
- Prefer /api/vnext-build when the caller already has structured build inputs.
- Prefer /api/rebuild-runtime-vnext when the live site spec inside Site Studio is the source of truth.
- Treat proof_report_path and gap_log_path as first-class outputs, not optional nice-to-haves.
- Do not infer success from HTTP 200 alone; inspect:
  - status
  - proof_report.overall_status
  - proof_report.total_issues
  - gap_log.blocking

Blunt truth:
- The external contract is already usable.
- It is not purely payload-driven; it is also guarded by an origin gate.
- That gate must be part of the frozen contract, or other systems will think the endpoint is broken when it is actually protected.
