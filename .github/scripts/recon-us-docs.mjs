/** 검증: 토스 상장주식수를 네이버 시가총액으로 교차검증 (네이버는 자체 헤더로 호출) */
const TOSS_H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
  referer: "https://tossinvest.com/", origin: "https://tossinvest.com",
};
// 네이버는 origin이 붙으면 "Invalid CORS request"로 거절한다 — 브라우저 흉내만 낸다
const NAVER_H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
};
const num = (s) => Number(String(s ?? "").replace(/[^0-9.]/g, "")) || 0;

const CHECK = "005930,000660,277810,454910,012450,047810,086520,373220,267260,034020,010140,042660,005380,035420,035720,051910,006400,105560,055550,000270,207940,068270,012330,009150,011070,010130,015760,096770,003670,247540".split(",");

const infoRes = await fetch(`https://wts-info-api.tossinvest.com/api/v2/stock-infos?codes=${CHECK.map(c=>"A"+c).join(",")}`, { headers: TOSS_H, signal: AbortSignal.timeout(20000) });
const info = new Map(((await infoRes.json()).result ?? []).map((r) => [String(r.symbol), r]));

// 시총 필드 이름 먼저 확인
const probe = await (await fetch(`https://m.stock.naver.com/api/stock/005930/integration`, { headers: NAVER_H, signal: AbortSignal.timeout(12000) })).json();
console.log("네이버 totalInfos 항목:", (probe.totalInfos ?? []).map((x) => `${x.code}=${x.key}`).join(" | "));
console.log();

console.log("=== 토스 상장주식수 × 네이버 현재가  vs  네이버 시가총액 ===");
let ok = 0, off = 0;
const bad = [];
for (const code of CHECK) {
  const t = info.get(code);
  if (!t) { console.log(`${code} 토스 없음`); continue; }
  try {
    const n = await (await fetch(`https://m.stock.naver.com/api/stock/${code}/integration`, { headers: NAVER_H, signal: AbortSignal.timeout(12000) })).json();
    const rows = n.totalInfos ?? [];
    const capRow = rows.find((x) => x.code === "marketValue");
    const close = num(n.dealTrendInfos?.[0]?.closePrice) || num(rows.find((x) => x.code === "lastClosePrice")?.value);
    if (!capRow) { console.log(`${code} ${t.name} 시총 필드 없음`); continue; }
    const txt = String(capRow.value);
    const jo = txt.match(/([\d,\.]+)\s*조/), eok = txt.match(/([\d,\.]+)\s*억/);
    const cap = (jo || eok) ? (jo ? num(jo[1]) * 1e12 : 0) + (eok ? num(eok[1]) * 1e8 : 0) : num(txt) * 1e8;
    const mine = Number(t.sharesOutstanding) * close;
    const diff = cap > 0 ? Math.abs(mine - cap) / cap : null;
    const v = diff === null ? "?" : diff < 0.01 ? "일치" : `괴리 ${(diff * 100).toFixed(1)}%`;
    if (diff !== null && diff < 0.01) ok++; else { off++; bad.push(`${code} ${t.name}`); }
    console.log(`${code} ${String(t.name).padEnd(13)} ${String(t.sharesOutstanding).padStart(12)}주 × ${String(close).padStart(8)}원 = ${(mine/1e12).toFixed(2)}조 | 네이버 "${txt}" = ${(cap/1e12).toFixed(2)}조  ${v}`);
  } catch (e) { console.log(`${code} 네이버 실패 ${String(e).slice(0,70)}`); }
  await new Promise(r => setTimeout(r, 150));
}
console.log(`\n1% 이내 일치 ${ok} / 불일치 ${off}`);
if (bad.length) console.log("불일치:", bad.join(", "));
