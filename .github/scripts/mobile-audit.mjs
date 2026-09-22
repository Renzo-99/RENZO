// 글자 잘림 없는지 + 화면 전체 폭 쓰는지 + 담기/저장 + 에러 출처
import { chromium } from "playwright";
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 25; i++) { process.stdout.write("."); await wait(10_000); }
console.log("\n배포 대기 끝");

const browser = await chromium.launch();

for (const [label, W] of [["1440", 1440], ["1920", 1920]]) {
  const ctx = await browser.newContext({ viewport: { width: W, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push({ m: String(e.message ?? e), s: String(e.stack ?? "").split("\n")[1] ?? "" }));
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await wait(4500);

  // 1) 화면 전체 폭 — 본문 오른쪽에 남는 여백
  const width = await page.evaluate(() => {
    const main = document.querySelector("main");
    const r = main.getBoundingClientRect();
    return { 화면: window.innerWidth, 본문폭: Math.round(r.width), 오른쪽여백: Math.round(window.innerWidth - r.right) };
  });
  console.log(`\n[${label}px] ${JSON.stringify(width)}`);

  // 2) 글자 잘림 — 이름·티커가 실제로 넘치는지
  const clip = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-testid="watchlist-panel"] li')];
    const out = [];
    for (const li of rows.slice(0, 8)) {
      const a = li.querySelector("a");
      if (!a) continue;
      const [t, n] = a.querySelectorAll("div");
      if (!t || !n) continue;
      out.push({
        티커: t.textContent, 잘림: t.scrollWidth > t.clientWidth + 1,
        이름: n.textContent, 이름잘림: n.scrollWidth > n.clientWidth + 1,
        이름칸: Math.round(a.getBoundingClientRect().width),
      });
    }
    return out;
  });
  console.log(`[${label}px] 행:`);
  for (const r of clip) console.log(`   ${r.티커}${r.잘림 ? "(잘림)" : ""} / ${r.이름}${r.이름잘림 ? "(잘림)" : ""} — 이름칸 ${r.이름칸}px`);

  // 3) 일정 칩 라벨
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="watch-events"] > a')].slice(0, 5).map((a) => {
      const [l, w] = a.querySelectorAll("span:not(:first-child)");
      return `${l?.textContent ?? ""}/${w?.textContent ?? ""}`;
    }));
  console.log(`[${label}px] 칩: ${JSON.stringify(chips)}`);
  console.log(`[${label}px] 에러 ${errs.length}건 ${errs.length ? JSON.stringify(errs.slice(0, 2)) : ""}`);
  await ctx.close();
}

// 4) 담기 → 저장
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
await wait(4500);
await page.getByTestId("watch-add-group").click();
await page.getByLabel("새 그룹 이름").fill("검증용");
await page.getByRole("button", { name: "만들기" }).click();
await wait(2500);
const add = page.locator('[data-testid^="watch-add-g-"]').last();
await add.click({ force: true });
await page.getByLabel("담을 종목").fill("NVDA");
await page.getByRole("button", { name: "담기" }).click();
await wait(5000);
const read = () => page.evaluate(() => {
  const s = [...document.querySelectorAll('[data-testid="watchlist-panel"] section')].find((x) => x.textContent.includes("검증용"));
  return s ? [...s.querySelectorAll("li")].map((li) => li.textContent.replace(/\s+/g, " ").slice(0, 44)) : null;
});
console.log(`\n[담기] ${JSON.stringify(await read())}`);
await page.reload({ waitUntil: "networkidle", timeout: 90_000 });
await wait(5000);
const kept = await read();
console.log(`[새로고침 뒤] ${JSON.stringify(kept)} ${kept?.some((t) => t.includes("NVDA")) ? "✓ 저장됨" : "✗"}`);
const del = page.locator('[aria-label="검증용 그룹 삭제"]');
if (await del.count()) { await del.first().click({ force: true }); await wait(3000); }
console.log(`[정리] 검증용 남음: ${await page.evaluate(() => document.body.innerText.includes("검증용"))}`);
await browser.close();
