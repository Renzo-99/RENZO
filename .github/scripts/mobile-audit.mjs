/**
 * 진단: 배포 사이트의 모바일 레이아웃 깨짐 원인 추적.
 * 폰 뷰포트에서 문서 폭이 화면을 넘는지, 어떤 요소가 넘치는지 찾는다.
 */
import { chromium } from "playwright";

const BASE = process.env.SITE ?? "https://stock-dashboard-jaeyeon.vercel.app";
const PATHS = (process.env.PATHS ?? "/").split(",");
const VIEWPORTS = (process.env.WIDTHS ?? "320,360,390,412")
  .split(",")
  .map((w) => ({ name: `${w}px`, width: Number(w), height: 844 }));

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  for (const p of PATHS) {
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 90_000 });
    } catch (e) {
      console.log(`\n### ${vp.name} ${p} — 이동 실패: ${e.message}`);
      await page.close();
      continue;
    }
    await page.waitForTimeout(9000); // 클라이언트 폴링 데이터가 들어올 시간

    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const docW = Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
        document.body.offsetWidth,
      );
      const path = (el) => {
        const parts = [];
        for (let e = el; e && e.tagName && parts.length < 5; e = e.parentElement) {
          let s = e.tagName.toLowerCase();
          if (e.id) s += "#" + e.id;
          else if (e.className && typeof e.className === "string") {
            const c = e.className.trim().split(/\s+/).slice(0, 4).join(".");
            if (c) s += "." + c;
          }
          parts.unshift(s);
        }
        return parts.join(" > ");
      };
      const over = [];
      for (const el of document.querySelectorAll("body *")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        const right = b.right + window.scrollX;
        if (right <= vw + 1) continue;
        let clipped = false;
        for (let par = el.parentElement; par && par !== document.body; par = par.parentElement) {
          const s = getComputedStyle(par);
          if (["auto", "scroll", "hidden", "clip"].includes(s.overflowX)) { clipped = true; break; }
        }
        over.push({ clipped, right: Math.round(right), w: Math.round(b.width), p: path(el),
          txt: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 45) });
      }
      const uncl = over.filter((o) => !o.clipped).sort((a, b) => b.right - a.right);
      const wide = [...over].sort((a, b) => b.w - a.w).slice(0, 6);

      // 넘침을 만든 '가장 안쪽' 요소 — 자식 중 넘치는 게 없는 리프만 남긴다
      const overEls = [...document.querySelectorAll("body *")].filter((el) => {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) return false;
        if (b.right + window.scrollX <= vw + 1) return false;
        for (let par = el.parentElement; par && par !== document.body; par = par.parentElement) {
          const s2 = getComputedStyle(par);
          if (["auto", "scroll", "hidden", "clip"].includes(s2.overflowX)) return false;
        }
        return true;
      });
      const leaves = overEls
        .filter((el) => !overEls.some((o) => o !== el && el.contains(o)))
        .map((el) => {
          const b = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            p: path(el),
            w: Math.round(b.width),
            right: Math.round(b.right + window.scrollX),
            minW: cs.minWidth,
            ws: cs.whiteSpace,
            size: el.getAttribute("size") ?? "",
            txt: (el.textContent || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 50),
          };
        });
      return { vw, docW, uncl: uncl.slice(0, 8), wide, uncCount: uncl.length, leaves };
    });

    console.log(`\n### ${vp.name} (${vp.width}px) ${p}`);
    console.log(`clientWidth=${r.vw} documentWidth=${r.docW} → 가로 넘침 ${r.docW - r.vw}px`);
    if (r.uncl.length) {
      console.log(`-- 스크롤 컨테이너 밖으로 넘친 요소 ${r.uncCount}개 (상위) --`);
      for (const o of r.uncl) console.log(`  right=${o.right} w=${o.w} | ${o.p} | ${o.txt}`);
    } else {
      console.log("-- 컨테이너 밖 넘침 없음 --");
    }
    if (r.leaves?.length) {
      console.log("-- 넘침의 실제 원인(최말단 요소) --");
      for (const o of r.leaves) console.log(`  w=${o.w} right=${o.right} minW=${o.minW} ws=${o.ws} size=${o.size} | ${o.p} | ${o.txt}`);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
