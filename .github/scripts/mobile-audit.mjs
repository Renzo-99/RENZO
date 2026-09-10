/** 검증: 지도가 화면에 들어오나·버블이 테두리 안에 있나·새 기능들이 렌더되나 */
import { chromium } from "playwright";
const APP = "https://stock-dashboard-jaeyeon.vercel.app";
const browser = await chromium.launch();
for (const [label, w, h] of [["데스크탑 1280×800", 1280, 800], ["폴드 펼침 900×1000", 900, 1000], ["모바일 412×915", 412, 915]]) {
  const page = await (await browser.newContext({ locale: "ko-KR", viewport: { width: w, height: h } })).newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(`${APP}/?cb=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator("#sectors").scrollIntoViewIfNeeded();
  await page.waitForTimeout(12000);
  // 반도체로 드릴다운 (칩 클릭)
  await page.locator("#sectors button", { hasText: "반도체" }).first().click().catch(() => null);
  await page.waitForTimeout(8000);
  const r = await page.evaluate(() => {
    const sec = document.querySelector("#sectors");
    const svg = sec?.querySelector("svg[aria-label='상대강도 지도']");
    const sb = svg?.getBoundingClientRect();
    const circles = [...(svg?.querySelectorAll("circle") ?? [])].filter((c) => Number(c.getAttribute("r")) >= 5);
    let out = 0;
    for (const c of circles) { const b = c.getBoundingClientRect(); if (b.left < sb.left || b.right > sb.right || b.top < sb.top || b.bottom > sb.bottom) out++; }
    const txt = (sec?.textContent ?? "").replace(/\s+/g, " ");
    return {
      svgH: Math.round(sb?.height ?? 0), svgW: Math.round(sb?.width ?? 0), circles: circles.length, outside: out,
      header: txt.slice(0, 160),
      hasChain: /설계|파운드리|전공정/.test(txt) && /→/.test(txt),
      hasEdit: txt.includes("✏️"), hasHelp: txt.includes("RS란?"), hasBig: txt.includes("크게 보기"),
      sortHeads: [...(sec?.querySelectorAll("thead button") ?? [])].length,
    };
  });
  console.log(`\n=== ${label} ===`);
  console.log(`지도 ${r.svgW}×${r.svgH}px (뷰포트 높이 ${h}) → ${r.svgH <= h * 0.6 ? "한 화면 OK" : "너무 큼 ⚠"} · 버블 ${r.circles}개 중 테두리 밖 ${r.outside}개${r.outside ? " ⚠" : " ✓"}`);
  console.log(`밸류체인 칩 ${r.hasChain ? "✓" : "✗"} · ✏️ 편집 ${r.hasEdit ? "✓" : "✗"} · RS 설명 ${r.hasHelp ? "✓" : "✗"} · 크게보기 ${r.hasBig ? "✓" : "✗"} · 정렬 머리글 ${r.sortHeads}개`);
  console.log(`헤더: ${r.header}`);
  console.log(`예외: ${errs.length ? errs.join(" | ") : "없음"}`);
  // 히트맵 토글 → 산업 층위 테마 타일 수
  await page.locator("#sectors button", { hasText: "산업" }).first().click().catch(() => null);
  await page.waitForTimeout(3000);
  await page.locator("#sectors button", { hasText: "히트맵" }).first().click().catch(() => null);
  await page.waitForTimeout(1500);
  const heat = await page.evaluate(() => {
    const svg = document.querySelector("#sectors svg[aria-label='산업 히트맵']");
    return { rects: svg?.querySelectorAll("rect").length ?? 0, h: Math.round(svg?.getBoundingClientRect().height ?? 0) };
  });
  console.log(`히트맵: rect ${heat.rects}개(산업+테마 타일), 높이 ${heat.h}px`);
  await page.context().close();
}
await browser.close();
