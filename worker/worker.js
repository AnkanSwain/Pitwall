/**
 * F1 Live Timing - Cloudflare Worker Proxy
 * =========================================
 * This Worker sits between your browser (GitHub Pages) and the F1 SignalR server.
 * It solves two problems:
 *   1. CORS — browsers block requests to other domains unless that domain explicitly allows it.
 *      livetiming.formula1.com does NOT allow browser requests, so this Worker adds the
 *      necessary "yes, browsers are allowed" headers to every response.
 *   2. Custom Headers — the F1 server requires a specific User-Agent ("BestHTTP") that browsers
 *      are not allowed to set for security reasons. This Worker adds it for you.
 *
 * The flow looks like this:
 *   Your Browser  →  This Worker  →  livetiming.formula1.com
 *                 ←               ←
 *
 * Deploy this with: wrangler deploy
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── CORS Preflight ──────────────────────────────────────────────────────────
    // Before a browser makes a cross-origin request, it sends an OPTIONS "preflight"
    // to ask "am I allowed to do this?". We always say yes.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // ── WebSocket Connection ────────────────────────────────────────────────────
    // The live stream uses WebSockets (persistent two-way connection).
    // We detect the upgrade request and bridge it to F1.
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      return handleWebSocket(request, url);
    }

    // ── HTTP Requests (SignalR Negotiate) ───────────────────────────────────────
    // Before opening a WebSocket, SignalR does a regular HTTP "negotiate" request
    // to get a connection token and a session cookie.
    return handleHttp(request, url);
  },
};

// ── HTTP Handler ──────────────────────────────────────────────────────────────
async function handleHttp(request, url) {
  // The browser calls YOUR_WORKER.workers.dev/signalr/negotiate?...
  // We forward that to livetiming.formula1.com/signalr/negotiate?...
  const targetUrl =
    "https://livetiming.formula1.com" + url.pathname + url.search;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: {
      // The F1 server requires this exact User-Agent — browsers can't set it themselves
      "User-Agent": "BestHTTP",
      "Accept-Encoding": "gzip, identity",
    },
  });

  // Read the body and the important Set-Cookie header from F1's response
  const body = await response.text();
  const f1Cookie = response.headers.get("set-cookie") || "";

  // We can't pass Set-Cookie directly to the browser via CORS (it's blocked),
  // so we inject the cookie VALUE into the JSON response body under a custom key.
  // The frontend will extract it and send it back when connecting the WebSocket.
  let enrichedBody = body;
  try {
    const parsed = JSON.parse(body);
    parsed._f1Cookie = f1Cookie; // inject cookie into the JSON
    enrichedBody = JSON.stringify(parsed);
  } catch {
    // not JSON, pass through as-is
  }

  return new Response(enrichedBody, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

// ── WebSocket Handler ─────────────────────────────────────────────────────────
async function handleWebSocket(request, url) {
  // The browser passes the F1 session cookie as a query param (since browsers
  // can't set Cookie headers on WebSocket connections either).
  const f1Cookie = url.searchParams.get("f1cookie") || "";

  // Build the target F1 WebSocket URL, removing our custom param
  const targetParams = new URLSearchParams(url.search);
  targetParams.delete("f1cookie");
  const targetUrl =
    "wss://livetiming.formula1.com" +
    url.pathname +
    "?" +
    targetParams.toString();

  // WebSocketPair creates two ends of a connection:
  //   clientSocket → sent back to the browser
  //   serverSocket → used by the Worker to communicate with both sides
  const { 0: clientSocket, 1: serverSocket } = new WebSocketPair();

  // Connect to the real F1 server, passing the required headers
  let f1Socket;
  try {
    const f1Response = await fetch(targetUrl, {
      headers: {
        Upgrade: "websocket",
        "User-Agent": "BestHTTP",
        "Accept-Encoding": "gzip, identity",
        ...(f1Cookie ? { Cookie: f1Cookie } : {}),
      },
    });
    f1Socket = f1Response.webSocket;
    if (!f1Socket) throw new Error("No WebSocket in F1 response");
  } catch (e) {
    return new Response("Failed to connect to F1: " + e.message, {
      status: 502,
    });
  }

  // Start listening on both ends
  f1Socket.accept();
  serverSocket.accept();

  // ── Bridge Messages ─────────────────────────────────────────────────────────
  // Every message F1 sends → forward to browser
  f1Socket.addEventListener("message", ({ data }) => {
    try {
      serverSocket.send(data);
    } catch (_) {}
  });

  // Every message browser sends → forward to F1 (e.g. Subscribe commands)
  serverSocket.addEventListener("message", ({ data }) => {
    try {
      f1Socket.send(data);
    } catch (_) {}
  });

  // If either side disconnects, close the other
  f1Socket.addEventListener("close", ({ code, reason }) => {
    try {
      serverSocket.close(code, reason);
    } catch (_) {}
  });
  serverSocket.addEventListener("close", ({ code, reason }) => {
    try {
      f1Socket.close(code, reason);
    } catch (_) {}
  });

  f1Socket.addEventListener("error", (e) =>
    console.error("F1 socket error:", e)
  );

  // Return the client-side WebSocket to the browser
  return new Response(null, {
    status: 101,
    webSocket: clientSocket,
    headers: corsHeaders(),
  });
}

// ── CORS Headers Helper ───────────────────────────────────────────────────────
// These headers tell the browser: "yes, any website is allowed to use this Worker"
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}
