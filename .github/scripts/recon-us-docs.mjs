/** 전수 감사 1단계: 한국 상장주식수·시가총액 권위 소스 탐색 + 시드 대조 */

const SEED = [
  { code: "005930", name: "삼성전자", shares: 5969782550 },
  { code: "000660", name: "SK하이닉스", shares: 728002365 },
  { code: "277810", name: "레인보우로보틱스", shares: 19388433 },
  { code: "454910", name: "두산로보틱스", shares: 64819980 },
  { code: "012450", name: "한화에어로스페이스", shares: 50630000 },
  { code: "047810", name: "한국항공우주", shares: 97480817 },
  { code: "086520", name: "에코프로", shares: 133129150 },
  { code: "373220", name: "LG에너지솔루션", shares: 234000000 },
  { code: "267260", name: "HD현대일렉트릭", shares: 36042805 },
  { code: "034020", name: "두산에너빌리티", shares: 640561146 },
  { code: "010140", name: "삼성중공업", shares: 882885800 },
  { code: "042660", name: "한화오션", shares: 306980829 },
];

const UA = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
};

async function tryFetch(label, url, headers = UA) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
    const text = await res.text();
    return { label, ok: res.ok, status: res.status, len: text.length, text };
  } catch (e) {
    return { label, ok: false, status: 0, len: 0, text: "", err: String(e).slice(0, 120) };
  }
}

console.log("=== 후보 소스 탐색 (삼성전자 005930) ===");
const candidates = [
  ["네이버 integration", "https://m.stock.naver.com/api/stock/005930/integration"],
  ["네이버 basic", "https://m.stock.naver.com/api/stock/005930/basic"],
  ["토스 web v3 종목", "https://wts-info-api.tossinvest.com/api/v3/stock-infos/A005930"],
  ["토스 web v2 종목", "https://wts-info-api.tossinvest.com/api/v2/stock-infos?codes=A005930"],
  ["토스 web 요약", "https://wts-info-api.tossinvest.com/api/v2/stock-infos/A005930/summary"],
  ["KRX 개별시세", "http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd"],
];
for (const [label, url] of candidates) {
  const r = await tryFetch(label, url);
  console.log(`${r.ok ? "OK  " : "FAIL"} ${label.padEnd(18)} HTTP ${r.status} ${r.len}B ${r.err ?? ""}`);
  if (r.ok && r.len > 0) console.log(`     ${r.text.slice(0, 300).replace(/\s+/g, " ")}`);
}
