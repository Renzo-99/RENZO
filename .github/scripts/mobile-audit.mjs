/** 정찰 20: 실제치(결과값) 소스 — 인베스팅(헤더 변형·POST)·야후 캘린더·트레이딩이코노믹스 게스트·FF 다음주 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const short = (t, n = 500) => String(t).replace(/\s+/g, " ").slice(0, n);
const tryFetch = async (label, url, init = {}) => {
  try { const r = await fetch(url, { ...init, headers: { "user-agent": UA, ...(init.headers ?? {}) } }); const t = await r.text(); console.log(`  ${label} → ${r.status} len ${t.length} :: ${short(t, 260)}`); return t; }
  catch (e) { console.log(`  ${label} → ERR ${e.message}`); return ""; }
};
console.log("=== 인베스팅 ===");
await tryFetch("위젯(referer 위젯)", "https://sslecal2.investing.com/?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&importance=1,2,3&countries=5,37&calType=week&timeZone=88&lang=18", { headers: { referer: "https://sslecal2.investing.com/", accept: "text/html,*/*", "accept-language": "ko-KR,ko;q=0.9" } });
await tryFetch("위젯(referer 없음)", "https://sslecal2.investing.com/?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&importance=1,2,3&countries=5,37&calType=week&timeZone=88&lang=18", { headers: { accept: "text/html,*/*" } });
await tryFetch("kr.investing 캘린더", "https://kr.investing.com/economic-calendar/", { headers: { accept: "text/html,*/*", "accept-language": "ko-KR,ko;q=0.9" } });
await tryFetch("getCalendarFilteredData", "https://kr.investing.com/economic-calendar/Service/getCalendarFilteredData", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "x-requested-with": "XMLHttpRequest", referer: "https://kr.investing.com/economic-calendar/", accept: "*/*" }, body: "country%5B%5D=5&country%5B%5D=37&importance%5B%5D=2&importance%5B%5D=3&timeZone=88&timeFilter=timeRemain&currentTab=thisWeek&submitFilters=1&limit_from=0" });
console.log("=== 야후 ===");
const y = await tryFetch("yahoo calendar html", "https://finance.yahoo.com/calendar/economic?day=2026-09-11", { headers: { accept: "text/html,*/*" } });
console.log("   Actual 포함:", y.includes("Actual"), "CPI 포함:", y.includes("CPI"), short(y.match(/Consumer Price Index[\s\S]{0,300}/)?.[0] ?? "", 300));
console.log("=== 트레이딩이코노믹스 게스트 ===");
await tryFetch("TE calendar guest", "https://api.tradingeconomics.com/calendar?c=guest:guest&f=json", { headers: { accept: "application/json" } });
await tryFetch("TE US CPI guest", "https://api.tradingeconomics.com/calendar/country/united%20states?c=guest:guest&f=json", { headers: { accept: "application/json" } });
console.log("=== FF 다음주 ===");
const ff = await tryFetch("ff nextweek", "https://nfs.faireconomy.media/ff_calendar_nextweek.json");
try { const j = JSON.parse(ff); console.log("   items", j.length, "KRW 이벤트:", j.filter((e) => e.country === "KRW").length, "국가:", [...new Set(j.map((e) => e.country))].join(",")); } catch {}
console.log("=== BLS 공개 API(키 없음) ===");
await tryFetch("BLS CPI-U SA", "https://api.bls.gov/publicAPI/v2/timeseries/data/CUSR0000SA0?latest=true", { headers: { accept: "application/json" } });
