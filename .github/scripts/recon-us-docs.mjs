// 토스 기업 개요 2차 정찰 — companyCode 기준 + JS 번들 grep + 대체 출처
import fs from "node:fs";
const H = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*", "accept-language": "ko-KR,ko;q=0.9",
  referer: "https://tossinvest.com/", origin: "https://tossinvest.com",
};
const OUT = [];
const log = (...a) => { const s = a.join(" "); console.log(s); OUT.push(s); };
async function probe(label, url, init = {}, cap = 2000) {
  try {
    const r = await fetch(url, { headers: H, ...init });
    const t = await r.text();
    log(`\n### ${label} [${r.status}] ${url}`);
    log(t.slice(0, cap));
    return t;
  } catch (e) { log(`\n### ${label} [ERR] ${url} ${e.message}`); return null; }
}
const INFO = "https://wts-info-api.tossinvest.com";

// 1) companyCode 기준
for (const [l, u] of [
  ["companies/005930", `${INFO}/api/v1/companies/005930`],
  ["companies/005930/summary", `${INFO}/api/v1/companies/005930/summary`],
  ["companies/005930/overview", `${INFO}/api/v1/companies/005930/overview`],
  ["companies/005930/description", `${INFO}/api/v1/companies/005930/description`],
  ["companies/005930/introduction", `${INFO}/api/v1/companies/005930/introduction`],
  ["companies/005930/business", `${INFO}/api/v1/companies/005930/business`],
  ["companies/005930/profile", `${INFO}/api/v1/companies/005930/profile`],
  ["companies/NAS00208X-E0", `${INFO}/api/v1/companies/NAS00208X-E0`],
  ["v2 companies/005930", `${INFO}/api/v2/companies/005930`],
  ["company/005930", `${INFO}/api/v1/company/005930`],
]) await probe(l, u);

for (const [l, b] of [
  ["POST companies codes", { codes: ["005930"] }],
  ["POST companies companyCodes", { companyCodes: ["005930"] }],
  ["POST companies productCodes", { productCodes: ["A005930"] }],
]) await probe(l, `${INFO}/api/v1/companies`, { method: "POST", headers: { ...H, "content-type": "application/json" }, body: JSON.stringify(b) });

// 2) 토스 JS 번들에서 '기업 개요' 계열 API 경로 찾기
try {
  const html = await (await fetch("https://tossinvest.com/stocks/A005930", { headers: { ...H, accept: "text/html" } })).text();
  const srcs = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]).slice(0, 30);
  log(`\n### JS 번들 ${srcs.length}개`);
  const hits = new Set();
  for (const s of srcs) {
    const u = s.startsWith("http") ? s : `https://tossinvest.com${s}`;
    try {
      const js = await (await fetch(u, { headers: H })).text();
      for (const m of js.matchAll(/["'`](\/api\/v\d\/[a-zA-Z0-9\-\/_{}$.]*(?:compan|summar|overview|descri|profil|intro|wiki|about)[a-zA-Z0-9\-\/_{}$.]*)["'`]/g)) hits.add(m[1]);
    } catch {}
  }
  log([...hits].join("\n") || "(없음)");
} catch (e) { log("번들 실패 " + e.message); }

// 3) 대체 출처 검증
await probe("위키 삼성전자", "https://ko.wikipedia.org/api/rest_v1/page/summary/%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90", { headers: { "user-agent": H["user-agent"] } }, 1200);
await probe("위키 한미반도체", "https://ko.wikipedia.org/api/rest_v1/page/summary/%ED%95%9C%EB%AF%B8%EB%B0%98%EB%8F%84%EC%B2%B4", { headers: { "user-agent": H["user-agent"] } }, 1200);
await probe("위키 이오테크닉스", "https://ko.wikipedia.org/api/rest_v1/page/summary/%EC%9D%B4%EC%98%A4%ED%85%8C%ED%81%AC%EB%8B%89%EC%8A%A4", { headers: { "user-agent": H["user-agent"] } }, 800);
await probe("야후 assetProfile", "https://query1.finance.yahoo.com/v10/finance/quoteSummary/NVDA?modules=assetProfile", { headers: { "user-agent": H["user-agent"] } }, 900);

fs.mkdirSync("audit-out", { recursive: true });
fs.writeFileSync("audit-out/toss-company-recon.txt", OUT.join("\n"));
