// 미국 장마감 뒤 등락률 0.00% 원인 (읽기 전용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" };
const j = async (u, h = UA) => { try { const r = await fetch(u, { headers: h, signal: AbortSignal.timeout(20000) }); return { s: r.status, b: await r.json().catch(() => null) }; } catch (e) { return { s: String(e) }; } };
const out = { at: new Date().toISOString() };
out.app = (await j("https://stock-dashboard-jaeyeon.vercel.app/api/watchlist/quotes?symbols=GOOGL,AVGO,NVDA,AAPL,INTC")).b;
for (const s of ["GOOGL", "NVDA"]) {
  const d = await j(`https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=1mo&interval=1d`);
  const r = d.b?.chart?.result?.[0];
  out[`daily_${s}`] = { s: d.s, last: (r?.timestamp ?? []).slice(-4).map((t, i, a) => [new Date(t * 1000).toISOString(), r.indicators.quote[0].close.slice(-4)[i]]) };
  const m = await j(`https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=1d&interval=1m&includePrePost=true`);
  const mr = m.b?.chart?.result?.[0];
  const meta = mr?.meta ?? {};
  const ts = mr?.timestamp ?? [];
  out[`intra_${s}`] = { s: m.s, regularMarketPrice: meta.regularMarketPrice, regularMarketTime: meta.regularMarketTime && new Date(meta.regularMarketTime * 1000).toISOString(), chartPreviousClose: meta.chartPreviousClose, previousClose: meta.previousClose,
    ctp: meta.currentTradingPeriod && Object.fromEntries(Object.entries(meta.currentTradingPeriod).map(([k, v]) => [k, [new Date(v.start * 1000).toISOString(), new Date(v.end * 1000).toISOString()]])),
    bars: ts.length, first: ts[0] && new Date(ts[0] * 1000).toISOString(), last: ts.at(-1) && new Date(ts.at(-1) * 1000).toISOString() };
}
const T = { ...UA, Origin: "https://www.tossinvest.com", Referer: "https://www.tossinvest.com/" };
out.toss = (await j("https://wts-info-api.tossinvest.com/api/v3/stock-prices?meta=true&productCodes=US20040819002,US19990122001", T)).b;
writeFileSync("audit-out/zero-rate.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 5000));
