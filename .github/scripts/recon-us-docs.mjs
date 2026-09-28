// 배포된 와치리스트 시세가 구간별로 맞게 나오는지 토스 원본과 대조 (읽기 전용 GET)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(200_000); // 배포 대기
const H = { "User-Agent": "Mozilla/5.0", Accept: "application/json", Origin: "https://www.tossinvest.com", Referer: "https://www.tossinvest.com/" };
const j = async (u, h = {}) => { try { const r = await fetch(u, { headers: h, signal: AbortSignal.timeout(20000) }); return await r.json(); } catch (e) { return { error: String(e) }; } };
const out = { at: new Date().toISOString() };
out.app = await j("https://stock-dashboard-jaeyeon.vercel.app/api/watchlist/quotes?symbols=005930,000660,095570,NVDA,AAPL");
out.toss = await j("https://wts-info-api.tossinvest.com/api/v3/stock-prices?meta=true&productCodes=A005930,A000660,A095570,US19990122001,US19801212001", H);
writeFileSync("audit-out/watch-split.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 4000));
