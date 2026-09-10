/** 검증 17: 폰 + 큰 글자 설정에서 글로벌 타일 값이 잘리지 않는지 (텍스트가 요소 폭을 넘지 않음) */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 21; i++) { await sleep(10_000); process.stdout.write("."); }
console.log("\n대기 끝");
const browser = await chromium.launch();
for (const [name, scale] of [["phone", 1], ["phone-big-text", 1.3]]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ko-KR", hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(`${B}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="hero-global-groups"] .rounded-lg', { timeout: 60_000 });
  if (scale !== 1) { await page.evaluate((s) => { document.documentElement.style.fontSize = `${16 * s}px`; document.body.style.zoom = String(s); }, scale); await sleep(500); }
  const r = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('[data-testid="hero-global-groups"] .rounded-lg, [data-testid="hero-global-grid"] > div'));
    const cut = [];
    for (const t of tiles) {
      for (const el of t.querySelectorAll("div, b")) {
        if (el.children.length > 0 && el.tagName !== "B") continue;
        if (el.scrollWidth > el.clientWidth + 1) cut.push(`${el.textContent} (${el.scrollWidth}>${el.clientWidth})`);
      }
    }
    const sample = tiles.slice(0, 3).map((t) => t.textContent?.replace(/\s+/g, " "));
    return { tiles: tiles.length, cut, sample, cols: getComputedStyle(document.querySelector('[data-testid="hero-global-groups"] .grid')).gridTemplateColumns.split(" ").length, overflow: document.documentElement.scrollWidth > window.innerWidth };
  });
  console.log(`  [${name}]`, JSON.stringify(r));
  await page.screenshot({ path: `tiles-${name}.png` }).catch(() => null);
  await ctx.close();
}
await browser.close();
