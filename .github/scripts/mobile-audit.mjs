/** 검증 22: 브리핑 카드 위·아래 분할 — 일정 타일이 전체 너비 격자(데스크톱 3열·폰 1열), 설명 3줄 제한, 넘침 없음 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 21; i++) { await sleep(10_000); process.stdout.write("."); }
console.log("\n대기 끝");
const browser = await chromium.launch();
for (const [name, w, h] of [["desktop", 1280, 900], ["phone", 390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, locale: "ko-KR" });
  const errs = new Map(); page.on("pageerror", (e) => errs.set(e.message, (errs.get(e.message) ?? 0) + 1));
  await page.goto(`${B}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="calendar-compact"] li', { timeout: 60_000 });
  const r = await page.evaluate(() => {
    const ul = document.querySelector('[data-testid="calendar-compact"]');
    const card = ul.closest(".rounded-lg.border");
    const cols = getComputedStyle(ul).gridTemplateColumns.split(" ").length;
    const lis = Array.from(ul.querySelectorAll("li"));
    const gauge = card.querySelector("svg[aria-label^='시황 점수']");
    return { cols, tiles: lis.length, cardW: Math.round(card.getBoundingClientRect().width), ulW: Math.round(ul.getBoundingClientRect().width), gaugeAboveUl: gauge.getBoundingClientRect().bottom <= ul.getBoundingClientRect().top, firstTile: lis[0]?.textContent?.replace(/\s+/g, " ").slice(0, 90), cardH: Math.round(card.getBoundingClientRect().height), overflow: document.documentElement.scrollWidth > window.innerWidth };
  });
  console.log(`  [${name}]`, JSON.stringify(r));
  console.log(`  [${name}] pageerrors:`, JSON.stringify([...errs.entries()]));
  await page.close();
}
await browser.close();
