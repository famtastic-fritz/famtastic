# Premiere Session Gaps — 2026-05-05

Captured during the "Pass 1 + Pass 2" build session. Per Fritz's directive, errors were noted and execution continued; these are open follow-ups for Shay (or a manual fix in a future session).

## GAP-2026-05-05-01 — Codex adversarial review unavailable mid-session

**What happened:** During the pre-execution adversarial review loop, the codex-bridge MCP returned:
```
ERROR: You've hit your usage limit. Upgrade to Pro... or try again at 9:28 PM.
```
Codex CLI rate-limited on `gpt-5.5`. Could not complete the review-until-trivial loop.

**Workaround applied:** Self-adversarial review by the executing agent. Surfaced 6 real issues which were folded into the implementation:
1. Drop Lenis (chose native scroll)
2. Drop GSAP (chose IntersectionObserver + CSS scroll-driven)
3. Single feature flag (`body[data-premiere="on"]`) instead of editing existing CSS
4. Replace animated `letter-spacing` with `transform: scale()`
5. `view()` timeline IO fallback
6. Consolidate grain + leak + vignette into one paint layer

**Recommended fix:**
- Establish a fallback chain for adversarial review: codex-bridge → codex-official → second-Claude-pass → local lint rules. Never let one provider rate-limit block the workflow.
- Codex-bridge MCP also surfaced an unrelated Linear OAuth handshake error during the failure (`AuthRequired ... Missing or invalid access token`) — separate cleanup needed.

**Owner:** Shay session / platform.

---

## GAP-2026-05-05-02 — codex-bridge MCP attempts Linear handshake unprompted

**What happened:** Same codex call as GAP-01 also produced:
```
ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed,
when AuthRequired ... www_authenticate_header: Bearer realm="OAuth"
... resource_metadata="https://mcp.linear.app/.well-known/oauth-protected-resource"
```
The Linear MCP was invoked despite the prompt having nothing to do with Linear. This is noisy and pollutes error output.

**Recommended fix:** Either auth Linear or remove the Linear MCP from the codex-bridge runtime.

**Owner:** Platform.

---

## GAP-2026-05-05-03 — Gemini API key expired (blocks all nano-banana image generation)

**What happened:** During Pass 2 (raster asset generation for The Premiere theme), all 6 nano-banana image gen calls returned:
```
API key expired. Please renew the API key.
```
Zero assets written. nano-banana subagent ID: `aed8262be3ef46de5`.

**Workaround applied:** Pass 1 ships without the raster assets — the experience uses CSS gradient placeholders that were intentionally designed to be the v1 fallback. The 3 deferred raster assets are nice-to-have polish, not blockers:
1. `velvet-curtain.png` — currently a CSS scarlet gradient (works)
2. `tier-{platinum,gold,silver,bronze}.png` — currently CSS foil-shimmer sweep on hover (works)
3. `brand-mark-foil.png` — currently the existing flat brand-mark.png (works)

**Recommended fix:**
1. Refresh `GEMINI_API_KEY` from https://aistudio.google.com/app/apikey
2. Update wherever it's set (`~/.zshrc`, `~/.config/famtastic/`, `~/famtastic/.env` — TBD which)
3. Re-run nano-banana subagent with the same prompts (logged in chat — can resume via `SendMessage to: aed8262be3ef46de5`)
4. Files land in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion/frontend/assets/premiere/`
5. Update `premiere.css`:
   - `.premiere-curtain` → swap gradient for `background-image: url(assets/premiere/velvet-curtain.png)`
   - `.tier-card--platinum` etc → swap CSS foil for actual medallion images
   - Hero brand-mark `<img src>` → swap to `assets/premiere/brand-mark-foil.png`
6. No JS changes required.

**Owner:** Fritz (key refresh) → next session execution.

---

## GAP-2026-05-05-04 — `data-premiere="on"` not yet feature-flagged at runtime

**What happened:** The body attribute is hardcoded into all 7 HTML pages. Works fine, but means flipping the flag requires re-deploying HTML. A more elegant pattern would be reading from a config (e.g., `window.__SITE_CONFIG__.PREMIERE_ENABLED`) and JS sets the attribute on first paint.

**Workaround applied:** None needed for this session — direct attribute is fine for V1.

**Recommended fix:** Migrate to `<script>` config-driven flag once the experience is approved and stable. Allows A/B testing, instant kill-switch via config change, no HTML redeploy.

**Owner:** Future enhancement. Low priority.

---

## GAP-2026-05-05-05 — preview MCP launch.json discovery requires absolute config path

**What happened:** Created `~/famtastic-sites/mbsh-reunion/.claude/launch.json` with the mbsh-frontend server config; preview MCP couldn't find it (was reading `~/famtastic/.claude/launch.json`). Worked around by adding the entry to the famtastic-side launch.json instead.

**Recommended fix:** Document the launch.json discovery rule (it's per-current-working-directory of the MCP, not project-aware). Or have the MCP search up the tree.

**Owner:** Platform docs.

---

## Note for Shay

This entire session's "let issues surface so we find gaps" directive paid off — 5 platform/operational gaps documented in one session, none of which would have been visible in a smooth-path execution. Recommend running this kind of "drive a substantial workstream end-to-end and log every tooling friction" session quarterly.
