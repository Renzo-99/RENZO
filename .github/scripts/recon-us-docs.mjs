/** 정찰: 주식 기대수익률(어닝일드) 소스 — S&P500 PER 확보 경로 */
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };
async function probe(label, url, ms = 12000) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
    const text = await res.text();
    console.log(`\n===== ${label} (${Date.now() - t0}ms) =====\nHTTP ${res.status} · ${text.length}B`);
    console.log(text.slice(0, 600).replace(/\n{2,}/g, "\n"));
  } catch (e) {
    console.log(`\n===== ${label} =====\n오류: ${e.message}`);
  }
}
await probe("야후 quoteSummary SPY", "https://query1.finance.yahoo.com/v10/finance/quoteSummary/SPY?modules=summaryDetail,defaultKeyStatistics");
await probe("야후 quoteSummary IVV", "https://query1.finance.yahoo.com/v10/finance/quoteSummary/IVV?modules=summaryDetail");
await probe("야후 quote SPY", "https://query1.finance.yahoo.com/v7/finance/quote?symbols=SPY,TLT,IEF");
await probe("multpl S&P PE", "https://www.multpl.com/s-p-500-pe-ratio");
await probe("multpl 어닝일드", "https://www.multpl.com/s-p-500-earnings-yield");
await probe("야후 chart SPY meta", "https://query1.finance.yahoo.com/v8/finance/chart/SPY?range=1d&interval=1d");
await probe("TLT 듀레이션(iShares)", "https://www.ishares.com/us/products/239454/ishares-20-year-treasury-bond-etf/1467271812596.ajax?fileType=json");
