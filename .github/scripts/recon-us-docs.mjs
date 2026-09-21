// threeMonthsRate 의 기준 구간 찾기 — 날짜별로 '오늘까지 수익률'을 만들어 토스 값과 가장 가까운 날을 고른다
// 1개월(=21거래일 전으로 맞은 값)을 대조군으로 같이 돌린다.
import fs from "node:fs";
const H = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
  accept: "application/json", "content-type": "application/json", referer: "https://tossinvest.com/", origin: "https://tossinvest.com" };
const OUT = []; const log = (...a) => { const s = a.join(" "); console.log(s); OUT.push(s); };
const INFO = "https://wts-info-api.tossinvest.com";
const j = async (u, i) => { try { const r = await fetch(u, { headers: H, ...i }); return r.ok ? r.json() : { __status: r.status }; } catch { return { __err: 1 }; } };

const all = await j(`${INFO}/api/v1/tics/all`);
const inds = (all?.result?.ticsItems ?? []).map((i) => ({ id: String(i.id), title: i.title, n: Number(i.companyCount ?? 0), m1: i.fluctuations?.oneMonthRate, m3: i.fluctuations?.threeMonthsRate }));
log(`### 산업 ${inds.length}개 (기준 ${all?.result?.baseDateTime})`);

// 구성종목이 적당히 적은 산업 5개 — 전수 계산이 가능한 것으로
const targets = inds.filter((x) => x.n >= 30 && x.n <= 140 && x.m3 != null).sort((a, b) => a.n - b.n).slice(0, 5);
log(`### 대상: ${targets.map((t) => `${t.title}(${t.n}종목, 1개월 ${t.m1}% 3개월 ${t.m3}%)`).join(" / ")}`);

async function members(id) {
  const out = []; const seen = new Set();
  for (let p = 1; p <= 40; p++) {
    const s = await j(`${INFO}/api/v2/tics/${id}/stocks`, { method: "POST", body: JSON.stringify({ ticsId: Number(id), page: p }) });
    const st = s?.result?.stocks ?? [];
    if (!st.length) break;
    for (const x of st) if (!seen.has(x.code)) { seen.add(x.code); out.push(x); }
  }
  return out;
}
async function series(code) {
  const path = String(code).startsWith("A") ? "kr-s" : "us-s";
  const r = await j(`${INFO}/api/v1/c-chart/${path}/${code}/day:1?count=200`);
  const c = r?.result?.candles;
  if (!Array.isArray(c) || c.length < 30) return null;
  const m = new Map();
  for (const x of c) m.set(String(x.dt).slice(0, 10), Number(x.close));
  return m;
}

for (const t of targets) {
  const mem = await members(t.id);
  const sers = []; let i = 0;
  const worker = async () => { while (i < mem.length) { const m = mem[i++]; const s = await series(m.code); if (s) sers.push(s); } };
  await Promise.all(Array.from({ length: 10 }, worker));
  if (sers.length < 10) { log(`\n### ${t.title}: 일봉 ${sers.length}개뿐 — 건너뜀`); continue; }

  // 오늘 종가
  const dates = [...new Set(sers.flatMap((s) => [...s.keys()]))].sort();
  const today = dates[dates.length - 1];
  // 각 날짜 d → 그날 값이 있는 종목들의 (오늘/그날 - 1) 동일가중 평균
  const curve = [];
  for (const d of dates) {
    const rs = [];
    for (const s of sers) { const a = s.get(d), b = s.get(today); if (a > 0 && b > 0) rs.push(((b - a) / a) * 100); }
    if (rs.length >= sers.length * 0.8) curve.push({ d, v: rs.reduce((x, y) => x + y, 0) / rs.length, n: rs.length });
  }
  const near = (target) => curve.reduce((best, c) => (Math.abs(c.v - target) < Math.abs(best.v - target) ? c : best), curve[0]);
  const b1 = near(t.m1), b3 = near(t.m3);
  const idx = (d) => curve.length - 1 - curve.findIndex((c) => c.d === d);
  log(`\n### ${t.title} (${sers.length}/${mem.length}종목, 오늘 ${today})`);
  log(`  1개월 토스 ${t.m1}% → 가장 가까운 날 ${b1.d} (내 값 ${b1.v.toFixed(2)}%, ${idx(b1.d)}거래일 전)`);
  log(`  3개월 토스 ${t.m3}% → 가장 가까운 날 ${b3.d} (내 값 ${b3.v.toFixed(2)}%, ${idx(b3.d)}거래일 전)`);
  const span = curve.map((c) => c.v);
  log(`  내 곡선 범위 ${Math.min(...span).toFixed(1)}% ~ ${Math.max(...span).toFixed(1)}% (${curve.length}일치)`);
}

fs.mkdirSync("audit-out", { recursive: true });
fs.writeFileSync("audit-out/toss-company-recon.txt", OUT.join("\n"));
