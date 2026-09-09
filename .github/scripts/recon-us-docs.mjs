/** 마스터에 남겨둔 토스 미확인 11개 코드 — 상장폐지인지 개별 확인 */
import { mkdirSync, writeFileSync } from "node:fs";

const NAVER_H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
};
const TOSS_H = { ...NAVER_H, referer: "https://tossinvest.com/", origin: "https://tossinvest.com" };

const TARGETS = [
  ["012510", "더존비즈온"], ["031440", "신세계푸드"], ["057050", "현대홈쇼핑"],
  ["082640", "동양생명"], ["094800", "맵스리얼티"], ["203690", "아크솔루션스"],
  ["222160", "NPX"], ["299900", "위지윅스튜디오"], ["467930", "IBKS제23호스팩"],
  ["469880", "하나30호스팩"], ["471050", "대신밸런스제17호스팩"],
];

const results = [];
for (const [code, oldName] of TARGETS) {
  const row = { code, oldName, naver: null, tossByCode: null, tossSearch: null };

  // 1) 네이버 — 상폐 종목도 흔적이 남는다
  try {
    const r = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, { headers: NAVER_H, signal: AbortSignal.timeout(12000) });
    if (r.ok) {
      const b = await r.json();
      row.naver = {
        name: b.stockName, close: b.closePrice, exch: b.stockExchangeType?.name,
        tradable: b.tradableStatus, tradableCode: b.tradableStatusCode,
        stopType: b.tradeStopType, endType: b.stockEndType, at: b.localTradedAt,
      };
    } else row.naver = { httpError: r.status };
  } catch (e) { row.naver = { err: String(e).slice(0, 60) }; }

  // 2) 토스 — 코드 직접 조회 재확인
  try {
    const r = await fetch(`https://wts-info-api.tossinvest.com/api/v2/stock-infos?codes=A${code}`, { headers: TOSS_H, signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    row.tossByCode = (j.result ?? []).length > 0 ? j.result[0] : `빈 결과 (HTTP ${r.status})`;
  } catch (e) { row.tossByCode = String(e).slice(0, 60); }

  // 3) 토스 — 이름으로 검색해 후속 코드(합병·사명변경)가 있는지
  try {
    const r = await fetch(`https://wts-info-api.tossinvest.com/api/v2/search/wts-auto-complete/wts-search-all?query=${encodeURIComponent(oldName)}`, { headers: TOSS_H, signal: AbortSignal.timeout(10000) });
    if (r.ok) {
      const j = await r.json();
      const txt = JSON.stringify(j);
      row.tossSearch = txt.length > 400 ? txt.slice(0, 400) + "…" : txt;
    } else row.tossSearch = `HTTP ${r.status}`;
  } catch (e) { row.tossSearch = String(e).slice(0, 60); }

  results.push(row);
  console.log(`\n${"─".repeat(58)}\n${code} ${oldName}`);
  console.log("  네이버:", JSON.stringify(row.naver));
  console.log("  토스코드:", typeof row.tossByCode === "string" ? row.tossByCode : JSON.stringify({ name: row.tossByCode.name, market: row.tossByCode.market?.displayName, shares: row.tossByCode.sharesOutstanding, delist: row.tossByCode.delistDate }));
  console.log("  토스검색:", String(row.tossSearch).slice(0, 260));
  await new Promise((r) => setTimeout(r, 200));
}

mkdirSync("audit-out", { recursive: true });
writeFileSync("audit-out/orphans.json", JSON.stringify(results, null, 1));
