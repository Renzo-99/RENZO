/** 검증 29: 되채우기 실행 → 산업 꼬리가 4주 전~현재 6점인지, 지도에 라벨·추정 표시가 그려지는지 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  const r = await fetch(`${B}/api/cron/rs-backfill`, { method: "HEAD" }).catch(() => null);
  if (r && r.status !== 404) ready = true; else { process.stdout.write(`.${r?.status ?? "x"}`); await sleep(10_000); }
}
console.log("\n배포 준비:", ready);
const t0 = Date.now();
const bf = await fetch(`${B}/api/cron/rs-backfill`);
const bj = await bf.json().catch(() => null);
console.log(`되채우기 ${bf.status} ${Math.round((Date.now() - t0) / 1000)}s:`, JSON.stringify(bj).slice(0, 600));
await sleep(3000);
const ind = await (await fetch(`${B}/api/industry`)).json();
const semi = ind.industries.find((n) => n.title === "반도체");
console.log("반도체 꼬리:", JSON.stringify(semi?.trail));
console.log("꼬리 점 수 분포:", JSON.stringify(ind.industries.reduce((a, n) => { a[n.trail.length] = (a[n.trail.length] ?? 0) + 1; return a; }, {})));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "ko-KR" });
await page.goto(`${B}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
await page.waitForSelector('svg[aria-label="상대강도 지도"] circle', { timeout: 60_000 });
await page.locator("svg g.cursor-pointer").filter({ hasText: "반도체" }).first().hover();
await sleep(500);
console.log("호버 후:", JSON.stringify(await page.evaluate(() => { const svg = document.querySelector('svg[aria-label="상대강도 지도"]'); return { orange: Array.from(svg.querySelectorAll("path")).filter((p) => p.getAttribute("stroke") === "#f4762a").length, labels: Array.from(svg.querySelectorAll("text")).map((t) => t.textContent).filter((t) => /주 전|어제|현재$/.test(t ?? "")), dashed: svg.querySelectorAll("circle[stroke-dasharray]").length }; })));
await page.screenshot({ path: "rrg-trail.png" }).catch(() => null);
await browser.close();
