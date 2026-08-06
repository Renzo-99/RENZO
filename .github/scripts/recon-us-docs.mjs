/**
 * 배포 확인 + 수집 트리거: 개발 컨테이너에서 vercel.app 접근이 막혀 있어
 * Actions 러너가 대신 크론 엔드포인트를 호출한다.
 */

const BASE = "https://stock-dashboard-jaeyeon.vercel.app";

async function hit(name, url, timeoutMs = 90_000, quiet = false) {
  console.log(`\n===== ${name} =====\n${url}`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    console.log("status:", res.status);
    const text = await res.text();
    if (!quiet) console.log(text.slice(0, 4000));
    return res.status;
  } catch (e) {
    console.log("FETCH ERROR:", e.message);
    return 0;
  }
}

await hit("수집+번역 (크론 수동 실행)", `${BASE}/api/cron/us-docs`);
await hit("피드 확인 (연준 항목의 abstract_ko)", `${BASE}/api/us-docs`, 30_000);
