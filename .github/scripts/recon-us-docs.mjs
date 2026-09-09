/**
 * 미국 종목 시가총액 소스 전수 점검.
 * (1) 앱이 쓰는 야후 crumb 경로가 데이터센터 IP에서 실제로 되는가
 * (2) 후보 소스들이 서로 일치하는가 (한 소스만 믿지 않는다)
 */
import { mkdirSync, writeFileSync } from "node:fs";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
const BROWSER = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
};
const TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "INTC", "MU"];
const T = (n) => (n ? `$${(n / 1e12).toFixed(3)}T` : "-");

// ── (1) 앱과 동일한 crumb 흐름
console.log("=== 야후 crumb 흐름 (앱 코드와 동일) ===");
let auth = null;
try {
  const r1 = await fetch("https://fc.yahoo.com", { headers: UA, redirect: "manual", signal: AbortSignal.timeout(8000) });
  const cookie = r1.headers.get("set-cookie")?.split(";")[0] ?? "";
  console.log(`fc.yahoo.com HTTP ${r1.status} · 쿠키 ${cookie ? "획득" : "없음"}`);
  if (cookie) {
    const r2 = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", { headers: { ...UA, Cookie: cookie }, signal: AbortSignal.timeout(8000) });
    const crumb = (await r2.text()).trim();
    console.log(`getcrumb HTTP ${r2.status} · crumb "${crumb.slice(0, 20)}"`);
    if (r2.ok && crumb && !crumb.includes("{")) auth = { cookie, crumb };
  }
} catch (e) { console.log("crumb 실패:", String(e).slice(0, 80)); }
console.log(`→ crumb ${auth ? "사용 가능" : "사용 불가"}\n`);

const yahoo = new Map();
if (auth) {
  for (const t of TICKERS) {
    try {
      const u = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${t}?modules=price,defaultKeyStatistics&crumb=${encodeURIComponent(auth.crumb)}`;
      const r = await fetch(u, { headers: { ...UA, Cookie: auth.cookie }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) { console.log(`  ${t} quoteSummary HTTP ${r.status}`); continue; }
      const j = await r.json();
      const p = j?.quoteSummary?.result?.[0]?.price;
      const k = j?.quoteSummary?.result?.[0]?.defaultKeyStatistics;
      yahoo.set(t, { cap: Number(p?.marketCap?.raw ?? 0), price: Number(p?.regularMarketPrice?.raw ?? 0), shares: Number(k?.sharesOutstanding?.raw ?? 0) });
    } catch (e) { console.log(`  ${t} 실패 ${String(e).slice(0, 50)}`); }
    await new Promise(r => setTimeout(r, 150));
  }
}
console.log(`야후 수집: ${yahoo.size}/${TICKERS.length}\n`);

// ── (2) TradingView 미국 스캐너 (앱의 us-market.ts가 쓰는 것)
console.log("=== TradingView 미국 스캐너 ===");
const tv = new Map();
try {
  const r = await fetch("https://scanner.tradingview.com/america/scan", {
    method: "POST", headers: { "Content-Type": "application/json", ...BROWSER },
    body: JSON.stringify({
      symbols: { tickers: TICKERS.map((t) => `NASDAQ:${t}`).concat(TICKERS.map((t) => `NYSE:${t}`)) },
      columns: ["name", "close", "market_cap_basic", "total_shares_outstanding", "currency"],
    }),
    signal: AbortSignal.timeout(20000),
  });
  console.log(`HTTP ${r.status}`);
  const j = await r.json();
  for (const row of j.data ?? []) {
    const [name, close, cap, shares, cur] = row.d;
    if (!cap) continue;
    tv.set(String(name), { cap: Number(cap), price: Number(close), shares: Number(shares), cur });
  }
} catch (e) { console.log("실패:", String(e).slice(0, 90)); }
console.log(`TV 수집: ${tv.size}\n`);

// ── (3) stockanalysis.com (독립 검증용)
console.log("=== stockanalysis.com ===");
const sa = new Map();
for (const t of TICKERS) {
  try {
    const r = await fetch(`https://stockanalysis.com/api/symbol/s/${t.toLowerCase()}/overview`, { headers: BROWSER, signal: AbortSignal.timeout(10000) });
    if (!r.ok) { if (t === "AAPL") console.log(`  HTTP ${r.status}`); continue; }
    const j = await r.json();
    const d = j?.data ?? j;
    sa.set(t, { cap: Number(d?.marketCap ?? d?.info?.marketCap ?? 0), price: Number(d?.price ?? 0), shares: Number(d?.sharesOut ?? 0) });
  } catch (e) { if (t === "AAPL") console.log("  실패:", String(e).slice(0, 70)); }
  await new Promise(r => setTimeout(r, 150));
}
console.log(`stockanalysis 수집: ${sa.size}\n`);

// ── (4) 토스가 미국 종목도 들고 있나
console.log("=== 토스 미국 종목 탐색 ===");
for (const path of [
  "https://wts-info-api.tossinvest.com/api/v2/stock-infos?codes=US19801",
  "https://wts-info-api.tossinvest.com/api/v2/stock-infos?codes=AAPL",
  "https://wts-info-api.tossinvest.com/api/v2/stock-infos?codes=USAAPL",
]) {
  try {
    const r = await fetch(path, { headers: { ...BROWSER, referer: "https://tossinvest.com/", origin: "https://tossinvest.com" }, signal: AbortSignal.timeout(10000) });
    const txt = await r.text();
    console.log(`  ${path.split("codes=")[1]} → HTTP ${r.status} ${txt.slice(0, 150)}`);
  } catch (e) { console.log(`  실패 ${String(e).slice(0, 50)}`); }
}

// ── 대조
console.log(`\n${"=".repeat(78)}\n티커     야후            TradingView      stockanalysis    최대괴리\n${"=".repeat(78)}`);
const rows = [];
for (const t of TICKERS) {
  const y = yahoo.get(t)?.cap ?? 0, v = tv.get(t)?.cap ?? 0, s = sa.get(t)?.cap ?? 0;
  const vals = [y, v, s].filter((x) => x > 0);
  const gap = vals.length >= 2 ? (Math.max(...vals) - Math.min(...vals)) / Math.max(...vals) : null;
  rows.push({ ticker: t, yahoo: y, tv: v, sa: s, gap });
  console.log(`${t.padEnd(8)} ${T(y).padEnd(15)} ${T(v).padEnd(16)} ${T(s).padEnd(16)} ${gap === null ? "비교불가" : (gap * 100).toFixed(2) + "%"}`);
}
mkdirSync("audit-out", { recursive: true });
writeFileSync("audit-out/us-caps.json", JSON.stringify({ crumbOk: !!auth, rows, yahoo: [...yahoo], tv: [...tv], sa: [...sa] }, null, 1));
