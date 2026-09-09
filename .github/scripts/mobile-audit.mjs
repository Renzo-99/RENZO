/** 메인 대시보드 오류 진단 — 콘솔 에러·미처리 예외·화면에 뜬 오류 문구를 모은다 */
import { chromium } from "playwright";

const APP = "https://stock-dashboard-jaeyeon.vercel.app";
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: "ko-KR", viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();

const consoleErrors = [];
const pageErrors = [];
const failedReqs = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
});
page.on("pageerror", (e) => pageErrors.push(String(e.stack ?? e).slice(0, 600)));
page.on("response", (r) => {
  if (r.status() >= 400) failedReqs.push(`${r.status()} ${r.url().replace(APP, "")}`);
});

console.log("=== 메인 대시보드 로딩 ===");
await page.goto(`${APP}/?cb=${Date.now()}`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(6000);

console.log("\n--- 미처리 예외 (pageerror) ---");
console.log(pageErrors.length ? pageErrors.join("\n\n") : "없음");

console.log("\n--- 콘솔 에러 ---");
console.log(consoleErrors.length ? [...new Set(consoleErrors)].join("\n") : "없음");

console.log("\n--- 실패한 요청 (4xx/5xx) ---");
console.log(failedReqs.length ? [...new Set(failedReqs)].join("\n") : "없음");

// 화면에 보이는 오류 문구
const texts = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("p, span, div")) {
    const t = (el.textContent ?? "").trim();
    if (!t || t.length > 120) continue;
    if (/오류|실패|일시적인|불러올 수|문제가|대기 중|없습니다|다시 시도/.test(t)) out.push(t);
  }
  return [...new Set(out)].slice(0, 25);
});
console.log("\n--- 화면에 뜬 오류·대기 문구 ---");
console.log(texts.length ? texts.join("\n") : "없음");

// /api/rates 직접 상태
const api = await page.evaluate(async () => {
  try {
    const r = await fetch("/api/rates?cb=" + Date.now());
    const b = await r.json();
    return { status: r.status, keys: Object.keys(b).slice(0, 20), error: b.error ?? null, asOf: b.asOf ?? "(없음)" };
  } catch (e) {
    return { err: String(e) };
  }
});
console.log("\n--- /api/rates ---");
console.log(JSON.stringify(api, null, 1));

await browser.close();
