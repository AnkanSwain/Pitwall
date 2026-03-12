# F1 Live Timing Companion

A browser-based real‑time Formula 1 race companion that displays live car positions, a timing tower, and race control messages. The frontend is a static HTML page hosted on GitHub Pages; a small Cloudflare Worker proxies requests to F1's official live data API so that the browser can access it without CORS or header restrictions.

---

## Repository Structure

```
root/
├── index.html        # The single‑page frontend app
├── README.md         # (this file)
├── SETUP.md          # Detailed step‑by‑step setup guide
└── worker/           # Cloudflare Worker proxy
    ├── worker.js     # Worker source code
    └── wrangler.toml # Wrangler configuration for deployment
```

The only runtime code is inside `worker/`; everything else is just static HTML/CSS/JS that runs in the browser.

---

## What the Worker Does

When the frontend tries to connect directly to `livetiming.formula1.com`, the request is blocked because: 1) the server doesn’t allow cross‑origin requests, and 2) it requires a special `User‑Agent` header (`BestHTTP`) that browsers cannot set. The Cloudflare Worker sits between your browser and the F1 server, adding the headers, handling cookies, and relaying WebSocket traffic. It also responds to CORS preflight requests so the browser is happy.

The simple flow is:

```
Browser ↔ Cloudflare Worker ↔ livetiming.formula1.com
```

Deploying the worker with [Wrangler](https://developers.cloudflare.com/workers/) gives you a URL you plug into the frontend.

---

## Quick Setup Overview

1. **Prerequisites**
   - GitHub account (for repo & Pages)
   - Cloudflare account (for the Worker)
   - Node.js & npm (to install Wrangler)
   - VS Code (recommended editor)

2. **Clone/Create the repository** on GitHub and pull it locally.

3. **Copy project files** (`index.html`, `worker/worker.js`, `worker/wrangler.toml`) into your repo.

4. **Deploy the Worker**
   - Install Wrangler: `npm install -g wrangler`
   - Run `wrangler login` and authorize
   - `cd worker` then `wrangler deploy`
   - Note the deployment URL (e.g. `https://f1-live-proxy.YOUR-NAME.workers.dev`)
   - Test it by visiting the negotiate endpoint in your browser and confirming you get JSON with a `ConnectionToken`.

5. **Configure frontend**
   - Open `index.html` and set `WORKER_URL` to the URL from above.

6. **Publish to GitHub Pages**
   - Commit and push your files
   - In repository Settings → Pages, select branch `main` and folder `/ (root)`
   - After a minute, your app will be available at `https://YOUR-GITHUB-NAME.github.io/REPO-NAME`.

7. **Use the app** during a live session by clicking **Connect**. Cars and timing data will stream in automatically.

For full, illustrated instructions and troubleshooting tips, see [SETUP.md](SETUP.md).

---

## Development Notes

- The frontend is a single HTML file with inline CSS/JS; it uses the `WORKER_URL` constant as the proxy base and reconnect logic for live sessions.
- `worker.js` contains the entire proxy logic (see comments in file). It handles both HTTP negotiate requests and WebSocket upgrades.
- `wrangler.toml` is a minimal configuration pointing to `worker.js` and specifying the script name.
- No build step is required; GitHub Pages serves `index.html` as‑is.

---

## License & Attribution

This repository is intended for personal/educational use. It reverse-engineers the F1 live timing protocol and proxies the official stream for browser consumption. Use responsibly and respect Formula 1's terms of service.

---

Happy racing! 🏁
