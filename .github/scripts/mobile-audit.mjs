/** 정찰 6: 토스 '테마'(TICS와 별개) · 종목 랭킹(주인공) · 지수 분봉 · 야간선물 · 종목 일봉 */
import { chromium } from "playwright";
const H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*", referer: "https://tossinvest.com/", origin: "https://tossinvest.com", "content-type": "application/json",
};
const short = (t, n = 380) => String(t).replace(/\s+/g, " ").slice(0, n);
async function hit(label, url, method = "GET", body) {
  try {
    const r = await fetch(url, { method, headers: H, body, signal: AbortSignal.timeout(12000) });
    const t = await r.text();
    console.log(`${method} ${r.status} ${label}\n   ${short(t)}\n`);
  } catch (e) { console.log(`${label} 실패 ${String(e).slice(0, 60)}\n`); }
}
const I = "https://wts-info-api.tossinvest.com";
console.log("=== (1) 토스 테마 후보 ===");
for (const [l, u, m, b] of [
  ["themes v1", `${I}/api/v1/themes`],
  ["themes v2", `${I}/api/v2/themes`],
  ["theme rankings", `${I}/api/v1/themes/rankings`],
  ["theme all", `${I}/api/v1/themes/all`],
  ["stock-themes 005930", `${I}/api/v1/stock-infos/A005930/themes`],
  ["stock tics 005930", `${I}/api/v1/stock-infos/A005930/tics`],
  ["product themes", `${I}/api/v2/products/A005930/themes`],
  ["search theme HBM", `${I}/api/v2/search/wts-auto-complete?query=HBM`],
  ["search v3 HBM", `${I}/api/v3/search-all/wts-auto-complete?query=HBM&sections=THEME`],
]) await hit(l, u, m, b);

console.log("=== (2) 종목 랭킹(주인공) 후보 ===");
for (const [l, u] of [
  ["rankings stock", `${I}/api/v1/rankings/stock?tag=kr_normal`],
  ["ranking fluctuation", `${I}/api/v2/rankings?name=fluctuation&tag=kr`],
  ["screener top", `${I}/api/v1/screener/rankings?tag=kr_fluctuation`],
  ["realtime rankings", `${I}/api/v3/rankings/realtime?tag=kr_normal`],
]) await hit(l, u);

console.log("=== (3) 지수 분봉·야간선물 후보 ===");
for (const [l, u] of [
  ["kospi 1m chart", `${I}/api/v1/c-chart/kr-s/KOSPI/min:1?count=400`],
  ["kospi day", `${I}/api/v1/c-chart/kr-s/KOSPI/day?count=5`],
  ["index list", `${I}/api/v1/indices?tag=kr`],
  ["dashboard index", `https://wts-cert-api.tossinvest.com/api/v1/dashboard/wts/overview/indicator/index`],
  ["dashboard futures", `https://wts-cert-api.tossinvest.com/api/v1/dashboard/wts/overview/indicator/futures`],
  ["samsung day chart", `${I}/api/v1/c-chart/kr-s/A005930/day?count=70`],
  ["samsung 1m chart", `${I}/api/v1/c-chart/kr-s/A005930/min:5?count=100`],
  ["stock-prices v3", `${I}/api/v3/stock-prices?meta=true&productCodes=A005930%2CA000660`],
]) await hit(l, u);

console.log("=== (4) 브라우저 XHR — 테마·지수 페이지 ===");
const browser = await chromium.launch();
const page = await (await browser.newContext({ locale: "ko-KR", viewport: { width: 1280, height: 900 } })).newPage();
const seen = new Map();
page.on("response", async (r) => {
  const u = r.url();
  if (!/tossinvest\.com\/api/.test(u) || seen.has(u)) return;
  if (!/theme|index|chart|rank|indic|futur|kospi/i.test(u)) return;
  let body = ""; try { body = short(await r.text(), 300); } catch {}
  seen.set(u, { status: r.status(), method: r.request().method(), post: short(r.request().postData() ?? "", 100), body });
});
for (const url of ["https://www.tossinvest.com/themes", "https://www.tossinvest.com/theme", "https://www.tossinvest.com/", "https://www.tossinvest.com/stocks/KOSPI", "https://www.tossinvest.com/indices/KOSPI"]) {
  try { await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }); await page.waitForTimeout(2000); console.log(`  열림: ${url} → ${page.url()}`); } catch (e) { console.log(`  ${url} → ${String(e).slice(0, 40)}`); }
}
for (const [u, v] of seen) console.log(`${v.method} ${v.status} ${u.replace("https://", "")}${v.post ? `\n   POST ${v.post}` : ""}\n   ${v.body}\n`);
await browser.close();
