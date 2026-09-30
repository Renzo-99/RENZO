// 와치리스트 현재 저장 상태 읽기 (읽기 전용 GET)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const r = await fetch("https://stock-dashboard-jaeyeon.vercel.app/api/watchlist/board", { signal: AbortSignal.timeout(20000) });
const body = await r.json();
const b = body.board;
const summary = (b?.groups ?? []).map((g) => ({ id: g.id, name: g.name, parent: g.parentId ?? null, color: g.color ?? null, n: g.items.length, kr: g.items.filter((i) => /^\d[0-9A-Z]{5}$/.test(i.symbol)).length, items: g.items.map((i) => i.symbol).join(",") }));
writeFileSync("audit-out/board-now.json", JSON.stringify({ at: new Date().toISOString(), status: r.status, summary }, null, 1));
console.log(JSON.stringify(summary, null, 1));
