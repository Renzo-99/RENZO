// 티커 → 토스 코드 (code-or-symbol) 호출 방식 확인 (읽기 전용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const gett = async (u) => { try { const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) }); return await r.text(); } catch { return ""; } };
const page = await gett("https://www.tossinvest.com/stocks/US19990122001/analytics");
const srcs = [...page.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => new URL(m[1], "https://www.tossinvest.com").href);
const base = srcs.find((s) => s.includes("/_next/static/"))?.split("/_next/static/")[0];
const queue = [...srcs]; const seen = new Set(srcs);
for (const s of srcs) { const t = await gett(s); for (const m of t.matchAll(/\{((?:\d+:"[0-9a-f]{8,20}",?){20,})\}/g)) for (const p of m[1].matchAll(/(\d+):"([0-9a-f]{8,20})"/g)) { const u = `${base}/_next/static/chunks/${p[1]}.${p[2]}.js`; if (!seen.has(u)) { seen.add(u); queue.push(u); } } }
const out = { at: new Date().toISOString(), ctx: [], tries: {} };
for (const u of queue) { const t = await gett(u); let i = -1; while ((i = t.indexOf("code-or-symbol", i + 1)) >= 0 && out.ctx.length < 4) out.ctx.push(t.slice(Math.max(0, i - 400), i + 400).replace(/\s+/g, " ")); }
const H = { "User-Agent": UA, Accept: "application/json", "Content-Type": "application/json", Origin: "https://www.tossinvest.com", Referer: "https://www.tossinvest.com/" };
const T = "https://wts-info-api.tossinvest.com/api/v2/stock-infos/code-or-symbol";
for (const [k, u, m, b] of [
  ["get_codeOrSymbol", `${T}?codeOrSymbol=NVDA`, "GET"], ["get_code", `${T}?code=NVDA`, "GET"], ["get_symbol", `${T}?symbol=NVDA`, "GET"], ["get_path", `${T}/NVDA`, "GET"],
  ["post_list", T, "POST", { codeOrSymbols: ["NVDA", "BRK.B", "005930"] }], ["post_codes", T, "POST", { codes: ["NVDA"] }],
]) { try { const r = await fetch(u, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined, signal: AbortSignal.timeout(15000) }); out.tries[k] = { s: r.status, t: (await r.text()).slice(0, 500) }; } catch (e) { out.tries[k] = String(e); } }
writeFileSync("audit-out/toss-symbol.json", JSON.stringify(out, null, 1));
console.log("ok");
