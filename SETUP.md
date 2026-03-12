# F1 Live Timing — Setup Guide

## What You're Building

A real-time F1 race companion that runs in your browser, hosted on GitHub Pages.
It shows live car positions, a timing tower, and race control messages pulled directly
from F1's official live stream — completely free.

---

## Before You Start

You'll need three free accounts:
- **GitHub** — github.com (hosts your website for free)
- **Cloudflare** — cloudflare.com (runs your proxy Worker for free)
- **Node.js** — nodejs.org (needed to deploy the Cloudflare Worker)

And one piece of software:
- **VS Code** — code.visualstudio.com (your code editor)

---

## Part 1 — What is the Cloudflare Worker? (Beginner Explanation)

Imagine you want to call a restaurant to order food, but there's a rule:
the restaurant only accepts calls from other restaurants, not from regular people.

You are the "browser" (regular person).
F1's live stream is the "restaurant".
The **Cloudflare Worker** is a friend who *is* a restaurant — so they can call on your behalf.

Here's what actually happens:
```
Your Browser  →  asks Cloudflare Worker for F1 data
Cloudflare Worker  →  calls F1's server (pretending to be F1's own app)
F1's server  →  sends data back to the Worker
Cloudflare Worker  →  forwards it to your browser
```

The Worker also:
1. Adds the `User-Agent: BestHTTP` header that F1's server requires
   (browsers are not allowed to set this header themselves for security reasons)
2. Adds `Access-Control-Allow-Origin: *` to tell your browser
   "yes, this data is safe to use from any website"
