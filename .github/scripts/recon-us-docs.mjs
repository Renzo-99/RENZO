// 스톡나우 웹 속보 API 형태 정찰 (읽기 전용, MCP 한도 무관)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36", Accept: "application/json", "Accept-Language": "ko-KR" };
const out = {};
const J = async (u) => { try { const r = await fetch(u, { headers: UA }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { s: r.status, j, t: j ? undefined : t.slice(0, 300), h: Object.fromEntries([...r.headers].filter(([k]) => /cache|rate|limit|age/i.test(k))) }; } catch (e) { return { err: String(e) }; } };
const a = await J("https://stocknow.ai/api/breaking-news?limit=2");
out.base = { s: a.s, h: a.h, topKeys: a.j && Object.keys(a.j), itemKeys: a.j?.items?.[0] && Object.keys(a.j.items[0]), item0: a.j?.items?.[0] && Object.fromEntries(Object.entries(a.j.items[0]).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 160) : v])), rest: a.j && Object.fromEntries(Object.entries(a.j).filter(([k]) => k !== "items")) };
for (const q of ["limit=200", "limit=50&page=2", "limit=5&offset=5", "limit=5&cursor=98150", "limit=5&lang=ko", "limit=5&lang=en", "limit=5&category=us_equities", "limit=5&minImpactScore=15", "size=5"]) {
  const r = await J(`https://stocknow.ai/api/breaking-news?${q}`);
  out[q] = { s: r.s, n: r.j?.items?.length, ids: r.j?.items?.slice(0, 5).map((x) => x.id), t0: r.j?.items?.[0]?.title?.slice(0, 60), rest: r.j && Object.fromEntries(Object.entries(r.j).filter(([k]) => k !== "items")), t: r.t };
}
for (const u of ["https://stocknow.ai/api/breaking-news/98191", "https://stocknow.ai/api/breaking-news/categories", "https://stocknow.ai/api/news?limit=2", "https://stocknow.ai/api/filings?limit=2"]) {
  const r = await J(u);
  out[u] = { s: r.s, keys: r.j && Object.keys(r.j), sample: r.j && JSON.stringify(r.j).slice(0, 700), t: r.t };
}
writeFileSync("audit-out/sn-web2.json", JSON.stringify(out, null, 1));
