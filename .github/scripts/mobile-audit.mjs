/** 정찰 2: 테마(TICS)별 구성 종목 엔드포인트 찾기 */
import { chromium } from "playwright";
const H = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*", referer: "https://tossinvest.com/", origin: "https://tossinvest.com",
  "content-type": "application/json",
};
const short = (t, n = 420) => String(t).replace(/\s+/g, " ").slice(0, n);

// 0) 트리 구조 파악
const all = await (await fetch("https://wts-info-api.tossinvest.com/api/v1/tics/all", { headers: H })).json();
const roots = all.result?.ticsItems ?? [];
console.log(`=== /tics/all: 최상위 ${roots.length}개 ===`);
for (const r of roots) console.log(`  [${r.id}] ${r.title} · ${r.companyCount}사 · 하위 ${(r.subItems ?? []).length}개: ${(r.subItems ?? []).slice(0, 8).map((s) => `${s.title}(${s.id},${s.companyCount})`).join(", ")}`);
const sample = roots[0];
const sub = sample?.subItems?.[0];
console.log("\n최상위 항목 키:", Object.keys(sample ?? {}).join(", "));
console.log("하위 항목 키:", Object.keys(sub ?? {}).join(", "));
console.log("하위 항목 표본:", short(JSON.stringify(sub), 500));
const SID = sub?.id ?? 1;

// 1) 405가 난 v2 경로에 POST/다른 메서드
console.log(`\n=== 후보 (ticsId=${SID}) ===`);
const tries = [
  ["POST", `https://wts-info-api.tossinvest.com/api/v2/tics/${SID}/stocks`, "{}"],
  ["POST", `https://wts-info-api.tossinvest.com/api/v2/tics/${SID}/stocks`, JSON.stringify({ ticsId: SID })],
  ["POST", `https://wts-info-api.tossinvest.com/api/v2/tics/stocks`, JSON.stringify({ ticsIds: [SID] })],
  ["GET", `https://wts-info-api.tossinvest.com/api/v2/tics/${SID}`, null],
  ["GET", `https://wts-info-api.tossinvest.com/api/v1/tics/${SID}/products`, null],
  ["GET", `https://wts-info-api.tossinvest.com/api/v1/tics/${SID}/companies?size=50`, null],
  ["GET", `https://wts-info-api.tossinvest.com/api/v2/tics/${SID}/companies`, null],
  ["GET", `https://wts-info-api.tossinvest.com/api/v1/tics/products?ticsId=${SID}`, null],
  ["GET", `https://wts-info-api.tossinvest.com/api/v2/tics/products?ticsIds=${SID}`, null],
  ["GET", `https://wts-info-api.tossinvest.com/api/v1/screener/tics/${SID}`, null],
  ["GET", `https://wts-info-api.tossinvest.com/api/v3/stock-infos/tics/${SID}`, null],
  ["GET", `https://wts-info-api.tossinvest.com/api/v2/stock-infos?ticsId=${SID}`, null],
  ["GET", `https://wts-info-api.tossinvest.com/api/v1/rankings/tics/${SID}`, null],
];
for (const [m, u, body] of tries) {
  try {
    const r = await fetch(u, { method: m, headers: H, body: body ?? undefined, signal: AbortSignal.timeout(10000) });
    const t = await r.text();
    console.log(`${m} ${r.status} ${u.replace("https://wts-info-api.tossinvest.com", "")}\n   ${short(t, 380)}`);
  } catch (e) { console.log(`${m} 실패 ${u} ${String(e).slice(0, 50)}`); }
}

// 2) 브라우저에서 실제 산업 상세 페이지 열어 XHR 캡처
console.log("\n=== 브라우저 XHR 캡처 (산업 상세 / 종목 상세) ===");
const browser = await chromium.launch();
const page = await (await browser.newContext({ locale: "ko-KR", viewport: { width: 1280, height: 900 } })).newPage();
const seen = new Map();
page.on("response", async (r) => {
  const u = r.url();
  if (!/tossinvest\.com\/api/.test(u) || seen.has(u)) return;
  if (!/tics|industr|theme|screen|product|compan/i.test(u)) return;
  let body = ""; try { body = short(await r.text(), 500); } catch {}
  seen.set(u, { status: r.status(), method: r.request().method(), post: short(r.request().postData() ?? "", 120), body });
});
for (const url of [
  `https://tossinvest.com/tics/${SID}`, `https://tossinvest.com/industries/${sample?.id}`, `https://tossinvest.com/industry/${SID}`,
  `https://tossinvest.com/tics/${sample?.id}`, "https://tossinvest.com/stocks/A005930/order", "https://tossinvest.com/stocks/A005930",
]) {
  try { await page.goto(url, { waitUntil: "networkidle", timeout: 40000 }); await page.waitForTimeout(2500); console.log(`  열림: ${url} → ${page.url()}`); }
  catch (e) { console.log(`  ${url} → ${String(e).slice(0, 50)}`); }
}
for (const [u, v] of seen) console.log(`${v.method} ${v.status} ${u.replace("https://", "")}${v.post ? `\n   POST ${v.post}` : ""}\n   ${v.body}\n`);
await browser.close();
