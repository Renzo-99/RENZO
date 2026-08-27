/**
 * 진단: 배포된 트렌드 레이더 API의 소스별 수집 성공 여부 확인.
 * (Vercel 서버 IP가 구글 번역을 차단당한 전례가 있어 실배포 검증 필수)
 */

const BASE = "https://stock-dashboard-jaeyeon.vercel.app";

const res = await fetch(`${BASE}/api/trends?nocache=${Date.now()}`, { signal: AbortSignal.timeout(90_000) });
const body = await res.json();
console.log(`HTTP ${res.status} · updatedAt=${body.updatedAt}`);
if (body.error) {
  console.log("오류:", body.error);
} else {
  for (const s of body.statuses ?? []) {
    console.log(`${s.ok ? "OK " : "FAIL"} ${s.id.padEnd(12)} ${s.count}건`);
  }
  const sample = (label, arr, fmt) => console.log(`${label}: ${(arr ?? []).slice(0, 3).map(fmt).join(" · ")}`);
  sample("구글KR", body.googleKr, (t) => `${t.keyword}(${t.traffic ?? "?"})`);
  sample("구글US", body.googleUs, (t) => t.keyword);
  sample("실검", body.krRealtime, (t) => t.keyword);
  sample("종목", body.stocks, (s) => `${s.symbol} ${s.score}`);
  sample("코인", body.coins, (c) => `${c.symbol} ${c.change24h}%`);
}
