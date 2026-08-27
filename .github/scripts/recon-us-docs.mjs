/**
 * 정찰: 트렌드 데이터 소스 후보들의 접근성·응답 형식 확인.
 * (트렌드 레이더 기능 설계용 — 2026-08-27)
 */

const UA = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
};

async function probe(label, url, headers = {}) {
  try {
    const res = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(15_000), redirect: "follow" });
    const text = await res.text();
    console.log(`\n===== ${label} =====`);
    console.log(`HTTP ${res.status} · ${text.length}B · content-type=${res.headers.get("content-type")}`);
    console.log(text.slice(0, 700).replace(/\n{2,}/g, "\n"));
  } catch (e) {
    console.log(`\n===== ${label} =====`);
    console.log(`오류: ${e.message}`);
  }
}

const yesterday = new Date(Date.now() - 86_400_000 * 2);
const y = yesterday.getUTCFullYear();
const m = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
const d = String(yesterday.getUTCDate()).padStart(2, "0");

await probe("1) 구글트렌드 일일 RSS (신) KR", "https://trends.google.com/trending/rss?geo=KR");
await probe("2) 구글트렌드 일일 RSS (구) KR", "https://trends.google.co.kr/trends/trendingsearches/daily/rss?geo=KR");
await probe("3) 구글트렌드 일일 RSS US", "https://trends.google.com/trending/rss?geo=US");
await probe("4) 구글트렌드 dailytrends JSON KR", "https://trends.google.com/trends/api/dailytrends?hl=ko&geo=KR&ns=15");
await probe("5) Stocktwits 트렌딩 심볼", "https://api.stocktwits.com/api/2/trending/symbols.json");
await probe("6) 위키피디아(한) 일일 조회수 톱", `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/ko.wikipedia/all-access/${y}/${m}/${d}`);
await probe("7) CoinGecko 트렌딩", "https://api.coingecko.com/api/v3/search/trending");
await probe("8) HN 프런트페이지", "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=10");
await probe("9) signal.bz 실시간 검색어", "https://api.signal.bz/news/realtime");
await probe("10) 레딧 wallstreetbets hot", "https://www.reddit.com/r/wallstreetbets/hot.json?limit=5");
await probe("11) 네이버 급상승(비공식 zum)", "https://news.zum.com/api/issue/keyword");
