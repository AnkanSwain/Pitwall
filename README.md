# Pitwall — F1 Live Timing

A browser-based real-time Formula 1 race companion. The frontend is a single static HTML page hosted on GitHub Pages. A Cloudflare Worker proxies requests to F1's official live stream so the browser can reach it without CORS or header restrictions.

---

## Repository Structure

```
root/
├── index.html        # The single-page frontend app
├── README.md         # This file
├── SETUP.md          # Step-by-step setup guide
└── worker/
    ├── worker.js     # Cloudflare Worker proxy source
    └── wrangler.toml # Wrangler deployment config
```

---

## Views

### Track Map
Shows car positions as coloured dots on a 2D track outline.

- **Track outline** is built two ways (hybrid approach):
  - From live `Position.z` data when F1's stream broadcasts it
  - As a fallback, a one-time fetch from OpenF1's free REST API loads historical position data for the same circuit
- When neither is available (live sessions where F1 restricts positional data), a message is shown and you can switch to Race Order view

### Race Order
A horizontal "virtual straight" that always works — derived entirely from timing data (gaps, positions, pit status). No position data required.

- Leader is shown at the far left
- Each car is a dot spread right proportional to their gap to the leader
- Lapped cars appear at the far right
- Pit lane cars appear in a separate zone below the main track line
- OUT LAP cars are highlighted in gold

You can switch between views at any time using the **Track Map / Race Order** toggle in the header.

---

## How the Worker Proxy Works

When the browser tries to connect directly to `livetiming.formula1.com`, the request is blocked because the server requires a custom `User-Agent` header (`BestHTTP`) that browsers cannot set, and it does not allow cross-origin requests. The Cloudflare Worker sits between your browser and F1's server, adding the required headers and relaying WebSocket traffic.

```
Browser  ↔  Cloudflare Worker  ↔  livetiming.formula1.com
```

The OpenF1 REST API (used for the track outline fallback) allows browser requests directly — no proxy needed for that.

---

## Quick Setup

1. Clone this repository locally
2. Install [Node.js](https://nodejs.org) and run `npm install -g wrangler`
3. `cd worker && wrangler login && wrangler deploy`
4. Copy the deployed Worker URL into `index.html` at the `WORKER_URL` constant
5. Push to GitHub and enable Pages (Settings → Pages → branch: main, folder: root)
6. Open your Pages URL during a live session and click **Connect**

See [SETUP.md](SETUP.md) for the full illustrated walkthrough.

---

## Data Sources

| Source | Used for | Authentication |
|---|---|---|
| `livetiming.formula1.com/signalr` | All live timing, positions, race control | None (via Worker proxy) |
| `api.openf1.org` | Track outline fallback (historical sessions) | None |

---

## Notes

- No build step required — `index.html` is served as-is by GitHub Pages
- The Cloudflare Worker free tier (100k requests/day) is sufficient for personal use
- F1's stream does not always broadcast `Position.z` during live sessions — Race Order view is the reliable fallback

---

Happy racing 🏁
