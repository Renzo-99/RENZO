// 국내 정규장 종가(15:30) 얻는 법 정찰 (읽기 전용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const H = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "application/json", Origin: "https://www.tossinvest.com", Referer: "https://www.tossinvest.com/" };
const T = "https://wts-info-api.tossinvest.com";
async function j(url) { try { const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(15000) }); const t = await r.text(); try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, t: t.slice(0, 300) }; } } catch (e) { return { e: String(e) }; } }
const out = { at: new Date().toISOString() };
const brief = (x) => { const c = x.b?.result?.candles; return c ? { n: c.length, first: c[c.length - 1]?.dt, last: c[0]?.dt, sample: c.slice(0, 2), exch: x.b.result.exchange } : x; };
out.min300 = brief(await j(`${T}/api/v1/c-chart/kr-s/A005930/min:1?count=300`));
const m = await j(`${T}/api/v1/c-chart/kr-s/A005930/min:1?count=300`);
const cs = m.b?.result?.candles ?? [];
out.around1530 = cs.filter((c) => /T15:(1[5-9]|2\d|3\d|4[0-5])/.test(c.dt)).map((c) => [c.dt, c.close, c.volume]);
out.minKrx = brief(await j(`${T}/api/v1/c-chart/kr-s/A005930/min:1?count=3&exchange=KRX`));
out.minKrxLower = brief(await j(`${T}/api/v1/c-chart/kr-s/A005930/min:1?count=3&exchange=krx`));
out.day = brief(await j(`${T}/api/v1/c-chart/kr-s/A005930/day:1?count=2`));
out.dayKrx = brief(await j(`${T}/api/v1/c-chart/kr-s/A005930/day:1?count=2&exchange=KRX`));
out.priceKrx = await j(`${T}/api/v3/stock-prices?meta=true&productCodes=A005930&exchange=KRX`);
out.priceKrxLower = await j(`${T}/api/v3/stock-prices?meta=true&productCodes=A005930&exchange=krx`);
out.priceNxtOnly = await j(`${T}/api/v3/stock-prices?meta=true&productCodes=A005930&exchange=NXT`);
out.priceNonNxt = await j(`${T}/api/v3/stock-prices?meta=true&productCodes=A095570`); // NXT 비거래 종목 추정
writeFileSync("audit-out/kr-close-recon.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 5000));
