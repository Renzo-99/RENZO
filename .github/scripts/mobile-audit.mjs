// 최근 네 건 한 번에 — 저장소 상태 / 높이 제한 / 종목추가 줄 / 행 글자 잘림 (읽기만 한다)
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 25; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

// 0) 저장소 — 검증 그룹이 치워졌는지, 지금 무엇이 담겨 있는지
const b = (await fetch(`${BASE}/api/watchlist/board`).then((r) => r.json())).board;
console.log("\n[저장소]");
for (const g of b?.groups ?? []) {
  const parent = (b.groups.find((x) => x.id === g.parentId) ?? {}).name;
  console.log(`  ${parent ? `${parent} > ` : ""}${g.name}: ${g.items.length}개 [${g.items.map((i) => i.symbol).join(", ")}]`);
}
console.log(`  검증 그룹 남음: ${(b?.groups ?? []).filter((g) => g.name.startsWith("검증")).length}개`);

const browser = await chromium.launch();
for (const [label, vp] of [["desktop", { width: 1600, height: 950 }], ["phone", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e.message ?? e)));
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await wait(4500);
  if (vp.width < 640) {
    const t = page.getByTestId("watchlist-toggle");
    if (await t.count() && await t.getAttribute("aria-expanded") === "false") { await t.click(); await wait(3000); }
  }

  const m = await page.evaluate(() => {
    const aside = document.querySelector('aside[aria-label="와치리스트"]');
    const inner = document.querySelector('[data-testid="watchlist-scroll"]');
    if (!aside || !inner) return { error: "없음" };
    const cs = getComputedStyle(aside);
    const rows = [...document.querySelectorAll('[data-testid="watchlist-panel"] li a')];
    return {
      칸높이: Math.round(aside.getBoundingClientRect().height),
      최대높이: cs.maxHeight,
      고정높이: cs.height,
      안쪽스크롤: getComputedStyle(inner).overflowY,
      // 목록이 칸을 넘는가 — 넘을 때만 안쪽 스크롤이 생겨야 한다
      넘침: inner.scrollHeight > inner.clientHeight + 2,
      종목추가줄: document.querySelectorAll('[data-testid^="watch-addrow-"]').length,
      행수: rows.length,
      잘린행: rows.filter((a) => [...a.querySelectorAll("div")].some((d) => d.scrollWidth > d.clientWidth + 1)).length,
      이름칸: rows.slice(0, 3).map((a) => Math.round(a.getBoundingClientRect().width)),
      행높이: rows.slice(0, 3).map((a) => Math.round(a.closest("li").getBoundingClientRect().height)),
    };
  });
  console.log(`\n[${label}] ${JSON.stringify(m)}`);

  // 종목 추가 줄이 실제로 입력칸을 여는지 (담지는 않는다 — 저장소를 건드리지 않으려고)
  const addrow = page.locator('[data-testid^="watch-addrow-"]').first();
  if (await addrow.count()) {
    await addrow.click();
    await wait(800);
    console.log(`[${label}] 종목 추가 눌러 입력칸 열림: ${await page.getByLabel("담을 종목").count() > 0}`);
    await page.keyboard.press("Escape");
  }
  console.log(`[${label}] 에러 ${errs.length}건`);
  await ctx.close();
}
await browser.close();
