/**
 * 한국 상장 전 종목 전수 조사.
 * 코드 열거: TradingView 스캐너(키 불필요)
 * 권위 값:   토스 web /api/v2/stock-infos (키·IP 제한 없음) — 한글명·시장·상장주식수
 * 결과: audit-out/kr-master.json (교정된 마스터), audit-out/summary.txt
 */
import { mkdirSync, writeFileSync } from "node:fs";

const UA = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
  referer: "https://tossinvest.com/",
  origin: "https://tossinvest.com",
};

// 1) 전 종목 코드 — TradingView 스캐너
const scanRes = await fetch("https://scanner.tradingview.com/korea/scan", {
  method: "POST",
  headers: { "Content-Type": "application/json", "user-agent": UA["user-agent"] },
  body: JSON.stringify({
    filter: [{ left: "type", operation: "equal", right: "stock" }],
    columns: ["name", "exchange", "market_cap_basic", "close", "total_shares_outstanding"],
    range: [0, 5000],
  }),
  signal: AbortSignal.timeout(30000),
});
console.log(`TV 스캐너 HTTP ${scanRes.status}`);
const scan = await scanRes.json();
const tv = new Map();
for (const r of scan.data ?? []) {
  const code = String(r.d[0]);
  if (!/^\d{6}$/.test(code)) continue;
  tv.set(code, {
    code,
    tvMarket: r.d[1] === "KOSDAQ" ? "KOSDAQ" : "KOSPI",
    tvCap: r.d[2] ?? null,
    tvClose: r.d[3] ?? null,
    tvShares: r.d[4] ?? null,
  });
}
console.log(`TV 전 종목: ${tv.size}`);

// 2) 토스 web 종목정보 — 100개씩 배치
const codes = [...tv.keys()];
const toss = new Map();
let failed = 0;
for (let i = 0; i < codes.length; i += 100) {
  const batch = codes.slice(i, i + 100);
  const url = `https://wts-info-api.tossinvest.com/api/v2/stock-infos?codes=${batch.map((c) => "A" + c).join(",")}`;
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    for (const r of (await res.json()).result ?? []) {
      if (!r?.symbol) continue;
      toss.set(String(r.symbol), r);
    }
  } catch (e) {
    failed++;
    console.log(`  배치 ${i / 100} 실패: ${String(e).slice(0, 80)}`);
  }
  if (i % 500 === 0) console.log(`  ...${i + batch.length}/${codes.length}`);
  await new Promise((r) => setTimeout(r, 120));
}
console.log(`토스 응답: ${toss.size}개 (실패 배치 ${failed})`);

// 3) 마스터 구성
const MARKET = { KSP: "KOSPI", KSQ: "KOSDAQ", KNX: "KONEX" };
const master = [];
const noToss = [];
for (const code of codes) {
  const t = toss.get(code);
  const v = tv.get(code);
  if (!t) {
    noToss.push(code);
    continue;
  }
  master.push({
    code,
    name: String(t.name ?? "").trim(),
    market: MARKET[t.market?.code] ?? v.tvMarket,
    shares: Number.isFinite(Number(t.sharesOutstanding)) ? Number(t.sharesOutstanding) : null,
    common: t.commonShare === true,
    group: t.group?.displayName ?? null,
    suspended: t.tradingSuspended === true,
    delistDate: t.delistDate ?? null,
    tvShares: v.tvShares,
    tvCap: v.tvCap,
    tvClose: v.tvClose,
  });
}
master.sort((a, b) => a.code.localeCompare(b.code));

mkdirSync("audit-out", { recursive: true });
writeFileSync("audit-out/kr-master.json", JSON.stringify(master));

// 4) 요약 + 교차검증(토스 상장주식수 × TV 종가 vs TV 시총)
let capChecked = 0;
let capOff = 0;
const worst = [];
for (const m of master) {
  if (!m.shares || !m.tvClose || !m.tvCap) continue;
  capChecked++;
  const mine = m.shares * m.tvClose;
  const diff = Math.abs(mine - m.tvCap) / m.tvCap;
  if (diff > 0.02) {
    capOff++;
    worst.push({ ...m, diff });
  }
}
worst.sort((a, b) => b.diff - a.diff);

const lines = [
  `전 종목 코드(TV): ${tv.size}`,
  `토스 응답: ${toss.size}  / 응답 없음: ${noToss.length}`,
  `마스터 산출: ${master.length}`,
  `상장주식수 있음: ${master.filter((m) => m.shares).length}`,
  `보통주: ${master.filter((m) => m.common).length}  / 우선주·기타: ${master.filter((m) => !m.common).length}`,
  `거래정지: ${master.filter((m) => m.suspended).length}`,
  ``,
  `시총 교차검증(토스주식수 × TV종가 vs TV시총): 대상 ${capChecked}, 2% 초과 괴리 ${capOff}`,
  ...worst.slice(0, 15).map((m) => `  ${m.code} ${m.name} 괴리 ${(m.diff * 100).toFixed(1)}% (토스주식수 ${m.shares} / TV주식수 ${m.tvShares})`),
  ``,
  `토스 응답 없는 코드 ${noToss.length}개: ${noToss.slice(0, 40).join(",")}`,
];
writeFileSync("audit-out/summary.txt", lines.join("\n"));
console.log("\n" + lines.join("\n"));

// 5) 시드 12종목 즉시 대조
const SEED = {
  "005930": 5969782550, "000660": 728002365, "277810": 19388433, "454910": 64819980,
  "012450": 50630000, "047810": 97480817, "086520": 133129150, "373220": 234000000,
  "267260": 36042805, "034020": 640561146, "010140": 882885800, "042660": 306980829,
};
console.log("\n=== 시드 stocks.json 상장주식수 대조 ===");
for (const [code, seed] of Object.entries(SEED)) {
  const m = master.find((x) => x.code === code);
  if (!m) { console.log(`${code} 토스 응답 없음`); continue; }
  const d = m.shares === null ? null : m.shares - seed;
  const mark = d === null ? "?" : d === 0 ? "일치" : `틀림 ${d > 0 ? "+" : ""}${d} (${((d / seed) * 100).toFixed(2)}%)`;
  console.log(`${code} ${m.name.padEnd(12)} 시드 ${String(seed).padStart(12)} → 실제 ${String(m.shares).padStart(12)}  ${mark}`);
}
