/**
 * 확정: 상장폐지 여부를 '마지막 거래일'로 판정.
 * 야후 일봉은 상폐 종목도 과거 데이터를 주되 최근 봉이 끊긴다 —
 * 존재/부재가 아니라 '언제까지 거래됐나'로 보면 오탐이 없다.
 * 살아 있는 종목을 대조군으로 함께 돌려 판정 기준 자체를 검증한다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
const H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
};

const SUSPECT = [
  ["012510", "더존비즈온"], ["031440", "신세계푸드"], ["057050", "현대홈쇼핑"],
  ["082640", "동양생명"], ["203690", "아크솔루션스"], ["222160", "NPX"],
  ["299900", "위지윅스튜디오"], ["467930", "IBKS제23호스팩"],
  ["469880", "하나30호스팩"], ["471050", "대신밸런스제17호스팩"],
];
const CONTROL = [
  ["094800", "맵스리얼티(네이버상 거래중)"], ["005930", "삼성전자"],
  ["001000", "신라섬유(거래정지)"], ["019680", "대교(거래정지)"],
];

/** 야후에서 마지막 거래일·종가 — .KS(코스피)/.KQ(코스닥) 둘 다 시도 */
async function lastTrade(code) {
  for (const sfx of [".KS", ".KQ"]) {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${code}${sfx}?range=3mo&interval=1d`, { headers: H, signal: AbortSignal.timeout(12000) });
      if (!r.ok) continue;
      const j = await r.json();
      const res = j?.chart?.result?.[0];
      const ts = res?.timestamp ?? [];
      const close = res?.indicators?.quote?.[0]?.close ?? [];
      if (ts.length === 0) continue;
      // 마지막으로 종가가 있는 봉
      let i = close.length - 1;
      while (i >= 0 && (close[i] === null || close[i] === undefined)) i--;
      if (i < 0) continue;
      return { sfx, date: new Date(ts[i] * 1000).toISOString().slice(0, 10), close: close[i], bars: ts.length };
    } catch { /* 다음 접미사 */ }
  }
  return null;
}

const today = new Date().toISOString().slice(0, 10);
console.log(`오늘(UTC) ${today}\n`);

async function report(list, title) {
  console.log(`\n${"=".repeat(64)}\n${title}\n${"=".repeat(64)}`);
  const rows = [];
  for (const [code, name] of list) {
    const lt = await lastTrade(code);
    let verdict;
    if (!lt) verdict = "야후에도 없음";
    else {
      const days = Math.round((Date.parse(today) - Date.parse(lt.date)) / 86400000);
      verdict = days <= 5 ? `거래중 (${days}일 전)` : `${days}일째 거래 없음`;
    }
    rows.push({ code, name, ...(lt ?? {}), verdict });
    console.log(`${code} ${name.padEnd(22)} ${lt ? `${lt.sfx} 마지막 ${lt.date} 종가 ${lt.close?.toFixed?.(0) ?? lt.close} (봉 ${lt.bars})` : "데이터 없음"}  → ${verdict}`);
    await new Promise((r) => setTimeout(r, 200));
  }
  return rows;
}

const suspect = await report(SUSPECT, "확인 대상 10개");
const control = await report(CONTROL, "대조군 — 판정 기준이 옳은지 검증");

mkdirSync("audit-out", { recursive: true });
writeFileSync("audit-out/last-trade.json", JSON.stringify({ today, suspect, control }, null, 1));
