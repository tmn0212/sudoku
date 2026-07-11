# Running fully offline — no backend, no localhost

## TL;DR

This app has **no backend and makes zero network requests at runtime.** Every
piece of logic — puzzle generation, the solver, the hint engine, scoring,
grading, all 240 challenge puzzles, your stats/progress — runs as JavaScript in
the browser on your device. Your data lives on-device in `localStorage` and
IndexedDB.

The dev/preview server (`npm run dev` / `npm run preview`) is **not a backend**.
It only hands over static files (`index.html`, `.js`, `.css`, images). There is
no server-side logic to move onto the phone — there never was any.

Verified: there are no `fetch`/`XMLHttpRequest`/`WebSocket` calls and no external
URLs (no CDN, no web fonts, no analytics) anywhere in `src/`.

## The one real catch: install requires HTTPS

Running the logic on the phone is not the hard part (it's 100% client-side).
The only requirement is getting the files onto the phone **and cached** so the
app survives with no network. That's the job of the **service worker**, and
browsers only register a service worker in a **secure context**:

> `https://…`, **or** `http://localhost` / `127.0.0.1` on the *same machine*.

When your iPhone loads your computer's dev server, the URL looks like
`http://192.168.1.5:5173` — a LAN IP over plain HTTP. From the phone that is
neither `localhost` nor HTTPS, so **iOS Safari refuses to register the service
worker** → no offline cache → the app only works while it can reach your
computer.

So "keep a localhost running for the phone to talk to" is exactly what prevents
independence. To get an app that works in airplane mode forever, serve it
**once** over HTTPS, let the service worker cache everything, and then the
host/computer is never needed again.

## How to make it truly independent on iPhone

### Option 1 — Free static host (recommended)

Deploy the built `dist/` folder to any HTTPS static host. **None of these is a
backend** — they serve the same static files, just over HTTPS on a public URL.
After you install the PWA once, the app never calls the host again; it keeps
working even if the host goes offline.

| Host | Notes |
| --- | --- |
| **Cloudflare Pages** | Free, fast, no config. Good default. |
| **Netlify** | Free; drag-and-drop `dist/` or connect a repo. |
| **Vercel** | Free, great DX. |
| **GitHub Pages** | Free, but served from a subpath — needs a `base` change (below). |

Steps:

1. `npm run build` → produces a self-contained `dist/` (HTML, JS, CSS, service
   worker, manifest, the 240-puzzle packs, icons — ~270 KB precached).
2. Upload `dist/` to the host → you get an HTTPS URL, e.g.
   `https://sudoku-abc.pages.dev`.
3. On the iPhone, open that URL **in Safari** → Share → **Add to Home Screen**.
4. Open it once with WiFi on so the service worker precaches everything.
5. Turn on airplane mode. It works — with no computer, WiFi, or host.

> **GitHub Pages only:** it serves from `https://you.github.io/sudoku_pwa/`, so
> set `base: '/sudoku_pwa/'` in `vite.config.ts` before building. The other
> three hosts serve from root and need no change.

### Option 2 — HTTPS from your own computer

Keep hosting locally but over **HTTPS** so the service worker can register:

- **`mkcert`** — generate a locally-trusted cert, serve the build over HTTPS on
  your LAN IP, and install the mkcert root cert on the iPhone (Settings →
  General → VPN & Device Management → trust the profile).
- **Tunnel** — `cloudflared tunnel` or `ngrok http 4173` gives a real HTTPS URL
  pointing at your local `npm run preview`.

Either way the computer only needs to be reachable for the **first load + cache**.
After that it's independent.

### Option 3 — Native wrapper (overkill)

Wrapping the same frontend in **Capacitor** and building with Xcode yields a real
`.app` (needs a Mac + Apple Developer account). Functionally it buys nothing over
the PWA here — the same code runs in a WebView instead of Safari — so only bother
if you want App Store distribution.

## iOS specifics

- **"Install" = Add to Home Screen in Safari.** Not an App Store download.
  Must be **Safari** (Chrome/Firefox on iOS can't add a home-screen PWA with a
  service worker).
- **Offline works after first cache.** The Workbox service worker precaches the
  app shell (`globPatterns` covers js/css/html/svg/png; `navigateFallback:
  index.html` handles routing offline). See `vite.config.ts`.
- **Data persistence:** saved game, stats, challenge progress, and learned
  techniques live in IndexedDB, and the app calls `navigator.storage.persist()`
  to ask iOS not to evict them. iOS can still reclaim storage after very long
  disuse; opening the app occasionally keeps it warm.
- **Updates:** `registerType: 'autoUpdate'` means a redeploy is fetched in the
  background next time the phone has network and swapped in. Fully offline, it
  keeps running the last cached version.

## Summary

| Concern | Reality |
| --- | --- |
| Backend / API server | **None exists.** Nothing runs on a server. |
| Logic location | 100% in-browser JS, on the phone. |
| Runtime network needs | **Zero** once installed + cached. |
| What a host is for | Serving static files over HTTPS **once**, for install. Not queried at runtime. |
| Drop the localhost after install | **Yes** — computer can be off; app works in airplane mode. |
| Why localhost-over-LAN fails | Service workers need HTTPS (or true localhost); a LAN IP over HTTP won't register one. |

The cleanest path is **Option 1**: deploy `dist/` to a free static host once,
install from the HTTPS URL, and you have a fully self-contained Sudoku app on
your iPhone that never touches a network again.
