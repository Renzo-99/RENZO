/** 검증 9: 히어로 카드·세부 테마·해시태그·검색 — 배포(새 라우트 /api/industry/subthemes) 대기 후 API + DOM */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const short = (t, n = 300) => String(t).replace(/\s+/g, " ").slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 배포 대기 — 새 라우트가 404가 아닐 때까지 최대 7분
let ready = false;
for (let i = 0; i < 42 && !ready; i++) {
  const r = await fetch(`${B}/api/industry/subthemes?industry=169`).catch(() => null);
  if (r?.status === 200) ready = true; else { process.stdout.write(`.${r?.status ?? "x"}`); await sleep(10_000); }
}
console.log("\n배포 준비:", ready);

console.log("\n=== (1) 크론 수동 실행(태그 색인·종목 스냅샷·세부 테마 수익률) ===");
const cron = await fetch(`${B}/api/cron/industry-snapshot`);
console.log(cron.status, short(await cron.text(), 400));

console.log("\n=== (2) 히어로 API ===");
const hero = await (await fetch(`${B}/api/market/hero`)).json();
console.log("kospi:", hero.kospi?.price, hero.kospi?.changeRate + "%", "캔들", hero.kospi?.candles?.length, "장", hero.kospi?.tradingStart, "~", hero.kospi?.tradingEnd);
console.log("kosdaq:", hero.kosdaq?.price, "밤사이:", (hero.overnight ?? []).map((o) => `${o.name} ${o.changeRate}%`).join(" · "));
console.log("문구:", JSON.stringify(hero.motto), "\n주인공:", (hero.heroes ?? []).map((h) => `${h.name} ${h.change}%(${h.themeTitle})`).join(", "));
console.log("테마:", (hero.topThemes ?? []).map((t) => `${t.title} ${t.change}%`).join(", "), "\n위키:", JSON.stringify(hero.recent?.slice(0, 2)));

console.log("\n=== (3) 세부 테마 층 ===");
const t0 = Date.now();
const th = await (await fetch(`${B}/api/industry/themes?id=169`)).json();
console.log(`themes ${th.themes?.length} · subThemes ${th.subThemes?.length} · ${Date.now() - t0}ms`);
for (const s of (th.subThemes ?? []).slice(0, 8)) console.log(`  ${s.title.padEnd(14)} 종목 ${s.count} 시총 ${(s.cap / 1e12).toFixed(1)}조 등락 ${s.change}% 1M ${s.perf1M}% 3M ${s.perf3M}% RS ${s.longRs}/${s.shortRs} ${s.quadrant} · ${s.summary?.slice(0, 20)}`);
const zeroPerf = (th.subThemes ?? []).filter((s) => s.perf1M === 0 && s.perf3M === 0).map((s) => s.title);
console.log("수익률 0인 세부 테마:", zeroPerf.length, zeroPerf.join(","));
const hbm = await (await fetch(`${B}/api/industry/stocks?id=sub:hbm`)).json();
console.log("sub:hbm:", hbm.node?.title, "editable", hbm.editable, "parent", hbm.node?.parentTitle, "종목", hbm.stocks?.length, "시총합", (hbm.totalCap / 1e12).toFixed(1) + "조");
for (const s of (hbm.stocks ?? []).slice(0, 5)) console.log(`  ${s.name} ${s.price} ${s.change}% 시총 ${(s.cap / 1e12).toFixed(2)}조 거래대금 ${(s.tradeValue / 1e8).toFixed(0)}억`);

console.log("\n=== (4) 해시태그·검색 ===");
for (const q of ["code=000660", "code=042700", "q=HBM", "q=반도체"]) {
  const r = await (await fetch(`${B}/api/industry/tags?${q}`)).json();
  console.log(`  ${q} → ready ${r.ready}`, q.startsWith("code") ? (r.tags ?? []).map((t) => `#${t.title}(${t.depth})`).join(" ") : (r.themes ?? []).map((t) => `${t.title}[${t.depth}:${t.count}]`).join(", "));
}
const lk = await (await fetch(`${B}/api/stocks/lookup?q=HBM`)).json();
console.log("  lookup HBM → 종목", lk.candidates?.length, "테마", (lk.themes ?? []).map((t) => `${t.title}(${t.depth})`).join(", "));

