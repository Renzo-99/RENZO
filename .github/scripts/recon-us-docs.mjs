// 토스 웹 — 지연 로드 청크까지 받아 종목 재무 API 경로 찾기 (읽기 전용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const get = async (u) => { try { const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) }); return { s: r.status, t: await r.text() }; } catch { return { s: "ERR", t: "" }; } };
const page = await get("https://www.tossinvest.com/stocks/US19990122001/analytics");
const srcs = [...page.t.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => new URL(m[1], "https://www.tossinvest.com").href);
const base = srcs.find((s) => s.includes("/_next/static/"))?.split("/_next/static/")[0];
const seen = new Set(srcs);
const queue = [...srcs];
// 런타임에서 청크 id → 해시 표를 뽑아 모든 청크 주소를 만든다
for (const s of srcs) {
  const r = await get(s);
  if (!/static\/chunks\//.test(r.t)) continue;
  for (const m of r.t.matchAll(/\{((?:\d+:"[0-9a-f]{8,20}",?){20,})\}/g)) {
    for (const p of m[1].matchAll(/(\d+):"([0-9a-f]{8,20})"/g)) {
      const u = `${base}/_next/static/chunks/${p[1]}.${p[2]}.js`;
      if (!seen.has(u)) { seen.add(u); queue.push(u); }
    }
  }
}
const out = { at: new Date().toISOString(), base, total: queue.length, stockInfos: {}, fin: {}, ctx: [] };
const pathRe = /["'`](\/api\/v\d+\/[^"'`\s]{3,160})["'`]/g;
let fetched = 0;
for (const u of queue) {
  if (fetched++ > 1500) break;
  const r = await get(u);
  for (const m of r.t.matchAll(pathRe)) {
    const p = m[1];
    if (/stock-infos|stocks?\/|stock-detail|company|financ|statement|income|revenue|earning|indicator|valuation|dividend/i.test(p) && !/lending|transfer|promotion|account|profit\//.test(p)) {
      out.stockInfos[p] = (out.stockInfos[p] ?? 0) + 1;
      if (/financ|statement|income|revenue|earning|indicator|valuation/i.test(p) && out.ctx.length < 30) out.ctx.push(r.t.slice(Math.max(0, m.index - 200), m.index + 200).replace(/\s+/g, " "));
    }
  }
}
out.fetched = fetched;
writeFileSync("audit-out/toss-fin-api2.json", JSON.stringify(out, null, 1));
console.log(Object.keys(out.stockInfos).length);
