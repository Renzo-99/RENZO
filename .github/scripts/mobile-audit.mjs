// 와치리스트 — 배치·따로 스크롤·그룹/종목 담기·중복 제거 검증
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 19; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();

for (const [label, vp] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await wait(4000);

  if (vp.width < 640) {
    const t = page.getByTestId("watchlist-toggle");
    console.log(`[${label}] 여닫기 줄 ${await t.count()}개`);
    if (await t.count()) { await t.click(); await wait(3000); }
  }

  const panel = page.getByTestId("watchlist-panel");
  console.log(`[${label}] 패널 ${await panel.count()}개`);
  if (await panel.count() === 0) { console.log(`[${label}] pageerrors: ${JSON.stringify(errs.slice(0,3))}`); await ctx.close(); continue; }

  // 그룹·종목 수
  const info = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="watchlist-panel"]');
    const groups = [...p.querySelectorAll('[data-testid^="watch-group-"]')].map((b) => b.textContent.replace(/\s+/g, " ").trim());
    const rows = p.querySelectorAll("ul > li").length;
    const chips = p.querySelectorAll('[data-testid="watch-events"] > a').length;
    const sparks = p.querySelectorAll("svg path").length;
    const rates = [...p.querySelectorAll("li")].slice(0, 3).map((li) => li.textContent.replace(/\s+/g, " ").trim().slice(0, 60));
    return { groups, rows, chips, sparks, rates };
  });
  console.log(`[${label}] 그룹 ${JSON.stringify(info.groups)}`);
  console.log(`[${label}] 행 ${info.rows}개 · 일정칩 ${info.chips}개 · 그래프 ${info.sparks}개`);
  console.log(`[${label}] 앞 3행: ${JSON.stringify(info.rates)}`);

  // 따로 스크롤 — 패널 안쪽만 움직이는지
  const scroll = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="watchlist-scroll"]');
    if (!el) return null;
    const before = { panel: el.scrollTop, page: window.scrollY };
    el.scrollTop = 300;
    return { before, after: { panel: el.scrollTop, page: window.scrollY }, scrollable: el.scrollHeight > el.clientHeight + 10 };
  });
  console.log(`[${label}] 따로 스크롤: ${JSON.stringify(scroll)}`);

  // 중복 제거 — 옛 '내 종목' 카드가 사라졌는지
  const dup = await page.evaluate(() => {
    const t = document.body.innerText;
    return { 내종목: (t.match(/내 종목/g) ?? []).length, 관심종목카드: (t.match(/관심종목/g) ?? []).length, 와치리스트: (t.match(/와치리스트/g) ?? []).length };
  });
  console.log(`[${label}] 문구 등장 횟수: ${JSON.stringify(dup)}`);

  // 그룹 만들기 버튼 존재
  console.log(`[${label}] 그룹 만들기 ${await page.getByTestId("watch-add-group").count()}개 · 정렬 고르기 ${await page.getByTestId("watch-sort").count()}개`);
  console.log(`[${label}] pageerrors: ${JSON.stringify(errs.slice(0, 3))}`);
  await ctx.close();
}
await browser.close();
