// 산업 39개 수익률을 채우고, 글로벌/국내가 실제로 갈리는지 확인
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 19; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

for (const q of ["?scope=industries", ""]) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${BASE}/api/cron/nodeperf${q}`, { signal: AbortSignal.timeout(300_000) });
    console.log(`[nodeperf${q}] HTTP ${r.status} ${Math.round((Date.now()-t0)/1000)}초 :: ${(await r.text()).slice(0, 300)}`);
  } catch (e) { console.log(`[nodeperf${q}] 실패 ${Math.round((Date.now()-t0)/1000)}초 :: ${e}`); }
}

const grab = async (scope) => {
  const res = await fetch(`${BASE}/api/industry?scope=${scope}`, { signal: AbortSignal.timeout(90_000) });
  const j = await res.json();
  return (j.industries ?? []).map((n) => ({ t: n.title, m1: n.perf1M, m3: n.perf3M, L: n.longRs, S: n.shortRs }));
};
const [all, kr] = [await grab("all"), await grab("kr")];
const byT = new Map(kr.map((x) => [x.t, x]));
let diff = 0;
console.log(`\n산업 ${all.length}개 — 글로벌 vs 국내 (3개월 / 장기RS)`);
for (const a of all.slice(0, 14)) {
  const k = byT.get(a.t); if (!k) continue;
  const d = Math.abs(a.m3 - k.m3) > 0.01 || a.L !== k.L;
  if (d) diff++;
  console.log(`  ${d ? "✱" : " "} ${a.t.padEnd(9)} ${String(a.m3).padStart(8)}% / ${String(k.m3).padStart(8)}%   RS ${String(a.L).padStart(3)} / ${String(k.L).padStart(3)}`);
}
console.log(`\n앞 14개 중 달라진 산업 ${diff}개`);

const browser = await chromium.launch();
for (const [label, vp] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`${BASE}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
  await wait(2500);
  const cell = () => page.evaluate(() => {
    const tr = document.querySelector("table tbody tr");
    if (!tr) return "(없음)";
    const td = [...tr.querySelectorAll("td")].map((x) => x.textContent.trim());
    return `${td[0].slice(0, 6)} … 3개월 ${td[5]} 장기RS ${td[6]}`;
  });
  console.log(`\n[${label}] 탭: ${(await page.locator('[data-testid="scope-tabs"] button').allTextContents()).join("|")}`);
  console.log(`[${label}] 글로벌: ${await cell()}`);
  await page.locator('[data-testid="scope-tabs"] button', { hasText: "국내" }).click();
  await wait(4500);
  console.log(`[${label}] 국내  : ${await cell()}`);
  console.log(`[${label}] pageerrors: ${JSON.stringify(errs)}`);
  await ctx.close();
}
await browser.close();
