/** 검증: 한글 단위 표기 + 원화·달러 병기 */
const APP = "https://stock-dashboard-jaeyeon.vercel.app";
for (const t of ["AAPL", "NVDA"]) {
  const r = await fetch(`${APP}/stock/${t}?cb=${Date.now()}`, { signal: AbortSignal.timeout(60000) });
  const html = await r.text();
  const i = html.indexOf('data-testid="stock-metrics"');
  const block = html.slice(i, i + 2500);
  const pick = (label) => {
    const j = block.indexOf(label);
    if (j < 0) return "(없음)";
    const seg = block.slice(j, j + 500).replace(/<[^>]+>/g, "|");
    return seg.split("|").filter((x) => x.trim() && x.trim() !== label).slice(0, 2).join("  /  ").trim();
  };
  console.log(`=== /stock/${t} HTTP ${r.status} ===`);
  console.log(`  현재가:   ${pick("현재가")}`);
  console.log(`  시가총액: ${pick("시가총액")}`);
  console.log(`  거래대금: ${pick("거래대금")}`);
  console.log();
}
// 미국 섹터 보드의 합산 시총 표기
const s = await (await fetch(`${APP}/sectors/us?cb=${Date.now()}`, { signal: AbortSignal.timeout(60000) })).text();
const caps = [...s.matchAll(/합산 시총[^<]*<\/?[^>]*>?([^<]{1,24})/g)].map((m) => m[1].trim()).slice(0, 5);
console.log("미국 섹터 합산 시총 표기:", caps.length ? caps.join(" | ") : "(클라이언트 렌더 — HTML엔 없음)");
console.log("영어 단위(T/B) 잔존 여부:", /\$\d[\d.,]*[TB]\b/.test(s) ? "남아 있음 ⚠" : "없음");
