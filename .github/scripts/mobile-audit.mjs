/** 4건 수정 검증 — 거래대금·한글명·미국 특징주·카드 정렬 */
import { chromium } from "playwright";
const APP = "https://stock-dashboard-jaeyeon.vercel.app";
const browser = await chromium.launch();
const page = await (await browser.newContext({ locale: "ko-KR", viewport: { width: 1280, height: 900 } })).newPage();

// 1) 업종 거래대금
const sec = await (await fetch(`${APP}/api/sectors?cb=${Date.now()}`)).json();
console.log("=== 1. 업종 거래대금 ===");
for (const s of (sec.sectors ?? []).slice(0, 4)) {
  const zero = s.stocks.filter((x) => !(x.tradeValue > 0)).length;
  console.log(`  ${s.name.padEnd(16)} 합계 ${(s.tradeValue / 1e8).toFixed(0)}억  0원종목 ${zero}/${s.stocks.length}`);
  for (const x of s.stocks.slice(0, 2)) console.log(`     ${x.name} 가격 ${x.price} 거래대금 ${(x.tradeValue / 1e8).toFixed(1)}억`);
}

// 2·3) 특징주 — 한글명 + 미국물
const f = await (await fetch(`${APP}/api/features/today?cb=${Date.now()}`)).json();
console.log("\n=== 2·3. 특징주 ===");
console.log("  기준:", f.criteria, "· 환율", f.fxUsd);
for (const r of f.rows ?? []) {
  const han = /[가-힣]/.test(r.name);
  console.log(`  [${r.market ?? "?"}] ${r.name.slice(0, 24).padEnd(26)} ${r.market === "US" ? "$" + r.price : r.price + "원"}  ${r.changeRate.toFixed(2)}%  ${(r.tradeValue / 1e8).toFixed(0)}억  ${r.market === "US" ? "" : han ? "한글✓" : "영문⚠"}`);
}
const krRows = (f.rows ?? []).filter((r) => r.market !== "US");
const usRows = (f.rows ?? []).filter((r) => r.market === "US");
console.log(`  국내 ${krRows.length}건(영문 잔존 ${krRows.filter((r) => !/[가-힣]/.test(r.name)).length}) · 미국 ${usRows.length}건`);

// 4) 카드 높이 정렬
await page.goto(`${APP}/?cb=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 90000 });
for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 1200); await page.waitForTimeout(400); }
await page.waitForTimeout(6000);
const rows = await page.evaluate(() => {
  const ul = [...document.querySelectorAll("ul")].find((u) => u.querySelectorAll("a[target=_blank]").length >= 4 && /입법|NARS|보고서/.test(u.textContent ?? ""));
  if (!ul) return null;
  const cards = [...ul.querySelectorAll("li > a")].map((a) => { const r = a.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height) }; });
  const byRow = new Map();
  for (const c of cards) { const k = c.top; byRow.set(k, [...(byRow.get(k) ?? []), c.h]); }
  return [...byRow.values()].map((hs) => ({ heights: hs, aligned: new Set(hs).size === 1 }));
});
console.log("\n=== 4. 국회입법조사처 카드 행별 높이 ===");
if (!rows) console.log("  (섹션을 못 찾음)");
else { for (const r of rows) console.log(`  ${r.aligned ? "정렬됨 ✓" : "안맞음 ⚠"} 높이 ${r.heights.join(", ")}`); }
await browser.close();
