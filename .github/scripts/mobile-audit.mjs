// 와치리스트 2차 — 에러 0, 고정·자체 스크롤, 그룹 만들기·종목 담기 실제 동작
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 19; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
await wait(4000);

// 1) 에러
console.log(`[에러] ${errs.length}건 ${JSON.stringify(errs.slice(0, 3))}`);

// 2) 고정 + 자체 스크롤 — 본문을 내려도 와치리스트는 제자리인가
const stick = await page.evaluate(async () => {
  const aside = document.querySelector('aside[aria-label="와치리스트"]');
  const inner = document.querySelector('[data-testid="watchlist-scroll"]');
  if (!aside || !inner) return { error: "없음" };
  const cs = getComputedStyle(inner);
  const csA = getComputedStyle(aside);
  const top0 = aside.getBoundingClientRect().top;
  window.scrollTo({ top: 1200 });
  await new Promise((r) => setTimeout(r, 400));
  const top1 = aside.getBoundingClientRect().top;
  window.scrollTo({ top: 0 });
  return {
    안쪽overflow: cs.overflowY,
    바깥position: csA.position,
    본문1200내린뒤_와치리스트_화면위치: { 전: Math.round(top0), 후: Math.round(top1) },
    제자리: Math.abs(top1 - top0) < 40,
  };
});
console.log(`[고정·자체스크롤] ${JSON.stringify(stick)}`);

// 3) 그룹 만들기 → 종목 담기
const before = await page.getByTestId("watchlist-panel").locator("section").count();
await page.getByTestId("watch-add-group").click();
await page.getByLabel("새 그룹 이름").fill("검증용");
await page.getByRole("button", { name: "만들기" }).click();
await wait(2500);
const after = await page.getByTestId("watchlist-panel").locator("section").count();
console.log(`[그룹 만들기] ${before}개 → ${after}개 ${after > before ? "✓" : "✗"}`);

const grp = page.locator('section:has-text("검증용")').first();
await grp.getByLabel("검증용에 종목 추가").click({ force: true });
await page.getByLabel("담을 종목").fill("NVDA");
await page.getByRole("button", { name: "담기" }).click();
await wait(4000);
const row = await grp.locator("li").allTextContents();
console.log(`[종목 담기] ${JSON.stringify(row.map((t) => t.replace(/\s+/g, " ").slice(0, 50)))}`);

// 4) 저장됐는지 — 새로고침 후에도 남아 있나
await page.reload({ waitUntil: "networkidle", timeout: 90_000 });
await wait(4000);
const kept = await page.locator('section:has-text("검증용")').count();
console.log(`[새로고침 뒤] 검증용 그룹 ${kept}개 ${kept > 0 ? "✓ 저장됨" : "✗ 사라짐"}`);

// 치우기 — 검증용 그룹 삭제
page.on("dialog", (d) => d.accept());
const g2 = page.locator('section:has-text("검증용")').first();
if (await g2.count()) { await g2.getByLabel("검증용 그룹 삭제").click({ force: true }); await wait(2500); }
console.log(`[정리] 남은 검증용 ${await page.locator('section:has-text("검증용")').count()}개`);
console.log(`[에러 최종] ${errs.length}건 ${JSON.stringify(errs.slice(0, 3))}`);
await browser.close();
