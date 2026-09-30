// 스톡나우 실데이터 확인 — 대시보드가 평소 하는 요청과 같음(한도 몇 회 사용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const base = "https://stock-dashboard-jaeyeon.vercel.app";
const get = (k) => fetch(`${base}/api/stocknow/feed?kind=${k}`).then((r) => r.json()).catch((e) => ({ err: String(e) }));
const b = await get("breaking");
const n = await get("news");
const f = await get("filings");
const st = await fetch(`${base}/api/stocknow/stock/NVDA`).then((r) => r.json()).catch((e) => ({ err: String(e) }));
const status = await fetch(`${base}/api/stocknow/status`).then((r) => r.json());
writeFileSync("audit-out/sn-data.json", JSON.stringify({
  breaking: { meta: b.meta, n: b.items?.length, mine: b.items?.filter((x) => x.mine.length).length, sample: b.items?.slice(0, 2).map((x) => [x.at, x.title, x.mine]) },
  news: { meta: n.meta, n: n.items?.length, us: n.items?.filter((x) => x.symbols.some((s) => !/^\d/.test(s))).length, sample: n.items?.slice(0, 3).map((x) => [x.local, x.title, x.symbols]) },
  filings: { meta: f.meta, n: f.items?.length, coverage: f.coverage, sample: f.items?.slice(0, 3).map((x) => [x.date, x.symbol, x.docType, x.title, x.url]) },
  nvda: { meta: st.meta, canonical: st.canonical, news: st.news?.length, filings: st.filings?.length, f0: st.filings?.[0] },
  status,
}, null, 1));
