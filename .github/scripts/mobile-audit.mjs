/** 검증 10: 테마 클릭 후 히어로 카드·산업 칩 유지, 강세 배지 근거 툴팁, 3개월 열 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 배포 대기 — 산업 API의 strength가 새 규칙(3개월 마이너스면 강세 없음)인지로 판별
let ready = false;
for (let i = 0; i < 42 && !ready; i++) {
  const r = await fetch(`${B}/api/industry`).catch(() => null);
  const b = r?.ok ? await r.json() : null;
  const bad = (b?.industries ?? []).filter((n) => (n.strength === "강세" && (n.perf3M <= 0 || n.shortRs < 50)) || (n.strength === "약세" && (n.perf3M >= 0 || n.shortRs > 50)));
  if (b && bad.length === 0) ready = true; else { process.stdout.write(`.${bad.length}`); await sleep(10_000); }
}
console.log("\n배포 준비:", ready);
const ind = await (await fetch(`${B}/api/industry`)).json();
console.log("산업 배지:", ind.industries.filter((n) => n.strength).map((n) => `${n.title} ${n.strength} 3M ${n.perf3M}% RS ${n.longRs}/${n.shortRs}`).join(" · ") || "(없음)");
const th = await (await fetch(`${B}/api/industry/themes?id=169`)).json();
console.log("반도체 테마 배지:", th.themes.filter((n) => n.strength).map((n) => `${n.title} ${n.strength} 3M ${n.perf3M}% RS ${n.longRs}/${n.shortRs}`).join(" · ") || "(없음)");
console.log("세부 테마 배지:", th.subThemes.filter((n) => n.strength).map((n) => `${n.title} ${n.strength} 3M ${n.perf3M}% RS ${n.longRs}/${n.shortRs}`).join(" · ") || "(없음)");

const browser = await chromium.launch();
for (const [w, h, name] of [[390, 844, "phone"], [1280, 900, "desktop"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, locale: "ko-KR" });
  const errs = new Map(); page.on("pageerror", (e) => errs.set(e.message, (errs.get(e.message) ?? 0) + 1));
  await page.goto(`${B}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="kospi-hero"] svg path', { timeout: 60_000 }).catch(() => null);
  // 히어로의 '오늘 많이 오른 테마' 1번 클릭 → 종목 층위로 가도 히어로·산업 칩이 남아야 한다
  const first = page.locator('[data-testid="kospi-hero"] ol li button').first();
  const themeName = (await first.textContent())?.trim();
  await first.click();
  await page.waitForSelector("table tbody tr", { timeout: 60_000 }).catch(() => null);
  await sleep(500);
  const after = await page.evaluate(() => ({
    hero: !!document.querySelector('[data-testid="kospi-hero"] svg path'),
    chips: document.querySelectorAll('button[aria-current="true"]').length,
    crumb: document.querySelector("nav, .flex.flex-wrap")?.textContent?.slice(0, 60),
    rows: document.querySelectorAll("table tbody tr").length,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  console.log(`  [${name}] 테마 '${themeName}' 클릭 후:`, JSON.stringify(after));
  // 반도체로 이동 → 배지 툴팁·3개월 열
  await page.locator('button:has-text("반도체")').first().click();
  await page.waitForSelector('[data-testid="subthemes"] tbody tr', { timeout: 60_000 }).catch(() => null);
  const badges = await page.evaluate(() => Array.from(document.querySelectorAll("[title*='형제 대비']")).map((b) => `${b.textContent}: ${b.getAttribute("title")}`));
  const cols = await page.evaluate(() => Array.from(document.querySelectorAll("thead th")).map((t) => t.textContent?.trim()).filter(Boolean));
  console.log(`  [${name}] 배지(${badges.length}):`, badges.slice(0, 4).join(" | "));
  console.log(`  [${name}] 표 열:`, cols.join(","));
  console.log(`  [${name}] 히어로 유지:`, await page.locator('[data-testid="kospi-hero"]').count(), "산업 칩 현재:", await page.locator('button[aria-current="true"]').textContent().catch(() => "?"));
  console.log(`  [${name}] pageerrors:`, JSON.stringify([...errs.entries()]));
  await page.close();
}
await browser.close();
