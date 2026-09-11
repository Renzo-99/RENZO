/** 검증 26: 증시캘린더 — /api/calendar/month 값, 격자(데스크톱)·목록(폰), 필터·주별·더보기·상세, 주요 일정 카드의 토스 값 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  const r = await fetch(`${B}/api/calendar/month?ym=2026-09`).catch(() => null);
  if (r?.status === 200) ready = true; else { process.stdout.write(`.${r?.status ?? "x"}`); await sleep(10_000); }
}
console.log("\n배포 준비:", ready);
const m = await (await fetch(`${B}/api/calendar/month?ym=2026-09`)).json();
const g = {}; for (const e of m.events) g[e.group] = (g[e.group] ?? 0) + 1;
console.log("9월 이벤트:", m.events.length, JSON.stringify(g));
for (const e of m.events.filter((e) => e.group === "economic" && e.actual).slice(0, 5)) console.log(`  ${e.date} ${e.time} ${"★".repeat(e.stars)} [${e.country}] ${e.title} · 예상 ${e.forecast ?? "―"} 이전 ${e.previous ?? "―"} 결과 ${e.actual}\n      ${e.why?.slice(0, 120)}`);
for (const e of m.events.filter((e) => e.group !== "economic").slice(0, 4)) console.log(`  ${e.date} [${e.group}] ${e.title} · ${e.country} · ${e.stockPath ?? ""}`);
const c = await (await fetch(`${B}/api/calendar`)).json();
console.log("주요 일정 카드 출처:", c.events.slice(0, 6).map((e) => `${e.title.slice(0, 14)}=${e.source}`).join(" | "));

const browser = await chromium.launch();
const d = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "ko-KR" });
const errs = new Map(); d.on("pageerror", (e) => errs.set(e.message, (errs.get(e.message) ?? 0) + 1));
await d.goto(`${B}/`, { waitUntil: "networkidle", timeout: 90_000 });
await d.waitForSelector('[data-testid="market-calendar"] .grid button', { timeout: 60_000 });
const cal = d.locator('[data-testid="market-calendar"]');
const probe = () => d.evaluate(() => { const el = document.querySelector('[data-testid="market-calendar"]'); const grid = el.querySelector(".hidden.sm\\:block") ?? el; return { rows: grid.querySelectorAll(".grid.grid-cols-6").length - 1, pills: grid.querySelectorAll("button[title]").length, more: Array.from(grid.querySelectorAll("button")).filter((b) => /더보기/.test(b.textContent)).length, today: grid.textContent.includes("오늘"), label: el.querySelector(".tnum.min-w-\\[7\\.5rem\\]")?.textContent, overflow: document.documentElement.scrollWidth > window.innerWidth }; });
console.log("  [desktop] 월별:", JSON.stringify(await probe()));
await cal.getByRole("button", { name: "실적", exact: true }).click(); await sleep(300);
console.log("  [desktop] 실적 필터:", JSON.stringify(await probe()));
await cal.getByRole("button", { name: "전체", exact: true }).first().click();
await cal.getByRole("button", { name: "주별", exact: true }).click(); await sleep(300);
console.log("  [desktop] 주별:", JSON.stringify(await probe()));
await cal.getByRole("button", { name: "월별", exact: true }).click(); await sleep(300);
const more = cal.locator("button", { hasText: "더보기" }).first();
if (await more.count()) { await more.click(); await sleep(200); console.log("  [desktop] 더보기 후:", JSON.stringify(await probe())); }
await cal.locator("button[title]").filter({ hasText: "소비자물가" }).first().click(); await sleep(300);
console.log("  [desktop] 상세:", await d.evaluate(() => document.querySelector('[data-testid="calendar-detail"]')?.textContent?.replace(/\s+/g, " ").slice(0, 260)));
await d.getByRole("button", { name: "다음" }).click(); await sleep(1500);
console.log("  [desktop] 다음 달:", JSON.stringify(await probe()));
console.log("  [desktop] pageerrors:", JSON.stringify([...errs.entries()]));
const p = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "ko-KR" });
await p.goto(`${B}/`, { waitUntil: "networkidle", timeout: 90_000 });
await p.waitForSelector('[data-testid="market-calendar"]', { timeout: 60_000 });
await sleep(1500);
console.log("  [phone] 목록:", JSON.stringify(await p.evaluate(() => { const el = document.querySelector('[data-testid="market-calendar"]'); const list = el.querySelector(".sm\\:hidden"); return { gridVisible: getComputedStyle(el.querySelector(".hidden.sm\\:block")).display, days: list.querySelectorAll(":scope > div").length, pills: list.querySelectorAll("button[title]").length, first: list.textContent.replace(/\s+/g, " ").slice(0, 100), overflow: document.documentElement.scrollWidth > window.innerWidth }; })));
await browser.close();
