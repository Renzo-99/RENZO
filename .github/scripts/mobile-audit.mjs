/** 정찰: 토스증권 웹이 실제로 호출하는 API를 브라우저로 캡처해 국고채/금리 경로를 찾는다 */
import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: "ko-KR",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
});

const seen = new Map(); // url -> {status, snippet}
ctx.on("response", async (res) => {
  const url = res.url();
  if (!/tossinvest\.com/.test(url)) return;
  if (!/\/api\//.test(url)) return;
  if (seen.has(url)) return;
  let snippet = "";
  try {
    const ct = res.headers()["content-type"] ?? "";
    if (ct.includes("json")) snippet = (await res.text()).slice(0, 260).replace(/\s+/g, " ");
  } catch { /* 본문 못 읽는 응답은 URL만 */ }
  seen.set(url, { status: res.status(), snippet });
});

for (const path of ["/", "/bond", "/bonds", "/market", "/invest/bond"]) {
  try {
    const page = await ctx.newPage();
    await page.goto("https://tossinvest.com" + path, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(6000);
    const bodyText = (await page.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\s+/g, " ");
    console.log(`\n### ${path} — 화면 텍스트: ${bodyText}`);
    await page.close();
  } catch (e) {
    console.log(`\n### ${path} — 이동 실패: ${e.message}`);
  }
}

console.log(`\n===== 캡처된 API ${seen.size}개 =====`);
for (const [url, v] of seen) {
  const hit = /국고|채권|bond|yield|rate/i.test(v.snippet) ? "  ★금리/채권 후보" : "";
  console.log(`[${v.status}] ${url}${hit}`);
  if (v.snippet) console.log(`      ${v.snippet.slice(0, 200)}`);
}
await browser.close();
