// 대시보드 잠금 확인 — 응답 코드만 기록(개인 데이터 없음)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const base = "https://stock-dashboard-jaeyeon.vercel.app";
const code = async (p) => { const r = await fetch(base + p, { redirect: "manual" }); return `${r.status} ${r.headers.get("location") ?? ""}`.trim(); };
let out = {};
for (let i = 0; i < 45; i++) {
  out = { home: await code("/"), board: await code("/api/watchlist/board"), themes: await code("/api/themes/custom"), status: await code("/api/stocknow/status"), tick: await code("/api/stocknow/tick"), login: await code("/login") };
  if (out.home.startsWith("307")) break;
  await new Promise((r) => setTimeout(r, 20000));
}
writeFileSync("audit-out/lock-check.json", JSON.stringify(out, null, 1));
