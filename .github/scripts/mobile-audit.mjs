/** 검증 30: 산업·테마·세부 테마 한 줄 설명이 전부 채워졌는지 (API + 화면) */
import { chromium } from "playwright";
const B = "https://stock-dashboard-jaeyeon.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  const b = await (await fetch(`${B}/api/industry`).catch(() => null))?.json().catch(() => null);
  const semi = b?.industries?.find((n) => n.title === "반도체");
  if (semi?.summary?.includes("메모리 가격")) ready = true; else { process.stdout.write("."); await sleep(10_000); }
}
console.log("\n배포 준비:", ready);
const ind = await (await fetch(`${B}/api/industry`)).json();
const empty = ind.industries.filter((n) => !(n.note ?? n.summary));
console.log("산업", ind.industries.length, "설명 없음", empty.length, empty.map((n) => n.title));
for (const n of ind.industries.slice(0, 5)) console.log(`  ${n.title}: ${n.note ?? n.summary}`);
let themeTotal = 0, themeEmpty = [];
for (const i of ind.industries) {
  const t = await (await fetch(`${B}/api/industry/themes?id=${i.id}`)).json();
  for (const th of t.themes ?? []) { themeTotal++; if (!(th.note ?? th.summary)) themeEmpty.push(`${i.title}/${th.title}`); }
  for (const st of t.subThemes ?? []) { if (!(st.note ?? st.summary)) themeEmpty.push(`${i.title}/세부/${st.title}`); }
}
console.log("테마", themeTotal, "설명 없음", themeEmpty.length, themeEmpty.slice(0, 10));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "ko-KR" });
await page.goto(`${B}/sectors`, { waitUntil: "networkidle", timeout: 90_000 });
await page.waitForSelector("table tbody tr", { timeout: 60_000 });
const rows = await page.evaluate(() => Array.from(document.querySelectorAll("table tbody tr")).map((tr) => { const t = tr.querySelector("td")?.textContent?.replace(/\s+/g, " ").trim() ?? ""; return t; }));
const noDesc = rows.filter((r) => /^\S+\s*(강세|약세)?\s*✏️$/.test(r) || !r.includes("✏️") === false && r.replace(/강세|약세|✏️/g, "").trim().split(" ").length < 3);
console.log("화면 산업 행", rows.length, "설명 없는 행", noDesc.length, JSON.stringify(rows.slice(0, 3)));
await browser.close();
