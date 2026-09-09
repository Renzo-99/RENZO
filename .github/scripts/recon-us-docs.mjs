/**
 * 정찰: 채권·옵션 데이터 소스 가용성 (2026-09-09).
 */
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };

async function probe(label, url, headers = {}) {
  try {
    const res = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(20_000) });
    const text = await res.text();
    console.log(`\n===== ${label} =====\nHTTP ${res.status} · ${text.length}B · ${res.headers.get("content-type")}`);
    console.log(text.slice(0, 420).replace(/\n{2,}/g, "\n"));
  } catch (e) {
    console.log(`\n===== ${label} =====\n오류: ${e.message}`);
  }
}

// 1) 야후 — 국채 금리·변동성 심볼
for (const s of ["%5ETNX", "%5EFVX", "%5ETYX", "%5EIRX", "%5EVIX3M", "%5EVIX9D", "%5EVVIX"]) {
  await probe(`야후 ${decodeURIComponent(s)}`, `https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=5d&interval=1d`);
}
// 2) FRED CSV (키 불필요) — 장단기 스프레드·하이일드·기대인플레
for (const id of ["T10Y2Y", "T10Y3M", "BAMLH0A0HYM2", "T10YIE", "DFII10"]) {
  await probe(`FRED ${id}`, `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`);
}
// 3) CBOE 풋콜 비율
await probe("CBOE 일별 통계", "https://www.cboe.com/us/options/market_statistics/daily/");
await probe("CBOE 총 P/C CSV", "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv");
// 4) 한국 — 국고채·VKOSPI
await probe("KRX VKOSPI(지수 JSON)", "http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd", {});
await probe("네이버 채권 API", "https://api.stock.naver.com/marketindex/bond/KOR3Y");
await probe("네이버 국고채 3년", "https://polling.finance.naver.com/api/realtime/marketindex/bond/KOR3Y");
await probe("ECOS 키없이", "https://ecos.bok.or.kr/api/StatisticSearch/sample/json/kr/1/5/817Y002/D/20260901/20260908/010200000");
