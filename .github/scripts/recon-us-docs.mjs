/**
 * 배포 확인 + 수집 트리거: 개발 컨테이너에서 vercel.app 접근이 막혀 있어
 * Actions 러너가 대신 크론 엔드포인트를 호출한다. (제목 정제 v2 재수집)
 */

const BASE = "https://stock-dashboard-jaeyeon.vercel.app";

async function hit(name, url, timeoutMs = 120_000, quiet = false) {
  console.log(`\n===== ${name} =====\n${url}`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    console.log("status:", res.status);
    const text = await res.text();
    if (!quiet) console.log(text.slice(0, 2500));
    return res.status;
  } catch (e) {
    console.log("FETCH ERROR:", e.message);
    return 0;
  }
}

await new Promise((r) => setTimeout(r, 160_000)); // 배포 대기
await hit("허브 재수집 1차 (v2 정제)", `${BASE}/api/cron/firm-insights`);
await hit("허브 재수집 2차 (미번역 잔여분)", `${BASE}/api/cron/firm-insights`);
