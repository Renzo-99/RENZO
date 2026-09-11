/** 검증 27(API만): 월별 캘린더의 이번 주 CPI에 예상치가 붙는지 */
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = false;
for (let i = 0; i < 40 && !ok; i++) {
  const m = await (await fetch(`${B}/api/calendar/month?ym=2026-09`).catch(() => null))?.json().catch(() => null);
  const cpi = m?.events?.find((e) => e.title.includes("소비자물가지수(CPI) 발표(전월"));
  if (cpi?.forecast) { ok = true; console.log("\nCPI 전월:", JSON.stringify({ forecast: cpi.forecast, previous: cpi.previous, actual: cpi.actual, stars: cpi.stars, why: cpi.why.slice(0, 160) })); }
  else { process.stdout.write("."); await sleep(10_000); }
}
console.log("예상치 보강:", ok);
