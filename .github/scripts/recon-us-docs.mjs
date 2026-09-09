/** 검증: 배포된 /api/rates 의 소스별 수집 성공 여부 (Vercel IP 기준) */
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const res = await fetch(`${BASE}/api/rates?nocache=${Date.now()}`, { signal: AbortSignal.timeout(90_000) });
const body = await res.json();
console.log(`HTTP ${res.status} · updatedAt=${body.updatedAt} · 곡선기준일=${body.curveDate}`);
if (body.error) {
  console.log("오류:", body.error);
} else {
  for (const s of body.statuses ?? []) console.log(`${s.ok ? "OK  " : "FAIL"} ${s.id.padEnd(6)} ${s.name} ${s.count}건`);
  const p = (a, f) => (a ?? []).slice(0, 4).map(f).join(" · ");
  console.log("미국:", p(body.curve, (c) => `${c.label} ${c.yield}%`));
  console.log("국고채:", p(body.krCurve, (c) => `${c.label} ${c.yield}%`));
  console.log("스프레드:", p(body.spreads, (s) => `${s.label} ${s.value}%p${s.alert ? "(경고)" : ""}`));
  console.log("VIX:", p(body.vol, (v) => `${v.label} ${v.value}`), "| 판정:", body.options?.structure, "VVIX", body.options?.vvix);
  console.log("ETF:", p(body.etfs, (e) => `${e.symbol} ${e.price}`));
}
