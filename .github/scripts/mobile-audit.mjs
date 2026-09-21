// 노드 수익률 스냅샷을 채우고, 글로벌/국내 전환이 실제로 값을 바꾸는지 검증
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < 19; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

// 1) 스냅샷 채우기
const t0 = Date.now();
let r = await fetch(`${BASE}/api/cron/nodeperf`, { signal: AbortSignal.timeout(300_000) }).catch((e) => ({ status: 0, err: String(e) }));
let body = r.status ? await r.text().catch(() => "") : r.err;
console.log(`[nodeperf] HTTP ${r.status} ${Math.round((Date.now()-t0)/1000)}초 :: ${String(body).slice(0, 300)}`);

// 2) 두 범위의 산업 수익률·RS 비교
const grab = async (scope) => {
  const res = await fetch(`${BASE}/api/industry?scope=${scope}`, { signal: AbortSignal.timeout(90_000) });
  const j = await res.json();
  return (j.industries ?? []).map((n) => ({ t: n.title, c: n.change, m1: n.perf1M, m3: n.perf3M, L: n.longRs, S: n.shortRs }));
};
const [all, kr] = [await grab("all"), await grab("kr")];
const byT = new Map(kr.map((x) => [x.t, x]));
let diff = 0;
console.log(`\n산업 ${all.length}개 — 글로벌 vs 국내`);
for (const a of all.slice(0, 12)) {
  const k = byT.get(a.t);
  if (!k) continue;
  if (Math.abs(a.m3 - k.m3) > 0.01 || a.L !== k.L) diff++;
  console.log(`  ${a.t.padEnd(8)} 3개월 글로벌 ${String(a.m3).padStart(7)}% / 국내 ${String(k.m3).padStart(7)}%   장기RS ${String(a.L).padStart(3)} / ${String(k.L).padStart(3)}`);
}
console.log(`\n앞 12개 중 값이 달라진 산업 ${diff}개`);

// 3) 화면에 탭이 뜨고 눌리는지
const browser = await chromium.launch();
for (const [label, vp] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`${BASE}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
  await wait(2500);
  const tabs = page.locator('[data-testid="scope-tabs"] button');
  console.log(`\n[${label}] 범위 탭 ${await tabs.count()}개: ${(await tabs.allTextContents()).join("|")}`);
  const row = () => page.evaluate(() => {
    const tr = document.querySelector("table tbody tr");
    return tr ? [...tr.querySelectorAll("td")].map((td) => td.textContent.trim()).slice(0, 7).join(" | ") : "(없음)";
  });
  console.log(`[${label}] 글로벌 첫 줄: ${await row()}`);
  await page.locator('[data-testid="scope-tabs"] button', { hasText: "국내" }).click();
  await wait(4000);
  console.log(`[${label}] 국내   첫 줄: ${await row()}`);
  console.log(`[${label}] pageerrors: ${JSON.stringify(errs)}`);
  await ctx.close();
}
await browser.close();
