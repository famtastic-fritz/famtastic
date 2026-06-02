# Part 3 — Visible Rebrand Decisions

> Inputs: Part-2 inventories for `shay-desktop-electron`, `shay-web`, `shay-workspace`.
> Scope: Tier-A visible rebrand only. Tier-B (identifier renames, bundle-ID migration, repo renames) is explicitly deferred.

---

## 1. Naming convention — the harness family

**Decision:** the Shay environments are named as a family of four sibling surfaces:

| Env tag (internal)        | Product name      | Use                                       |
| ------------------------- | ----------------- | ----------------------------------------- |
| `shay-desktop-electron`   | **Shay Desktop**  | Legacy ambient assistant control center   |
| `shay-web`                | **Shay Web**      | Browser/PWA chat surface                  |
| `shay-workspace`          | **Shay Workspace**| Desktop workspace (chat + tools + jobs)   |
| _(future)_                | **Shay Companion**| Reserved for mobile / always-on companion |

**Rules of use**
- The user-visible app name in titlebars, dock, About panel, PWA short-name, and OS task switcher is the two-word product name (`Shay Desktop`, etc.) — **never** `Shay-Shay` and never bare `Shay` in chrome.
- The agent persona name (in conversation, message placeholder "Message Shay…", `_botName`, DEFAULT_SOUL seed) is bare **`Shay`**.
- `Shay-Shay` survives only where it's already shipping in dialog titles (`shay-desktop-electron/src/main/index.ts:728,740`) — do not introduce new `Shay-Shay` strings. Migrate those two on first touch to `Shay Desktop`.
- Internal env tags (`shay-desktop-electron` etc.) are the keys used in `shay-environments/`, kanban, and the plan; they don't change.

---

## 2. Brand mark approach

**Decision:** Shay's mark is a **sibling to FAMtastic's mark, not a clone**. It shares the FAMtastic family palette (blue/yellow/red anchors with a magic-wand burst as the active energy) but stands as its own monogram. FAMtastic is the studio/parent brand; Shay is the agent persona living inside it. The two should feel related on a shelf without being confusable.

**Generation tool:** `muapi-logo-branding` (per the standing `feedback_use_muapi_recipes_not_primitives.md` rule — recipes are ~10x faster and produce a full kit in one pass).

**Starting brief tone:**
- Single-letter monogram **S** as the core mark — soft, confident, modern.
- Carries the **FAMtastic magic-wand burst** as an accent (small starburst near the upper-right of the S), tying it to the parent family.
- Mark works at 16×16 favicon and 1024×1024 app-icon without losing the burst.
- One-color, two-color, and full-color variants. Light-on-dark and dark-on-light pairs.

---

## 3. Color palette + typography hint

**Palette (proposed; muapi-logo-branding may refine):**
- **Shay Blue** `#1E5BFF` — primary, matches FAMtastic F-blue family but shifted slightly cooler/brighter to read as "agent / signal".
- **Shay Gold** `#F5C542` — accent (intentionally reuses the existing Hermes-webui gold token so theme overrides are minimal; also a credible cousin to FAMtastic A-yellow `#F5C518`).
- **Shay Red** `#E63946` — alert / magic-wand burst (cousin to FAMtastic M-red).
- **Shay Ink** `#0D0D1A` — dark mode bg (reuses upstream `--bg` dark token; zero-friction).
- **Shay Cream** `#FEFCF7` — light mode bg (reuses upstream `--bg` light token).

**Typography hint:** defer the exact pairing to the muapi recipe output. Starting brief: a **geometric humanist sans** for the wordmark (e.g. Inter / Söhne / DM Sans family), paired with the system stack already in use across the three envs for body. Do **not** introduce a new body webfont in Part 3 — chrome only.

---

## 4. Per-env application strategy

### 4.1 `shay-desktop-electron` (Shay Desktop)

Three surgical passes, in order, all landing in the existing Electron tree (no fork):

