/** 검증: 배포된 /api/rates — 소스별 수집 + 채권 vs 주식 판정 */
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const res = await fetch(`${BASE}/api/rates?nocache=${Date.now()}`, { signal: AbortSignal.timeout(90_000) });
const text = await res.text();
let body;
try { body = JSON.parse(text); } catch { console.log(`HTTP ${res.status} · JSON 아님(배포 중?):`, text.slice(0, 200)); process.exit(0); }
console.log(`HTTP ${res.status} · updatedAt=${body.updatedAt} · 곡선기준일=${body.curveDate}`);
if (body.error) { console.log("오류:", body.error); process.exit(0); }
for (const s of body.statuses ?? []) console.log(`${s.ok ? "OK  " : "FAIL"} ${s.id.padEnd(7)} ${s.name} ${s.count}건`);
const p = (a, f) => (a ?? []).slice(0, 6).map(f).join(" · ");
console.log("미국 곡선:", p(body.curve, (c) => `${c.label} ${c.yield}%`));
console.log("국고채:", p(body.krCurve, (c) => `${c.label} ${c.yield}%`) || "(없음)");
console.log("스프레드:", p(body.spreads, (s) => `${s.label} ${s.value}%p${s.alert ? "(경고)" : ""}`));
console.log("VIX:", p(body.vol, (v) => `${v.label} ${v.value}`), "| 구조:", body.options?.structure, "VVIX", body.options?.vvix);
const v = body.verdict ?? {};
console.log(`판정: ${v.side} 점수 ${v.score} | 어닝일드 ${v.equityYield}% vs 10년 ${v.bondYield}% → ERP ${v.erp}%p | 실질 ${v.realYield}% (기대물가 ${v.breakeven}%) | PER ${body.per}`);
console.log("근거:", (v.factors ?? []).map((f) => `${f.label} ${f.points > 0 ? "+" : ""}${f.points}`).join(" · "));
const lb = body.longBond;
if (lb) console.log(`장기물: ${lb.label} YTM ${lb.ytm}% D ${lb.duration} · +1%p→가격 ${lb.dv01Pct}% · 손익분기 +${lb.breakevenRisePp}%p · 시나리오 ${lb.scenarios.map((s) => `${s.deltaPp}:${s.totalReturn}%`).join(" ")}`);
