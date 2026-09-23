// 폴드 펼침 = 데스크톱 배치인지 확인 (읽기 전용 — 데이터 변경 없음)
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 25; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();
const VIEWS = [
  ["폴드 접음", 374, 980, true],
  ["폴드 펼침(세로)", 728, 656, true],
  ["폴드 펼침(가로)", 656, 728, true],
  ["일반 폰", 393, 852, true],
  ["아이패드 미니", 744, 1133, true],
  ["데스크톱", 1600, 950, false],
];

for (const [label, w, h, touch] of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, screen: { width: w, height: h } });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e.message ?? e)));
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await wait(4500);

  const m = await page.evaluate(() => {
    const vw = (sel) => document.querySelector(sel);
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }; };
    const visible = (el) => !!el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).display !== "none";
    const cols = (el) => (el ? getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length : 0);

    const metas = [...document.querySelectorAll('meta[name="viewport"]')].map((m) => m.getAttribute("content"));
    const nav = [...document.querySelectorAll("header nav")].map((n) => ({ 보임: visible(n), 글자: (n.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60) }));
    const aside = vw('aside[aria-label="와치리스트"]');
    const main = aside?.parentElement ? [...aside.parentElement.children].find((c) => c !== aside) : null;
    const cal = vw('[data-testid="calendar-compact"]');
    const hero = vw('[data-testid="hero-global-grid"]');

    return {
      innerWidth: window.innerWidth,
      screen: `${screen.width}x${screen.height}`,
      viewportMeta: metas,
      헤더메뉴: nav,
      햄버거보임: visible([...document.querySelectorAll("header button")].find((b) => b.getAttribute("aria-label") === "메뉴")),
      와치리스트: box(aside),
      본문: box(main),
      좌우2단: !!(aside && main) && box(aside).y === box(main).y && box(aside).x !== box(main).x,
      브리핑열수: cols(cal),
      지수타일열수: cols(hero),
    };
  });
  console.log(`\n=== ${label} (${w}x${h}) ===`);
  console.log(JSON.stringify(m, null, 1));
  if (errs.length) console.log("페이지 에러:", errs.slice(0, 3));
  await ctx.close();
}
await browser.close();
