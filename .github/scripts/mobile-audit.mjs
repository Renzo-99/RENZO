/** 검증 13: 히어로 탭(국내·미국·글로벌)·미국 장중선 ET 눈금·주인공 US·문구 탭별·산업 칩 마퀴 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  const b = await (await fetch(`${B}/api/market/hero`).catch(() => null))?.json().catch(() => null);
  if (b?.mottos?.us) ready = true; else { process.stdout.write("."); await sleep(10_000); }
}
console.log("\n배포 준비:", ready);
const h = await (await fetch(`${B}/api/market/hero`)).json();
console.log("지수:", (h.indices ?? []).map((i) => `${i.name}(${i.nation}) ${i.price} ${i.changeRate}% 캔들 ${i.candles.length} ${i.tradingStart}~${i.tradingEnd}`).join("\n     "));
console.log("문구:", JSON.stringify(h.mottos));
console.log("주인공 KR:", (h.heroes?.kr ?? []).map((s) => `${s.name} ${s.change}%`).join(", "));
console.log("주인공 US:", (h.heroes?.us ?? []).map((s) => `${s.name}(${s.code}) ${s.change}% · ${s.themeTitle}`).join(", "));

const browser = await chromium.launch();
for (const [w, hh, name] of [[1280, 900, "desktop"], [390, 844, "phone"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: hh }, locale: "ko-KR" });
  const errs = new Map(); page.on("pageerror", (e) => errs.set(e.message, (errs.get(e.message) ?? 0) + 1));
  await page.goto(`${B}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="kospi-hero"] [role="tab"]', { timeout: 60_000 });
  for (const tab of ["미국", "글로벌", "국내"]) {
    await page.getByRole("tab", { name: tab }).click();
    await sleep(600);
    const st = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="kospi-hero"]');
      const txt = el?.textContent ?? "";
      const svgTexts = Array.from(el?.querySelectorAll("svg text") ?? []).map((t) => t.textContent);
      return { market: el?.getAttribute("data-market"), paths: el?.querySelectorAll("svg path").length, grid: el?.querySelectorAll('[data-testid="hero-global-grid"] > div').length ?? 0,
        ticks: svgTexts.filter((t) => /장 개장|장 마감/.test(t ?? "")), head: txt.slice(0, 120).replace(/\s+/g, " "), 주인공: (txt.match(/오늘의 주인공[^오]*?오늘 많이/)?.[0] ?? "").slice(0, 160), overflow: document.documentElement.scrollWidth > window.innerWidth };
    });
    console.log(`  [${name}] ${tab}:`, JSON.stringify(st));
  }
  const mq = await page.evaluate(() => {
    const m = document.querySelector('[data-testid="chip-marquee"] .chip-marquee');
    if (!m) return null;
    const cs = getComputedStyle(m);
    const a = m.getBoundingClientRect().left;
    return { anim: cs.animationName, dur: cs.animationDuration, state: cs.animationPlayState, chips: m.querySelectorAll("button").length, left0: Math.round(a) };
  });
  await sleep(1500);
  const left1 = await page.evaluate(() => Math.round(document.querySelector('[data-testid="chip-marquee"] .chip-marquee')?.getBoundingClientRect().left ?? 0));
  console.log(`  [${name}] 마퀴:`, JSON.stringify(mq), "1.5초 뒤 left:", left1, "(오른쪽으로 이동하면 커진다)");
  console.log(`  [${name}] pageerrors:`, JSON.stringify([...errs.entries()]));
  await page.close();
}
await browser.close();
