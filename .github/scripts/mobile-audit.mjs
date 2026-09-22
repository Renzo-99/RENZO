// 와치리스트 3차 — 에러 출처를 스택으로 특정 + 종목 담기/저장
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 25; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();

// 1) 와치리스트 없는 페이지 vs 있는 페이지 — 에러가 어디서 나는지 가른다
for (const [label, path] of [["/sectors (와치리스트 없음)", "/sectors"], ["/ (와치리스트 있음)", "/"]]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push({ msg: String(e.message ?? e), stack: String(e.stack ?? "").split("\n").slice(0, 4).join(" | ") }));
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
  await wait(4000);
  console.log(`\n[${label}] 에러 ${errs.length}건`);
  for (const e of errs.slice(0, 2)) console.log(`   ${e.msg}\n   ↳ ${e.stack}`);
  await ctx.close();
}

// 2) 종목 담기 → 저장 확인
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
await wait(4000);

await page.getByTestId("watch-add-group").click();
await page.getByLabel("새 그룹 이름").fill("검증용");
await page.getByRole("button", { name: "만들기" }).click();
await wait(2500);

const addBtn = page.locator('[data-testid^="watch-add-g-"]').last();
console.log(`\n[담기] ＋ 버튼 ${await addBtn.count()}개`);
await addBtn.click();
await page.getByLabel("담을 종목").fill("NVDA");
await page.getByRole("button", { name: "담기" }).click();
await wait(5000);

const shown = await page.evaluate(() => {
  const secs = [...document.querySelectorAll('[data-testid="watchlist-panel"] section')];
  const s = secs.find((x) => x.textContent.includes("검증용"));
  return s ? [...s.querySelectorAll("li")].map((li) => li.textContent.replace(/\s+/g, " ").slice(0, 50)) : null;
});
console.log(`[담기] 검증용 그룹 행: ${JSON.stringify(shown)}`);

await page.reload({ waitUntil: "networkidle", timeout: 90_000 });
await wait(5000);
const kept = await page.evaluate(() => {
  const secs = [...document.querySelectorAll('[data-testid="watchlist-panel"] section')];
  const s = secs.find((x) => x.textContent.includes("검증용"));
  return s ? [...s.querySelectorAll("li")].map((li) => li.textContent.replace(/\s+/g, " ").slice(0, 40)) : null;
});
console.log(`[새로고침 뒤] ${JSON.stringify(kept)} ${kept?.length ? "✓ 저장됨" : "✗"}`);

// 치우기
const del = page.locator('[aria-label="검증용 그룹 삭제"]');
if (await del.count()) { await del.first().click({ force: true }); await wait(3000); }
const left = await page.evaluate(() => document.body.innerText.includes("검증용"));
console.log(`[정리] 검증용 남음: ${left}`);
await browser.close();
