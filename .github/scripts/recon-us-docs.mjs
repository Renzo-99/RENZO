/** 정찰 2차: FRED 대체 소스 — 미 재무부 공식 수익률곡선, 야후 2년물, CBOE 풋콜, ECOS 10년물 */
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };
async function probe(label, url, headers = {}, ms = 12000) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(ms) });
    const text = await res.text();
    console.log(`\n===== ${label} (${Date.now() - t0}ms) =====\nHTTP ${res.status} · ${text.length}B · ${res.headers.get("content-type")}`);
    console.log(text.slice(0, 500).replace(/\n{2,}/g, "\n"));
  } catch (e) {
    console.log(`\n===== ${label} (${Date.now() - t0}ms) =====\n오류: ${e.message}`);
  }
}
const y = new Date().getUTCFullYear();
// 1) 미 재무부 공식 일별 수익률 곡선 (키 불필요)
await probe("재무부 수익률곡선 XML", `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${y}`);
await probe("재무부 수익률곡선 CSV", `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${y}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${y}&page&_format=csv`);
// 2) FRED 대체 경로
await probe("FRED txt", "https://fred.stlouisfed.org/data/T10Y2Y.txt", {}, 8000);
await probe("stlouisfed api(키없음)", "https://api.stlouisfed.org/fred/series/observations?series_id=T10Y2Y&file_type=json", {}, 8000);
// 3) 야후 2년물·신용 프록시
for (const s of ["2YY%3DF", "%5EUST2Y", "HYG", "LQD", "TLT", "IEF"]) {
  await probe(`야후 ${decodeURIComponent(s)}`, `https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=5d&interval=1d`);
}
// 4) CBOE 풋콜 비율 후보
await probe("CBOE 풋콜 일별 CSV", "https://cdn.cboe.com/api/global/us_indices/daily_prices/PUT_History.csv", {}, 10000);
await probe("CBOE 시장통계 JSON", "https://www.cboe.com/us/options/market_statistics/daily/json/", {}, 10000);
// 5) ECOS 국고채 10년 (샘플키)
await probe("ECOS 국고채10년", "https://ecos.bok.or.kr/api/StatisticSearch/sample/json/kr/1/5/817Y002/D/20260901/20260908/010210000");
