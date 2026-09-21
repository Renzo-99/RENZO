// 토스 기업 개요(한 줄 설명) 출처 정찰
import fs from "node:fs";

const H = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
  "accept-language": "ko-KR,ko;q=0.9",
  referer: "https://tossinvest.com/",
  origin: "https://tossinvest.com",
};

const OUT = [];
function log(...a) { const s = a.join(" "); console.log(s); OUT.push(s); }

async function probe(label, url, init = {}) {
  try {
    const r = await fetch(url, { headers: H, ...init });
    const t = await r.text();
    log(`\n### ${label} [${r.status}] ${url}`);
    if (!r.ok) { log(t.slice(0, 200)); return null; }
    let j = null;
    try { j = JSON.parse(t); } catch { log("(비JSON) " + t.slice(0, 300)); return null; }
    log(JSON.stringify(j).slice(0, 2500));
    return j;
  } catch (e) {
    log(`\n### ${label} [ERR] ${url}\n${e.message}`);
    return null;
  }
}

const INFO = "https://wts-info-api.tossinvest.com";
const CODE = "A005930"; // 삼성전자
const US = "US19990122001"; // NVDA

// 1) 알려진 stock-infos 전체 필드
await probe("stock-infos v2", `${INFO}/api/v2/stock-infos?codes=${CODE},A000660,${US}`);

// 2) 기업 개요 후보들
const cands = [
  ["companies", `${INFO}/api/v1/companies/${CODE}`],
  ["company-detail", `${INFO}/api/v1/companies/${CODE}/detail`],
  ["company-summary", `${INFO}/api/v1/companies/${CODE}/summary`],
  ["company-info", `${INFO}/api/v1/company-info/${CODE}`],
  ["stock-info v1", `${INFO}/api/v1/stock-infos/${CODE}`],
  ["stock-detail v3", `${INFO}/api/v3/stock-infos/${CODE}`],
  ["overview", `${INFO}/api/v1/stocks/${CODE}/overview`],
  ["company v2", `${INFO}/api/v2/companies/${CODE}`],
  ["description", `${INFO}/api/v1/stocks/${CODE}/description`],
  ["profile", `${INFO}/api/v1/stocks/${CODE}/profile`],
  ["wiki", `${INFO}/api/v1/stocks/${CODE}/wiki`],
  ["company-intro", `${INFO}/api/v1/company-introductions/${CODE}`],
  ["stock-summary", `${INFO}/api/v1/stock-summaries?codes=${CODE}`],
  ["stock-contents", `${INFO}/api/v1/stock-contents/${CODE}`],
  ["kr-company", `${INFO}/api/v1/kr-companies/${CODE}`],
  ["financial", `${INFO}/api/v1/companies/${CODE}/financials`],
  ["tics of stock", `${INFO}/api/v1/tics/stocks/${CODE}`],
];
for (const [l, u] of cands) await probe(l, u);

// 3) POST 형태
for (const [l, u, b] of [
  ["companies POST", `${INFO}/api/v1/companies`, { codes: [CODE] }],
  ["company-summaries POST", `${INFO}/api/v1/company-summaries`, { codes: [CODE] }],
  ["stock-infos POST", `${INFO}/api/v3/stock-infos`, { codes: [CODE] }],
]) {
  await probe(l, u, { method: "POST", headers: { ...H, "content-type": "application/json" }, body: JSON.stringify(b) });
}

// 4) 토스 종목 페이지 HTML — meta description / __NEXT_DATA__
for (const [l, u] of [["page kr", `https://tossinvest.com/stocks/${CODE}`], ["page us", `https://tossinvest.com/stocks/${US}`]]) {
  try {
    const r = await fetch(u, { headers: { ...H, accept: "text/html" } });
    const t = await r.text();
    log(`\n### ${l} [${r.status}] len=${t.length}`);
    const metas = [...t.matchAll(/<meta[^>]*(?:name|property)="(description|og:description)"[^>]*content="([^"]{0,400})"/g)];
    for (const m of metas) log(`  meta ${m[1]}: ${m[2]}`);
    const ttl = t.match(/<title[^>]*>([^<]{0,200})<\/title>/);
    if (ttl) log(`  title: ${ttl[1]}`);
    const idx = t.indexOf("기업 개요");
    if (idx > 0) log(`  '기업 개요' 주변: ${t.slice(idx - 200, idx + 600).replace(/\s+/g, " ")}`);
  } catch (e) { log(`\n### ${l} [ERR] ${e.message}`); }
}

fs.mkdirSync("audit-out", { recursive: true });
fs.writeFileSync("audit-out/toss-company-recon.txt", OUT.join("\n"));
