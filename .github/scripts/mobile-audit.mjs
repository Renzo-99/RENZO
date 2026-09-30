// 재무 탭 실서버 확인 — 사이드 패널(NVDA)·전체 페이지(삼성전자·SK하이닉스·TSM·BRK) (읽기 전용)
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// 새 배포 확인: 재무 탭 HTML 에 토스 출처 문구가 나올 때까지
for (let i = 0; i < 60; i++) { await wait(10_000); process.stdout.write("."); if (i >= 18) break; }
console.log("\n대기 끝");
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.route("**/api/watchlist/board", (r) => (r.request().method() === "GET" ? r.continue() : r.fulfill({ json: { ok: true } })));
const errs = []; p.on("pageerror", (e) => errs.push(e.message.slice(0, 100)));
async function finTab(scope) {
  await scope.getByRole("tab", { name: "재무" }).first().click();
  await scope.locator('[data-testid="toss-finance"], text=재무 데이터를 가져오지 못했어요').first().waitFor({ timeout: 90_000 }).catch(() => {});
  return p.evaluate(() => {
    const f = document.querySelector('[data-testid="toss-finance"]');
    if (!f) return { toss: false, text: document.body.innerText.match(/출처:[^\n]{0,60}|재무 데이터를 가져오지 못했어요/)?.[0] ?? null };
    const head = [...f.querySelectorAll('[data-testid="fin-INC-Y"] thead th')].slice(0, 3).map((t) => t.textContent);
    const rows = [...f.querySelectorAll('[data-testid="fin-INC-Y"] > div:first-child tbody tr')].slice(0, 6).map((tr) => [...tr.children].slice(0, 2).map((c) => c.textContent).join(" "));
    const stats = [...f.querySelectorAll('[data-testid="fin-indicators"] > div')].map((d) => d.innerText.replace(/\n/g, " ").slice(0, 40));
    return { toss: true, src: f.querySelector("p")?.textContent, head, rows, stats: stats.slice(0, 9) };
  });
}
// 1) 사이드 패널
await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }); await wait(5000);
await p.getByTestId("watch-tab-global").click().catch(() => {}); await wait(800);
await p.locator('[data-testid="watchlist-panel"] a[href="/peek/NVDA"]').first().click();
await p.getByTestId("stock-sheet").waitFor(); await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 90_000 }).catch(() => {});
console.log("[사이드 패널 NVDA]", JSON.stringify(await finTab(p.getByTestId("stock-sheet"))));
// 2) 전체 페이지
for (const c of ["005930", "000660", "TSM", "AAPL"]) {
  await p.goto(`${BASE}/stock/${c}`, { waitUntil: "domcontentloaded", timeout: 120_000 }); await wait(3000);
  console.log(`[전체 페이지 ${c}]`, JSON.stringify(await finTab(p)));
}
if (errs.length) console.log("에러", [...new Set(errs)]);
await b.close();
