/** 검증 33: 탐색기 뒤로가기 — 주소 변화, 브라우저 뒤로, ‹뒤로 버튼, 폰 탭 이동 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  const html = await (await fetch(`${B}/sectors`).catch(() => null))?.text().catch(() => "") ?? "";
  if (html.includes("explorer-back") || i >= 20) ready = true; else { process.stdout.write("."); await sleep(10_000); }
}
console.log("\n대기 끝");
const browser = await chromium.launch();
for (const [name, w, h, touch] of [["desktop", 1280, 900, false], ["phone", 390, 844, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  const errs = new Map(); page.on("pageerror", (e) => errs.set(e.message, (errs.get(e.message) ?? 0) + 1));
  await page.goto(`${B}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
  const url = () => new URL(page.url()).search || "(없음)";
  const ROW = touch ? "[data-testid='nodes-mobile'] li, [data-testid='stocks-mobile'] li" : "table tbody tr";
  const state = () => page.evaluate((sel) => ({ back: !!document.querySelector('[data-testid="explorer-back"]'), crumb: document.querySelector('[data-testid="explorer-back"]')?.parentElement?.textContent?.replace(/\s+/g, " ").trim().slice(0, 40), rows: document.querySelectorAll(sel).length }), ROW);
  console.log(`  [${name}] 시작 ${url()}`, JSON.stringify(await state()));
  // 산업 → 테마
  const ind = page.locator(ROW).filter({ hasText: "반도체" }).first();
  touch ? await ind.tap() : await ind.click();
  await sleep(1200);
  console.log(`  [${name}] 반도체 진입 ${url()}`, JSON.stringify(await state()));
  // 테마 → 종목
  const th = page.locator(ROW).first();
  touch ? await th.tap() : await th.click();
  await sleep(1500);
  console.log(`  [${name}] 테마 진입 ${url()}`, JSON.stringify(await state()));
  // 브라우저 뒤로 2번
  await page.goBack(); await sleep(900);
  console.log(`  [${name}] 뒤로1 ${url()}`, JSON.stringify(await state()));
  await page.goBack(); await sleep(900);
  console.log(`  [${name}] 뒤로2 ${url()}`, JSON.stringify(await state()));
  // 앞으로 → ‹뒤로 버튼
  await page.goForward(); await sleep(900);
  const back = page.locator('[data-testid="explorer-back"]');
  if (await back.count()) { touch ? await back.tap() : await back.click(); await sleep(900); console.log(`  [${name}] ‹뒤로 버튼 ${url()}`, JSON.stringify(await state())); }
  console.log(`  [${name}] pageerrors:`, JSON.stringify([...errs.entries()]));
  await ctx.close();
}
await browser.close();
