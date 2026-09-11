/** 정찰 25: 월별 캘린더 POST 바디 변형 + key-events 전체 구조(예상·실제·이전이 여기 있다) */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const A = { "user-agent": UA, accept: "application/json, text/plain, */*", "content-type": "application/json", origin: "https://www.tossinvest.com", referer: "https://www.tossinvest.com/calendar" };
const short = (t, n = 300) => String(t).replace(/\s+/g, " ").slice(0, n);
const C = "https://wts-cert-api.tossinvest.com";
console.log("=== monthly POST ===");
const bodies = [{}, { countries: ["KR", "US"] }, { types: ["ECONOMIC", "EARNINGS", "HOLIDAY"] }, { nation: "ALL" }, { filter: { nation: "ALL", category: "ALL" } }, { calendarTypes: ["ECONOMIC"] }, { eventTypes: ["ECONOMIC", "EARNING", "HOLIDAY"], nations: ["KR", "US"] }, []];
for (const b of bodies) {
  const r = await fetch(`${C}/api/v4/calendar/monthly/2026-09`, { method: "POST", headers: A, body: JSON.stringify(b) }).catch(() => null);
  const t = await r?.text().catch(() => "") ?? "";
  console.log(`  ${JSON.stringify(b).slice(0, 60).padEnd(62)} → ${r?.status} len ${t.length} :: ${short(t, 240)}`);
  if (r?.status === 200 && t.length > 100) {
    try {
      const j = JSON.parse(t); const res = j.result ?? j;
      console.log("   top keys:", Object.keys(res).join(","));
      const arr = Array.isArray(res) ? res : Object.values(res).find((v) => Array.isArray(v));
      if (arr) { console.log("   배열", arr.length, "keys:", Object.keys(arr[0] ?? {}).join(",")); for (const e of arr.slice(0, 4)) console.log("   ", short(JSON.stringify(e), 500)); const flat = arr.flatMap((d) => Array.isArray(d.events) ? d.events : Array.isArray(d.items) ? d.items : [d]); const g = {}; for (const e of flat) { const k = e.group ?? e.type ?? e.category ?? e.eventType ?? e.id?.group ?? "?"; g[k] = (g[k] ?? 0) + 1; } console.log("   분포:", JSON.stringify(g), "키합집합:", [...new Set(flat.flatMap((e) => Object.keys(e)))].join(",")); for (const k of ["EARN", "HOLIDAY", "실적", "휴장"]) { const s = flat.find((e) => JSON.stringify(e).toUpperCase().includes(k)); if (s) console.log("   예", k, short(JSON.stringify(s), 500)); } }
    } catch {}
    break;
  }
}
console.log("\n=== key-events 전체 ===");
const k = await (await fetch(`${C}/api/v1/calendar/ai-summary/key-events`, { headers: A })).json();
const res = k.result ?? {};
console.log("top keys:", Object.keys(res).join(","));
for (const key of Object.keys(res)) {
  const v = res[key];
  console.log(` ${key}:`, typeof v === "object" && v ? Object.keys(v).join(",") : v);
  const arr = Array.isArray(v) ? v : v?.indicators ?? v?.items ?? v?.events;
  if (Array.isArray(arr)) { console.log("  n=", arr.length, "keys:", Object.keys(arr[0] ?? {}).join(",")); for (const e of arr) console.log("   ", short(JSON.stringify(e), 330)); }
}
for (const u of [`${C}/api/v1/calendar/ai-summary/key-events?date=2026-09-16`, `${C}/api/v1/calendar/ai-summary/key-events?startDate=2026-09-01&endDate=2026-09-30`, `${C}/api/v1/calendar/ai-summary/key-events?yearMonth=2026-09`]) {
  const r = await fetch(u, { headers: A }).catch(() => null); const t = await r?.text().catch(() => "") ?? "";
  const n = (t.match(/"ric"/g) ?? []).length; console.log("  ", u.slice(C.length), "→", r?.status, "ric 수", n);
}
