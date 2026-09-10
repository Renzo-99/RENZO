/** 검증 11: RRG 지도 — 올리면 주황 꼬리·시점 라벨·팝업 카드, 나머지 회색. 폰은 탭 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 새 배포가 뜰 시간을 준다(푸시 후 약 3분) — 감지 영역 circle(fill=transparent)이 보이면 새 코드
let ready = false;
for (let i = 0; i < 24 && !ready; i++) { await sleep(10_000); process.stdout.write("."); if (i >= 20) ready = true; } // 3.5분 대기
console.log("\n배포 준비:", ready);
const ind = await (await fetch(`${B}/api/industry`)).json();
console.log("반도체 꼬리:", JSON.stringify(ind.industries.find((n) => n.title === "반도체")?.trail));

const browser = await chromium.launch();
for (const [w, h, name, touch] of [[1280, 900, "desktop", false], [390, 844, "phone", true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  const errs = new Map(); page.on("pageerror", (e) => errs.set(e.message, (errs.get(e.message) ?? 0) + 1));
  await page.goto(`${B}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('svg[aria-label="상대강도 지도"] circle[fill="transparent"]', { timeout: 60_000 });
  // 히어로 카드가 다 뜬 뒤(레이아웃이 더 안 밀릴 때) 탭한다 — 카드가 늦게 자라면 탭 좌표가 빗나간다
  await page.waitForSelector('[data-testid="kospi-hero"] ol li, [data-testid="kospi-hero"] p', { timeout: 60_000 }).catch(() => null);
  await sleep(1500);
  const bubble = page.locator("svg g.cursor-pointer").filter({ hasText: "반도체" }).first();
  const b1 = await bubble.boundingBox();
  if (touch) await bubble.tap(); else await bubble.hover();
  await sleep(600);
  const b2 = await bubble.boundingBox();
  console.log(`  [${name}] bbox 전/후:`, JSON.stringify(b1), JSON.stringify(b2));
  const st = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="rrg-card"]');
    const svg = document.querySelector('svg[aria-label="상대강도 지도"]');
    const orange = svg ? Array.from(svg.querySelectorAll("path")).filter((p) => p.getAttribute("stroke") === "#f4762a").length : 0;
    const labels = svg ? Array.from(svg.querySelectorAll("text")).map((t) => t.textContent).filter((t) => /주 전|어제|현재/.test(t ?? "")) : [];
    const dimmed = svg ? Array.from(svg.querySelectorAll("circle")).filter((c) => c.getAttribute("opacity") === "0.1").length : 0;
    return { card: card?.textContent?.replace(/\s+/g, " ").slice(0, 200), orange, labels, dimmed, url: location.pathname + location.search };
  });
  const lvl0 = await page.evaluate(() => ({ subthemes: !!document.querySelector('[data-testid="subthemes"]'), card: !!document.querySelector('[data-testid="rrg-card"]') }));
  console.log(`  [${name}] 반도체 ${touch ? "첫 탭" : "호버"}:`, JSON.stringify({ ...st, ...lvl0 }));
  await page.screenshot({ path: `rrg-${name}.png`, fullPage: false }).catch(() => null);
  if (touch) {
    await bubble.tap(); await sleep(2500);
    const lvl = await page.evaluate(() => ({ subthemes: !!document.querySelector('[data-testid="subthemes"]'), bubbles: document.querySelectorAll('svg[aria-label="상대강도 지도"] circle').length, current: document.querySelector('button[aria-current="true"]')?.textContent }));
    console.log(`  [phone] 두 번째 탭 후(테마 층위여야 함):`, JSON.stringify(lvl));
  }
  console.log(`  [${name}] pageerrors:`, JSON.stringify([...errs.entries()]));
  await ctx.close();
}
await browser.close();
