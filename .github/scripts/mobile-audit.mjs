/** 검증 28: 폰(큰 글자 포함)에서 주요 일정 타일의 제목·설명이 잘리지 않고 전부 보이는지, 머리글이 한 줄인지 */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 21; i++) { await sleep(10_000); process.stdout.write("."); }
console.log("\n대기 끝");
const api = await (await fetch(`${B}/api/calendar`)).json();
const full = api.events.filter((e) => e.date >= "2026-09-11").slice(0, 6).map((e) => ({ title: e.title, whyLen: e.why.length }));
const browser = await chromium.launch();
for (const [name, scale] of [["phone", 1], ["phone-big", 1.3]]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "ko-KR" });
  await page.goto(`${B}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="calendar-compact"] li', { timeout: 60_000 });
  if (scale !== 1) { await page.evaluate((s) => { document.body.style.zoom = String(s); }, scale); await sleep(400); }
  const r = await page.evaluate((full) => {
    const lis = Array.from(document.querySelectorAll('[data-testid="calendar-compact"] li'));
    const cut = [];
    lis.forEach((li, i) => {
      const txt = li.textContent ?? "";
      const titleFull = txt.includes(full[i]?.title ?? "@@");
      const why = li.querySelector("p:last-child");
      const whyFull = why && (why.textContent?.length ?? 0) >= (full[i]?.whyLen ?? 0);
      const clipped = Array.from(li.querySelectorAll("*")).some((el) => { const cs = getComputedStyle(el); return (cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) || cs.webkitLineClamp !== "none"; });
      if (!titleFull || !whyFull || clipped) cut.push({ i, titleFull, whyFull, clipped });
    });
    const head = document.querySelector('[data-testid="calendar-compact"]').previousElementSibling;
    const headRect = head.getBoundingClientRect();
    return { tiles: lis.length, cut, headH: Math.round(headRect.height), headText: head.textContent.replace(/\s+/g, " ").slice(0, 60), overflow: document.documentElement.scrollWidth > window.innerWidth };
  }, full);
  console.log(`  [${name}]`, JSON.stringify(r));
  await page.close();
}
await browser.close();
