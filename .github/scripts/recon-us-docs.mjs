// 토스 거래소 코드 + 내 종목 수 (읽기 전용, 스톡나우 한도 안 씀)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const H = { "User-Agent": "Mozilla/5.0", Accept: "application/json", Origin: "https://www.tossinvest.com", Referer: "https://www.tossinvest.com/" };
const out = { markets: {} };
for (const s of ["NVDA", "IBM", "JPM", "SPY", "QQQ", "BRK.B", "TSM", "SPCX", "HONA", "BRKA.VI", "A005930", "A247540", "A277810", "SOXL", "GLD"]) {
  const r = await fetch(`https://wts-info-api.tossinvest.com/api/v2/stock-infos/code-or-symbol/${encodeURIComponent(s)}`, { headers: H }).then((x) => x.json()).catch(() => null);
  const x = r?.result;
  out.markets[s] = x ? { code: x.code, symbol: x.symbol, market: x.market, group: x.group?.code } : null;
}
const base = "https://stock-dashboard-jaeyeon.vercel.app";
const board = await fetch(`${base}/api/watchlist/board`).then((r) => r.json()).catch(() => null);
const themes = await fetch(`${base}/api/themes/custom`).then((r) => r.json()).catch(() => null);
const w = new Set((board?.board?.groups ?? []).flatMap((g) => g.items.map((i) => i.symbol)));
const t = new Set((themes?.themes ?? []).flatMap((th) => th.stocks.map((s) => s.symbol)).filter((s) => !s.startsWith("#")));
const all = new Set([...w, ...t]);
out.counts = { watch: w.size, theme: t.size, themesN: themes?.themes?.length, union: all.size, kr: [...all].filter((s) => /^\d/.test(s)).length };
out.themeSample = [...t].slice(0, 30);
writeFileSync("audit-out/sn-prep.json", JSON.stringify(out, null, 1));
