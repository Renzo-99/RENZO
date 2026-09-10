/** 정찰 4: /tics/{id}/stocks 페이징 파라미터 — 기본 10건만 온다(반도체 575사 중 10) */
const H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*", referer: "https://tossinvest.com/", origin: "https://tossinvest.com", "content-type": "application/json",
};
const U = "https://wts-info-api.tossinvest.com/api/v2/tics/169/stocks";
const tries = [
  ["body {}", U, "{}"],
  ["body page/size", U, JSON.stringify({ page: 0, size: 100 })],
  ["body page1", U, JSON.stringify({ page: 1, size: 100 })],
  ["body pageSize", U, JSON.stringify({ pageSize: 100, pageNumber: 0 })],
  ["query size", `${U}?size=100&page=0`, "{}"],
  ["query size 1000", `${U}?size=1000`, "{}"],
  ["query page 1", `${U}?size=50&page=1`, "{}"],
  ["body sort", U, JSON.stringify({ page: 0, size: 100, sortBy: "MARKET_CAP", sortOrder: "DESC" })],
  ["body nation", U, JSON.stringify({ page: 0, size: 100, nation: "kr" })],
];
for (const [label, url, body] of tries) {
  try {
    const r = await fetch(url, { method: "POST", headers: H, body, signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch {}
    const st = j?.result?.stocks;
    console.log(`${label.padEnd(16)} HTTP ${r.status} · stocks=${Array.isArray(st) ? st.length : "-"} page=${j?.result?.page} size=${j?.result?.size} total=${j?.result?.totalCount} · 첫=${st?.[0]?.name ?? ""} 마지막=${st?.[st.length - 1]?.name ?? ""}${!st ? " · " + t.slice(0, 160) : ""}`);
  } catch (e) { console.log(`${label} 실패 ${String(e).slice(0, 60)}`); }
}
