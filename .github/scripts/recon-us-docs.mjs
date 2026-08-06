/**
 * 정찰: 컨설팅·회계법인 12곳의 RSS 후보 + 구글뉴스 RSS(site: 검색) 가용성 확인.
 * 각 URL의 상태/타입/아이템 수/첫 아이템만 요약 출력해 로그를 짧게 유지한다.
 */

const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };

const gnews = (domain) =>
  `https://news.google.com/rss/search?q=site:${domain}&hl=en-US&gl=US&ceid=US:en`;

const CANDIDATES = [
  ["mckinsey official", "https://www.mckinsey.com/insights/rss"],
  ["mckinsey gnews", gnews("mckinsey.com")],
  ["bcg official", "https://www.bcg.com/rss"],
  ["bcg gnews", gnews("bcg.com")],
  ["bain insights feed", "https://www.bain.com/insights/feed/"],
  ["bain gnews", gnews("bain.com")],
  ["kearney gnews", gnews("kearney.com")],
  ["adlittle gnews", gnews("adlittle.com")],
  ["rolandberger gnews", gnews("rolandberger.com")],
  ["iqvia gnews", gnews("iqvia.com")],
  ["accenture newsroom rss", "https://newsroom.accenture.com/rss/news-releases.xml"],
  ["accenture gnews", gnews("accenture.com")],
  ["deloitte gnews", gnews("deloitte.com")],
  ["pwc gnews", gnews("pwc.com")],
  ["ey gnews", gnews("ey.com")],
  ["kpmg gnews", gnews("kpmg.com")],
];

for (const [name, url] of CANDIDATES) {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15_000), redirect: "follow" });
    const text = await res.text();
    const items = [...text.matchAll(/<item[\s>]/g)].length;
    const title = text.match(/<item[\s>][\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.slice(0, 90);
    const pub = text.match(/<item[\s>][\s\S]*?<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/)?.[1]?.slice(0, 40);
    const link = text.match(/<item[\s>][\s\S]*?<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/)?.[1]?.slice(0, 120);
    console.log(`${name} | ${res.status} | ${res.headers.get("content-type")?.slice(0, 30)} | items=${items}`);
    if (items > 0) console.log(`   1st: ${title} | ${pub}\n   link: ${link}`);
  } catch (e) {
    console.log(`${name} | ERROR ${e.message}`);
  }
}
