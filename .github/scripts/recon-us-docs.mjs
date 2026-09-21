// 일봉 계산이 왜 어긋나는지 — 원자료를 그대로 본다
import fs from "node:fs";
const H = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
  accept: "application/json", "content-type": "application/json", referer: "https://tossinvest.com/", origin: "https://tossinvest.com" };
const OUT = []; const log = (...a) => { const s = a.join(" "); console.log(s); OUT.push(s); };
const INFO = "https://wts-info-api.tossinvest.com";
const j = async (u, i) => { const r = await fetch(u, { headers: H, ...i }); return r.ok ? r.json() : { __status: r.status }; };

for (const [label, path, code] of [["삼성전자", "kr-s", "A005930"], ["SK하이닉스", "kr-s", "A000660"], ["엔비디아", "us-s", "US19990122001"]]) {
  const r = await j(`${INFO}/api/v1/c-chart/${path}/${code}/day:1?count=70`);
  const c = r?.result?.candles ?? r?.candles ?? [];
  log(`\n### ${label} candles=${c.length} 응답키=${Object.keys(r?.result ?? r).join(",")}`);
  if (c.length) {
    log(`  [0]  ${JSON.stringify(c[0])}`);
    log(`  [1]  ${JSON.stringify(c[1])}`);
    log(`  [-1] ${JSON.stringify(c[c.length - 1])}`);
    const asc = [...c].sort((a, b) => String(a.dt).localeCompare(String(b.dt)));
    log(`  오름차순 첫 ${asc[0].dt} ${asc[0].close} → 끝 ${asc[asc.length-1].dt} ${asc[asc.length-1].close}`);
    const n = asc.length;
    for (const back of [21, 63]) {
      if (n > back) {
        const b = asc[n-1-back], l = asc[n-1];
        log(`  ${back}거래일 전(${b.dt}) ${b.close} → 지금(${l.dt}) ${l.close} = ${(((l.close-b.close)/b.close)*100).toFixed(2)}%`);
      }
    }
  }
}

// 현재가 API와 대조
const pr = await j(`${INFO}/api/v3/stock-prices?meta=true&productCodes=A005930,A000660,US19990122001`);
log(`\n### stock-prices: ${JSON.stringify(pr?.result ?? pr).slice(0, 900)}`);

// 토스가 준 노드 수익률 몇 개 더
const all = await j(`${INFO}/api/v1/tics/all`);
const its = all?.result?.ticsItems ?? [];
log(`\n### 산업 39개 3개월 수익률 분포`);
const rs = its.map((i) => ({ t: i.title, m3: i.fluctuations?.threeMonthsRate, m1: i.fluctuations?.oneMonthRate })).sort((a,b)=>(b.m3??-999)-(a.m3??-999));
for (const x of rs.slice(0, 5)) log(`  ▲ ${x.t}: 3개월 ${x.m3}% · 1개월 ${x.m1}%`);
for (const x of rs.slice(-5)) log(`  ▼ ${x.t}: 3개월 ${x.m3}% · 1개월 ${x.m1}%`);

fs.mkdirSync("audit-out", { recursive: true });
fs.writeFileSync("audit-out/toss-company-recon.txt", OUT.join("\n"));
