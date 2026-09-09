/** 전수 조사 검증: (1) 토스 상장주식수를 네이버 시총으로 교차검증 (2) 누락 코드 개별 재조회 */
import { mkdirSync, writeFileSync } from "node:fs";
const UA = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
  referer: "https://tossinvest.com/", origin: "https://tossinvest.com",
};
const num = (s) => Number(String(s ?? "").replace(/[^0-9.]/g, "")) || 0;

// ── (1) 검증 대상: 시드 12 + 섹터 대표주
const CHECK = "005930,000660,277810,454910,012450,047810,086520,373220,267260,034020,010140,042660,005380,035420,035720,051910,006400,105560,055550,000270,207940,068270,012330,009150,011070,010130,015760,096770,003670,247540".split(",");
console.log("=== 토스 상장주식수 × 네이버 종가  vs  네이버 시가총액 ===");
const infoRes = await fetch(`https://wts-info-api.tossinvest.com/api/v2/stock-infos?codes=${CHECK.map(c=>"A"+c).join(",")}`, { headers: UA, signal: AbortSignal.timeout(20000) });
const info = new Map(((await infoRes.json()).result ?? []).map((r) => [String(r.symbol), r]));
let okCount = 0, offCount = 0;
for (const code of CHECK) {
  const t = info.get(code);
  if (!t) { console.log(`${code} 토스 없음`); continue; }
  try {
    const n = await (await fetch(`https://m.stock.naver.com/api/stock/${code}/integration`, { headers: UA, signal: AbortSignal.timeout(12000) })).json();
    const capRow = (n.totalInfos ?? []).find((x) => x.code === "marketValue" || x.key === "시가총액");
    const close = num((n.totalInfos ?? []).find((x) => x.code === "closePrice" || x.key === "종가")?.value) || num(n.closePrice);
    if (!capRow) { console.log(`${code} ${t.name} 네이버 시총 필드 없음 (키: ${(n.totalInfos??[]).map(x=>x.code).join("|")})`); continue; }
    const naverCapText = String(capRow.value);
    // "1,609조 1,234억" 같은 한글 단위 → 원
    let cap = 0;
    const jo = naverCapText.match(/([\d,\.]+)\s*조/); const eok = naverCapText.match(/([\d,\.]+)\s*억/);
    if (jo || eok) cap = (jo ? num(jo[1]) * 1e12 : 0) + (eok ? num(eok[1]) * 1e8 : 0);
    else cap = num(naverCapText) * 1e8; // 억원 단위 숫자만 오는 경우
    const mine = Number(t.sharesOutstanding) * close;
    const diff = cap > 0 ? Math.abs(mine - cap) / cap : null;
    const verdict = diff === null ? "?" : diff < 0.01 ? "일치" : `괴리 ${(diff*100).toFixed(1)}%`;
    if (diff !== null && diff < 0.01) okCount++; else offCount++;
    console.log(`${code} ${String(t.name).padEnd(14)} 주식수 ${String(t.sharesOutstanding).padStart(13)} × 종가 ${String(close).padStart(9)} = ${(mine/1e12).toFixed(2)}조  네이버 "${naverCapText}" → ${(cap/1e12).toFixed(2)}조  ${verdict}`);
  } catch (e) { console.log(`${code} 네이버 실패 ${String(e).slice(0,60)}`); }
  await new Promise(r => setTimeout(r, 150));
}
console.log(`\n1% 이내 일치 ${okCount} / 불일치 ${offCount}`);

// ── (2) 마스터에서 빠진 코드 개별 재조회
const GONE = "001000,002785,002787,002880,006490,011000,012510,018470,019680,019685,031440,038530,057050,073190,082640,083640,087260,094800,099220,196450,203400,203690,214680,222160,285800,297570,299900,304840,332290,365590,467930,468760,469880,471050,498390,900110,900120".split(",").filter(Boolean);
console.log(`\n=== 마스터에서 빠진 ${GONE.length}개 코드 개별 재조회 ===`);
const revived = [];
for (const code of GONE) {
  try {
    const r = await fetch(`https://wts-info-api.tossinvest.com/api/v2/stock-infos?codes=A${code}`, { headers: UA, signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    const t = (j.result ?? [])[0];
    if (t?.symbol) {
      revived.push({ code, name: t.name, market: { KSP: "KOSPI", KSQ: "KOSDAQ", KNX: "KONEX" }[t.market?.code] ?? "KOSPI", shares: t.sharesOutstanding ?? null, delistDate: t.delistDate ?? null, suspended: t.tradingSuspended === true });
      console.log(`  살아있음 ${code} ${t.name} ${t.market?.displayName} 주식수=${t.sharesOutstanding} 상폐일=${t.delistDate ?? "-"}`);
    } else {
      console.log(`  응답없음 ${code} (HTTP ${r.status})`);
    }
  } catch (e) { console.log(`  실패 ${code} ${String(e).slice(0,50)}`); }
  await new Promise(r => setTimeout(r, 100));
}
mkdirSync("audit-out", { recursive: true });
writeFileSync("audit-out/revived.json", JSON.stringify(revived));
console.log(`\n되살린 코드 ${revived.length}/${GONE.length}`);
