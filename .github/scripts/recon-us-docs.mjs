// 토스 웹 번들에서 재무 API 경로 찾기 (읽기 전용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const get = async (u) => { try { const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) }); return { s: r.status, t: await r.text() }; } catch (e) { return { s: "ERR", t: "" }; } };
const out = { at: new Date().toISOString(), pages: {}, hits: {} };
const scripts = new Set();
for (const path of ["/stocks/US19990122001/analytics", "/stocks/A005930/analytics", "/stocks/US19990122001/order"]) {
  const r = await get("https://www.tossinvest.com" + path);
  out.pages[path] = { s: r.s, len: r.t.length };
  for (const m of r.t.matchAll(/(?:src|href)="([^"]+\.js)"/g)) scripts.add(new URL(m[1], "https://www.tossinvest.com").href);
}
out.scriptCount = scripts.size;
const pat = /["'`](\/api\/v\d+\/[A-Za-z0-9\-_/${}.:]*?(?:financ|income|statement|balance|cash-?flow|revenue|earning|profit|indicator|ratio|valuation)[A-Za-z0-9\-_/${}.:?=&]*)["'`]/gi;
const ctx = [];
let n = 0;
for (const s of scripts) {
  if (n++ > 400) break;
  const r = await get(s);
  for (const m of r.t.matchAll(pat)) {
    out.hits[m[1]] = (out.hits[m[1]] ?? 0) + 1;
    if (ctx.length < 40) ctx.push(r.t.slice(Math.max(0, m.index - 120), m.index + 160).replace(/\s+/g, " "));
  }
}
out.ctx = ctx;
writeFileSync("audit-out/toss-fin-api.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
