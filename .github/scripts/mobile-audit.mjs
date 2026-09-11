/** 정찰 18: 토스 경제 일정 원본 필드 — 중요도·예상치·실제치·이전치·국가·시각이 있는지 */
const H = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", accept: "application/json, text/plain, */*", referer: "https://www.tossinvest.com/", origin: "https://www.tossinvest.com" };
const C = "https://wts-cert-api.tossinvest.com";
const short = (t, n = 400) => String(t).replace(/\s+/g, " ").slice(0, n);
const r = await fetch(`${C}/api/v2/dashboard/wts/overview/calendar/economic-events`, { headers: H });
const b = await r.json();
console.log("status", r.status, "top keys:", Object.keys(b.result ?? {}).join(","));
const ev = b.result?.events ?? [];
console.log("events:", ev.length, "keys:", Object.keys(ev[0] ?? {}).join(","));
for (const e of ev.slice(0, 4)) console.log(JSON.stringify(e));
// 값이 있는 이벤트(actual 채워진 것) 찾기
const withVal = ev.filter((e) => JSON.stringify(e).match(/actual|forecast|expect|previous|consensus/i));
console.log("값 필드 있는 이벤트:", withVal.length, JSON.stringify(withVal[0] ?? null).slice(0, 500));
// 다른 파라미터·엔드포인트도 시도
for (const u of [`${C}/api/v2/dashboard/wts/overview/calendar/economic-events?from=2026-09-01&to=2026-09-30`, `${C}/api/v1/dashboard/wts/overview/calendar/economic-events`, `${C}/api/v2/dashboard/wts/overview/calendar/earnings`, `${C}/api/v2/dashboard/wts/overview/calendar`, `https://wts-info-api.tossinvest.com/api/v1/economic-calendar?startDate=2026-09-08&endDate=2026-09-14`, `https://wts-info-api.tossinvest.com/api/v1/calendar/economic?date=2026-09-11`]) {
  const x = await fetch(u, { headers: H }).catch(() => null);
  console.log("  ", u.replace(C, "").slice(0, 90), "→", x?.status, short(await x?.text?.() ?? "", 300));
}
