/** 검증: 배포된 /api/rates 의 국고채(토스) 상태 */
const url = "https://stock-dashboard-jaeyeon.vercel.app/api/rates";
const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
console.log(`HTTP ${res.status}`);
const b = await res.json();
console.log("\n=== 소스 상태 ===");
for (const s of b.statuses ?? []) console.log(`${s.ok ? "OK  " : "FAIL"} ${s.id.padEnd(6)} ${s.name} · ${s.count}`);
console.log("\n=== 국고채 곡선 ===");
for (const p of b.krCurve ?? []) console.log(`${p.label.padEnd(12)} ${p.yield}%  (${p.changePp > 0 ? "+" : ""}${p.changePp}%p)`);
const l = (b.krCurve ?? []).find((p) => p.maturity === 10);
const s2 = (b.krCurve ?? []).find((p) => p.maturity === 2);
if (l && s2) console.log(`\n한국 장단기차 10년−2년: ${(l.yield - s2.yield).toFixed(2)}%p`);
console.log("\n판정:", b.verdict?.side, b.verdict?.score, "·", b.verdict?.headline);
