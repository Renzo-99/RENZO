// 토스 재무 API 응답 모양 (읽기 전용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const H = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "application/json", Origin: "https://www.tossinvest.com", Referer: "https://www.tossinvest.com/" };
const T = "https://wts-info-api.tossinvest.com";
const get = async (p) => { try { const r = await fetch(T + p, { headers: H, signal: AbortSignal.timeout(20000) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { s: r.status, j, t: j ? null : t.slice(0, 200) }; } catch (e) { return { s: "ERR", t: String(e) }; } };
const out = { at: new Date().toISOString() };
const info = await get("/api/v2/stock-infos?codes=US19990122001,A005930,US19801212001,US19970515005");
out.info = info.j?.result?.map((x) => ({ code: x.code, symbol: x.symbol, companyCode: x.companyCode, name: x.name }));
const cc = Object.fromEntries((info.j?.result ?? []).map((x) => [x.code, x.companyCode]));
for (const [label, sc] of [["NVDA", "US19990122001"], ["SEC", "A005930"]]) {
  const c = cc[sc] ?? sc;
  const paths = {
    comprehensive: `/api/v2/companies/${c}/financial-statements/comprehensive`,
    records: `/api/v2/companies/${sc}/financial-statement-records`,
    recordsCC: `/api/v2/companies/${c}/financial-statement-records`,
    indicators: `/api/v1/stock-detail/ui/wts/${sc}/investment-indicators`,
    investment: `/api/v2/stock-infos/${sc}/investment`,
    stability: `/api/v2/stock-infos/stability/${sc}`,
    evaluation: `/api/v2/stock-infos/evaluation/${sc}`,
    opIncome: `/api/v2/stock-infos/operating-income/${sc}`,
    consensus: `/api/v2/stock-infos/consensus/${sc}`,
    estRevenue: `/api/v2/companies/${sc}/financial/estimate/revenue`,
    sales: `/api/v2/companies/${c}/sales-compositions`,
  };
  for (const [k, p] of Object.entries(paths)) {
    const r = await get(p);
    out[`${label}_${k}`] = { path: p, s: r.s, body: r.j ? JSON.stringify(r.j).slice(0, 1500) : r.t };
  }
}
writeFileSync("audit-out/toss-fin-shape.json", JSON.stringify(out, null, 1));
console.log("ok");
