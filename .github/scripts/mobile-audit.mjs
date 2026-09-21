/** 정찰 32: 해외 종목의 티커 — stock-infos / stock-prices 응답에서 symbol 필드 확인 (US·NAS·AMX 코드) */
const H = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", accept: "application/json, text/plain, */*", referer: "https://tossinvest.com/", origin: "https://tossinvest.com" };
const I = "https://wts-info-api.tossinvest.com";
const short = (t, n = 900) => String(t).replace(/\s+/g, " ").slice(0, n);
const codes = "US19990122001,US19971008002,US20090806002,NAS2607010002,AMX0240604001,NAS0250224006";
for (const u of [`${I}/api/v2/stock-infos?codes=${codes}`, `${I}/api/v3/stock-prices?meta=true&productCodes=${codes}`, `${I}/api/v1/stock-infos/US19990122001`, `${I}/api/v2/stock-infos/US19990122001`]) {
  const r = await fetch(u, { headers: H }).catch(() => null);
  const t = await r?.text().catch(() => "") ?? "";
  console.log(u.replace(I, ""), "→", r?.status);
  try { const j = JSON.parse(t); const arr = Array.isArray(j.result) ? j.result : [j.result]; for (const e of arr.slice(0, 6)) console.log("   ", short(JSON.stringify(e), 420)); } catch { console.log("   ", short(t, 300)); }
}
