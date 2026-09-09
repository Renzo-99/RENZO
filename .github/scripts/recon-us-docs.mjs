/** 정찰: multpl 어닝일드/PER 값 추출 형태 + 재무부 실질수익률(TIPS) 곡선 */
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };
async function get(url, ms = 12000) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
  return { status: res.status, text: await res.text() };
}
for (const [label, url] of [
  ["multpl 어닝일드", "https://www.multpl.com/s-p-500-earnings-yield"],
  ["multpl PER", "https://www.multpl.com/s-p-500-pe-ratio"],
]) {
  try {
    const { status, text } = await get(url);
    const idx = text.indexOf("Current");
    console.log(`\n===== ${label} HTTP ${status} =====`);
    console.log("Current 주변:", text.slice(Math.max(0, idx - 120), idx + 420).replace(/\s+/g, " "));
    const m = text.match(/id="current"[\s\S]{0,300}?</);
    console.log("id=current 블록:", m ? m[0].replace(/\s+/g, " ").slice(0, 300) : "없음");
  } catch (e) {
    console.log(`\n===== ${label} =====\n오류: ${e.message}`);
  }
}
// 재무부 실질수익률(TIPS) 곡선 — 기대인플레(브레이크이븐) 계산용
const yr = new Date().getUTCFullYear();
try {
  const { status, text } = await get(`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${yr}/all?type=daily_treasury_real_yield_curve&field_tdr_date_value=${yr}&page&_format=csv`);
  console.log(`\n===== 재무부 실질수익률 CSV HTTP ${status} =====`);
  console.log(text.split("\n").slice(0, 3).join("\n"));
} catch (e) {
  console.log("\n===== 재무부 실질수익률 =====\n오류:", e.message);
}
