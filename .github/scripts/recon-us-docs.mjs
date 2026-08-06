/**
 * 배포 확인 + 수집 트리거: 개발 컨테이너에서 vercel.app 접근이 막혀 있어
 * Actions 러너가 대신 크론 엔드포인트를 호출한다.
 * 인사이트 허브(38개 소스)는 첫 실행에서 영문 번역이 많아 두 번 호출한다.
 */

const BASE = "https://stock-dashboard-jaeyeon.vercel.app";

async function hit(name, url, timeoutMs = 120_000, quiet = false) {
  console.log(`\n===== ${name} =====\n${url}`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    console.log("status:", res.status);
    const text = await res.text();
    if (!quiet) console.log(text.slice(0, 3500));
    return res.status;
  } catch (e) {
    console.log("FETCH ERROR:", e.message);
    return 0;
  }
}

// 새 라우트 배포를 기다린다 (최대 ~4분)
let deployed = false;
for (let i = 0; i < 12; i++) {
  const page = await hit(`insights-hub 배포 확인 (${i + 1}/12)`, `${BASE}/insights-hub`, 30_000, true);
  if (page === 200) {
    deployed = true;
    break;
  }
  await new Promise((r) => setTimeout(r, 20_000));
}
if (!deployed) console.log("\n배포 확인 실패 — 크론 호출은 그래도 시도해 본다");

await hit("허브 수집+번역 1차", `${BASE}/api/cron/firm-insights`);
await hit("허브 수집+번역 2차 (미번역 잔여분)", `${BASE}/api/cron/firm-insights`);