1. **i18n pass (highest leverage).** Edit `src/shared/i18n/locales/{en,es,id,ja,pt-BR,zh-CN,zh-TW}/{welcome,common,install,settings,errors,chat,agents,gateway,memory,tools}.ts`. Map `Hermes` / `Hermes Agent` → `Shay` / `Shay Desktop` per the naming rules in §1. Specifically: `welcome.title`, `common.appName`, `install.installingHermes`, `settings.hermesAgent`, `settings.migrateToHermes`, the settings long-form descriptions at lines 45/52/69/80/81/84/93, `errors:3,5`, `chat:70`, `agents:4`, `gateway:9`, `memory:4,23,28,30`. ~70 string edits, eliminates the majority of visible "Hermes".
2. **Hardcoded UI pass.** `src/renderer/screens/AgentMonitor.tsx:173`, `src/renderer/src/App.tsx:89`, `src/renderer/src/screens/Settings/index.tsx:49,59`, `src/renderer/src/screens/Settings/Settings.tsx` storage-key labels (display strings only — keys stay), `src/main/index.ts:417` (`Shay-Shay` → `Shay Desktop`), `src/main/index.ts:728,740` (same), `src/main/ssh-remote.ts:465` DEFAULT_SOUL persona seed, `src/main/kanban.ts:144,159,161`, `src/main/hermes.ts:518,751,752`.
3. **Asset pass.** Replace `src/renderer/src/assets/{hermesbg.webp,hermes.png,splash.png,splashtext.png,splashtext-w.webp,icon.png}`, `build/icon.{icns,ico,png}`, `resources/icon.png` with Shay-branded outputs from the muapi recipe (see §7). Remove `src/renderer/src/assets/logos/nousresearch.svg` (upstream-org logo — not ours to ship).

**Explicitly NOT touched in Part 3** (per §6, parked as Tier B):
- `window.hermesAPI` IPC bridge (190 callers) — add `window.shayAPI` as alias if convenient, but do not rip-and-replace.
- localStorage keys `hermes-theme`, `hermes-version-cache`, `hermes-openclaw-cache`, `hermes-openclaw-dismissed` — rename breaks user prefs; migrate-on-read later.
- CLI tokens (`hermes kanban`, `hermes mcp add/remove`), env vars (`HERMES_PYTHON`, `HERMES_HOME`), `.hermes/` paths, install URL `NousResearch/hermes-agent` — these are infra tied to the upstream Python engine.
- `x-hermes-session-id` header, `hermes.tool.progress` SSE event — wire protocol.
- External `t.me/hermes_agent_desktop` Telegram URL — hide behind feature flag until a Shay-owned channel exists.

### 4.2 `shay-web` (Shay Web)

**Strategy:** zero edits to `_refs/hermes-webui-v0.51/` (read-only). All chrome is delivered via the upstream's own `HERMES_WEBUI_EXTENSION_DIR` mechanism (confirmed in `_refs/hermes-webui-v0.51/api/extensions.py`).

Overlay directory: `shay-environments/shay-web/chrome/`
- `shay-chrome.css` — overrides theme CSS custom properties (`--accent`, `--accent-hover`, `--gold`, `--sidebar`, `--bg`) at `:root` and `:root.dark` to map the Hermes gold/dark palette to the Shay palette in §3.
- `shay-chrome.js` IIFE — (1) sets `window._botName='Shay'` before `applyBotName()` fires (boot.js:1599); (2) on `DOMContentLoaded` swaps `#appTitlebarTitle` textContent, `.app-titlebar-icon` innerHTML (replaces inline caduceus SVG at index.html lines 126-137), `meta[name=apple-mobile-web-app-title]`, and all `link[rel*=icon|apple-touch-icon]` hrefs to `/extensions/shay-*`; (3) installs a `MutationObserver` on `<title>` to defeat the `applyBotName` clobber (boot.js:1599,1644,1734); (4) post-i18n DOM sweep for residual "Hermes" strings (onboarding modal `#onboardingTitle`, settings labels, dashboard tooltips); (5) re-runs after panel transitions.
- Assets: `shay-mark.svg`, `shay-favicon.svg`, `shay-favicon-32.png`, `shay-favicon-192.png`, `shay-favicon-512.png`, `shay-apple-touch.png` — generated by §7 brief.

Launch wiring (added to the shay-web start script):
```
export HERMES_WEBUI_EXTENSION_DIR=/Users/famtasticfritz/famtastic/shay-environments/shay-web/chrome
export HERMES_WEBUI_EXTENSION_STYLESHEET_URLS=/extensions/shay-chrome.css
export HERMES_WEBUI_EXTENSION_SCRIPT_URLS=/extensions/shay-chrome.js
```

**Known limits documented (not blockers):** `manifest.json` `name="Hermes"` cannot be JS-overridden post-install (already-installed PWAs keep the old name until reinstall); a future reverse-proxy rewrite of `/manifest.json` is the Tier-B fix.

### 4.3 `shay-workspace` (Shay Workspace)

**Strategy for dev-mode (current state, `npm run dev`):** Electron preload script delivered from `shay-environments/shay-workspace/overlay/` — no edits to `_refs/hermes-workspace-v2.3/`.

