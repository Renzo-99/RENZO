/** 검증 21: /api/calendar 보강 값(별·예상·이전·결과) + 메인 압축 카드·브리핑 전체 화면 DOM */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  const b = await (await fetch(`${B}/api/calendar`).catch(() => null))?.json().catch(() => null);
  if (b?.events?.some((e) => /전월 대비는|예상치 제공 없음|예상이 이전과|예상치가 이전보다/.test(e.why ?? ""))) ready = true; else { process.stdout.write("."); await sleep(10_000); }
}
console.log("\n배포 준비:", ready);
const c = await (await fetch(`${B}/api/calendar`)).json();
console.log("요약:", c.summary);
for (const e of c.events) console.log(`  ${e.date} ${e.time ?? "--:--"} ${"★".repeat(e.stars)} [${e.country}] ${e.title} · 예상 ${e.forecast ?? "―"} 이전 ${e.previous ?? "―"} 결과 ${e.actual ?? "―"} (${e.source ?? "토스만"})\n      왜: ${e.why}`);
const browser = await chromium.launch();
for (const [name, w, h] of [["phone", 390, 844], ["desktop", 1280, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, locale: "ko-KR" });
  const errs = new Map(); page.on("pageerror", (e) => errs.set(e.message, (errs.get(e.message) ?? 0) + 1));
  await page.goto(`${B}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="calendar-compact"] li', { timeout: 60_000 }).catch(() => null);
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="calendar-compact"] li')).map((li) => li.textContent?.replace(/\s+/g, " ").trim()));
  console.log(`  [${name}] 메인 압축(${rows.length}):`, JSON.stringify(rows.slice(0, 4)), "overflow", await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
  await page.goto(`${B}/briefing`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="calendar-full"] > div', { timeout: 60_000 }).catch(() => null);
  const full = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="calendar-full"] > div')).map((d) => d.textContent?.replace(/\s+/g, " ").trim()));
  console.log(`  [${name}] 브리핑 전체(${full.length}):`, JSON.stringify(full.slice(0, 3)), "overflow", await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
  console.log(`  [${name}] pageerrors:`, JSON.stringify([...errs.entries()]));
  await page.close();
}
await browser.close();
