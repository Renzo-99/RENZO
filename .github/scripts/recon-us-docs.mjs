// 스톡나우 뉴스 틱 진단
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const base = "https://stock-dashboard-jaeyeon.vercel.app";
const st = () => fetch(`${base}/api/stocknow/status`).then((r) => r.json()).then((s) => s.byFeed);
const out = { before: await st() };
const t0 = Date.now();
const n = await fetch(`${base}/api/stocknow/feed?kind=news`).then((r) => r.json());
out.news = { ms: Date.now() - t0, meta: n.meta, n: n.items?.length };
out.mid = await st();
const t = await fetch(`${base}/api/stocknow/tick`).then((r) => r.json());
out.tick = t;
out.after = await st();
writeFileSync("audit-out/sn-diag.json", JSON.stringify(out, null, 1));
