// 스톡나우 웹사이트 속보 한글 데이터 경로 정찰 (읽기 전용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36", "Accept-Language": "ko-KR" };
const out = { pages: {}, js: {}, tries: {} };
for (const u of ["https://stocknow.ai/", "https://www.stocknow.ai/", "https://stocknow.ai/BreakingNews/98191", "https://stocknow.ai/BreakingNews"]) {
  try {
    const r = await fetch(u, { headers: UA, redirect: "follow" });
    const t = await r.text();
    out.pages[u] = { status: r.status, final: r.url, len: t.length, head: t.slice(0, 600), scripts: [...t.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((m) => m[1]).slice(0, 40), apis: [...new Set([...t.matchAll(/["'`](https?:\/\/[a-z0-9.-]*stocknow[a-z0-9.-]*\/[^"'`\s]{0,80}|\/api\/[^"'`\s]{0,80})["'`]/gi)].map((m) => m[1]))].slice(0, 60), ko: (t.match(/[가-힣][^<"]{10,80}/g) ?? []).slice(0, 15) };
    // 스크립트 안의 API 경로
    const base = new URL(r.url);
    for (const s of out.pages[u].scripts.slice(0, 25)) {
      const su = new URL(s, base).toString();
      if (out.js[su]) continue;
      try {
        const js = await fetch(su, { headers: UA }).then((x) => x.text());
        const hits = [...new Set([...js.matchAll(/["'`]((?:https?:\/\/[a-z0-9.-]+)?\/(?:api|v1|v2|v3)\/[A-Za-z0-9_/{}$.:-]{2,80})/g)].map((m) => m[1]))];
        const bn = [...new Set([...js.matchAll(/.{0,80}[Bb]reaking[_-]?[Nn]ews.{0,80}/g)].map((m) => m[0]))].slice(0, 12);
        out.js[su] = { len: js.length, hits: hits.slice(0, 80), bn };
      } catch (e) { out.js[su] = String(e); }
    }
  } catch (e) { out.pages[u] = String(e); }
}
for (const u of ["https://stocknow.ai/api/breaking-news?limit=3", "https://api.stocknow.ai/breaking-news?limit=3", "https://api.stocknow.ai/v1/breaking-news?limit=3", "https://stocknow.ai/api/BreakingNews?limit=3", "https://stocknow.ai/api/news/breaking?limit=3"]) {
  try { const r = await fetch(u, { headers: UA }); out.tries[u] = { s: r.status, ct: r.headers.get("content-type"), b: (await r.text()).slice(0, 400) }; } catch (e) { out.tries[u] = String(e); }
}
writeFileSync("audit-out/sn-web.json", JSON.stringify(out, null, 1));
