/** 정찰: 미 국채 — 재무부 공식 CSV vs 토스 실시간, 어느 쪽이 무엇을 재는지 대조 */
const UA = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
  referer: "https://tossinvest.com/",
  origin: "https://tossinvest.com",
};

// 1) 토스
const tRes = await fetch("https://wts-cert-api.tossinvest.com/api/v1/dashboard/wts/overview/indicator/bond", {
  headers: UA, signal: AbortSignal.timeout(12000),
});
const tBody = await tRes.json();
const items = tBody.result?.majorIndicatorInfos ?? [];
console.log(`토스 HTTP ${tRes.status} · 항목 ${items.length}개\n`);
console.log("=== 토스 전체 항목 ===");
for (const i of items) {
  console.log(`${(i.code ?? "").padEnd(16)} ${(i.displayName ?? "").padEnd(16)} nation=${i.nation}  ${i.price?.latestPrice}  (기준 ${i.price?.basePrice})`);
}
console.log("\n=== 미국물 원본(첫 항목 전체) ===");
console.log(JSON.stringify(items.find((i) => i.nation === "us"), null, 1).slice(0, 1600));

// 2) 재무부 공식 CSV
const year = new Date().getUTCFullYear();
const csvUrl = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${year}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${year}&page&_format=csv`;
const cRes = await fetch(csvUrl, { headers: { "user-agent": "Mozilla/5.0 (compatible; recon/1.0)" }, signal: AbortSignal.timeout(20000) });
const csv = await cRes.text();
const lines = csv.trim().split(/\r?\n/);
const cols = lines[0].split(",").map((c) => c.replace(/"/g, "").trim());
const row = lines[1].split(",").map((c) => c.replace(/"/g, "").trim());
const get = (name) => row[cols.indexOf(name)];
console.log(`\n재무부 HTTP ${cRes.status} · 기준일 ${row[0]}`);

// 3) 대조
console.log("\n=== 미 국채: 재무부 종가 vs 토스 실시간 ===");
const pairs = [["2 Yr", "ROB.US2YT-RR"], ["5 Yr", "ROB.US5YT-RR"], ["10 Yr", "ROB.US10YT-RR"], ["30 Yr", "ROB.US30YT-RR"]];
for (const [col, code] of pairs) {
  const t = items.find((i) => i.code === code)?.price?.latestPrice;
  const c = Number(get(col));
  const d = t == null ? null : (t - c);
  console.log(`${col.padEnd(6)} 재무부 ${c.toFixed(3)}  토스 ${t ?? "-"}  차이 ${d === null ? "-" : (d > 0 ? "+" : "") + d.toFixed(3)}%p`);
}
console.log("\n토스에 없는 만기(재무부만):", ["3 Mo", "1 Yr", "20 Yr"].map((c) => `${c}=${get(c)}`).join(" · "));
console.log("KST 현재:", new Date(Date.now() + 9 * 3600e3).toISOString().replace("T", " ").slice(0, 19));
