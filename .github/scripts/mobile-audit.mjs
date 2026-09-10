/** 검증 16: 폰에서 산업·테마·세부 테마·종목 구성이 카드 목록으로, 가로 넘침 없음, 정렬 상자 동작, 스크린샷 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ready = false;
for (let i = 0; i < 36 && !ready; i++) {
  await sleep(10_000);
  const html = await (await fetch(`${B}/sectors`).catch(() => null))?.text().catch(() => "");
  process.stdout.write(".");
  if (i >= 20) ready = true;
}
console.log("\n대기 끝");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ko-KR", hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errs = new Map(); page.on("pageerror", (e) => errs.set(e.message, (errs.get(e.message) ?? 0) + 1));
await page.goto(`${B}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
await page.waitForSelector('[data-testid="nodes-mobile"] li', { timeout: 60_000 });
const probe = (sel) => page.evaluate((sel) => {
  const ul = document.querySelector(sel);
  const table = ul?.parentElement?.querySelector("table");
  const first = ul?.querySelector("li");
  return { cards: ul?.querySelectorAll("li").length ?? 0, tableVisible: table ? getComputedStyle(table.closest("div")).display !== "none" : null, first: first?.textContent?.replace(/\s+/g, " ").slice(0, 140), bars: first?.querySelectorAll(".rounded-full.bg-muted").length, overflow: document.documentElement.scrollWidth > window.innerWidth, ulVisible: ul ? getComputedStyle(ul).display !== "none" : null };
}, sel);
console.log("  산업(폰):", JSON.stringify(await probe('[data-testid="nodes-mobile"]')));
// 정렬 상자: 등락으로 바꾸고 첫 카드가 바뀌는지
await page.selectOption('select[aria-label="정렬 기준"]', "change");
await sleep(300);
console.log("  등락 정렬 후 첫 카드:", (await page.evaluate(() => document.querySelector('[data-testid="nodes-mobile"] li')?.textContent?.replace(/\s+/g, " ").slice(0, 60))));
await page.locator('[data-testid="nodes-mobile"] li').filter({ hasText: "반도체" }).first().tap();
await page.waitForSelector('[data-testid="subthemes-mobile"] li', { timeout: 60_000 });
console.log("  테마(폰):", JSON.stringify(await probe('[data-testid="nodes-mobile"]')));
console.log("  세부 테마(폰):", JSON.stringify(await probe('[data-testid="subthemes-mobile"]')));
await page.screenshot({ path: "mobile-themes.png", fullPage: false }).catch(() => null);
await page.locator('[data-testid="subthemes-mobile"] li').filter({ hasText: "HBM" }).first().tap();
await page.waitForSelector('[data-testid="stocks-mobile"] li', { timeout: 60_000 });
console.log("  종목(폰):", JSON.stringify(await probe('[data-testid="stocks-mobile"]')));
// 데스크톱은 표가 보이고 카드는 숨겨져야 한다
const d = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "ko-KR" });
await d.goto(`${B}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
await d.waitForSelector("table tbody tr", { timeout: 60_000 });
console.log("  데스크톱:", JSON.stringify(await d.evaluate(() => ({ ulVisible: getComputedStyle(document.querySelector('[data-testid="nodes-mobile"]')).display, tableRows: document.querySelectorAll("table tbody tr").length, sortBarVisible: getComputedStyle(document.querySelector('select[aria-label="정렬 기준"]').parentElement).display }))));
console.log("  pageerrors:", JSON.stringify([...errs.entries()]));
await browser.close();
