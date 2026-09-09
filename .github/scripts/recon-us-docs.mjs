/** 정찰: 토스증권 웹 공개 API에서 국고채(채권) 금리 경로 찾기 */
const UA = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "accept": "application/json, text/plain, */*",
  "referer": "https://tossinvest.com/",
  "origin": "https://tossinvest.com",
};
async function probe(label, url, ms = 10000) {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
    const t = await res.text();
    const head = t.slice(0, 300).replace(/\s+/g, " ");
    console.log(`\n[${res.status}] ${label}\n  ${url}\n  ${head}`);
  } catch (e) {
    console.log(`\n[ERR] ${label} — ${e.message}`);
  }
}
const INFO = "https://wts-info-api.tossinvest.com";
// 1) 기존에 쓰는 경로로 API 형태 확인
await probe("TICS 랭킹(기존)", `${INFO}/api/v1/tics/rankings?tag=kr_normal&depths=0&depths=1`);
// 2) 채권/금리 후보 경로
for (const path of [
  "/api/v1/bonds",
  "/api/v2/bonds",
  "/api/v1/bond/products",
  "/api/v1/market-indicators",
  "/api/v1/market-indicators/kr",
  "/api/v2/market-indicators",
  "/api/v1/indices",
  "/api/v2/indices",
  "/api/v1/interest-rates",
  "/api/v1/rates",
]) {
  await probe(`후보 ${path}`, `${INFO}${path}`);
}
// 3) 토스 웹 채권 페이지 — 내부 API 힌트 찾기
try {
  const res = await fetch("https://tossinvest.com/bond", { headers: UA, signal: AbortSignal.timeout(12000) });
  const html = await res.text();
  console.log(`\n[${res.status}] tossinvest.com/bond · ${html.length}B`);
  const apis = [...new Set((html.match(/https?:\/\/[a-z0-9.-]*tossinvest\.com[^"'\\ )]{0,60}/gi) || []))].slice(0, 25);
  console.log("  발견된 도메인/경로:", apis.join("\n   "));
  const kw = ["국고채", "채권", "bond", "yield"].map((k) => `${k}:${html.includes(k)}`).join(" ");
  console.log("  키워드:", kw);
} catch (e) {
  console.log("[ERR] tossinvest.com/bond —", e.message);
}
