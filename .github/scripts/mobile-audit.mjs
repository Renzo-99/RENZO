/** 검증 11: RRG 지도 — 올리면 주황 꼬리·시점 라벨·팝업 카드, 나머지 회색. 폰은 탭 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ready = false;
for (let i = 0; i < 42 && !ready; i++) {
  const b = await (await fetch(`${B}/api/industry`).catch(() => null))?.json().catch(() => null);
  const t = b?.industries?.[0]?.trail;
  if (t && t[t.length - 1]?.label === "현재") ready = true; else { process.stdout.write("."); await sleep(10_000); }
}
console.log("\n배포 준비:", ready);
const ind = await (await fetch(`${B}/api/industry`)).json();
console.log("반도체 꼬리:", JSON.stringify(ind.industries.find((n) => n.title === "반도체")?.trail));

const browser = await chromium.launch();
for (const [w, h, name, touch] of [[1280, 900, "desktop", false], [390, 844, "phone", true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  const errs = new Map(); page.on("pageerror", (e) => errs.set(e.message, (errs.get(e.message) ?? 0) + 1));
  await page.goto(`${B}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector("svg circle", { timeout: 60_000 });
  const bubble = page.locator("svg g.cursor-pointer").filter({ hasText: "반도체" }).first();
  if (touch) await bubble.tap(); else await bubble.hover();
  await sleep(500);
  const st = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="rrg-card"]');
    const svg = card?.parentElement?.querySelector("svg");
    const orange = svg ? Array.from(svg.querySelectorAll("path")).filter((p) => p.getAttribute("stroke") === "#f4762a").length : 0;
    const labels = svg ? Array.from(svg.querySelectorAll("text")).map((t) => t.textContent).filter((t) => /주 전|어제|현재/.test(t ?? "")) : [];
    const dimmed = svg ? Array.from(svg.querySelectorAll("circle")).filter((c) => c.getAttribute("opacity") === "0.1").length : 0;
    return { card: card?.textContent?.replace(/\s+/g, " ").slice(0, 200), orange, labels, dimmed, url: location.pathname + location.search };
  });
  console.log(`  [${name}] 반도체 ${touch ? "탭" : "호버"}:`, JSON.stringify(st));
  await page.screenshot({ path: `rrg-${name}.png`, fullPage: false }).catch(() => null);
  if (touch) { await bubble.tap(); await sleep(1500); console.log(`  [phone] 두 번째 탭 후:`, await page.evaluate(() => document.querySelector("nav + div, .flex.flex-wrap")?.textContent?.slice(0, 40)), "행", await page.locator("table tbody tr").count()); }
  console.log(`  [${name}] pageerrors:`, JSON.stringify([...errs.entries()]));
  await ctx.close();
}
await browser.close();