The preload:
1. Monkey-patches `document.title` setter and installs a `MutationObserver` on `<title>` to defeat `src/hooks/use-page-title.ts:3` (BASE_TITLE) and `src/routes/__root.tsx:129` writes — keeps title pinned to `<Page> — Shay Workspace`.
2. Rewrites `<link rel=icon|apple-touch-icon|manifest>` hrefs (set by `__root.tsx:166-186`) to overlay-served Shay assets.
3. Observes `document.body` for the boot-splash nodes at `__root.tsx:473-474` and swaps their `src` (`/claude-avatar.webp`, `/claude-banner.png`) and `alt` (`Hermes Agent`, `Hermes Workspace`) to Shay equivalents.
4. Injects a `<style>` tag that re-themes the CSS custom properties declared in `src/styles.css:712` (`Hermes Workspace Themes`) and `:1086` (`Hermes Nous` variant), scoped to the same `:root[data-theme=…]` selectors. Token values come from §3.
5. Rewrites the `<link rel=manifest>` to a `data:` URL containing a Shay-named manifest (sidesteps `public/manifest.json` edits).
6. Rewrites the root meta description (`__root.tsx:134`) — user-visible in OG/share previews.

**Packaged-distribution rebrand is deferred (Tier B).** That work covers `electron-builder.config.cjs` `appId=com.hermesworkspace.app`, `productName=hermes-workspace`, `copyright`, DMG title, GitHub publish `outsourc-e/hermes-workspace`, and `package.json` name/description. It's only needed when we start shipping a packaged `.app` / `.dmg`.

---

## 5. Bundle ID / install path / repo name decisions

| Asset                                                         | Decision     | Rationale                                                                                                            |
| ------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `shay-desktop-electron` `appId=com.famtastic.shaydesktop`     | **Keep**     | Already Shay/FAMtastic-branded. No work needed.                                                                       |
| `shay-desktop-electron` `productName=Shay Desktop`            | **Keep**     | Already correct.                                                                                                      |
| `shay-desktop-electron` `homepage=github.com/famtastic/shay-desktop` | **Keep** | Already correct.                                                                                                      |
| `shay-workspace` `appId=com.hermesworkspace.app`              | **DEFER**    | Changing appId in electron-builder breaks Squirrel/Sparkle auto-update continuity for any users on the old ID. Park until we ship our first packaged build under Shay branding — at that point the migration cost is zero (no prior installs). |
| `shay-workspace` `productName=hermes-workspace`               | **DEFER**    | Same release; dev-mode preload covers visible chrome.                                                                 |
| `shay-workspace` `electron-builder publish: outsourc-e/hermes-workspace` | **DEFER** | Repo-rename is a Tier-B operation (breaks autoupdate feed URLs, requires GitHub redirect).                            |
| `shay-desktop-electron` `.hermes/` install path, `HERMES_HOME` | **DEFER**   | Engine-layer concern; rename means migrating user state.                                                              |
| `shay-web` `manifest.json` `name=Hermes`                      | **DEFER**    | Already-installed PWAs persist; future reverse-proxy rewrite of `/manifest.json`.                                     |
| localStorage keys (`hermes-theme`, `hermes-version-cache`, …) | **DEFER**    | Rename wipes user prefs; needs a migrate-on-read shim before keys change.                                             |
| `window.hermesAPI` IPC bridge                                 | **DEFER**    | 190 call sites; add `window.shayAPI` alias if trivial, otherwise leave for Tier B.                                    |

**Standing rule:** any rename that breaks auto-update continuity, persists in user storage, or crosses a wire protocol is Tier B and requires its own migration plan.

---

## 6. In scope vs deferred

### IN scope — Part 3 (Tier A: visible rebrand)
- Product name strings: titlebars, About panels, dialog titles, splash alt text, meta descriptions.
- Agent persona name strings: `_botName`, message placeholders, DEFAULT_SOUL seed, i18n `appName`/`hermesAgent`/`installingHermes` etc.
- Visible brand mark: app icons (`.icns`/`.ico`/`.png`), favicons, PWA icons, splash mark, titlebar inline SVG, hero/bg images.
- Theme palette overrides where they read as visible color (titlebar gradient, accent color, splash background).
- Error toasts and runtime messages that surface "Hermes" to the end user.
- Onboarding/welcome screens.

### DEFERRED — Tier B (internal identifier migration)
- Bundle IDs (`com.hermesworkspace.app`), product names in `electron-builder.config.cjs`, package.json `name`.
- Repo renames (`outsourc-e/hermes-workspace` → Shay-owned).
- localStorage / IndexedDB key renames (require migrate-on-read shims).
- IPC bridge name (`window.hermesAPI` → `window.shayAPI`) — 190 call sites.
- CLI tokens (`hermes kanban`, `hermes mcp …`), env vars (`HERMES_PYTHON`, `HERMES_HOME`), filesystem paths (`.hermes/`), install URLs (`NousResearch/hermes-agent`).
- Wire-protocol identifiers: `x-hermes-session-id` header, `hermes.tool.progress` SSE event.
- PWA `manifest.json` `name` (requires proxy rewrite or upstream fork).
- External community URLs (`t.me/hermes_agent_desktop`) — pending Shay-owned channel.

