/** 검증: 배포된 앱이 시드에 없는 종목의 시가총액을 채우는가 */
const APP = "https://stock-dashboard-jaeyeon.vercel.app";
const TOSS_H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  accept: "application/json, text/plain, */*",
  referer: "https://tossinvest.com/", origin: "https://tossinvest.com",
};
// 시드 12종목 밖 — 예전이라면 에이전트 없이는 시총이 비었을 종목들
const CODES = ["005930", "035420", "042660", "247540", "012330", "010130", "011070", "003670"];

const q = await (await fetch(`${APP}/api/quotes?symbols=${CODES.join(",")}&cb=${Date.now()}`, { signal: AbortSignal.timeout(30000) })).json();
console.log("=== /api/quotes 응답 ===");
for (const x of q.quotes ?? q ?? []) console.log(`${x.symbol} ${String(x.name ?? "").padEnd(14)} ${x.price}원 상장주식수=${x.listedShares ?? "-"} src=${x.source}`);

const t = await (await fetch(`https://wts-info-api.tossinvest.com/api/v2/stock-infos?codes=${CODES.map(c=>"A"+c).join(",")}`, { headers: TOSS_H, signal: AbortSignal.timeout(15000) })).json();
console.log("\n=== 토스 권위값 대조 ===");
for (const r of t.result ?? []) console.log(`${r.symbol} ${String(r.name).padEnd(14)} 상장주식수=${r.sharesOutstanding}`);

console.log("\n=== 시드 교정 확인 (삼성전자) ===");
const s = (t.result ?? []).find((r) => r.symbol === "005930");
console.log(`토스 ${s?.sharesOutstanding} / 새 시드 5846278608 / 옛 시드 5969782550 → ${s?.sharesOutstanding === 5846278608 ? "시드가 권위값과 일치" : "재확인 필요"}`);
