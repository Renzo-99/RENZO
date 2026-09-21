// 일봉이 액면분할·권리락을 반영한 수정주가인지 검증 — 여기 걸리면 내 계산 자체가 못 쓴다
import fs from "node:fs";
const H = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
  accept: "application/json", "content-type": "application/json", referer: "https://tossinvest.com/", origin: "https://tossinvest.com" };
const OUT = []; const log = (...a) => { const s = a.join(" "); console.log(s); OUT.push(s); };
const INFO = "https://wts-info-api.tossinvest.com";
const j = async (u, i) => { try { const r = await fetch(u, { headers: H, ...i }); return r.ok ? r.json() : { __status: r.status }; } catch { return { __err: 1 }; } };

async function ser(code, count = 200) {
  const path = String(code).startsWith("A") ? "kr-s" : "us-s";
  const r = await j(`${INFO}/api/v1/c-chart/${path}/${code}/day:1?count=${count}`);
  const c = r?.result?.candles;
  if (!Array.isArray(c) || c.length < 30) return null;
  return [...c].map((x) => ({ d: String(x.dt).slice(0, 10), c: Number(x.close), b: Number(x.base) })).sort((a, b) => a.d.localeCompare(b.d));
}

// 1) 삼성전자 6~9월 흐름을 주 단위로
const s = await ser("A005930");
log(`### 삼성전자 ${s[0].d} ~ ${s[s.length-1].d} (${s.length}일)`);
log("  " + s.filter((_, i) => i % 5 === 0).map((x) => `${x.d.slice(5)}:${x.c}`).join(" "));

// 2) base(전일종가)와 직전 캔들 종가가 어긋나는 날 = 수정 안 된 구간
let gaps = 0;
for (let i = 1; i < s.length; i++) {
  const jump = Math.abs(s[i].c / s[i-1].c - 1);
  const baseMismatch = s[i].b > 0 && Math.abs(s[i].b / s[i-1].c - 1) > 0.02;
  if (jump > 0.32 || baseMismatch) { gaps++; if (gaps <= 6) log(`  ⚠ ${s[i].d}: 전일종가 ${s[i-1].c} → base ${s[i].b} 종가 ${s[i].c} (변동 ${(jump*100).toFixed(1)}%)`); }
}
log(`  삼성전자 이상 ${gaps}일`);

// 3) 반도체 국내 구성종목 전체로 같은 검사
const mem = [];
for (let p = 1; p <= 12; p++) {
  const r = await j(`${INFO}/api/v2/tics/169/stocks`, { method: "POST", body: JSON.stringify({ ticsId: 169, page: p }) });
  const st = r?.result?.stocks ?? []; if (!st.length) break; mem.push(...st);
}
const kr = mem.filter((m) => String(m.code).startsWith("A")).slice(0, 60);
let bad = 0, ok = 0; const worst = [];
let i = 0;
const worker = async () => {
  while (i < kr.length) {
    const m = kr[i++];
    const t = await ser(m.code, 70);
    if (!t) continue;
    ok++;
    let g = 0;
    for (let k = 1; k < t.length; k++) {
      if (Math.abs(t[k].c / t[k-1].c - 1) > 0.32 || (t[k].b > 0 && Math.abs(t[k].b / t[k-1].c - 1) > 0.02)) g++;
    }
    if (g > 0) { bad++; worst.push(`${m.name}(${g}일)`); }
  }
};
await Promise.all(Array.from({ length: 8 }, worker));
log(`\n### 반도체 국내 ${ok}종목 중 불연속 있는 종목 ${bad}개`);
log(`  ${worst.slice(0, 20).join(", ")}`);

// 4) 마지막 종가와 현재가 API 대조
const codes = kr.slice(0, 6).map((m) => m.code);
const pr = await j(`${INFO}/api/v3/stock-prices?meta=true&productCodes=${codes.join(",")}`);
for (const p of pr?.result ?? []) {
  const t = await ser(p.productCode, 5);
  log(`  ${p.productCode}: 일봉 마지막 ${t?.[t.length-1]?.c} vs 현재가 ${p.close} ${t?.[t.length-1]?.c === p.close ? "✓" : "✗"}`);
}

fs.mkdirSync("audit-out", { recursive: true });
fs.writeFileSync("audit-out/toss-company-recon.txt", OUT.join("\n"));
