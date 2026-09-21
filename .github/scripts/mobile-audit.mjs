// 세부 테마 → 종목 목록에 기업 한 줄 소개가 뜨는지 검증
import { chromium } from "playwright";

const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 배포 대기
process.stdout.write("");
for (let i = 0; i < 21; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n대기 끝");

const browser = await chromium.launch();

async function check(label, viewport, url, pick) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
  await wait(2500);
  if (pick) { await pick(page); await wait(4000); }

  const phone = viewport.width < 640;
  const listSel = phone ? '[data-testid="stocks-mobile"]' : "table";
  const rows = await page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return { found: false };
    const items = [...root.querySelectorAll(sel.includes("table") ? "tbody tr" : "li")];
    return {
      found: true,
      total: items.length,
      withDesc: items.filter((li) => li.querySelector('[data-testid="stock-desc"]')).length,
      sample: items.slice(0, 5).map((li) => {
        const d = li.querySelector('[data-testid="stock-desc"]');
        const name = li.querySelector("a, .font-bold, .font-semibold");
        return { name: (name?.textContent ?? "").trim().slice(0, 14), desc: (d?.textContent ?? "(없음)").trim().slice(0, 90), clipped: d ? d.scrollHeight > d.clientHeight + 1 : false };
      }),
    };
  }, listSel);

  console.log(`\n[${label}] ${JSON.stringify(rows, null, 1)}`);
  console.log(`[${label}] pageerrors: ${JSON.stringify(errs)}`);
  await ctx.close();
}

// 1) 세부 테마(HBM) 종목 목록 — 폰·데스크톱
for (const [l, vp] of [["phone-sub", { width: 390, height: 844 }], ["desktop-sub", { width: 1280, height: 900 }]]) {
  await check(l, vp, `${BASE}/sectors?node=sub:hbm&depth=2`);
}
// 2) 토스 테마(종합반도체 553) 종목 목록 — 해외 종목 포함
await check("phone-tics", { width: 390, height: 844 }, `${BASE}/sectors?node=553&depth=2`);

await browser.close();
