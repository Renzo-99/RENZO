// 하위 그룹 — 폰(늘 보임)·데스크톱(hover) 양쪽에서 만들고, 반드시 되돌린다
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 25; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();

/** 그룹 머리글 버튼(테스트 표식)으로 그 그룹의 section을 정확히 찾는다 —
 *  section.textContent 에는 행의 '그룹 옮기기' 목록 때문에 모든 그룹 이름이 섞여 들어간다 */
const idOf = (page, name) => page.evaluate((n) => {
  const btn = [...document.querySelectorAll('[data-testid^="watch-group-"]')]
    .find((b) => b.querySelector("span:nth-child(2)")?.textContent.trim() === n);
  return btn?.getAttribute("data-testid")?.replace("watch-group-", "") ?? null;
}, name);

const tree = (page) => page.evaluate(() =>
  [...document.querySelectorAll('[data-testid^="watch-group-"]')].map((b) => {
    const sec = b.closest("section");
    const pad = parseInt(getComputedStyle(sec).paddingLeft || "0", 10);
    const name = b.querySelector("span:nth-child(2)")?.textContent.trim() ?? "?";
    const n = b.querySelector("span:nth-child(3)")?.textContent.trim() ?? "";
    return `${"· ".repeat(Math.round(pad / 10))}${name}(${n})`;
  }));

for (const [label, vp] of [["desktop", { width: 1600, height: 950 }], ["phone", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e.message ?? e)));
  page.on("dialog", (d) => d.accept());
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await wait(5000);
  if (vp.width < 640) { await page.getByTestId("watchlist-toggle").click(); await wait(3000); }

  console.log(`\n[${label}] 장 구간: ${await page.evaluate(() => document.querySelector('[data-testid="watch-sessions"]')?.textContent.replace(/\s+/g, " ").trim() ?? "(없음)")}`);
  console.log(`[${label}] 처음: ${JSON.stringify(await tree(page))}`);

  // 상위 그룹
  await page.getByTestId("watch-add-group").click();
  await page.getByLabel("새 그룹 이름").fill("검증상위");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await wait(2500);
  const pid = await idOf(page, "검증상위");

  // ⊞ 가 실제로 눌리는지 (force 없이 — 폰에서 손가락으로 누를 수 있어야 한다)
  const sub = page.getByTestId(`watch-subgroup-${pid}`);
  const visible = await sub.isVisible().catch(() => false);
  console.log(`[${label}] ⊞ 보임: ${visible}`);
  if (!visible && vp.width >= 1024) await page.locator(`[data-testid="watch-group-${pid}"]`).hover();
  await sub.click();
  await page.getByLabel("하위 그룹 이름").fill("검증하위");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await wait(2500);
  console.log(`[${label}] 하위 만든 뒤: ${JSON.stringify((await tree(page)).filter((t) => t.includes("검증")))}`);

  // 하위에 종목 담기 → 상위 개수 합산
  const sid = await idOf(page, "검증하위");
  const add = page.locator(`[data-testid="watch-add-${sid}"]`);
  if (!(await add.isVisible().catch(() => false)) && vp.width >= 1024) await page.locator(`[data-testid="watch-group-${sid}"]`).hover();
  await add.click();
  await page.getByLabel("담을 종목").fill("삼성전자");
  await page.getByRole("button", { name: "담기", exact: true }).click();
  await wait(4500);
  console.log(`[${label}] 종목 담은 뒤: ${JSON.stringify((await tree(page)).filter((t) => t.includes("검증")))}`);

  // 접기 전파
  await page.locator(`[data-testid="watch-group-${pid}"]`).click();
  await wait(1200);
  console.log(`[${label}] 상위 접음 → 하위 보임: ${(await tree(page)).some((t) => t.includes("검증하위"))}`);
  await page.locator(`[data-testid="watch-group-${pid}"]`).click();
  await wait(1200);

  // 새로고침 뒤 유지
  await page.reload({ waitUntil: "networkidle", timeout: 90_000 });
  await wait(5000);
  if (vp.width < 640) { await page.getByTestId("watchlist-toggle").click().catch(() => {}); await wait(2500); }
  console.log(`[${label}] 새로고침 뒤: ${JSON.stringify((await tree(page)).filter((t) => t.includes("검증")))}`);

  // 되돌리기 — 하위부터
  for (const name of ["검증하위", "검증상위"]) {
    const id = await idOf(page, name);
    if (!id) continue;
    const del = page.locator(`[aria-label="${name} 그룹 삭제"]`);
    if (!(await del.isVisible().catch(() => false)) && vp.width >= 1024) await page.locator(`[data-testid="watch-group-${id}"]`).hover();
    await del.click().catch(() => {});
    await wait(2500);
  }
  console.log(`[${label}] 정리 후: ${JSON.stringify(await tree(page))}`);
  console.log(`[${label}] 에러 ${errs.length}건`);
  await ctx.close();
}
await browser.close();
