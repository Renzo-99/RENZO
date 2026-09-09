/** 정찰: 토스 채권 지표 응답의 정확한 필드 구조 (전일대비 계산 가능한지) */
const UA = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
  referer: "https://tossinvest.com/",
  origin: "https://tossinvest.com",
};
const res = await fetch("https://wts-cert-api.tossinvest.com/api/v1/dashboard/wts/overview/indicator/bond", {
  headers: UA, signal: AbortSignal.timeout(12000),
});
const body = await res.json();
const items = body?.result?.indicators ?? [];
console.log(`HTTP ${res.status} · 항목 ${items.length}개`);
console.log("\n=== 첫 항목 전체 ===");
console.log(JSON.stringify(items[0], null, 1).slice(0, 1600));
console.log("\n=== 한국 10년 전체 ===");
console.log(JSON.stringify(items.find((i) => i.code === "KR1BENCH0010"), null, 1).slice(0, 1600));
console.log("\n=== 코드·이름·값 요약 ===");
for (const it of items) {
  const p = it.price ?? {};
  console.log(`${it.code} | ${it.displayName} | ${it.nation} | latest=${p.latestPrice} base=${p.base ?? "-"} close=${p.close ?? "-"} chg=${p.change ?? "-"} rate=${p.changeRate ?? "-"} type=${p.changeType ?? "-"} at=${p.dateTime ?? p.updatedAt ?? "-"}`);
}
