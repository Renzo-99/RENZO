/** 정찰 8: 종목 일봉 캔들 필드 전체 · stock-prices meta 응답 형태 · 일봉 count 상한 */
const H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*", referer: "https://tossinvest.com/", origin: "https://tossinvest.com", "content-type": "application/json",
};
const I = "https://wts-info-api.tossinvest.com";
const short = (t, n = 300) => String(t).replace(/\s+/g, " ").slice(0, n);

console.log("=== (1) 일봉 캔들 필드 ===");
const d = await (await fetch(`${I}/api/v1/c-chart/kr-s/A005930/day:1?count=70`, { headers: H })).json();
const cs = d.result?.candles ?? [];
console.log("count:", cs.length, "keys:", Object.keys(cs[0] ?? {}).join(","));
console.log("first:", JSON.stringify(cs[0]));
console.log("last:", JSON.stringify(cs[cs.length - 1]));
console.log("[20]:", JSON.stringify(cs[20]));
for (const n of [130, 260]) {
  const r = await fetch(`${I}/api/v1/c-chart/kr-s/A005930/day:1?count=${n}`, { headers: H });
  const b = await r.json(); console.log(`  count=${n} → ${r.status} 캔들 ${b.result?.candles?.length} 첫 dt ${b.result?.candles?.at(-1)?.dt}`);
}
console.log("\n=== (2) stock-prices meta ===");
const p = await fetch(`${I}/api/v3/stock-prices?meta=true&productCodes=A005930,A000660,A403870`, { headers: H });
console.log(p.status, short(await p.text(), 1500));
console.log("\n=== (3) 코스닥 종목 일봉 (kr-s 공용?) ===");
const q = await fetch(`${I}/api/v1/c-chart/kr-s/A403870/day:1?count=3`, { headers: H });
console.log(q.status, short(await q.text(), 400));
