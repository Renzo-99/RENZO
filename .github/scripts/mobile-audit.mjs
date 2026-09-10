/** 검증 14: 글로벌 탭 맨 앞·기본, 아시아/유럽/원자재/환율/코인 칩, 탭 줄이 카드 맨 위 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  const b = await (await fetch(`${B}/api/market/hero`).catch(() => null))?.json().catch(() => null);
  if (b?.global?.groups) ready = true; else { process.stdout.write("."); await sleep(10_000); }
}
console.log("\n배포 준비:", ready);
const h = await (await fetch(`${B}/api/market/hero`)).json();
for (const g of h.global?.groups ?? []) console.log(`  ${g.title}:`, g.items.map((q) => `${q.label} ${q.price} ${q.changeRate}%`).join(" · "));
console.log("글로벌 시각:", h.global?.at);

const browser = await chromium.launch();
for (const [w, hh, name] of [[1280, 900, "desktop"], [390, 844, "phone"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: hh }, locale: "ko-KR" });
  const errs = new Map(); page.on("pageerror", (e) => errs.set(e.message, (errs.get(e.message) ?? 0) + 1));
  await page.goto(`${B}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="kospi-hero"] [role="tab"]', { timeout: 60_000 });
  const st = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="kospi-hero"]');
    const tabs = Array.from(el?.querySelectorAll('[role="tab"]') ?? []).map((t) => `${t.textContent}${t.getAttribute("aria-selected") === "true" ? "*" : ""}`);
    const firstChild = el?.querySelector("[class*=CardContent], div > div")?.textContent?.slice(0, 20);
    const tabTop = el?.querySelector('[role="tablist"]')?.getBoundingClientRect().top ?? 0;
    const cardTop = el?.getBoundingClientRect().top ?? 0;
    const groups = Array.from(el?.querySelectorAll('[data-testid="hero-global-groups"] > div') ?? []).map((g) => `${g.querySelector("span")?.textContent}(${g.querySelectorAll("span.rounded-full").length})`);
    return { market: el?.getAttribute("data-market"), tabs, tabOffsetFromCardTop: Math.round(tabTop - cardTop), grid: el?.querySelectorAll('[data-testid="hero-global-grid"] > div').length, groups, overflow: document.documentElement.scrollWidth > window.innerWidth, firstChild };
  });
  console.log(`  [${name}] 기본 탭:`, JSON.stringify(st));
  const sample = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="hero-global-groups"] span.rounded-full')).slice(0, 4).map((s) => s.textContent?.replace(/\s+/g, " ")));
  console.log(`  [${name}] 칩 예:`, JSON.stringify(sample));
  console.log(`  [${name}] pageerrors:`, JSON.stringify([...errs.entries()]));
  await page.close();
}
await browser.close();
