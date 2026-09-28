// 장 구간별 시세 정찰 (읽기 전용) — 토스 국내/미국 현재가 필드, 야후 분봉 프리·애프터
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const H = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "application/json", Origin: "https://www.tossinvest.com", Referer: "https://www.tossinvest.com/" };
const out = { at: new Date().toISOString() };
async function j(url, opt = {}) {
  try { const r = await fetch(url, { headers: H, ...opt, signal: AbortSignal.timeout(15000) }); const t = await r.text(); try { return { status: r.status, body: JSON.parse(t) }; } catch { return { status: r.status, text: t.slice(0, 400) }; } }
  catch (e) { return { error: String(e) }; }
}
const T = "https://wts-info-api.tossinvest.com";
out.tossKr = await j(`${T}/api/v3/stock-prices?meta=true&productCodes=A005930,A000660`);
out.tossUs = await j(`${T}/api/v3/stock-prices?meta=true&productCodes=US19801212001,US19990122001`);
out.tossUsNoMeta = await j(`${T}/api/v3/stock-prices?productCodes=US19990122001`);
out.tossKrMin = await j(`${T}/api/v1/c-chart/kr-s/A005930/min:1?count=3`);
out.tossUsMin = await j(`${T}/api/v1/c-chart/us-s/US19990122001/min:1?count=3`);
const y = await j("https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=1d&interval=1m&includePrePost=true");
const r = y.body?.chart?.result?.[0];
if (r) {
  const ts = r.timestamp ?? [], c = r.indicators?.quote?.[0]?.close ?? [];
  const tail = []; for (let i = Math.max(0, ts.length - 3); i < ts.length; i++) tail.push([new Date(ts[i] * 1000).toISOString(), c[i]]);
  out.yahoo1m = { status: y.status, meta: r.meta, bars: ts.length, tail };
} else out.yahoo1m = y;
const y2 = await j("https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=5d&interval=5m&includePrePost=true");
const r2 = y2.body?.chart?.result?.[0];
out.yahoo5d = r2 ? { meta: { currentTradingPeriod: r2.meta?.currentTradingPeriod, regularMarketPrice: r2.meta?.regularMarketPrice, chartPreviousClose: r2.meta?.chartPreviousClose, previousClose: r2.meta?.previousClose }, bars: r2.timestamp?.length } : y2;
writeFileSync("audit-out/session-recon.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
