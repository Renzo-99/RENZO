// 해외·ETF 로고 출처 찾기 — 티커로 토스 검색이 로고와 코드를 주는지
import fs from "node:fs";
const H = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
  accept: "application/json", "content-type": "application/json", referer: "https://tossinvest.com/", origin: "https://tossinvest.com" };
const OUT = []; const log = (...a) => { const s = a.join(" "); console.log(s); OUT.push(s); };
const INFO = "https://wts-info-api.tossinvest.com";
const j = async (u, i) => { try { const r = await fetch(u, { headers: H, ...i }); return r.ok ? await r.json() : { __status: r.status }; } catch (e) { return { __err: String(e) }; } };

const TICKERS = ["NVDA", "JEPI", "SCHD", "NVDL", "VYM", "ARGT", "NANC", "AAPL"];

// 1) 자동완성 검색 (번들에서 본 경로)
for (const q of ["NVDA", "JEPI"]) {
  for (const path of [
    `/api/v1/search-all/auto-complete/company?query=${q}`,
    `/api/v1/search-all/auto-complete/company?keyword=${q}`,
    `/api/v1/search-all/auto-complete?query=${q}`,
  ]) {
    const r = await j(`${INFO}${path}`);
    log(`\n### ${path} → ${r.__status ? `HTTP ${r.__status}` : JSON.stringify(r).slice(0, 700)}`);
  }
}

// 2) POST 형태
for (const q of ["JEPI"]) {
  const r = await j(`${INFO}/api/v1/search-all/auto-complete/company`, { method: "POST", body: JSON.stringify({ query: q }) });
  log(`\n### POST auto-complete/company {query:${q}} → ${r.__status ? `HTTP ${r.__status}` : JSON.stringify(r).slice(0, 700)}`);
}

// 3) stock-infos 가 티커를 받아주는지 (받아주면 logoImageUrl까지 한 번에)
const r3 = await j(`${INFO}/api/v2/stock-infos?codes=${TICKERS.join(",")}`);
log(`\n### stock-infos?codes=티커 → ${JSON.stringify(r3).slice(0, 600)}`);

// 4) 토스 로고 URL 규칙 확인 — companyCode 기반이 실제로 뜨는지
for (const [label, url] of [
  ["NVDA(companyCode)", "https://static.toss.im/png-icons/securities/icn-sec-fill-NAS00208X-E0.png"],
  ["삼성전자(6자리)", "https://static.toss.im/png-icons/securities/icn-sec-fill-005930.png"],
  ["티커 그대로", "https://static.toss.im/png-icons/securities/icn-sec-fill-NVDA.png"],
]) {
  try {
    const res = await fetch(url, { method: "HEAD", headers: H });
    log(`  로고 ${label}: HTTP ${res.status} ${res.headers.get("content-type") ?? ""}`);
  } catch (e) { log(`  로고 ${label}: ERR ${e}`); }
}

fs.mkdirSync("audit-out", { recursive: true });
fs.writeFileSync("audit-out/toss-company-recon.txt", OUT.join("\n"));
