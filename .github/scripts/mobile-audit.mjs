/** 검증 31: 종목 층위에 미국·해외 종목 포함, 국가 탭, 현지 통화 표시, 미국 종목 해시태그(크론 재실행 후) */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  const b = await (await fetch(`${B}/api/industry/stocks?id=169`).catch(() => null))?.json().catch(() => null);
  if (b?.stocks?.some((s) => s.nation === "us" && /^[A-Z]{1,6}$/.test(s.code))) ready = true; else { process.stdout.write("."); await sleep(10_000); }
}
console.log("\n배포 준비:", ready);
const st = await (await fetch(`${B}/api/industry/stocks?id=169`)).json();
const cnt = st.stocks.reduce((a, s) => { a[s.nation] = (a[s.nation] ?? 0) + 1; return a; }, {});
console.log("반도체 종목:", st.stocks.length, JSON.stringify(cnt), "전체 시총", (st.totalCap / 1e12).toFixed(0) + "조", "국내", (st.krCap / 1e12).toFixed(0) + "조");
for (const s of st.stocks.filter((s) => s.nation !== "kr").slice(0, 4)) console.log(`  ${s.nation} ${s.name} (${s.code}) ${s.price} ≈${s.priceKrw}원 시총 ${(s.cap / 1e12).toFixed(0)}조 ${s.change}%`);
console.log("크론(태그 색인 갱신):", (await fetch(`${B}/api/cron/industry-snapshot`)).status);
for (const c of ["NVDA", "000660"]) { const t = await (await fetch(`${B}/api/industry/tags?code=${c}`)).json(); console.log(`  태그 ${c}:`, (t.tags ?? []).map((x) => "#" + x.title).join(" ")); }
const browser = await chromium.launch();
const d = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "ko-KR" });
await d.goto(`${B}/sectors?node=169&depth=1`, { waitUntil: "networkidle", timeout: 90_000 });
await d.waitForSelector('[data-testid="nation-tabs"]', { timeout: 60_000 });
const tabs = await d.evaluate(() => Array.from(document.querySelectorAll('[data-testid="nation-tabs"] button')).map((b) => b.textContent?.replace(/\s+/g, " ").trim()));
console.log("  [desktop] 국가 탭:", JSON.stringify(tabs), "행", await d.locator("table tbody tr").count());
await d.locator('[data-testid="nation-tabs"] button', { hasText: "미국" }).click(); await sleep(400);
const usRows = await d.evaluate(() => Array.from(document.querySelectorAll("table tbody tr")).slice(0, 3).map((tr) => tr.textContent?.replace(/\s+/g, " ").trim()));
console.log("  [desktop] 미국 탭 행", await d.locator("table tbody tr").count(), JSON.stringify(usRows));
await d.goto(`${B}/stock/NVDA`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await d.waitForSelector('[data-testid="stock-tags"]', { timeout: 60_000 }).catch(() => null);
console.log("  [desktop] NVDA 태그:", await d.evaluate(() => Array.from(document.querySelectorAll('[data-testid="stock-tags"] a')).map((a) => a.textContent).join(" ")));
const p = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "ko-KR" });
await p.goto(`${B}/sectors?node=169&depth=1`, { waitUntil: "networkidle", timeout: 90_000 });
await p.waitForSelector('[data-testid="stocks-mobile"] li', { timeout: 60_000 });
console.log("  [phone] 카드", await p.locator('[data-testid="stocks-mobile"] li').count(), "국기 🇺🇸", await p.evaluate(() => (document.querySelector('[data-testid="stocks-mobile"]').textContent.match(/🇺🇸/g) ?? []).length), "overflow", await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
await browser.close();
