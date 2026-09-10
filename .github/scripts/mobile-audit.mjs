/** 배포 검증: 산업 탐색기 API 3층 + 크론 프라이밍 + 메인 화면 렌더 */
import { chromium } from "playwright";
const APP = "https://stock-dashboard-jaeyeon.vercel.app";
const T = (n) => (n >= 1e12 ? `${(n / 1e12).toFixed(1)}조` : `${(n / 1e8).toFixed(0)}억`);

// 0) 크론 프라이밍 시도 (CRON_SECRET이 걸려 있으면 401 — 그 경우 16:20 KST 첫 실행을 기다린다)
try {
  const r = await fetch(`${APP}/api/cron/industry-snapshot`, { signal: AbortSignal.timeout(280000) });
  const t = await r.text();
  console.log(`=== 크론 프라이밍 HTTP ${r.status} ===\n${t.slice(0, 400)}\n`);
} catch (e) { console.log("크론 프라이밍 실패:", String(e).slice(0, 80)); }

// 1) 산업 층위
const ind = await (await fetch(`${APP}/api/industry?cb=${Date.now()}`, { signal: AbortSignal.timeout(90000) })).json();
console.log(`=== /api/industry ===`);
if (ind.error) console.log("오류:", ind.error);
else {
  console.log(`산업 ${ind.industries.length}개 · 시총 ${T(ind.totalCap)} · 수익률 기준 ${ind.asOf} · 시총 ${ind.capsApprox ? "근사" : "정확"} (${ind.capsAt})`);
  console.log(`${"산업".padEnd(12)} ${"시총".padStart(8)} ${"비중".padStart(4)} ${"등락".padStart(7)} 장기 단기 사분면 강세`);
  for (const n of ind.industries.slice(0, 12)) console.log(`${n.title.padEnd(12)} ${T(n.cap).padStart(8)} ${(Math.round(n.share * 100) + "%").padStart(4)} ${(n.change.toFixed(2) + "%").padStart(7)} ${String(n.longRs).padStart(4)} ${String(n.shortRs).padStart(4)} ${n.quadrant} ${n.strength ?? ""}`);
  console.log("오늘 많이 오른 테마:", ind.topThemes.map((t) => `${t.title} ${t.change > 0 ? "+" : ""}${t.change}%`).join(" · "));
}

// 2) 테마 층위 — 반도체
const th = await (await fetch(`${APP}/api/industry/themes?id=169&cb=${Date.now()}`, { signal: AbortSignal.timeout(90000) })).json();
console.log(`\n=== /api/industry/themes?id=169 (반도체) ===`);
if (th.error) console.log("오류:", th.error);
else {
  console.log(`산업 RS 장기 ${th.industry.longRs} 단기 ${th.industry.shortRs} · 테마 ${th.themes.length}개`);
  for (const n of th.themes.slice(0, 10)) console.log(`  ${n.title.padEnd(16)} ${T(n.cap).padStart(8)} ${n.count}종목 ${(n.change.toFixed(2) + "%").padStart(7)} 장기 ${n.longRs} 단기 ${n.shortRs} ${n.quadrant} ${n.strength ?? ""}`);
}

// 3) 종목 층위 — 반도체 전공정 장비(711)
const st = await (await fetch(`${APP}/api/industry/stocks?id=711&cb=${Date.now()}`, { signal: AbortSignal.timeout(90000) })).json();
console.log(`\n=== /api/industry/stocks?id=711 ===`);
if (st.error) console.log("오류:", st.error);
else {
  console.log(`${st.node.parentTitle} › ${st.node.title} · 국내 ${st.stocks.length}종목 (해외 ${st.foreignCount}) · 시총 ${T(st.totalCap)}`);
  for (const s of st.stocks.slice(0, 6)) console.log(`  ${s.name.padEnd(12)} ${s.code} ${String(s.price).padStart(9)}원 ${(s.change.toFixed(2) + "%").padStart(7)} 시총 ${T(s.cap)} 거래대금 ${T(s.tradeValue)}`);
}

// 4) 메인 화면 렌더
const browser = await chromium.launch();
const page = await (await browser.newContext({ locale: "ko-KR", viewport: { width: 1280, height: 900 } })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await page.goto(`${APP}/?cb=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.locator("#sectors").scrollIntoViewIfNeeded().catch(() => null);
await page.waitForTimeout(15000);
const sec = await page.evaluate(() => {
  const el = document.querySelector("#sectors");
  const txt = (el?.textContent ?? "").replace(/\s+/g, " ");
  return { has: !!el, svg: el?.querySelectorAll("svg").length ?? 0, rows: el?.querySelectorAll("tbody tr").length ?? 0, chips: el?.querySelectorAll("button").length ?? 0, head: txt.slice(0, 260) };
});
console.log(`\n=== 메인 #sectors ===\nsvg ${sec.svg} · 표 행 ${sec.rows} · 버튼 ${sec.chips}\n${sec.head}\n미처리 예외: ${errs.length ? errs.join(" | ") : "없음"}`);
await browser.close();
