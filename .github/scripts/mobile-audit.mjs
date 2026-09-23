// 하위 그룹 만들기·접기·개수 합산 + 장 구간 표시 검증 (만든 것은 반드시 되돌린다)
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 25; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } });
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(String(e.message ?? e)));
page.on("dialog", (d) => d.accept());
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
await wait(5000);

// 0) 장 구간 표시
const sess = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="watch-sessions"]');
  return el ? el.textContent.replace(/\s+/g, " ").trim() : "(없음)";
});
console.log(`[장 구간] ${sess}`);

const tree = () => page.evaluate(() =>
  [...document.querySelectorAll('[data-testid="watchlist-panel"] section')].map((s) => {
    const btn = s.querySelector('[data-testid^="watch-group-"]');
    const pad = parseInt(getComputedStyle(s).paddingLeft || "0", 10);
    return btn ? `${" ".repeat(pad / 10 * 2)}${btn.textContent.replace(/\s+/g, " ").trim()}` : null;
  }).filter(Boolean));

console.log(`[처음] ${JSON.stringify(await tree())}`);

// 1) 맨 바깥 그룹 만들기
await page.getByTestId("watch-add-group").click();
await page.getByLabel("새 그룹 이름").fill("검증상위");
await page.getByRole("button", { name: "만들기", exact: true }).click();
await wait(2500);

// 2) 그 안에 하위 그룹 만들기
const parentId = await page.evaluate(() => {
  const s = [...document.querySelectorAll('[data-testid="watchlist-panel"] section')].find((x) => x.textContent.includes("검증상위"));
  return s?.querySelector('[data-testid^="watch-subgroup-"]')?.getAttribute("data-testid")?.replace("watch-subgroup-", "") ?? null;
});
console.log(`[⊞ 단추] ${parentId ? "있음" : "없음"}`);
await page.getByTestId(`watch-subgroup-${parentId}`).click({ force: true });
await page.getByLabel("하위 그룹 이름").fill("검증하위");
await page.getByRole("button", { name: "만들기", exact: true }).click();
await wait(2500);
console.log(`[하위 만든 뒤] ${JSON.stringify((await tree()).filter((t) => t.includes("검증")))}`);

// 3) 하위에 종목 담기 → 상위 개수에 합산되는지
const subId = await page.evaluate(() => {
  const s = [...document.querySelectorAll('[data-testid="watchlist-panel"] section')].find((x) => x.querySelector('[data-testid^="watch-group-"]')?.textContent.includes("검증하위"));
  return s?.querySelector('[data-testid^="watch-group-"]')?.getAttribute("data-testid")?.replace("watch-group-", "") ?? null;
});
await page.locator(`[data-testid="watch-add-${subId}"]`).click({ force: true });
await page.getByLabel("담을 종목").fill("삼성전자");
await page.getByRole("button", { name: "담기", exact: true }).click();
await wait(4500);
console.log(`[종목 담은 뒤] ${JSON.stringify((await tree()).filter((t) => t.includes("검증")))}`);

// 4) 상위 접으면 하위도 접히는지
await page.locator(`[data-testid="watch-group-${parentId}"]`).click();
await wait(1200);
const collapsed = await page.evaluate(() => document.body.innerText.includes("검증하위"));
console.log(`[상위 접음] 하위 보임: ${collapsed} ${collapsed ? "✗" : "✓ 같이 접힘"}`);
await page.locator(`[data-testid="watch-group-${parentId}"]`).click();
await wait(1200);

// 5) 새로고침 뒤에도 층이 유지되는지
await page.reload({ waitUntil: "networkidle", timeout: 90_000 });
await wait(5000);
console.log(`[새로고침 뒤] ${JSON.stringify((await tree()).filter((t) => t.includes("검증")))}`);

// 6) 되돌리기 — 상위를 지우면 하위는 한 층 올라가므로 하위부터 지운다
for (const name of ["검증하위", "검증상위"]) {
  const btn = page.locator(`[aria-label="${name} 그룹 삭제"]`);
  if (await btn.count()) { await btn.first().click({ force: true }); await wait(2500); }
}
await wait(1500);
const left = await page.evaluate(() => document.body.innerText.includes("검증"));
console.log(`[정리] 검증 그룹 남음: ${left}`);
console.log(`[마지막 상태] ${JSON.stringify(await tree())}`);
console.log(`[에러] ${errs.length}건 ${JSON.stringify(errs.slice(0, 2))}`);
await browser.close();
