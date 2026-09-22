// 와치리스트 등락률이 토스 현재가와 일치하는지 대조
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const TOSS = "https://wts-info-api.tossinvest.com";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 25; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const codes = ["005930", "000660", "277810", "042700", "012450"];

// 1) 토스 원본
const toss = await fetch(`${TOSS}/api/v3/stock-prices?meta=true&productCodes=${codes.map((c) => `A${c}`).join(",")}`, {
  headers: { "user-agent": "Mozilla/5.0", referer: "https://tossinvest.com/", origin: "https://tossinvest.com" },
}).then((r) => r.json());
const ref = new Map((toss.result ?? []).map((r) => {
  const c = String(r.productCode).replace(/^A/, "");
  const rate = r.base > 0 ? ((r.close - r.base) / r.base) * 100 : 0;
  return [c, { close: r.close, rate: Math.round(rate * 100) / 100 }];
}));
console.log(`\n[토스 원본] ${[...ref].map(([c, v]) => `${c} ${v.close}원 ${v.rate}%`).join(" | ")}`);

// 2) 우리 API
const ours = await fetch(`${BASE}/api/watchlist/quotes?symbols=${codes.join(",")}`).then((r) => r.json());
console.log(`[우리 API] ${(ours.quotes ?? []).map((q) => `${q.symbol} ${q.price}원 ${q.changeRate?.toFixed(2)}%`).join(" | ")}`);

let bad = 0;
for (const q of ours.quotes ?? []) {
  const r = ref.get(q.symbol);
  if (!r) continue;
  const dPrice = Math.abs(q.price - r.close);
  const dRate = Math.abs(q.changeRate - r.rate);
  const ok = dPrice < 1 && dRate < 0.02;
  if (!ok) bad++;
  console.log(`   ${q.symbol}: 가격차 ${dPrice} · 등락차 ${dRate.toFixed(3)}%p ${ok ? "✓" : "✗"}`);
}
console.log(`[대조] 어긋난 종목 ${bad}개`);

// 3) 화면에 뜨는 값도 같은지 + 10초 뒤 갱신되는지
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } });
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(String(e.message ?? e)));
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
await wait(5000);
const read = () => page.evaluate(() =>
  [...document.querySelectorAll('[data-testid="watchlist-panel"] li')].slice(0, 6).map((li) => {
    const a = li.querySelector("a");
    const divs = li.querySelectorAll("div");
    return a ? `${a.querySelector("div")?.textContent} ${[...divs].map((d) => d.textContent).find((t) => /%$/.test(t ?? "")) ?? "?"}` : null;
  }).filter(Boolean));
const first = await read();
console.log(`\n[화면] ${JSON.stringify(first)}`);

// 폭·잘림도 같이
const layout = await page.evaluate(() => {
  const main = document.querySelector("main");
  const rows = [...document.querySelectorAll('[data-testid="watchlist-panel"] li a')].slice(0, 5);
  return {
    오른쪽여백: Math.round(window.innerWidth - main.getBoundingClientRect().right),
    잘린행: rows.filter((a) => [...a.querySelectorAll("div")].some((d) => d.scrollWidth > d.clientWidth + 1)).length,
    이름칸: rows.map((a) => Math.round(a.getBoundingClientRect().width)),
  };
});
console.log(`[배치] ${JSON.stringify(layout)}`);
await wait(13000);
const second = await read();
console.log(`[13초 뒤] ${JSON.stringify(second)} ${JSON.stringify(first) === JSON.stringify(second) ? "(변동 없음 — 장 상황에 따라 정상)" : "(갱신됨)"}`);
console.log(`[에러] ${errs.length}건 ${JSON.stringify(errs.slice(0, 2))}`);
await browser.close();
