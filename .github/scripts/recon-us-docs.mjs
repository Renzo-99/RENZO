// 재무 데이터 출처 정찰 (읽기 전용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const out = { at: new Date().toISOString() };
async function get(url, headers = {}) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json, text/html", ...headers }, signal: AbortSignal.timeout(20000), redirect: "follow" });
    const t = await r.text();
    return { status: r.status, len: t.length, text: t };
  } catch (e) { return { status: "ERR", err: String(e).slice(0, 120), text: "" }; }
}
const brief = (x, n = 300) => ({ status: x.status, len: x.len, head: (x.text || x.err || "").slice(0, n) });

// 1) 배포된 앱 재무 탭 (서버 렌더 HTML 안의 텍스트)
for (const c of ["NVDA", "AAPL", "TSM", "005930", "000660", "BRKA.VI"]) {
  const r = await get(`https://stock-dashboard-jaeyeon.vercel.app/stock/${c}`);
  const txt = r.text.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const i = txt.indexOf("출처:");
  const fail = txt.includes("재무 데이터를 가져오지 못했어요");
  out[`app_${c}`] = { status: r.status, fail, finance: i >= 0 ? txt.slice(i, i + 260) : null };
}
// 2) 지금 쓰는 출처
out.naverAnnual = brief(await get("https://m.stock.naver.com/api/stock/005930/finance/annual"), 200);
out.yahooNoCrumb = brief(await get("https://query2.finance.yahoo.com/v10/finance/quoteSummary/NVDA?modules=incomeStatementHistory"), 200);
// 3) 야후 crumb 방식
{
  const fc = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA }, redirect: "manual" }).catch(() => null);
  const cookie = (fc?.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  const crumb = await get("https://query2.finance.yahoo.com/v1/test/getcrumb", { Cookie: cookie });
  out.yahooCrumb = { cookie: cookie ? cookie.slice(0, 20) + "…" : null, crumbStatus: crumb.status, crumb: crumb.text.slice(0, 20) };
  if (crumb.status === 200 && crumb.text && crumb.text.length < 40) {
    const q = await get(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/NVDA?modules=incomeStatementHistory,incomeStatementHistoryQuarterly,balanceSheetHistory,cashflowStatementHistory,financialData,defaultKeyStatistics&crumb=${encodeURIComponent(crumb.text)}`, { Cookie: cookie });
    out.yahooWithCrumb = brief(q, 600);
    const ts = await get(`https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/NVDA?type=annualTotalRevenue,annualOperatingIncome,annualNetIncome,quarterlyTotalRevenue&period1=1577836800&period2=1893456000&crumb=${encodeURIComponent(crumb.text)}`, { Cookie: cookie });
    out.yahooTimeseries = brief(ts, 400);
  }
}
// 4) 나스닥
out.nasdaqAnnual = brief(await get("https://api.nasdaq.com/api/company/NVDA/financials?frequency=1", { Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" }), 700);
out.nasdaqTSM = brief(await get("https://api.nasdaq.com/api/company/TSM/financials?frequency=2", { Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" }), 300);
// 5) SEC
const secUA = { "User-Agent": "stock-dashboard research contact@example.com" };
const tick = await get("https://www.sec.gov/files/company_tickers.json", secUA);
out.secTickers = { status: tick.status, len: tick.len, nvda: (tick.text.match(/"cik_str":\d+,"ticker":"NVDA"/) || [null])[0] };
out.secFacts = brief(await get("https://data.sec.gov/api/xbrl/companyconcept/CIK0001045810/us-gaap/Revenues.json", secUA), 300);
// 6) 토스 추정 경로
const TH = { Origin: "https://www.tossinvest.com", Referer: "https://www.tossinvest.com/" };
for (const [k, u] of Object.entries({
  t1: "https://wts-info-api.tossinvest.com/api/v1/stock-infos/US19990122001/financial-statements?period=YEAR",
  t2: "https://wts-info-api.tossinvest.com/api/v2/stock-infos/US19990122001/financials",
  t3: "https://wts-info-api.tossinvest.com/api/v1/financial/US19990122001/income-statement?period=year",
  t4: "https://wts-info-api.tossinvest.com/api/v1/stock-detail/ui/US19990122001/financials",
  t5: "https://wts-info-api.tossinvest.com/api/v2/stock-infos/A005930/financial-statements",
})) out[`toss_${k}`] = brief(await get(u, TH), 200);
writeFileSync("audit-out/fin-recon.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 8000));
