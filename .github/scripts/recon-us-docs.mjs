// 토스 번들에서 재무 API 호출 정의(방식·본문) 뽑기 + POST 시도 (읽기 전용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const get = async (u) => { try { const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) }); return await r.text(); } catch { return ""; } };
const page = await get("https://www.tossinvest.com/stocks/US19990122001/analytics");
const srcs = [...page.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => new URL(m[1], "https://www.tossinvest.com").href);
const base = srcs.find((s) => s.includes("/_next/static/"))?.split("/_next/static/")[0];
const queue = [...srcs]; const seen = new Set(srcs);
for (const s of srcs) {
  const t = await get(s);
  for (const m of t.matchAll(/\{((?:\d+:"[0-9a-f]{8,20}",?){20,})\}/g)) for (const p of m[1].matchAll(/(\d+):"([0-9a-f]{8,20})"/g)) {
    const u = `${base}/_next/static/chunks/${p[1]}.${p[2]}.js`; if (!seen.has(u)) { seen.add(u); queue.push(u); }
  }
}
const keys = ["financial-statements/comprehensive", "financial-statement-records", "financial/estimate/revenue", "stock-infos/stability", "stock-infos/evaluation/", "operating-income/", "sales-compositions"];
const out = { at: new Date().toISOString(), defs: {} };
for (const u of queue) {
  const t = await get(u);
  for (const k of keys) {
    let i = -1;
    while ((i = t.indexOf(k, i + 1)) >= 0) {
      (out.defs[k] ??= []);
      if (out.defs[k].length < 4) out.defs[k].push(t.slice(Math.max(0, i - 500), i + 500).replace(/\s+/g, " "));
    }
  }
}
// POST 시도
const H = { "User-Agent": UA, Accept: "application/json", "Content-Type": "application/json", Origin: "https://www.tossinvest.com", Referer: "https://www.tossinvest.com/" };
const T = "https://wts-info-api.tossinvest.com";
const post = async (p, body) => { try { const r = await fetch(T + p, { method: "POST", headers: H, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) }); return { s: r.status, t: (await r.text()).slice(0, 1500) }; } catch (e) { return { s: "ERR", t: String(e) }; } };
out.post = {
  comp_empty: await post("/api/v2/companies/NAS00208X-E0/financial-statements/comprehensive", {}),
  rec_empty: await post("/api/v2/companies/US19990122001/financial-statement-records", {}),
  stab_empty: await post("/api/v2/stock-infos/stability/US19990122001", {}),
};
writeFileSync("audit-out/toss-fin-defs.json", JSON.stringify(out, null, 1));
console.log("ok");
