/** 정찰: 토스 대시보드 지표 API 전체 응답에서 금리(국고채) 항목 찾기 */
const UA = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
  referer: "https://tossinvest.com/",
  origin: "https://tossinvest.com",
};
async function show(label, url) {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(12000) });
    const text = await res.text();
    console.log(`\n===== ${label} [${res.status}] ${text.length}B =====`);
    let body;
    try { body = JSON.parse(text); } catch { console.log(text.slice(0, 300)); return; }
    const items = body?.result?.indicators ?? body?.result?.majorIndicatorInfos ?? body?.result?.exchangeRates ?? [];
    if (Array.isArray(items) && items.length) {
      for (const it of items) {
        const price = it.price ?? it;
        console.log(`  code=${it.code} name=${it.displayName ?? it.name} nation=${it.nation ?? "-"} ` +
          `latest=${price.latestPrice ?? price.close ?? price.base ?? "-"} type=${it.indicatorType ?? it.type ?? "-"}`);
      }
    } else {
      console.log(JSON.stringify(body).slice(0, 900));
    }
    // 금리/채권 키워드 위치
    const hit = text.match(/.{60}(국고채|금리|채권|bond|yield|treasury).{80}/gi);
    if (hit) console.log("  ★키워드 주변:", hit.slice(0, 5).join("\n   "));
  } catch (e) {
    console.log(`\n===== ${label} =====\n오류: ${e.message}`);
  }
}
const CERT = "https://wts-cert-api.tossinvest.com";
const INFO = "https://wts-info-api.tossinvest.com";
await show("v4 대시보드 지표(전체)", `${CERT}/api/v4/dashboard/wts/overview/indicator`);
await show("v1 지수 kr", `${CERT}/api/v1/dashboard/wts/overview/indicator/index?market=kr`);
await show("v1 지수 us", `${CERT}/api/v1/dashboard/wts/overview/indicator/index?market=us`);
await show("환율/달러인덱스", `${INFO}/api/v1/dashboard/wts/overview/exchange-rates`);
// 금리 전용 후보
for (const p of ["/api/v1/dashboard/wts/overview/indicator/interest-rate", "/api/v4/dashboard/wts/overview/indicator?type=RATE", "/api/v1/dashboard/wts/overview/indicator/bond"]) {
  await show(`후보 ${p}`, `${CERT}${p}`);
}
