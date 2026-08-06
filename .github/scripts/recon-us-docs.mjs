/**
 * 배포 확인 + 수집 트리거: 개발 컨테이너에서 vercel.app 접근이 막혀 있어
 * Actions 러너가 대신 크론 엔드포인트를 호출한다. (기재부 소스 교체 반영분)
 */

const BASE = "https://stock-dashboard-jaeyeon.vercel.app";

async function hit(name, url, timeoutMs = 120_000, quiet = false) {
  console.log(`\n===== ${name} =====\n${url}`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    console.log("status:", res.status);
    const text = await res.text();
    if (!quiet) console.log(text.slice(0, 2000));
    return res.status;
  } catch (e) {
    console.log("FETCH ERROR:", e.message);
    return 0;
  }
}

await new Promise((r) => setTimeout(r, 150_000)); // 배포 대기
await hit("허브 수집 (기재부 교체 반영)", `${BASE}/api/cron/firm-insights`);
