// 로케일 오류가 사라졌는지 확인 (읽기 전용 — 데이터 변경 없음)
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 25; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();
const PAGES = ["/", "/stock/005930", "/stock/NVDA", "/portfolio", "/titans"];
const VIEWS = [["폴드7 펼침", 984, 1092, true, 2], ["데스크톱", 1600, 950, false, 1]];
let total = 0;
for (const [label, w, h, touch, dpr] of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: dpr });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const errs = []; page.on("pageerror", (e) => errs.push(String(e.message ?? e)));
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120_000 }).catch((e) => errs.push("goto " + e.message));
    await wait(5000);
    const info = await page.evaluate(() => ({
      lang: navigator.language,
      차트캔버스: [...document.querySelectorAll("canvas")].filter((c) => c.width > 0 && c.getBoundingClientRect().width > 0).length,
    }));
    total += errs.length;
    console.log(`[${label}] ${path}  lang=${info.lang}  차트캔버스=${info.차트캔버스}  에러=${errs.length}${errs.length ? "  " + JSON.stringify([...new Set(errs)].slice(0, 3)) : ""}`);
    await page.close();
  }
  await ctx.close();
}
console.log(`\n총 페이지 에러: ${total}`);
await browser.close();
