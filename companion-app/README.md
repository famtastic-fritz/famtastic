# Shay — Command (Fritz Companion App)

The pocket version of how Fritz talks to his second-in-command. A mobile-first,
installable PWA: ask a question, get a streamed answer, and check the **Today**
tab for the Command Center briefing.

Pure static — **no build step, no npm, no dependencies.** Five files plus an
icon and a copy of the briefing snapshot.

```
companion-app/
├─ index.html             two views (Chat + Today) and a bottom tab bar
├─ app.js                 chat logic, pluggable backend + local mock, Today renderer
├─ manifest.webmanifest   PWA manifest ("Shay — Command")
├─ sw.js                  service worker (offline app shell, network-first state.json)
├─ state.json             copy of command-center/state.json (feeds the Today tab)
├─ icons/icon.svg         scalable app icon
└─ icons/icon-512.png     512×512 maskable icon
```

## Run it (and install on a phone)

From inside `companion-app/`:

```bash
python3 -m http.server 8099
```

Then on your phone (same Wi-Fi as the machine):

1. Find the machine's LAN IP: `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux).
2. Open `http://<that-ip>:8099/` in mobile Safari / Chrome.
3. **Add to Home Screen.** It launches standalone (no browser chrome), with
   safe-area insets and the FAMtastic dark theme.

> A service worker is registered, so after the first load the app shell opens
> offline. Service workers require `http://localhost` or HTTPS — a plain LAN IP
> over `http://` works for first load but the SW may not register on some
> browsers without HTTPS. For a guaranteed install, serve over HTTPS or use a
> tunnel (e.g. `cloudflared`, `ngrok`).

## What's mock vs real today

- **Today tab — REAL.** Fetches `./state.json` and renders the KPIs, "Needs you
  now", and your starred priorities — the same snapshot the Command Center
  dashboard uses. Network-first via the service worker, with the last snapshot
  cached for offline. The tab badge shows the "needs you" count.
- **Chat — MOCK by default.** With no backend wired, replies come from a
  built-in local mock that clearly labels every answer **"(mock — no backend
  wired)"**. The mock gives a sensible canned answer (and can summarize your
  briefing from `state.json`) plus echoes your message. Conversation is
  persisted to `localStorage`, so it survives reloads.

## What works offline

- Opening the app (HTML, JS, manifest, icons are cached on install).
- The full **mock chat** (no network needed) with persisted history.
- The **Today tab** falls back to the last cached `state.json`.
- A real backend, by definition, needs the network.

## Point it at the real Shay gateway

The chat client resolves its endpoint in this order:

1. `window.SHAY_ENDPOINT` (set a global before `app.js` loads), then
2. `<meta name="shay-endpoint" content="…">` in `index.html`, then
3. the built-in mock (if neither is set).

To go live, set the meta tag in `index.html`:

```html
<meta name="shay-endpoint" content="https://gateway.example/api/chat">
```

The client `POST`s JSON:

```json
{ "message": "What needs me today?", "history": [ { "role": "user", "content": "…" } ] }
```

It accepts a JSON reply (`{ "reply": "…" }` — also honors `text` / `message` /
`content`) **or** a `text/plain` body, and reveals the reply with a simple
streaming text animation. If the request fails it falls back to the mock and
says so.

> **Note (from the plan's open questions):** the Shay gateway is local today.
> Reaching it from a phone off-LAN needs secure remote access — the Shay master
> plan flags setting `API_SERVER_KEY` before any exposure, and the auth header
> wiring is intentionally left for that step. Push (so Shay reaches you first)
> depends on the reach fabric from `shay-omnipresent-assistant` and is not in
> this MVP.

## Keeping Today fresh

`state.json` here is a **copy** of `command-center/state.json`. Re-copy (or
symlink) it whenever the Command Center regenerates:

```bash
cp ../command-center/state.json ./state.json
# or, served from one place:  ln -sf ../command-center/state.json ./state.json
```
