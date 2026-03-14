export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Always handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      // WebSocket upgrade
      if (request.headers.get("Upgrade") === "websocket") {
        return handleWebSocket(request, url);
      }
      return handleHttp(request, url);
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }
  },
};

async function handleHttp(request, url) {
  const targetUrl = "https://livetiming.formula1.com" + url.pathname + url.search;

  let response;
  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        "User-Agent": "BestHTTP",
        "Accept-Encoding": "gzip, identity",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "F1 fetch failed: " + e.message }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }

  const body = await response.text();
  const f1Cookie = response.headers.get("set-cookie") || "";
  const cookieValue = f1Cookie.split(";")[0].trim();

  let enrichedBody = body;
  try {
    const parsed = JSON.parse(body);
    parsed._f1Cookie = cookieValue;
    enrichedBody = JSON.stringify(parsed);
  } catch (_) { }

  return new Response(enrichedBody, {
    status: response.status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

async function handleWebSocket(request, url) {
  const f1Cookie = url.searchParams.get("f1cookie") || "";
  const targetParams = new URLSearchParams(url.search);
  targetParams.delete("f1cookie");
  const targetUrl =
    "https://livetiming.formula1.com" + url.pathname + "?" + targetParams.toString();

  console.log("WS target URL:", targetUrl);
  console.log("Cookie present:", !!f1Cookie);

  const { 0: clientSocket, 1: serverSocket } = new WebSocketPair();

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
    console.log("F1 response status:", f1Response.status);
    console.log("F1 webSocket exists:", !!f1Response.webSocket);
    f1Socket = f1Response.webSocket;
    if (!f1Socket) throw new Error("No WebSocket in F1 response");
  } catch (e) {
    console.log("F1 connection error:", e.message);
    return new Response("Failed to connect to F1: " + e.message, { status: 502 });
  }

  console.log("Bridge established successfully");
  // ... rest of the function unchanged

  f1Socket.accept();
  serverSocket.accept();

  f1Socket.addEventListener("message", ({ data }) => { try { serverSocket.send(data); } catch (_) { } });
  serverSocket.addEventListener("message", ({ data }) => { try { f1Socket.send(data); } catch (_) { } });
  f1Socket.addEventListener("close", ({ code, reason }) => { try { serverSocket.close(code, reason); } catch (_) { } });
  serverSocket.addEventListener("close", ({ code, reason }) => { try { f1Socket.close(code, reason); } catch (_) { } });

  return new Response(null, {
    status: 101,
    webSocket: clientSocket,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}