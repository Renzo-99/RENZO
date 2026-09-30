// 토스 재무제표 원본 (읽기 전용) — 단위·항목 구조 확인 + 테스트 자료
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out/toss-fin", { recursive: true });
const H = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "application/json", "Content-Type": "application/json", Origin: "https://www.tossinvest.com", Referer: "https://www.tossinvest.com/" };
const T = "https://wts-info-api.tossinvest.com";
const post = async (p, body) => { const r = await fetch(T + p, { method: "POST", headers: H, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) }); return { s: r.status, j: await r.json().catch(() => null) }; };
const get = async (p) => { const r = await fetch(T + p, { headers: H, signal: AbortSignal.timeout(20000) }); return { s: r.status, j: await r.json().catch(() => null) }; };
const sum = {};
for (const code of ["A005930", "US19990122001", "A277810"]) {
  for (const f of ["INC", "BAL", "CAS"]) for (const p of ["Y", "Q"]) {
    const r = await post(`/api/v2/companies/${code}/financial-statement-records`, { factorCode: f, period: p });
    writeFileSync(`audit-out/toss-fin/${code}-${f}-${p}.json`, JSON.stringify(r.j));
    const t = r.j?.result?.table ?? [];
    sum[`${code}-${f}-${p}`] = { s: r.s, isKr: r.j?.result?.isKr, periods: t.map((x) => x.period), n: t[0]?.value?.length, units: [...new Set(t.flatMap((x) => x.value.map((v) => v.unitType)))], top: (t.at(-1)?.value ?? []).filter((v) => !v.parentItem).map((v) => `${v.item}:${v.itemNameKor}=${v.value}`).slice(0, 14) };
  }
  for (const [k, pth] of [["rnp", `/api/v2/stock-infos/revenue-and-net-profit/${code}`], ["opi", `/api/v2/stock-infos/operating-income/${code}`], ["stab", `/api/v2/stock-infos/stability/${code}`], ["eval", `/api/v2/stock-infos/evaluation/${code}`]]) {
    const r = await post(pth);
    writeFileSync(`audit-out/toss-fin/${code}-${k}.json`, JSON.stringify(r.j));
    sum[`${code}-${k}`] = { s: r.s, head: JSON.stringify(r.j).slice(0, 500) };
  }
  const ind = await get(`/api/v1/stock-detail/ui/wts/${code}/investment-indicators`);
  writeFileSync(`audit-out/toss-fin/${code}-ind.json`, JSON.stringify(ind.j));
}
writeFileSync("audit-out/toss-fin/summary.json", JSON.stringify(sum, null, 1));
console.log("ok");
