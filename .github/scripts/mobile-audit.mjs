/** 정찰 23: 토스 증시캘린더(월별)의 API 경로 찾기 — 웹 페이지 JS 번들에서 calendar/event/holiday/earning 경로 추출 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const H = { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*", "accept-language": "ko-KR,ko;q=0.9" };
const short = (t, n = 300) => String(t).replace(/\s+/g, " ").slice(0, n);
const found = new Set();
const scan = (txt, from) => {
  for (const m of txt.matchAll(/["'`](\/api\/[^"'`\s]*(?:calendar|event|holiday|earning|schedule|ipo|dividend)[^"'`\s]*)["'`]/gi)) found.add(m[1]);
  for (const m of txt.matchAll(/(https?:\/\/wts-[a-z-]+\.tossinvest\.com\/api\/[^"'`\s]*)/g)) if (/calendar|event|holiday|earning|schedule/i.test(m[1])) found.add(m[1]);
  for (const m of txt.matchAll(/["'`]([^"'`\s]*calendar[^"'`\s]*)["'`]/gi)) if (m[1].includes("/") && m[1].length < 120) found.add("path:" + m[1]);
};
for (const url of ["https://www.tossinvest.com/calendar", "https://www.tossinvest.com/calendar/economic", "https://tossinvest.com/calendar"]) {
  const r = await fetch(url, { headers: H, redirect: "follow" }).catch((e) => null);
  const html = await r?.text().catch(() => "") ?? "";
  console.log(url, "→", r?.status, "len", html.length, "title:", short(html.match(/<title>([^<]*)/)?.[1] ?? "", 80));
  scan(html, url);
  const srcs = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]))].filter((s) => /\.js/.test(s)).slice(0, 60);
  console.log("  scripts:", srcs.length);
  let n = 0;
  for (const s of srcs) {
    const u = s.startsWith("http") ? s : new URL(s, url).href;
    const js = await fetch(u, { headers: { "user-agent": UA } }).then((x) => x.text()).catch(() => "");
    if (/calendar/i.test(js)) { n++; scan(js, u); }
  }
  console.log("  calendar 언급 번들:", n);
  if (html.length > 1000) break;
}
console.log("\n=== 후보 경로 ===");
for (const f of [...found].sort()) console.log("  ", f);
console.log("\n=== 직접 시도 ===");
const C = "https://wts-cert-api.tossinvest.com", I = "https://wts-info-api.tossinvest.com";
const A = { "user-agent": UA, accept: "application/json, text/plain, */*", origin: "https://www.tossinvest.com", referer: "https://www.tossinvest.com/" };
for (const u of [
  `${C}/api/v2/dashboard/wts/overview/calendar/economic-events?startDate=2026-09-01&endDate=2026-09-30`,
  `${C}/api/v2/dashboard/wts/overview/calendar/economic-events?yearMonth=2026-09`,
  `${C}/api/v1/dashboard/wts/calendar/events?startDate=2026-09-01&endDate=2026-09-30`,
  `${C}/api/v1/calendar/events?startDate=2026-09-01&endDate=2026-09-30`,
  `${I}/api/v1/calendar/events?startDate=2026-09-01&endDate=2026-09-30`,
  `${I}/api/v2/calendar?startDate=2026-09-01&endDate=2026-09-30`,
  `${I}/api/v1/calendars?from=2026-09-01&to=2026-09-30`,
  `${I}/api/v1/calendar/economic-events?startDate=2026-09-01&endDate=2026-09-30`,
  `${I}/api/v1/calendar/monthly?year=2026&month=9`,
  `${C}/api/v1/dashboard/wts/overview/calendar/earnings-events`,
  `${C}/api/v2/dashboard/wts/overview/calendar/holidays`,
]) {
  const r = await fetch(u, { headers: A }).catch(() => null);
  console.log("  ", u.replace(C, "C").replace(I, "I").slice(0, 100), "→", r?.status, short(await r?.text().catch(() => "") ?? "", 160));
}
