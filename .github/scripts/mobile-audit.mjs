/** 정찰 3: /tics/{id}/stocks 응답 전체 필드 (국내·미국 항목 각 1개) + /tics/all fluctuations 커버리지 */
const H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*", referer: "https://tossinvest.com/", origin: "https://tossinvest.com", "content-type": "application/json",
};
const all = await (await fetch("https://wts-info-api.tossinvest.com/api/v1/tics/all", { headers: H })).json();
const roots = all.result?.ticsItems ?? [];
let nodes = 0, withFluc = 0, withCap = 0;
for (const r of roots) { nodes++; if (r.fluctuations) withFluc++; for (const s of r.subItems ?? []) { nodes++; if (s.fluctuations) withFluc++; } }
console.log(`=== /tics/all: 노드 ${nodes}개, fluctuations 있음 ${withFluc}개 ===`);
console.log("최상위 fluctuations 표본:", JSON.stringify(roots.find((r) => r.id === 169)?.fluctuations));
console.log("최상위에 시총 필드 있나:", Object.keys(roots[0]).filter((k) => /cap|market|value/i.test(k)).join(",") || "없음");

for (const id of [169, 711]) { // 반도체(산업), 반도체 전공정 장비(테마)
  const r = await fetch(`https://wts-info-api.tossinvest.com/api/v2/tics/${id}/stocks`, { method: "POST", headers: H, body: "{}", signal: AbortSignal.timeout(15000) });
  const j = await r.json();
  const stocks = j.result?.stocks ?? [];
  const kr = stocks.find((s) => /^A\d{6}$/.test(s.code));
  const us = stocks.find((s) => /^US/.test(s.code));
  console.log(`\n=== POST /tics/${id}/stocks → HTTP ${r.status} · ${stocks.length}종목 · 국내 ${stocks.filter((s) => /^A\d{6}$/.test(s.code)).length} · 미국 ${stocks.filter((s) => /^US/.test(s.code)).length} · 기타 ${stocks.filter((s) => !/^A\d{6}$|^US/.test(s.code)).length} ===`);
  console.log("result 키:", Object.keys(j.result ?? {}).join(", "));
  console.log("국내 항목 전체:", JSON.stringify(kr));
  console.log("미국 항목 전체:", JSON.stringify(us));
  console.log("코드 접두 분포:", [...new Set(stocks.map((s) => String(s.code).slice(0, 2)))].join(","));
}
// 요청 바디로 정렬/페이징 되나
const r2 = await fetch(`https://wts-info-api.tossinvest.com/api/v2/tics/169/stocks`, { method: "POST", headers: H, body: JSON.stringify({ size: 500, sortBy: "marketCapKrw" }), signal: AbortSignal.timeout(15000) });
const j2 = await r2.json();
console.log(`\nsize=500 요청 → ${j2.result?.stocks?.length}종목 (기본 요청과 비교)`);
