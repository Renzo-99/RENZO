// 반도체(169) 3개월 수익률 11.3% 은 국내만인가, 국내+해외인가 — 직접 계산해 맞춰본다
import fs from "node:fs";
const H = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
  accept: "application/json", "content-type": "application/json", referer: "https://tossinvest.com/", origin: "https://tossinvest.com" };
const OUT = []; const log = (...a) => { const s = a.join(" "); console.log(s); OUT.push(s); };
const INFO = "https://wts-info-api.tossinvest.com";
const j = async (u, i) => { const r = await fetch(u, { headers: H, ...i }); return r.ok ? r.json() : { __status: r.status }; };

// 구성 종목 5페이지(시총 상위 50)
const rows = [];
for (let p = 1; p <= 5; p++) {
  const s = await j(`${INFO}/api/v2/tics/169/stocks`, { method: "POST", body: JSON.stringify({ ticsId: 169, page: p }) });
  rows.push(...(s?.result?.stocks ?? []));
}
log(`### 반도체 상위 ${rows.length}종목`);

// 해외 일봉 경로 찾기
for (const path of ["kr-s", "us-s", "os-s", "ov-s"]) {
  const r = await j(`${INFO}/api/v1/c-chart/${path}/US19990122001/day:1?count=3`);
  log(`  c-chart/${path}/US… → ${r.__status ? `HTTP ${r.__status}` : `candles ${r?.result?.candles?.length ?? r?.candles?.length ?? "?"}`}`);
}

async function perf3M(code) {
  const path = code.startsWith("A") ? "kr-s" : "us-s";
  const r = await j(`${INFO}/api/v1/c-chart/${path}/${code}/day:1?count=70`);
  const c = r?.result?.candles ?? r?.candles;
  if (!Array.isArray(c) || c.length < 64) return null;
  const asc = [...c].sort((a, b) => String(a.dt).localeCompare(String(b.dt)));
  const last = Number(asc[asc.length - 1].close);
  const base = Number(asc[asc.length - 1 - 63].close);
  return base > 0 ? ((last - base) / base) * 100 : null;
}

const got = [];
for (const s of rows) {
  const p = await perf3M(String(s.code));
  if (p !== null) got.push({ name: s.name, kr: String(s.code).startsWith("A"), cap: Number(s.marketCapKrw ?? 0), p });
}
const wavg = (xs) => { const t = xs.reduce((a, b) => a + b.cap, 0); return t > 0 ? xs.reduce((a, b) => a + b.p * b.cap, 0) / t : NaN; };
const eavg = (xs) => (xs.length ? xs.reduce((a, b) => a + b.p, 0) / xs.length : NaN);
const kr = got.filter((x) => x.kr), fg = got.filter((x) => !x.kr);

log(`### 계산된 종목 ${got.length}개 (국내 ${kr.length} · 해외 ${fg.length})`);
log(`  국내만   시총가중 ${wavg(kr).toFixed(2)}%  동일가중 ${eavg(kr).toFixed(2)}%`);
log(`  해외만   시총가중 ${wavg(fg).toFixed(2)}%  동일가중 ${eavg(fg).toFixed(2)}%`);
log(`  국내+해외 시총가중 ${wavg(got).toFixed(2)}%  동일가중 ${eavg(got).toFixed(2)}%`);
const all = await j(`${INFO}/api/v1/tics/all`);
const n = (all?.result?.ticsItems ?? []).find((i) => String(i.id) === "169");
log(`### 토스가 준 반도체 3개월 = ${n?.fluctuations?.threeMonthsRate}%  1개월 = ${n?.fluctuations?.oneMonthRate}%`);
log(`### 상위 10: ${got.slice(0, 10).map((x) => `${x.name} ${x.p.toFixed(1)}%`).join(", ")}`);

fs.mkdirSync("audit-out", { recursive: true });
fs.writeFileSync("audit-out/toss-company-recon.txt", OUT.join("\n"));
