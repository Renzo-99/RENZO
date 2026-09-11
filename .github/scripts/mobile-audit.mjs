/** 정찰 19: 경제 일정의 중요도·예상치·실제치 소스 — 인베스팅 위젯(한국어)·포렉스팩토리 JSON·토스 aiSummary */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const short = (t, n = 500) => String(t).replace(/\s+/g, " ").slice(0, n);

console.log("=== (1) 인베스팅 경제 캘린더 위젯 (lang=18 한국어, 이번 주, 중요도 1~3) ===");
const wu = "https://sslecal2.investing.com/?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&importance=1,2,3&features=datepicker,timezone&countries=5,37,35,6,4,72,22,17,39,14,10,25,12,43,43,45,110&calType=week&timeZone=88&lang=18";
const w = await fetch(wu, { headers: { "user-agent": UA, referer: "https://www.investing.com/" } }).catch((e) => ({ status: "ERR " + e.message, text: async () => "" }));
const html = await w.text();
console.log("status", w.status, "length", html.length);
const rows = [...html.matchAll(/<tr[^>]*id="eventRowId_(\d+)"[^>]*>([\s\S]*?)<\/tr>/g)];
console.log("rows:", rows.length);
for (const r of rows.slice(0, 5)) {
  const cells = [...r[2].matchAll(/<td[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/td>/g)].map((m) => `${m[1].split(" ")[0]}=${short(m[2].replace(/<[^>]+>/g, "").trim(), 40)}`);
  const bulls = (r[2].match(/grayFullBullishIcon/g) || []).length;
  const attrs = r[0].match(/<tr[^>]*>/)[0];
  console.log(`  ${r[1]} bulls=${bulls} ${short(attrs, 220)}`);
  console.log("     ", cells.join(" | "));
}
// 실제치 채워진 행 찾기
const withActual = rows.filter((r) => /class="[^"]*act[^"]*"[^>]*>\s*[-\d]/.test(r[2]));
console.log("실제치 있는 행:", withActual.length, withActual[0] ? short(withActual[0][2].replace(/<[^>]+>/g, " "), 200) : "");

console.log("\n=== (2) 포렉스팩토리 JSON ===");
const ff = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", { headers: { "user-agent": UA } }).catch((e) => ({ status: "ERR " + e.message, json: async () => null }));
const fj = await ff.json?.().catch(() => null);
console.log("status", ff.status, "items", Array.isArray(fj) ? fj.length : "x", "keys", Object.keys(fj?.[0] ?? {}).join(","));
for (const e of (fj ?? []).filter((e) => e.country === "USD" && e.impact === "High").slice(0, 4)) console.log("  ", JSON.stringify(e));

console.log("\n=== (3) 토스 aiSummary ===");
const t = await (await fetch("https://wts-cert-api.tossinvest.com/api/v2/dashboard/wts/overview/calendar/economic-events", { headers: { "user-agent": UA, accept: "application/json", origin: "https://www.tossinvest.com", referer: "https://www.tossinvest.com/" } })).json();
console.log(short(JSON.stringify(t.result?.aiSummary), 600));
