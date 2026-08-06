/**
 * 정찰: 기획재정부(moef) 구글뉴스 쿼리 대안 — site:moef.go.kr가 최근 항목 0건.
 */

const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };

const g = (q) =>
  "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=ko&gl=KR&ceid=KR:ko";

const LIST = [
  ["moef 기간 없이", g("site:moef.go.kr")],
  ["korea.kr 기재부", g("site:korea.kr 기획재정부 when:30d")],
  ["korea.kr 브리핑 전체", g("site:korea.kr when:7d")],
  ["뉴스검색 기재부 보도자료", g('"기획재정부" 보도자료 when:7d')],
];

for (const [name, url] of LIST) {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15_000) });
    const text = await res.text();
    const items = [...text.matchAll(/<item[\s>]/g)].length;
    console.log(`${name} | ${res.status} | items=${items}`);
    let shown = 0;
    for (const m of text.matchAll(/<item[\s>][\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/g)) {
      if (shown++ >= 3) break;
      console.log(`   ${m[1].slice(0, 80)} | ${m[2].slice(0, 26)}`);
    }
  } catch (e) {
    console.log(`${name} | ERROR ${e.message.slice(0, 60)}`);
  }
}
