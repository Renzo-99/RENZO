/** 메인 대시보드 섹션별 상태 점검 — 어느 카드가 비어 있나 / XHR 상태 전부 */
import { chromium } from "playwright";

const APP = "https://stock-dashboard-jaeyeon.vercel.app";
const browser = await chromium.launch();

for (const [label, width] of [["모바일 412", 412], ["데스크탑 1280", 1280]]) {
  const ctx = await browser.newContext({ locale: "ko-KR", viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  const xhr = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 300)));
  page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("/api/")) xhr.push(`${r.status()} ${u.replace(APP, "").split("?")[0]}`);
  });

  await page.goto(`${APP}/?cb=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  // 지연 로딩 섹션을 깨우려고 끝까지 스크롤
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(8000);

  console.log(`\n${"=".repeat(70)}\n### ${label}\n${"=".repeat(70)}`);
  console.log("XHR:", [...new Set(xhr)].sort().join(" | ") || "없음");
  console.log("에러:", errs.length ? [...new Set(errs)].join("\n  ") : "없음");

  const sections = await page.evaluate(() => {
    const out = [];
    for (const sec of document.querySelectorAll("section")) {
      const h = sec.querySelector("h1, h2, h3");
      const title = (h?.textContent ?? sec.id ?? "?").trim().slice(0, 28);
      const body = (sec.textContent ?? "").replace(/\s+/g, " ").trim();
      // 카드가 살아 있나: 숫자가 있으면 데이터가 들어온 것
      const hasNum = /\d/.test(body.replace(title, ""));
      const placeholder = /불러오는 중|대기 중|없습니다|준비 중|—|―/.test(body);
      out.push({ title, len: body.length, hasNum, placeholder, head: body.slice(0, 90) });
    }
    return out;
  });
  for (const s of sections) {
    const mark = !s.hasNum ? "비었음 ⚠" : s.placeholder ? "일부 대기" : "정상";
    console.log(`  ${mark.padEnd(10)} ${s.title.padEnd(30)} ${String(s.len).padStart(6)}자  ${s.head.slice(0, 60)}`);
  }
  await ctx.close();
}
await browser.close();
