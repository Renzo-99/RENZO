// 와치리스트 종목 → 사이드 패널 실서버 확인 (읽기 전용 — 저장 요청은 막는다)
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// 새 배포가 올라왔는지 확인 — /peek/NVDA 가 전체 페이지로 넘겨주면(3xx) 새 배포
for (let i = 0; i < 60; i++) {
  const r = await fetch(`${BASE}/peek/NVDA`, { redirect: "manual" }).catch(() => null);
  if (r && r.status >= 300 && r.status < 400) { console.log(`새 배포 확인 (${r.status} → ${r.headers.get("location")})`); break; }
  process.stdout.write(`${r?.status ?? "x"} `); await wait(10_000);
}
const b = await chromium.launch();
for (const [label, w, h, mobile] of [["데스크톱", 1440, 900, false], ["폴드 펼침", 984, 1092, true], ["폰", 393, 852, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  // 혹시라도 와치리스트를 바꾸는 요청은 보내지 않는다
  await p.route("**/api/watchlist/board", (r) => (r.request().method() === "GET" ? r.continue() : r.fulfill({ json: { ok: true } })));
  const errs = []; p.on("pageerror", (e) => errs.push(e.message.slice(0, 100)));
  await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 }); await wait(6000);
  if (await p.getByTestId("watchlist-toggle").isVisible().catch(() => false)) { await p.getByTestId("watchlist-toggle").click(); await wait(1500); }
  // 종목이 있는 탭으로 (지금 한국 탭은 비어 있다)
  await p.getByTestId("watch-tab-global").click().catch(() => {}); await wait(800);
  const diag = await p.evaluate(() => ({
    탭: [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent + (t.getAttribute("aria-selected") === "true" ? "✓" : "")).join(" "),
    링크: [...document.querySelectorAll('[data-testid="watchlist-panel"] a')].slice(0, 4).map((a) => a.getAttribute("href")),
  }));
  console.log(`[${label}] 와치리스트: ${JSON.stringify(diag)}`);
  const link = p.locator('[data-testid="watchlist-panel"] a[href^="/peek/"]').first();
  const href = await link.getAttribute("href");
  const t0 = Date.now();
  await link.click();
  await p.getByTestId("stock-sheet").waitFor({ timeout: 15000 });
  const openMs = Date.now() - t0;
  await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 90_000 }).catch(() => {});
  const loadMs = Date.now() - t0;
  await wait(3000);
  const st = await p.evaluate(() => {
    const d = document.querySelector('[data-testid="stock-sheet"] [role="dialog"]');
    const r = d.getBoundingClientRect();
    const body = d.querySelector(":scope > div");
    return {
      url: location.pathname, 패널폭: Math.round(r.width), 화면폭: innerWidth,
      제목: d.querySelector("h1")?.textContent?.trim(),
      차트: [...d.querySelectorAll("canvas")].filter((c) => c.getBoundingClientRect().width > 50).length,
      탭: [...d.querySelectorAll('[role="tab"]')].map((t) => t.textContent).join("/"),
      가로넘침: body.scrollWidth > body.clientWidth + 1,
      뒤대시보드: !!document.querySelector('[data-testid="watchlist-panel"]'),
    };
  });
  await p.keyboard.press("Escape"); await wait(1000);
  const after = await p.evaluate(() => ({ url: location.pathname, 패널: !!document.querySelector('[data-testid="stock-sheet"]') }));
  console.log(`\n[${label}] ${href} 패널열림 ${openMs}ms · 내용 ${loadMs}ms\n  ${JSON.stringify(st)}\n  Esc 후 ${JSON.stringify(after)}${errs.length ? "\n  에러 " + JSON.stringify([...new Set(errs)]) : ""}`);
  await ctx.close();
}
await b.close();
