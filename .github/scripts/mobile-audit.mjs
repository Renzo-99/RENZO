/** 렌더된 화면에서 금액 표기를 읽는다 — 클라이언트 렌더 화면은 HTML만 봐선 알 수 없다 */
import { chromium } from "playwright";
const APP = "https://stock-dashboard-jaeyeon.vercel.app";

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: "ko-KR", viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();

async function textOf(path, waitFor) {
  await page.goto(`${APP}${path}?cb=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return await page.evaluate(() => document.body.innerText);
}

// 1) 미국 섹터 보드 — 합산 시총 표기
const sectors = await textOf("/sectors/us");
const capLines = sectors.split("\n").filter((l) => l.includes("합산 시총")).slice(0, 6);
console.log("=== /sectors/us 합산 시총 ===");
capLines.forEach((l) => console.log("  " + l.trim()));
const english = sectors.match(/\$[\d.,]+\s*[TBM]\b/g);
console.log("영어 단위 잔존:", english ? english.slice(0, 5).join(", ") : "없음");

// 2) 종목 상세 — 원화·달러 병기
for (const t of ["AAPL", "NVDA"]) {
  const txt = await textOf(`/stock/${t}`, '[data-testid="stock-metrics"]');
  const i = txt.indexOf("현재가");
  console.log(`\n=== /stock/${t} 지표 블록 ===`);
  console.log(txt.slice(i, i + 220).split("\n").map((l) => "  " + l).join("\n"));
}

await browser.close();