console.log("\n=== (5) DOM ===");
const browser = await chromium.launch();
for (const [w, h, name] of [[390, 844, "phone"], [1280, 900, "desktop"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => console.log(`  [${name}] pageerror:`, e.message));
  await page.goto(`${B}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="kospi-hero"] svg path, [data-testid="kospi-hero"] p', { timeout: 60_000 }).catch(() => null);
  const heroInfo = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="kospi-hero"]');
    if (!el) return null;
    const txt = el.textContent ?? "";
    return { paths: el.querySelectorAll("svg path").length, texts: el.querySelectorAll("svg text").length, 최고: txt.includes("최고"), 최저: txt.includes("최저"), 개장: txt.includes("장 개장"), 마감: txt.includes("장 마감"), 밤사이: txt.includes("밤사이"), 주인공: txt.includes("오늘의 주인공"), 위키: txt.includes("최근 수정된 위키"), 문구: txt.includes("“"), overflow: document.documentElement.scrollWidth > window.innerWidth, w: el.getBoundingClientRect().width };
  });
  console.log(`  [${name}] hero:`, JSON.stringify(heroInfo));
  await page.screenshot({ path: `hero-${name}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(h, 900) } }).catch(() => null);

  await page.goto(`${B}/sectors?node=169&depth=0`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="subthemes"] tbody tr', { timeout: 90_000 }).catch(() => null);
  const sub = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="subthemes"]');
    return { rows: el?.querySelectorAll("tbody tr").length ?? 0, chips: el?.querySelectorAll("button.rounded-full").length ?? 0, hasHbm: !!el?.textContent?.includes("HBM"), toggle: !!document.body.textContent?.includes("세부 테마") && !!document.body.textContent?.includes("토스 테마"), overflow: document.documentElement.scrollWidth > window.innerWidth };
  });
  console.log(`  [${name}] 세부 테마:`, JSON.stringify(sub));
  // 지도 토글 → 세부 테마 버블
  const tog = page.getByRole("button", { name: "세부 테마", exact: true }).first();
  if (await tog.count()) { await tog.click(); await sleep(800); console.log(`  [${name}] 지도(세부) 버블:`, await page.locator("svg circle").count()); }

  await page.goto(`${B}/sectors?node=sub:hbm&depth=2`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-testid="subtheme-stocks"]', { timeout: 60_000 }).catch(() => null);
  const st = await page.evaluate(() => ({ head: document.querySelector('[data-testid="subtheme-stocks"]')?.textContent?.slice(0, 80), rows: document.querySelectorAll("table tbody tr").length, remove: document.querySelectorAll('button[aria-label$="빼기"]').length, addForm: !!document.querySelector('input[aria-label="종목 추가"]') }));
  console.log(`  [${name}] sub:hbm 종목:`, JSON.stringify(st));

  await page.goto(`${B}/stock/000660`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForSelector('[data-testid="stock-tags"]', { timeout: 60_000 }).catch(() => null);
  const tags = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="stock-tags"] a')).map((a) => a.textContent + "→" + a.getAttribute("href")));
  console.log(`  [${name}] 000660 태그(${tags.length}):`, tags.slice(0, 8).join(" "));

  if (name === "desktop") {
    await page.goto(`${B}/`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByLabel("검색").fill("HBM");
    await sleep(1500);
    const dd = await page.evaluate(() => Array.from(document.querySelectorAll("form ul li button")).map((b) => b.textContent?.replace(/\s+/g, " ").trim()));
    console.log("  [desktop] 검색 HBM 드롭다운:", JSON.stringify(dd));
  }
  await page.close();
}
await browser.close();