---

## 7. The muapi-logo-branding brief (verbatim for Apply phase)

The Apply phase passes the following brief to the `muapi-logo-branding` skill. If the skill is **unreachable from inside a workflow agent**, the Apply agents fall back to clean text-only branding (product names in §1, palette in §3) and a **simple inline SVG monogram** (capital `S` in Shay Blue with a 3-point yellow burst at upper-right), and flag full asset regeneration as a follow-up task.

```
brand_name: Shay
tagline: (no tagline — agent persona inside FAMtastic)
brand_voice: confident, warm, modern, signal-bright. Sibling to FAMtastic
  (parent studio brand) — shares family palette and magic-wand burst motif
  but is its own monogram. Not gimmicky. Reads as "the agent who answers."

mark_concept: single-letter monogram S. Rounded geometric construction.
  Small 3-point magic-wand starburst at the upper-right of the S (echoes
  the FAMtastic burst — the family signature of "spark of action").
  Works as a one-color silhouette at 16x16. Negative-space-friendly.

palette:
  primary:   #1E5BFF  (Shay Blue)
  accent:    #F5C542  (Shay Gold — wand burst)
  alert:     #E63946  (Shay Red — used sparingly)
  ink:       #0D0D1A  (dark surface)
  cream:     #FEFCF7  (light surface)

typography_hint: geometric humanist sans for wordmark (Inter / DM Sans /
  Söhne family — recipe picks). Body type defers to system stack — do not
  introduce body webfont.

variants_required:
  - full-color on light
  - full-color on dark
  - one-color (Shay Blue)
  - one-color (white, for dark backgrounds)
  - icon-only (no wordmark)
  - wordmark-only

target_outputs:
  # shay-desktop-electron
  - icon.icns                 (macOS, 1024 source)
  - icon.ico                  (Windows, 256 multi-res)
  - icon.png                  (Linux, 1024x1024)
  - hermesbg.webp replacement (hero bg — composition with mark + Shay Blue gradient field)
  - hermes.png  replacement   (1024x1024 mascot/hero plate)
  - splash.png + splashtext.png + splashtext-w.webp replacements (Shay wordmark)
  # shay-web (overlay dir)
  - shay-mark.svg             (titlebar inline replacement, 64x64 viewBox)
  - shay-favicon.svg
  - shay-favicon-32.png
  - shay-favicon-192.png
  - shay-favicon-512.png
  - shay-apple-touch.png      (180x180)
  # shay-workspace (overlay dir)
  - shay-avatar.webp          (boot-splash avatar replacement)
  - shay-banner.png + shay-banner-light.png (boot-splash banners)
  - shay-icon-192.png + shay-icon-512.png
  - shay-favicon.ico
  - cover.png replacement     (OG/Twitter share card)

sibling_brand_reference:
  FAMtastic brand mark — see ~/famtastic/brand/FAMTASTIC-BRAND-MARK.md.
  Shay shares the palette family and burst motif. Do NOT replicate the
  F/A/M three-letter construction — Shay's mark is a single S monogram.

deliverable_format: PNG + SVG for every variant. ICNS/ICO compiled from
  the 1024 source via iconutil / png-to-ico in Apply phase.
```

---

## Summary

The Shay environments are unified under a four-name family — **Shay Desktop**, **Shay Web**, **Shay Workspace**, and a reserved **Shay Companion** — with the bare agent persona name **Shay** used in conversation contexts. Part 3 is a strictly visible rebrand: product strings, brand mark, icons, splash/hero images, and theme palette only, executed via direct file edits on `shay-desktop-electron`, the upstream-supported `HERMES_WEBUI_EXTENSION_DIR` overlay on `shay-web`, and an Electron preload overlay on `shay-workspace` so both `_refs/` trees stay read-only. The mark is generated by the `muapi-logo-branding` recipe per the standing recipe-first rule, designed as a sibling to FAMtastic (shared blue/yellow/red family palette and magic-wand burst motif) but rendered as its own single-letter `S` monogram so the two brands feel related without being confusable. All bundle-ID, repo-name, localStorage-key, IPC-bridge, CLI-token, wire-protocol, and PWA-manifest identifier renames are explicitly deferred to Tier B because they carry auto-update, user-state, or protocol-continuity migration costs that exceed Part 3's scope — and the standing rule is that any rename crossing those boundaries needs its own migration plan.
