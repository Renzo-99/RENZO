// 등락률이 안 가려지는지 + 폴드 펼침 폭에서 2단 배치가 되는지 (읽기 전용)
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 25; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();

// 폴드7: 접었을 때(커버) / 펼쳤을 때(안쪽, 세로·가로) + 일반 폰·데스크톱
const VIEWS = [
  ["폴드 접음", { width: 374, height: 980 }, true],
  ["폴드 펼침(세로)", { width: 884, height: 1104 }, false],
  ["폴드 펼침(가로)", { width: 1104, height: 884 }, false],
  ["일반 폰", { width: 390, height: 844 }, true],
  ["데스크톱", { width: 1600, height: 950 }, false],
];

for (const [label, vp, isPhone] of VIEWS) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: isPhone, isMobile: isPhone });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e.message ?? e)));
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await wait(4500);

  // 접이식 줄이 보이면 = 한 줄 배치. 안 보이면 = 2단 배치
  const toggle = page.getByTestId("watchlist-toggle");
  const folded = await toggle.isVisible().catch(() => false);
  if (folded) { await toggle.click(); await wait(2500); }

  const m = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="watchlist-panel"]');
    const aside = document.querySelector('aside[aria-label="와치리스트"]');
    if (!panel || !aside) return { error: "없음" };
    const rows = [...panel.querySelectorAll("li")].filter((li) => li.querySelector("a[href^='/stock/']"));
    // 등락률 글자와 겹치는 다른 요소가 있는지 — 실제 좌표로 확인한다
    const covered = [];
    for (const li of rows.slice(0, 8)) {
      const rate = [...li.querySelectorAll("div")].find((d) => /%$/.test(d.textContent?.trim() ?? ""));
      if (!rate) continue;
      const r = rate.getBoundingClientRect();
      const mid = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (mid && !rate.contains(mid) && mid !== rate) covered.push(`${li.querySelector("a")?.textContent?.slice(0, 6)}→${mid.tagName}.${(mid.className || "").toString().slice(0, 20)}`);
    }
    return {
      2단: getComputedStyle(aside.parentElement).display === "grid",
      칸너비: Math.round(aside.getBoundingClientRect().width),
      행수: rows.length,
      등락률가려짐: covered,
      점세개: panel.querySelectorAll('[data-testid^="watch-row-menu-"]').length,
    };
  });
  console.log(`\n[${label} ${vp.width}x${vp.height}] 접이식줄:${folded} ${JSON.stringify(m)}`);
  console.log(`[${label}] 에러 ${errs.length}건`);
  await ctx.close();
}
await browser.close();
