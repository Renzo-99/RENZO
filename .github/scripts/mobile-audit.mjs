// 화면에서 글로벌/국내 탭이 실제로 숫자를 바꾸는지
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 19; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();
for (const [label, vp] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`${BASE}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
  await wait(3000);

  const phone = vp.width < 640;
  const read = () => page.evaluate((isPhone) => {
    if (isPhone) {
      const li = document.querySelector('[data-testid="nodes-mobile"] li');
      if (!li) return "(없음)";
      const t = li.textContent.replace(/\s+/g, " ");
      const m = t.match(/3개월\s*([+\-]?[\d.]+%)/);
      const rs = [...li.querySelectorAll("*")].map((e) => e.textContent).find((x) => /장기 RS/.test(x ?? ""));
      return `${t.slice(0, 10)} | 3개월 ${m?.[1] ?? "?"} | ${(rs ?? "").replace(/\s+/g, " ").slice(0, 14)}`;
    }
    const tr = document.querySelector("table tbody tr");
    if (!tr) return "(없음)";
    const td = [...tr.querySelectorAll("td")].map((x) => x.textContent.trim());
    return `${td[0].slice(0, 8)} | 3개월 ${td[5]} | 장기RS ${td[6]} | 단기RS ${td[7]}`;
  }, phone);

  const a = await read();
  await page.locator('[data-testid="scope-tabs"] button', { hasText: "국내" }).click();
  await wait(5000);
  const b = await read();
  await page.locator('[data-testid="scope-tabs"] button', { hasText: "글로벌" }).click();
  await wait(5000);
  const c = await read();
  console.log(`\n[${label}] 글로벌 : ${a}`);
  console.log(`[${label}] 국내   : ${b}   ${a === b ? "✗ 안 바뀜" : "✓ 바뀜"}`);
  console.log(`[${label}] 되돌림 : ${c}   ${a === c ? "✓ 복귀" : "✗ 복귀 실패"}`);
  console.log(`[${label}] pageerrors: ${JSON.stringify(errs)}`);
  await ctx.close();
}
await browser.close();
