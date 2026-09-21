/** 검증 34: 아래로 스크롤해도 뒤로 버튼이 보이는지 — 고정 브레드크럼 + 카드 머리글 버튼 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 21; i++) { await sleep(10_000); process.stdout.write("."); }
console.log("\n대기 끝");
const browser = await chromium.launch();
for (const [name, path, w, h, touch] of [["desktop-sectors", "/sectors", 1280, 900, false], ["phone-sectors", "/sectors", 390, 844, true], ["phone-main", "/", 390, 844, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  const errs = new Map(); page.on("pageerror", (e) => errs.set(e.message, (errs.get(e.message) ?? 0) + 1));
  await page.goto(`${B}${path}?node=169&depth=0`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="subthemes"] tbody tr, [data-testid="subthemes-mobile"] li', { timeout: 60_000 }).catch(() => null);
  const visibleBacks = async () => page.evaluate(() => {
    const vh = window.innerHeight;
    return Array.from(document.querySelectorAll("button")).filter((b) => /뒤로/.test(b.textContent ?? "")).map((b) => { const r = b.getBoundingClientRect(); return { top: Math.round(r.top), inView: r.top >= 0 && r.bottom <= vh && r.width > 0 }; });
  });
  console.log(`  [${name}] 상단:`, JSON.stringify(await visibleBacks()));
  // 세부 테마 표까지 스크롤
  const sub = page.locator('[data-testid="subthemes"]');
  if (await sub.count()) { await sub.scrollIntoViewIfNeeded(); await sleep(600); }
  const after = await visibleBacks();
  console.log(`  [${name}] 세부 테마까지 스크롤:`, JSON.stringify(after), "보이는 뒤로", after.filter((b) => b.inView).length);
  // 맨 아래까지
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(600);
  const bottom = await visibleBacks();
  console.log(`  [${name}] 맨 아래:`, "보이는 뒤로", bottom.filter((b) => b.inView).length, JSON.stringify(bottom.slice(0, 3)));
  // 실제로 눌러서 올라가는지
  const btn = page.locator("button", { hasText: "뒤로" }).first();
  if (await btn.count()) { touch ? await btn.tap() : await btn.click(); await sleep(900); console.log(`  [${name}] 클릭 후 주소:`, new URL(page.url()).search || "(없음)"); }
  console.log(`  [${name}] pageerrors:`, JSON.stringify([...errs.entries()]));
  await ctx.close();
}
await browser.close();
