# Installing on iPhone via a Cloudflare quick tunnel

A repeatable recipe for getting the PWA onto an iPhone (or any device) **over
HTTPS**, so the service worker can register and cache the app for good. After the
first cached load the phone never needs your computer again — see
[offline-pwa.md](./offline-pwa.md) for why HTTPS is the one hard requirement.

A **quick tunnel** (`cloudflared tunnel --url ...`) needs **no Cloudflare account
and no login**. It hands you a throwaway `https://<random>.trycloudflare.com` URL
that forwards to a server on your machine.

## TL;DR

```bash
# one-time: install cloudflared (see below)

npm run build                          # produce dist/
npx serve dist -l 4173                 # serve the build locally (terminal 1)
cloudflared tunnel --url http://127.0.0.1:4173   # open the tunnel (terminal 2)
```

`cloudflared` prints a line like:

```
https://dos-participants-subaru-return.trycloudflare.com
```

Open **that** URL on the iPhone in **Safari**, let it fully load, then
**Share -> Add to Home Screen**. `Ctrl-C` both processes when done.

## One-time: install cloudflared

No root needed — drop the standalone binary in `~/.local/bin`:

```bash
mkdir -p ~/.local/bin
curl -fsSL -o ~/.local/bin/cloudflared \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x ~/.local/bin/cloudflared
cloudflared --version   # confirm ~/.local/bin is on your PATH
```

- Other architectures: swap `cloudflared-linux-amd64` for `-linux-arm64` etc.
  (see the [releases page](https://github.com/cloudflare/cloudflared/releases)).
- macOS: `brew install cloudflared` instead.

## Each time you want to install/update on the phone

### 1. Build

```bash
npm run build
```

This emits a self-contained `dist/` (app shell, service worker, manifest, the
240-puzzle packs, icons — ~400 KB precached).

### 2. Serve `dist/` locally

```bash
npx serve dist -l 4173
```

The tunnel needs a local HTTP server to point at. `serve` works out of the box.

> **Do not use `npm run preview` here without a config tweak.** Vite's preview
> server has DNS-rebinding protection and will reject the tunnel's hostname with
> **`403 Blocked request. This host is not allowed.`** If you prefer `npm run
> preview`, first add an `allowedHosts` entry to `vite.config.ts`:
>
> ```ts
> export default defineConfig({
>   preview: { allowedHosts: ['.trycloudflare.com'] },
>   plugins: [ /* ... */ ],
> })
> ```
>
> `serve` has no such check, which is why the TL;DR uses it.

### 3. Open the tunnel

In a second terminal:

```bash
cloudflared tunnel --url http://127.0.0.1:4173
```

Copy the `https://<random>.trycloudflare.com` URL it prints. Keep this terminal
running — closing it kills the tunnel.

### 4. Install on the iPhone (do this with WiFi/data ON)

1. Open the tunnel URL in **Safari** (must be Safari — Chrome/Firefox on iOS
   can't add a service-worker PWA to the home screen).
2. **Let the page fully load and sit a few seconds.** This is when the service
   worker registers and precaches everything. Skipping this is what leaves you
   with a "Safari can't open the page" error later.
3. **Share -> Add to Home Screen.**
4. Open the app from its home-screen icon once, still online.
5. Turn on **Airplane Mode** and reopen it. It should launch fully offline.

Once step 5 works, the tunnel, the local server, and your computer are no longer
needed for that install.

### 5. Shut down

`Ctrl-C` in both terminals. The `trycloudflare.com` URL dies immediately.

## Notes and caveats

- **The URL is single-use.** Every `cloudflared tunnel` run mints a new random
  hostname. Great for a one-time install; if you plan to reinstall or ship
  updates regularly, deploy `dist/` to a permanent free HTTPS host instead
  (Netlify / Cloudflare Pages / Vercel — see
  [offline-pwa.md](./offline-pwa.md#option-1--free-static-host-recommended)).
- **Anyone with the URL can reach your server while the tunnel is up.** It is a
  public HTTPS endpoint into `dist/` on your machine. This app serves only static
  files with no backend, so the exposure is low, but still tear the tunnel down
  when you are done.
- **Updates:** the app uses `registerType: 'autoUpdate'`, so the next time the
  installed PWA has network it fetches and swaps in the latest deploy. To push a
  new version through a tunnel, rebuild, reopen a tunnel, and load it once on the
  phone with network on.
