/** 진단: ECOS 실패 원인 좁히기 — 러너(공개망)에서 sample 키가 아직 되는지 + 대체 소스 */
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };
async function probe(label, url, ms = 12000) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
    const text = await res.text();
    console.log(`\n===== ${label} (${Date.now() - t0}ms) HTTP ${res.status} =====`);
    console.log(text.slice(0, 320).replace(/\s+/g, " "));
  } catch (e) {
    console.log(`\n===== ${label} =====\n오류: ${e.message}`);
  }
}
const end = new Date(), start = new Date(end.getTime() - 30 * 86400000);
const f = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
await probe("ECOS sample 국고채3년", `https://ecos.bok.or.kr/api/StatisticSearch/sample/json/kr/1/40/817Y002/D/${f(start)}/${f(end)}/010200000`);
// 대체 후보들
await probe("KOFIA 채권 시가평가", "https://www.kofiabond.or.kr/proxy/websquare/getBondYieldInfo.do");
await probe("e-나라지표 국고채", "https://www.index.go.kr/unity/openApi/xml_stts.do?idntfcId=&statsCode=1073");
await probe("네이버 금융 채권 페이지", "https://finance.naver.com/marketindex/bondList.naver");
await probe("investing 대체(코스콤 fnguide류)", "https://api.stock.naver.com/marketindex/exchange/FX_USDKRW");
