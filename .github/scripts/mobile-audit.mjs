// 구성 종목 명부를 만들고 → RS 꼬리를 새 기준으로 되채운 뒤 → 꼬리가 범위별로 다른지 확인
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 19; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const hit = async (path, label) => {
  const t0 = Date.now();
  try {
    const r = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(320_000) });
    const t = await r.text();
    console.log(`[${label}] HTTP ${r.status} ${Math.round((Date.now()-t0)/1000)}초 :: ${t.slice(0, 500)}`);
    return r.ok;
  } catch (e) { console.log(`[${label}] 실패 ${Math.round((Date.now()-t0)/1000)}초 :: ${e}`); return false; }
};

await hit("/api/cron/industry-snapshot", "명부·수익률 만들기");
await hit("/api/cron/rs-backfill", "꼬리 되채우기");

for (const scope of ["all", "kr"]) {
  const r = await fetch(`${BASE}/api/industry?scope=${scope}`, { signal: AbortSignal.timeout(90_000) });
  const j = await r.json();
  const inds = j.industries ?? [];
  const withTrail = inds.filter((n) => (n.trail ?? []).length > 0);
  const semi = inds.find((n) => n.title === "반도체");
  console.log(`\n[scope=${scope}] 산업 ${inds.length}개 · 꼬리 있는 노드 ${withTrail.length}개`);
  console.log(`  반도체 지금 (장기 ${semi?.longRs}, 단기 ${semi?.shortRs})`);
  console.log(`  반도체 꼬리: ${(semi?.trail ?? []).map((p) => `${p.label}(${p.longRs},${p.shortRs})${p.approx ? "*" : ""}`).join(" → ") || "(없음)"}`);
}

const browser = await chromium.launch();
for (const [label, vp] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`${BASE}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
  await wait(3000);
  const count = () => page.evaluate(() => document.querySelectorAll("svg path[stroke]").length);
  console.log(`\n[${label}] 글로벌 지도 선 ${await count()}개`);
  await page.locator('[data-testid="scope-tabs"] button', { hasText: "국내" }).click();
  await wait(5000);
  console.log(`[${label}] 국내   지도 선 ${await count()}개`);
  console.log(`[${label}] pageerrors: ${JSON.stringify(errs)}`);
  await ctx.close();
}
await browser.close();
