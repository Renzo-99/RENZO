/** 검증 15: 산업 칩 띠 — 오른쪽→왼쪽 이동, 칩 클릭 후에도 계속, 동작 줄이기 설정에서도 이동 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 배포는 이미 떠 있다(직전 실행에서 방향 확인) — 바로 진행
const browser = await chromium.launch();
for (const [name, reduced] of [["desktop", "no-preference"], ["desktop-reduced-motion", "reduce"], ["phone", "no-preference"]]) {
  const phone = name === "phone";
  const ctx = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 900 }, locale: "ko-KR", reducedMotion: reduced, hasTouch: phone, isMobile: phone });
  const page = await ctx.newPage();
  await page.goto(`${B}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="chip-marquee"] .chip-marquee button', { timeout: 60_000 });
  await page.mouse.move(5, 5);
  const left = () => page.evaluate(() => Math.round(document.querySelector('[data-testid="chip-marquee"] .chip-marquee')?.getBoundingClientRect().left ?? 0));
  const cs = await page.evaluate(() => { const m = document.querySelector('[data-testid="chip-marquee"] .chip-marquee'); const c = getComputedStyle(m); return { anim: c.animationName, dur: c.animationDuration, state: c.animationPlayState }; });
  const a = await left(); await sleep(1500); const b = await left();
  console.log(`  [${name}] 스타일:`, JSON.stringify(cs), `left ${a} → ${b} (왼쪽으로 흐르면 줄어든다: ${b < a ? "OK" : "안 움직임"})`);
  // 칩을 누른 뒤에도 계속 흐르는지 — 첫 칩 클릭(테마 층위로) 후 마우스를 치우고 측정
  const chip = page.locator('[data-testid="chip-marquee"] .chip-marquee button').first();
  const chipName = await chip.textContent();
  // 흐르는 요소는 플레이라이트가 '불안정'하다고 기다린다 — 사람처럼 먼저 올려서(멈춤) 누른다
  const box = await chip.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(300);
  if (phone) await chip.tap({ force: true }); else await chip.click({ force: true });
  await page.mouse.move(5, 5);
  await sleep(3500); // 터치 정지 2.5초 포함
  const c1 = await left(); await sleep(1500); const c2 = await left();
  const focused = await page.evaluate(() => document.activeElement?.tagName + ":" + (document.activeElement?.textContent ?? "").slice(0, 10));
  console.log(`  [${name}] '${chipName}' 클릭 후 left ${c1} → ${c2} (${c2 < c1 ? "계속 흐름 OK" : "멈춤"}) · 포커스 ${focused} · 상태 ${await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="chip-marquee"] .chip-marquee')).animationPlayState)}`);
  await ctx.close();
}
await browser.close();
