/** 정찰 5: 페이징 — 토스는 다른 API에서 pagingParam{number,size}를 쓴다. 그 변형들 */
const H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*", referer: "https://tossinvest.com/", origin: "https://tossinvest.com", "content-type": "application/json",
};
const U = "https://wts-info-api.tossinvest.com/api/v2/tics/169/stocks";
const tries = [
  ["pagingParam", U, JSON.stringify({ pagingParam: { number: 2, size: 100 } })],
  ["pagingParam n1 s100", U, JSON.stringify({ pagingParam: { number: 1, size: 100 } })],
  ["paging", U, JSON.stringify({ paging: { number: 2, size: 100 } })],
  ["page obj", U, JSON.stringify({ page: { number: 2, size: 100 } })],
  ["number/size", U, JSON.stringify({ number: 2, size: 100 })],
  ["pageNo", U, JSON.stringify({ pageNo: 2, size: 100 })],
  ["offset/limit", U, JSON.stringify({ offset: 10, limit: 100 })],
  ["query number", `${U}?number=2&size=100`, "{}"],
  ["query pageNo", `${U}?pageNo=2&pageSize=100`, "{}"],
  ["query offset", `${U}?offset=10&limit=100`, "{}"],
  ["ids", U, JSON.stringify({ ticsId: 169, page: 2, size: 100 })],
];
for (const [label, url, body] of tries) {
  try {
    const r = await fetch(url, { method: "POST", headers: H, body, signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch {}
    const st = j?.result?.stocks;
    console.log(`${label.padEnd(20)} HTTP ${r.status} · stocks=${Array.isArray(st) ? st.length : "-"} page=${j?.result?.page} size=${j?.result?.size} total=${j?.result?.totalCount} · 첫=${st?.[0]?.name ?? ""}${!st ? " · " + t.slice(0, 140) : ""}`);
  } catch (e) { console.log(`${label} 실패 ${String(e).slice(0, 60)}`); }
}
