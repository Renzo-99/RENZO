// 폴드 접힘/펼침 — 티커·이름이 안 깨지는지, 펼치면 2단이 되는지 (읽기 전용)
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 25; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();
const VIEWS = [
  ["폴드 접음(좁게)", 300, 900, true],
  ["폴드 접음", 374, 980, true],
  ["폴드 펼침", 728, 950, true],
  ["폴드 펼침(가로)", 950, 728, true],
  ["일반 폰", 390, 844, true],
  ["데스크톱", 1600, 950, false],
];

for (const [label, w, h, touch] of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e.message ?? e)));
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await wait(4500);
  const toggle = page.getByTestId("watchlist-toggle");
  const drawer = await toggle.isVisible().catch(() => false);
  if (drawer) { await toggle.click(); await wait(2500); }

  const m = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="watchlist-panel"]');
    const aside = document.querySelector('aside[aria-label="와치리스트"]');
    if (!panel || !aside) return { error: "패널 없음" };
    const rows = [...panel.querySelectorAll("li")].filter((li) => li.querySelector("a[href^='/stock/']"));
    const info = rows.slice(0, 6).map((li) => {
      const a = li.querySelector("a");
      const [t, n] = a.querySelectorAll("div");
      return {
        티커: t?.textContent ?? "", 티커잘림: t ? t.scrollWidth > t.clientWidth + 1 : false,
        이름칸: Math.round(a.getBoundingClientRect().width),
      };
    });
    const rate = rows[0] ? [...rows[0].querySelectorAll("div")].find((d) => /%$/.test(d.textContent?.trim() ?? "")) : null;
    let 가려짐 = null;
    if (rate) {
      const r = rate.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      가려짐 = top && !rate.contains(top) && top !== rate ? top.tagName : null;
    }
    return {
      "2단": getComputedStyle(aside.parentElement).display === "grid",
      칸폭: Math.round(aside.getBoundingClientRect().width),
      그래프: panel.querySelectorAll("svg").length,
      티커잘린행: info.filter((x) => x.티커잘림).length,
      이름칸: [...new Set(info.map((x) => x.이름칸))],
      티커들: info.map((x) => x.티커).slice(0, 4),
      등락률가려짐: 가려짐,
    };
  });
  console.log(`\n[${label} ${w}x${h}] 서랍:${drawer} ${JSON.stringify(m, null, 0)}`);
  console.log(`[${label}] 에러 ${errs.length}건`);
  await ctx.close();
}
await browser.close();
