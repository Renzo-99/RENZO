/** 검증: 배포된 앱에서 (1) 야후 crumb (2) 환율 (3) 미국 시총 환산이 되는가 */
const APP = "https://stock-dashboard-jaeyeon.vercel.app";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };

// 배포된 앱이 미국 종목 상세를 렌더하는지 — HTML에서 시가총액 값을 긁는다
for (const t of ["AAPL", "NVDA"]) {
  try {
    const r = await fetch(`${APP}/stock/${t}?cb=${Date.now()}`, { signal: AbortSignal.timeout(45000) });
    const html = await r.text();
    console.log(`\n=== /stock/${t} HTTP ${r.status} (${html.length}B) ===`);
    const cap = html.match(/시가총액[\s\S]{0,300}?>([^<]{1,30}(?:조원|억원|—|―))</);
    const price = html.match(/현재가[\s\S]{0,300}?>(\$?[\d,\.]+)</);
    console.log("  현재가:", price?.[1] ?? "(못 찾음)");
    console.log("  시가총액:", cap?.[1] ?? "(못 찾음)");
  } catch (e) { console.log(`${t} 실패:`, String(e).slice(0, 90)); }
}

// 환율 소스가 살아 있는지 (앱이 쓰는 그 경로)
const fx = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?range=1d&interval=1d", { headers: UA, signal: AbortSignal.timeout(12000) });
const fxj = await fx.json();
const rate = fxj?.chart?.result?.[0]?.meta?.regularMarketPrice;
console.log(`\n원/달러 (야후 KRW=X): HTTP ${fx.status} → ${rate}`);

// 기대값 계산
const y = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=1d", { headers: UA, signal: AbortSignal.timeout(12000) });
const yj = await y.json();
console.log(`AAPL 현재가: $${yj?.chart?.result?.[0]?.meta?.regularMarketPrice}`);
console.log(`기대 시총(원): 약 ${((4.615e12 * rate) / 1e12).toFixed(0)}조원`);
