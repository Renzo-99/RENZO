// 반도체(169) 전 구성종목으로 1·3개월 수익률을 네 가지 방식으로 계산 → 토스 값과 대조
import fs from "node:fs";
const H = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
  accept: "application/json", "content-type": "application/json", referer: "https://tossinvest.com/", origin: "https://tossinvest.com" };
const OUT = []; const log = (...a) => { const s = a.join(" "); console.log(s); OUT.push(s); };
const INFO = "https://wts-info-api.tossinvest.com";
const j = async (u, i) => { try { const r = await fetch(u, { headers: H, ...i }); return r.ok ? r.json() : { __status: r.status }; } catch { return { __err: 1 }; } };

// 전 구성종목
const rows = [];
for (let p = 1; p <= 35; p++) {
  const s = await j(`${INFO}/api/v2/tics/169/stocks`, { method: "POST", body: JSON.stringify({ ticsId: 169, page: p }) });
  const st = s?.result?.stocks ?? [];
  rows.push(...st);
  if (st.length === 0) break;
}
const seen = new Set(); const mem = rows.filter((r) => (seen.has(r.code) ? false : (seen.add(r.code), true)));
log(`### 반도체 구성종목 ${mem.length}개 (국내 ${mem.filter(m=>String(m.code).startsWith("A")).length})`);

async function perf(code) {
  const path = String(code).startsWith("A") ? "kr-s" : "us-s";
  const r = await j(`${INFO}/api/v1/c-chart/${path}/${code}/day:1?count=70`);
  const c = r?.result?.candles;
  if (!Array.isArray(c) || c.length < 64) return null;
  const asc = [...c].sort((a, b) => String(a.dt).localeCompare(String(b.dt)));
  const n = asc.length, last = Number(asc[n-1].close);
  const p = (back) => { const b = Number(asc[n-1-back].close); return b > 0 ? ((last-b)/b)*100 : null; };
  return { m1: p(21), m3: p(63) };
}

const got = []; let i = 0;
const worker = async () => { while (i < mem.length) { const m = mem[i++]; const p = await perf(m.code); if (p && p.m1 !== null && p.m3 !== null) got.push({ name: m.name, kr: String(m.code).startsWith("A"), cap: Number(m.marketCapKrw ?? 0), ...p }); } };
await Promise.all(Array.from({ length: 8 }, worker));

const w = (xs, k) => { const t = xs.reduce((a,b)=>a+b.cap,0); return t>0 ? xs.reduce((a,b)=>a+b[k]*b.cap,0)/t : NaN; };
const e = (xs, k) => (xs.length ? xs.reduce((a,b)=>a+b[k],0)/xs.length : NaN);
const med = (xs, k) => { const v = xs.map(x=>x[k]).sort((a,b)=>a-b); return v.length ? v[Math.floor(v.length/2)] : NaN; };
const kr = got.filter(x=>x.kr), fg = got.filter(x=>!x.kr);
const f = (n) => (Number.isFinite(n) ? n.toFixed(2) : "―");

log(`### 계산 성공 ${got.length}개 (국내 ${kr.length} · 해외 ${fg.length})`);
for (const [lab, xs] of [["국내만", kr], ["해외만", fg], ["국내+해외", got]]) {
  log(`  ${lab.padEnd(10)} 1개월: 시총가중 ${f(w(xs,"m1"))} 동일가중 ${f(e(xs,"m1"))} 중앙값 ${f(med(xs,"m1"))} | 3개월: 시총가중 ${f(w(xs,"m3"))} 동일가중 ${f(e(xs,"m3"))} 중앙값 ${f(med(xs,"m3"))}`);
}
const all = await j(`${INFO}/api/v1/tics/all`);
const n = (all?.result?.ticsItems ?? []).find((x) => String(x.id) === "169");
log(`### 토스 반도체: 1개월 ${n?.fluctuations?.oneMonthRate}% · 3개월 ${n?.fluctuations?.threeMonthsRate}% (기준 ${n?.fluctuations?.baseDateTime})`);

fs.mkdirSync("audit-out", { recursive: true });
fs.writeFileSync("audit-out/toss-company-recon.txt", OUT.join("\n"));
