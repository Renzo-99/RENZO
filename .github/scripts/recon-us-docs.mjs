/** 확정: 나머지 10개 코드가 정말 상장폐지인지 — 네이버 검색 + TV 심볼검색으로 교차 확인 */
import { mkdirSync, writeFileSync } from "node:fs";
const H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
};

const T = [
  ["012510", "더존비즈온"], ["031440", "신세계푸드"], ["057050", "현대홈쇼핑"],
  ["082640", "동양생명"], ["203690", "아크솔루션스"], ["222160", "NPX"],
  ["299900", "위지윅스튜디오"], ["467930", "IBKS제23호스팩"],
  ["469880", "하나30호스팩"], ["471050", "대신밸런스제17호스팩"],
];
// 대조군 — 살아 있는 종목이 같은 검사를 어떻게 통과하는지 확인
const CONTROL = [["094800", "맵스리얼티"], ["005930", "삼성전자"]];

async function probe(code, name) {
  const out = { code, name };
  // (1) 네이버 종목 검색 — 코드로
  try {
    const r = await fetch(`https://m.stock.naver.com/api/search/stock?query=${code}&target=stock`, { headers: H, signal: AbortSignal.timeout(12000) });
    const j = r.ok ? await r.json() : null;
    const items = j?.stocks ?? j?.result?.stocks ?? j?.items ?? [];
    out.naverByCode = r.ok ? items.slice(0, 3).map((x) => `${x.reutersCode ?? x.itemCode ?? x.cd}:${x.stockName ?? x.nm}:${x.stockEndType ?? ""}`) : `HTTP ${r.status}`;
  } catch (e) { out.naverByCode = String(e).slice(0, 50); }
  // (2) 네이버 종목 검색 — 이름으로 (사명변경·합병 후속 코드 탐지)
  try {
    const r = await fetch(`https://m.stock.naver.com/api/search/stock?query=${encodeURIComponent(name)}&target=stock`, { headers: H, signal: AbortSignal.timeout(12000) });
    const j = r.ok ? await r.json() : null;
    const items = j?.stocks ?? j?.result?.stocks ?? j?.items ?? [];
    out.naverByName = r.ok ? items.slice(0, 3).map((x) => `${x.reutersCode ?? x.itemCode ?? x.cd}:${x.stockName ?? x.nm}`) : `HTTP ${r.status}`;
  } catch (e) { out.naverByName = String(e).slice(0, 50); }
  // (3) TradingView 심볼 검색
  try {
    const r = await fetch(`https://symbol-search.tradingview.com/symbol_search/?text=${code}&exchange=&type=stock&hl=0&lang=ko&domain=production`, { headers: { ...H, referer: "https://www.tradingview.com/" }, signal: AbortSignal.timeout(12000) });
    const j = r.ok ? await r.json() : null;
    const arr = Array.isArray(j) ? j : (j?.symbols ?? []);
    out.tv = r.ok ? arr.slice(0, 3).map((x) => `${x.exchange}:${x.symbol}:${String(x.description ?? "").slice(0, 20)}`) : `HTTP ${r.status}`;
  } catch (e) { out.tv = String(e).slice(0, 50); }
  return out;
}

const rows = [];
console.log("=== 확인 대상 10개 ===");
for (const [c, n] of T) { const r = await probe(c, n); rows.push(r); console.log(`\n${c} ${n}\n  네이버(코드): ${JSON.stringify(r.naverByCode)}\n  네이버(이름): ${JSON.stringify(r.naverByName)}\n  TV: ${JSON.stringify(r.tv)}`); await new Promise(x=>setTimeout(x,250)); }
console.log("\n\n=== 대조군(살아 있는 종목) ===");
for (const [c, n] of CONTROL) { const r = await probe(c, n); console.log(`\n${c} ${n}\n  네이버(코드): ${JSON.stringify(r.naverByCode)}\n  네이버(이름): ${JSON.stringify(r.naverByName)}\n  TV: ${JSON.stringify(r.tv)}`); await new Promise(x=>setTimeout(x,250)); }

mkdirSync("audit-out", { recursive: true });
writeFileSync("audit-out/delist-check.json", JSON.stringify(rows, null, 1));
