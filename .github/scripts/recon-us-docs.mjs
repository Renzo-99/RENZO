/** 전수 감사 2단계: 네이버·토스 응답의 상장주식수/시가총액 필드 확정 */
const UA = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
};

for (const code of ["005930", "277810"]) {
  console.log(`\n${"=".repeat(60)}\n### ${code}\n${"=".repeat(60)}`);

  const nRes = await fetch(`https://m.stock.naver.com/api/stock/${code}/integration`, { headers: UA, signal: AbortSignal.timeout(12000) });
  const n = await nRes.json();
  console.log(`\n[네이버 integration] 최상위 키:`, Object.keys(n).join(", "));
  console.log("stockName:", n.stockName, "/ 시장:", n.stockExchangeType?.name ?? n.sosok);
  console.log("totalInfos:");
  for (const t of n.totalInfos ?? []) console.log(`   ${(t.code ?? "").padEnd(22)} ${(t.key ?? "").padEnd(12)} ${t.value}`);
  if (n.dealTrendInfos?.[0]) console.log("dealTrend 키:", Object.keys(n.dealTrendInfos[0]).join(", "));

  const nb = await (await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, { headers: UA, signal: AbortSignal.timeout(12000) })).json();
  console.log(`\n[네이버 basic] 키:`, Object.keys(nb).join(", "));
  for (const k of ["marketValue", "marketValueHangul", "listedStockCnt", "listedStockCount", "stockTotalCount", "sharesOutstanding", "closePrice", "industryCodeType", "stockExchangeType"]) {
    if (k in nb) console.log(`   ${k} =`, typeof nb[k] === "object" ? JSON.stringify(nb[k]) : nb[k]);
  }

  const tRes = await fetch(`https://wts-info-api.tossinvest.com/api/v2/stock-infos?codes=A${code}`, { headers: { ...UA, referer: "https://tossinvest.com/", origin: "https://tossinvest.com" }, signal: AbortSignal.timeout(12000) });
  const t = (await tRes.json()).result?.[0];
  console.log(`\n[토스 v2 stock-infos] 키:`, Object.keys(t ?? {}).join(", "));
  console.log(JSON.stringify(t, null, 1).slice(0, 1200));
}
