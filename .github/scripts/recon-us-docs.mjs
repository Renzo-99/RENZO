/** 검증: 배포된 /api/rates — 미 국채 실시간 오버레이 + 국고채(토스) */
const res = await fetch(`https://stock-dashboard-jaeyeon.vercel.app/api/rates?cb=${Date.now()}`, {
  signal: AbortSignal.timeout(30000),
});
console.log(`HTTP ${res.status}`);
const b = await res.json();
console.log("수집 시각:", b.updatedAt, "· 재무부 기준일:", b.curveDate);
console.log("\n=== 소스 상태 ===");
for (const s of b.statuses ?? []) console.log(`${s.ok ? "OK  " : "FAIL"} ${s.id.padEnd(7)} ${s.name} · ${s.count}`);
console.log("\n=== 미 국채 곡선 (종가 → 실시간) ===");
for (const p of b.curve ?? []) {
  const live = p.live == null ? "-" : `${p.live}% (${p.liveChangePp > 0 ? "+" : ""}${p.liveChangePp}%p)`;
  const gap = p.live == null ? "" : `  괴리 ${(p.live - p.yield).toFixed(3)}%p`;
  console.log(`${p.label.padEnd(8)} 종가 ${String(p.yield).padEnd(6)} 실시간 ${live}${gap}`);
}
console.log("\n=== 스프레드 ===");
for (const s of b.spreads ?? []) console.log(`${s.label.padEnd(22)} ${s.value}%p ${s.alert ? "[경고]" : ""}`);
console.log("\n=== 국고채 ===");
for (const p of b.krCurve ?? []) console.log(`${p.label.padEnd(12)} ${p.yield}%`);
console.log("\n판정:", b.verdict?.side, b.verdict?.score, "·", b.verdict?.headline);
console.log("장기물:", b.longBond?.label, b.longBond?.ytm + "%");
