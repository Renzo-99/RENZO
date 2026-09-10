/** 정찰 7: 지수 대시보드 전체 항목(코스닥·야간선물?) · overview/ranking POST(급등?) · 종목 일봉 파라미터 */
const H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*", referer: "https://tossinvest.com/", origin: "https://tossinvest.com", "content-type": "application/json",
};
const short = (t, n = 300) => String(t).replace(/\s+/g, " ").slice(0, n);
const C = "https://wts-cert-api.tossinvest.com", I = "https://wts-info-api.tossinvest.com";

console.log("=== (1) 지수 indicator 전체 ===");
const idx = await (await fetch(`${C}/api/v1/dashboard/wts/overview/indicator/index`, { headers: H })).json();
for (const it of idx.result?.majorIndicatorInfos ?? []) {
  const c = it.miniChart?.candles ?? [];
  console.log(`  ${it.code.padEnd(12)} ${it.displayName.padEnd(14)} ${it.nation} 현재 ${it.price?.latestPrice} 기준 ${it.price?.basePrice} 캔들 ${c.length}개 ${c[0]?.startDate ?? ""}~${c[c.length - 1]?.endDate ?? ""} 거래 ${it.miniChart?.tradingStart}~${it.miniChart?.tradingEnd}`);
}
console.log("첫 캔들 형태:", JSON.stringify((idx.result?.majorIndicatorInfos?.[0]?.miniChart?.candles ?? [])[0]));
for (const kind of ["futures", "future", "night", "index-futures", "kr-futures"]) {
  const r = await fetch(`${C}/api/v1/dashboard/wts/overview/indicator/${kind}`, { headers: H }); console.log(`  indicator/${kind} → ${r.status}`);
}
const v4 = await fetch(`${C}/api/v4/dashboard/wts/overview/indicator`, { headers: H });
console.log(`v4 indicator → ${v4.status} ${short(await v4.text(), 500)}`);

console.log("\n=== (2) overview/ranking POST 변형 ===");
for (const body of [{}, { rankingType: "FLUCTUATION" }, { type: "rise" }, { tag: "kr_normal" }, { name: "kr_fluctuation" }, { rankingId: "fluctuation" }]) {
  const r = await fetch(`${C}/api/v2/dashboard/wts/overview/ranking`, { method: "POST", headers: H, body: JSON.stringify(body) });
  console.log(`  ${JSON.stringify(body).padEnd(30)} → ${r.status} ${short(await r.text(), 260)}`);
}
console.log("\n=== (3) 실시간 랭킹 ===");
const rk = await (await fetch(`${I}/api/v1/rankings/realtime/stock?size=10`, { headers: H })).json();
console.log("dateTime:", rk.result?.dateTime, "· 항목:", (rk.result?.data ?? []).map((d) => `${d.name}(${d.symbol ?? d.code})`).join(", "));
for (const u of [`${I}/api/v1/rankings/realtime/stock?size=10&tag=kr`, `${I}/api/v1/rankings/fluctuation/stock?size=10`, `${I}/api/v2/rankings/realtime/stock?size=10&nation=kr`]) {
  const r = await fetch(u, { headers: H }); console.log(`  ${u.replace(I, "")} → ${r.status} ${short(await r.text(), 160)}`);
}

console.log("\n=== (4) 종목 일봉 파라미터 ===");
for (const u of [`${I}/api/v1/c-chart/kr-s/A005930/day:1?count=70`, `${I}/api/v1/c-chart/kr-s/A005930/day?count=70&useAdjustedRate=true`, `${I}/api/v1/c-chart/kr-s/A005930/day:1`, `${I}/api/v1/c-chart/kr-s/A005930/week:1?count=20`, `${I}/api/v1/c-chart/kr-s/A005930/min:5?count=3`]) {
  const r = await fetch(u, { headers: H }); const t = await r.text(); let n = "-"; try { n = JSON.parse(t).result?.candles?.length; } catch {}
  console.log(`  ${u.replace(I, "")} → ${r.status} 캔들 ${n} ${r.status !== 200 ? short(t, 120) : short(t, 200)}`);
}