3. Handles relaying the session cookie (F1's way of identifying your connection)

The Worker runs on Cloudflare's servers 24/7, completely free for personal use
(Cloudflare's free tier allows 100,000 requests per day — more than enough).

---

## Part 2 — Create the GitHub Repository

### Step 1 — Create a new repository on GitHub
1. Go to github.com and sign in
2. Click the **+** button in the top right → **New repository**
3. Name it: `f1-companion`
4. Make sure it is set to **Public** (required for free GitHub Pages hosting)
5. Check **Add a README file**
6. Click **Create repository**

### Step 2 — Open the repo in VS Code
1. On your repository page, click the green **Code** button
2. Copy the HTTPS URL (looks like `https://github.com/YOUR-NAME/f1-companion.git`)
3. Open VS Code
4. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the Command Palette
5. Type `Git: Clone` and press Enter
6. Paste your repo URL and choose where to save it on your computer
7. When prompted, click **Open** to open the cloned folder

### Step 3 — Add the project files
1. In VS Code's file explorer (left panel), you'll see your repo folder
2. Copy `index.html` into the root of the folder (same level as README.md)
3. Create a new folder called `worker` and copy `worker.js` and `wrangler.toml` into it

Your folder structure should look like:
```
f1-companion/
├── README.md
├── index.html
└── worker/
    ├── worker.js
    └── wrangler.toml
```

---

## Part 3 — Deploy the Cloudflare Worker

This is the proxy that lets your browser talk to F1's servers.

### Step 1 — Install Node.js
1. Go to nodejs.org and download the LTS version
2. Run the installer and follow the steps
3. To verify: open a terminal in VS Code (`Terminal → New Terminal`) and type:
   ```
   node --version
   ```
   You should see something like `v20.0.0`

### Step 2 — Create a Cloudflare account
1. Go to cloudflare.com and sign up for a free account
2. You don't need to add a domain or do anything complicated — just create the account

### Step 3 — Install Wrangler (Cloudflare's deployment tool)
In your VS Code terminal, type:
```bash
npm install -g wrangler
```
This installs Wrangler globally so you can use it from any folder.

### Step 4 — Log in to Cloudflare
```bash
wrangler login
```
This opens your browser and asks you to authorise Wrangler to access your Cloudflare account.
Click **Allow**.

### Step 5 — Deploy the Worker
In your VS Code terminal, navigate to the worker folder:
```bash
cd worker
wrangler deploy
```

After a few seconds you'll see output like:
```
✅ Successfully deployed to https://f1-live-proxy.YOUR-NAME.workers.dev
```

**Copy that URL** — you'll need it in the next step.

### Step 6 — Test the Worker
Open your browser and visit:
```
https://f1-live-proxy.YOUR-NAME.workers.dev/signalr/negotiate?connectionData=[{"name":"Streaming"}]&clientProtocol=1.5
```
You should see JSON response with `ConnectionToken` in it. That means it's working! ✅

---

## Part 4 — Configure the Frontend

### Step 1 — Set your Worker URL in index.html
1. Open `index.html` in VS Code
2. Find this line near the top of the `<script>` section:
   ```javascript
   const WORKER_URL = "https://f1-live-proxy.YOUR-NAME.workers.dev";
   ```
3. Replace `YOUR-NAME` with your actual Cloudflare subdomain from Step 5 above

### Step 2 — Save the file

---

## Part 5 — Publish to GitHub Pages

### Step 1 — Commit and push your files
In VS Code, click the **Source Control** icon in the left sidebar (it looks like a branching tree).
You'll see your changed files listed. Then:
1. Click the **+** next to each file to stage them
2. Type a commit message in the box at the top, e.g. "Initial F1 companion setup"
3. Click **Commit**
4. Click **Sync Changes** (or **Push**)

Alternatively, use the terminal:
```bash
git add .
git commit -m "Initial F1 companion setup"
git push
```

### Step 2 — Enable GitHub Pages
1. Go to your repository on github.com
2. Click **Settings** (top navigation)
3. Scroll down to the **Pages** section in the left sidebar
4. Under **Source**, select **Deploy from a branch**
5. Set Branch to **main**, folder to **/ (root)**
6. Click **Save**

After 1-2 minutes, GitHub will show you a URL like:
```
https://YOUR-GITHUB-NAME.github.io/f1-companion
```

Open that URL in your browser — your F1 companion is live! 🎉

---

## Part 6 — Using the App

### During a race/session:
1. Open your GitHub Pages URL
2. Click the red **Connect** button in the top right
3. The status dot will turn yellow (connecting) then green (live)
4. If there is an active session, cars will appear on the track map within seconds

### When there's no session:
- The map will show "No Live Session"
- The app is still connected and waiting — as soon as a session starts, it will auto-populate

### F1 session schedule:
- Practice sessions: Friday/Saturday
- Qualifying: Saturday
- Sprint (at sprint weekends): Saturday
- Race: Sunday

---

## Troubleshooting

**"Failed: Failed to fetch"**
→ Your WORKER_URL is wrong or the Worker isn't deployed. Re-check Part 3.

**"Connection error"**
→ F1 servers may be temporarily down, or there's a typo in the Worker URL. Try refreshing.

**Cars don't appear / map is empty**
→ There's no active F1 session. The app only shows data during live sessions.

**Worker says "Hello World" or 404**
→ You're visiting the Worker URL directly — that's fine. The Worker only does something
   useful when your frontend calls it with SignalR endpoints.

**Timing tower is empty**
→ DriverList data hasn't arrived yet. Wait a few seconds after connecting.

---

## Making Changes

Whenever you edit `index.html`:
1. Save the file in VS Code
2. Commit and push (Source Control panel → stage → commit → push)
3. Wait ~30 seconds for GitHub Pages to redeploy
4. Hard refresh your browser (`Ctrl+Shift+R` or `Cmd+Shift+R`)

---

## What's Next (Future Ideas)

- **Multiple views**: Add a timing-only view, a telemetry view, a weather panel
- **Track outlines**: Include pre-built SVG track outlines from the F1DB dataset
  instead of learning them from position data
- **Driver details**: Click a car to see their sector times, stint info, and speed
- **Session replay**: Record a session and replay it later using the position data
- **Notifications**: Browser notifications for safety cars, red flags, fastest laps
