/** 산업·테마 전체 목록(id·제목·토스 요약·종목 수) 덤프 → audit-out/tics.json (한 줄 설명 작성용) */
import { mkdirSync, writeFileSync } from "node:fs";
const H = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", accept: "application/json, text/plain, */*", referer: "https://tossinvest.com/", origin: "https://tossinvest.com" };
const r = await fetch("https://wts-info-api.tossinvest.com/api/v1/tics/all", { headers: H });
const j = await r.json();
const arr = j.result?.ticsItems ?? [];
const out = [];
const walk = (n, parent) => {
  if (!n || n.id == null) return;
  out.push({ id: String(n.id), title: n.title ?? n.name, depth: parent ? 1 : 0, parentId: parent ? String(parent.id) : null, parentTitle: parent?.title ?? null, summary: n.summary ?? n.description ?? null, count: n.companyCount ?? null });
  for (const c of n.subItems ?? n.children ?? []) walk(c, n);
};
for (const n of arr) walk(n, null);
mkdirSync("audit-out", { recursive: true });
writeFileSync("audit-out/tics.json", JSON.stringify(out, null, 1));
console.log("status", r.status, "nodes", out.length, "industries", out.filter((n) => n.depth === 0).length, "no-summary", out.filter((n) => !n.summary).length);
for (const n of out.filter((n) => n.depth === 0)) console.log(` ${n.id} ${n.title} (${n.count}) ${n.summary ? "✓" : "—"}`);
