// 스톡나우 MCP 정찰 — 인증 필요 여부·도구 목록 (읽기 전용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const URL_ = "https://mcp.stocknow.ai/mcp";
const out = { at: new Date().toISOString() };
let sid = null;
async function rpc(method, params, id) {
  const h = { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" };
  if (sid) h["mcp-session-id"] = sid;
  const r = await fetch(URL_, { method: "POST", headers: h, body: JSON.stringify(id === undefined ? { jsonrpc: "2.0", method, params } : { jsonrpc: "2.0", id, method, params }), signal: AbortSignal.timeout(30000) });
  sid = r.headers.get("mcp-session-id") ?? sid;
  const text = await r.text();
  let body = text;
  const m = text.match(/^data: (.*)$/m); if (m) body = m[1];
  try { body = JSON.parse(body); } catch {}
  return { status: r.status, auth: r.headers.get("www-authenticate"), ctype: r.headers.get("content-type"), body: typeof body === "string" ? body.slice(0, 800) : body };
}
try {
  out.init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "stock-dashboard", version: "1" } }, 1);
  if (out.init.status === 200) {
    await rpc("notifications/initialized", {}, undefined);
    out.tools = await rpc("tools/list", {}, 2);
  }
} catch (e) { out.err = String(e); }
out.wellKnown = await fetch("https://mcp.stocknow.ai/.well-known/oauth-protected-resource").then(async (r) => ({ s: r.status, t: (await r.text()).slice(0, 500) })).catch((e) => String(e));
writeFileSync("audit-out/stocknow.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 3000));
