/** 정찰 24: /api/v4/calendar/monthly/2026-09 — 어느 호스트인지, 응답 구조(경제지표·실적·휴장일·국가·중요도?) */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const A = { "user-agent": UA, accept: "application/json, text/plain, */*", origin: "https://www.tossinvest.com", referer: "https://www.tossinvest.com/calendar" };
const short = (t, n = 300) => String(t).replace(/\s+/g, " ").slice(0, n);
const hosts = ["https://wts-cert-api.tossinvest.com", "https://wts-info-api.tossinvest.com", "https://wts-api.tossinvest.com", "https://wts-cert-api.tossinvest.com/api/v4/calendar/monthly/2026-09?country=KR"];
for (const h of hosts) {
  const u = h.includes("/api/") ? h : `${h}/api/v4/calendar/monthly/2026-09`;
  const r = await fetch(u, { headers: A }).catch((e) => ({ status: "ERR " + e.message, text: async () => "" }));
  const t = await r.text();
  console.log(u, "→", r.status, "len", t.length);
  if (r.status === 200) {
    try {
      const j = JSON.parse(t);
      const res = j.result ?? j;
      console.log("  top keys:", Object.keys(res).join(","));
      const arr = Array.isArray(res) ? res : res.events ?? res.days ?? res.items ?? res.data ?? Object.values(res).find((v) => Array.isArray(v));
      if (Array.isArray(arr)) {
        console.log("  배열 길이:", arr.length, "첫 원소 keys:", Object.keys(arr[0] ?? {}).join(","));
        for (const e of arr.slice(0, 3)) console.log("  ", short(JSON.stringify(e), 700));
        // 그룹/타입 분포
        const flat = arr.flatMap((d) => (Array.isArray(d.events) ? d.events : [d]));
        const groups = {};
        for (const e of flat) { const g = e.group ?? e.type ?? e.category ?? e.id?.group ?? "?"; groups[g] = (groups[g] ?? 0) + 1; }
        console.log("  그룹 분포:", JSON.stringify(groups), "총", flat.length);
        const samples = ["EARNING", "HOLIDAY", "DIVIDEND", "IPO"].map((k) => flat.find((e) => JSON.stringify(e).toUpperCase().includes(k)));
        for (const s of samples) if (s) console.log("  예:", short(JSON.stringify(s), 600));
        console.log("  키 합집합:", [...new Set(flat.flatMap((e) => Object.keys(e)))].join(","));
      } else console.log("  ", short(t, 800));
    } catch { console.log("  ", short(t, 400)); }
  } else console.log("  ", short(t, 200));
}
for (const u of ["https://wts-cert-api.tossinvest.com/api/v1/calendar/ai-summary/key-events", "https://wts-info-api.tossinvest.com/api/v1/calendar/ai-summary/key-events", "https://wts-cert-api.tossinvest.com/api/v1/nova-calendar/ai/summary/weekly"]) {
  const r = await fetch(u, { headers: A }).catch(() => null);
  console.log(u.replace("https://", ""), "→", r?.status, short(await r?.text().catch(() => "") ?? "", 400));
}
