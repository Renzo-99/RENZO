/**
 * 정찰: 산업→테마→종목 트리를 어디서 받을 수 있나
 * (1) 토스 산업(TICS) 페이지의 XHR 캡처 — 트리·구성종목 엔드포인트 발견
 * (2) 후보 엔드포인트 직접 타진
 * (3) TradingView 한국 스캔 — 전 종목 수익률(1주/1달/3달/6달)+시총+업종을 한 번에 주는가 (RS 계산용)
 */
import { chromium } from "playwright";
const H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*", referer: "https://tossinvest.com/", origin: "https://tossinvest.com",
};

// ── (1) XHR 캡처
const browser = await chromium.launch();
const page = await (await browser.newContext({ locale: "ko-KR", viewport: { width: 1280, height: 900 } })).newPage();
const seen = new Map();
page.on("response", async (r) => {
  const u = r.url();
  if (!/tossinvest\.com\/api/.test(u)) return;
  if (!/tics|industr|sector|theme|categor|group/i.test(u)) return;
  if (seen.has(u)) return;
  let body = "";
  try { body = (await r.text()).slice(0, 700); } catch {}
  seen.set(u, { status: r.status(), body });
});
for (const url of ["https://tossinvest.com/industries", "https://tossinvest.com/industry", "https://tossinvest.com/", "https://tossinvest.com/screener"]) {
  try { await page.goto(url, { waitUntil: "networkidle", timeout: 40000 }); await page.waitForTimeout(3000); } catch (e) { console.log(`  ${url} → ${String(e).slice(0, 60)}`); }
}
// 산업 링크가 있으면 하나 눌러본다
try {
  const link = page.locator('a[href*="tics"], a[href*="industr"]').first();
  if (await link.count()) { await link.click({ timeout: 5000 }); await page.waitForTimeout(4000); }
} catch {}
console.log("=== (1) 토스 XHR 캡처 (tics/industry 관련) ===");
for (const [u, v] of seen) console.log(`HTTP ${v.status} ${u.replace("https://", "")}\n   ${v.body.replace(/\s+/g, " ").slice(0, 400)}\n`);
await browser.close();

// ── (2) 후보 직접 타진
console.log("=== (2) 후보 엔드포인트 ===");
const cands = [
  "https://wts-info-api.tossinvest.com/api/v1/tics/rankings?tag=kr_normal&depths=0",
  "https://wts-info-api.tossinvest.com/api/v1/tics/rankings?tag=kr_normal&depths=0&depths=1",
  "https://wts-info-api.tossinvest.com/api/v1/tics",
  "https://wts-info-api.tossinvest.com/api/v1/tics/tree",
  "https://wts-info-api.tossinvest.com/api/v1/tics/1",
  "https://wts-info-api.tossinvest.com/api/v1/tics/1/stocks",
  "https://wts-info-api.tossinvest.com/api/v1/tics/1/companies",
  "https://wts-info-api.tossinvest.com/api/v2/tics/1/stocks",
  "https://wts-info-api.tossinvest.com/api/v1/tics/stocks?ticsId=1",
];
for (const u of cands) {
  try {
    const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(10000) });
    const t = (await r.text()).replace(/\s+/g, " ");
    console.log(`HTTP ${r.status} ${u.replace("https://wts-info-api.tossinvest.com", "")}\n   ${t.slice(0, 350)}\n`);
  } catch (e) { console.log(`실패 ${u} ${String(e).slice(0, 50)}`); }
}

// ── (3) TradingView 한국 스캔 — RS 계산 재료
console.log("=== (3) TradingView 한국 전 종목 수익률 스캔 ===");
const cols = ["name", "description", "close", "change", "market_cap_basic", "sector", "industry", "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.YTD", "Value.Traded"];
const r = await fetch("https://scanner.tradingview.com/korea/scan", {
  method: "POST", headers: { "Content-Type": "application/json", "user-agent": H["user-agent"] },
  body: JSON.stringify({ filter: [{ left: "type", operation: "equal", right: "stock" }], columns: cols, range: [0, 5000] }),
  signal: AbortSignal.timeout(30000),
});
const j = await r.json();
const rows = j.data ?? [];
console.log(`HTTP ${r.status} · ${rows.length}행 · 컬럼: ${cols.join(", ")}`);
const filled = cols.map((c, i) => `${c}=${rows.filter((x) => x.d[i] != null).length}`);
console.log("컬럼별 채워진 행 수:", filled.join(" | "));
console.log("표본 3행:");
for (const x of rows.slice(0, 3)) console.log("  ", JSON.stringify(Object.fromEntries(cols.map((c, i) => [c, x.d[i]]))));
const sectors = new Map(); const industries = new Map();
for (const x of rows) { const s = x.d[5], ind = x.d[6]; if (s) sectors.set(s, (sectors.get(s) ?? 0) + 1); if (ind) industries.set(ind, (industries.get(ind) ?? 0) + 1); }
console.log(`\n섹터 ${sectors.size}개:`, [...sectors.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(", "));
console.log(`\n업종(industry) ${industries.size}개 — 상위 40:`, [...industries.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${k}(${v})`).join(", "));
