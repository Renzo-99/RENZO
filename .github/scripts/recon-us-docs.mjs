/** 검증: 미국 종목 상세 페이지의 통화 표시 (수정 후) */
const APP = "https://stock-dashboard-jaeyeon.vercel.app";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };

const fxj = await (await fetch("https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?range=1d&interval=1d", { headers: UA, signal: AbortSignal.timeout(12000) })).json();
const rate = fxj?.chart?.result?.[0]?.meta?.regularMarketPrice;
console.log(`원/달러 실환율: ${rate}\n`);

for (const t of ["AAPL", "NVDA"]) {
  const yj = await (await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${t}?range=1d&interval=1d`, { headers: UA, signal: AbortSignal.timeout(12000) })).json();
  const px = yj?.chart?.result?.[0]?.meta?.regularMarketPrice;

  const r = await fetch(`${APP}/stock/${t}?cb=${Date.now()}`, { signal: AbortSignal.timeout(60000) });
  const html = await r.text();
  // 지표 블록만 잘라 라벨별로 정확히 읽는다
  const block = html.slice(html.indexOf('data-testid="stock-metrics"'), html.indexOf('data-testid="stock-metrics"') + 2500);
  const pick = (label) => {
    const i = block.indexOf(label);
    if (i < 0) return "(라벨 없음)";
    const seg = block.slice(i, i + 400).replace(/<[^>]+>/g, "|");
    return (seg.split("|").filter((x) => x.trim() && x.trim() !== label)[0] ?? "").trim();
  };
  console.log(`=== /stock/${t} HTTP ${r.status} ===`);
  console.log(`  야후 실제가:   $${px}`);
  console.log(`  화면 현재가:   ${pick("현재가")}`);
  console.log(`  화면 시가총액: ${pick("시가총액")}`);
  console.log(`  화면 거래대금: ${pick("거래대금")}`);
  console.log();
}
