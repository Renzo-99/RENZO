// 와치리스트 최적화 실서버 확인 (읽기 전용 — 저장 요청은 막는다)
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 22; i++) { await wait(10_000); process.stdout.write("."); }
console.log("\n대기 끝");
const b = await chromium.launch();
for (const [label, w, h, mobile] of [["데스크톱", 1440, 900, false], ["폴드 펼침", 984, 1092, true]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })).newPage();
  await p.route("**/api/watchlist/board", (r) => (r.request().method() === "GET" ? r.continue() : r.fulfill({ json: { ok: true } })));
  let reqs = 0; const asked = new Set();
  p.on("request", (r) => { if (r.url().includes("/api/watchlist/quotes")) { reqs++; (new URL(r.url()).searchParams.get("symbols") ?? "").split(",").forEach((s) => asked.add(s)); } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message.slice(0, 100)));
  await p.addInitScript(() => localStorage.setItem("watch.tab.v1", "global"));
  await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 }); await wait(4000);
  if (await p.getByTestId("watchlist-toggle").isVisible().catch(() => false)) { await p.getByTestId("watchlist-toggle").click(); await wait(1500); }
  reqs = 0; asked.clear(); await wait(11_000);
  const total = await p.locator('[data-row-key]').count();
  const shown = await p.evaluate(() => {
    const box = document.querySelector('[data-testid="watchlist-scroll"]'); const r = box.getBoundingClientRect();
    const rows = [...document.querySelectorAll("[data-row-key]")].filter((li) => { const x = li.getBoundingClientRect(); return x.bottom > Math.max(r.top, 0) && x.top < Math.min(r.bottom, innerHeight); });
    return rows.map((li) => `${li.dataset.rowKey.split("|")[1]} ${li.querySelector('[data-testid^="watch-rate-"]')?.textContent}`);
  });
  console.log(`[${label}] 전체 줄 ${total} · 10초 동안 요청 ${reqs}번 · 종목 ${asked.size}개`);
  console.log(`  화면에 보이는 줄: ${shown.join(" | ")}`);
  const ids = await p.$$eval('[data-testid^="watch-group-"][aria-expanded="true"]', (els) => els.map((e) => e.dataset.testid));
  for (const id of ids) { await p.getByTestId(id).click().catch(() => {}); await wait(60); }
  await wait(1500); reqs = 0; await wait(11_000);
  console.log(`  분류 모두 접은 뒤 10초 동안 요청 ${reqs}번${errs.length ? " · 에러 " + JSON.stringify([...new Set(errs)]) : ""}`);
}
await b.close();
