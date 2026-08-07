/**
 * 배포 확인 + 수집 트리거: 산업부·환경부 정책브리핑 교체 반영분.
 */

const BASE = "https://stock-dashboard-jaeyeon.vercel.app";

async function hit(name, url, timeoutMs = 120_000) {
  console.log(`\n===== ${name} =====\n${url}`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    console.log("status:", res.status);
    console.log((await res.text()).slice(0, 2500));
    return res.status;
  } catch (e) {
    console.log("FETCH ERROR:", e.message);
    return 0;
  }
}

await new Promise((r) => setTimeout(r, 160_000)); // 배포 대기
await hit("허브 수집 (산업부·환경부 교체 반영)", `${BASE}/api/cron/firm-insights`);
