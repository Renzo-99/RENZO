// 폴드7 실제 크기(984×1092)에서 데스크톱 배치인지 확인 (읽기 전용 — 데이터 변경 없음)
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 25; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();
const VIEWS = [
  ["폴드7 펼침(세로)", 984, 1092, true, 2],
  ["폴드7 펼침(가로)", 1092, 984, true, 2],
  ["폴드7 접음", 360, 884, true, 3],
  ["일반 폰", 393, 852, true, 3],
  ["데스크톱", 1600, 950, false, 1],
];

for (const [label, w, h, touch, dpr] of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, screen: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e.message ?? e)));
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await wait(5000);
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    const shown = (el) => !!el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).display !== "none";
    const cols = (el) => (el ? getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length : 0);
    const aside = q('aside[aria-label="와치리스트"]');
    const grid = aside?.closest("div.grid, div[class*='grid']") ?? aside?.parentElement?.parentElement;
    const briefing = q("#briefing");
    const charts = q("#charts");
    const chartCards = charts ? [...charts.querySelectorAll("canvas")].map((c) => box(c)).filter((b) => b && b.w > 50) : [];
    return {
      innerWidth: window.innerWidth,
      lg기준선: matchMedia("(min-width: 960px)").matches,
      헤더메뉴: shown([...document.querySelectorAll("header nav")][0]),
      햄버거: shown([...document.querySelectorAll("header button")].find((b) => b.getAttribute("aria-label") === "메뉴")),
      좌우2단: getComputedStyle(document.querySelector("main > div") ?? document.body).display === "grid" ? getComputedStyle(document.querySelector("main > div")).gridTemplateColumns : "grid 아님",
      와치리스트: box(aside),
      브리핑열: cols(q('[data-testid="calendar-compact"]')),
      지수타일열: cols(q('[data-testid="hero-global-grid"]')),
      히어로2단: cols(q('[data-testid="hero-global-grid"]')?.closest(".grid.gap-3")),
      지수차트: chartCards.slice(0, 2).map((b) => `${b.x},${b.y} ${b.w}w`),
      가로넘침: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  console.log(`\n=== ${label} (${w}x${h}) ===\n` + JSON.stringify(m));
  if (errs.length) console.log("페이지 에러:", [...new Set(errs)].slice(0, 2));
  await ctx.close();
}
await browser.close();
