/**
 * 정찰: 산업통상자원부·환경부 구글뉴스 제목 형태 — v2 필터가 전부 걸러낸 원인 파악.
 */

const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };

const g = (q) =>
  "https://news.google.com/rss/search?q=" + encodeURIComponent(`${q} when:30d`) + "&hl=ko&gl=KR&ceid=KR:ko";

for (const [name, url] of [
  ["motie", g("site:motie.go.kr")],
  ["me", g("site:me.go.kr")],
]) {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15_000) });
    const text = await res.text();
    console.log(`\n===== ${name} | ${res.status} =====`);
    let n = 0;
    for (const m of text.matchAll(/<item[\s>][\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/g)) {
      if (n++ >= 15) break;
      console.log(`${m[2].slice(5, 22)} | ${m[1].slice(0, 90)}`);
    }
    if (n === 0) console.log("(items 없음)");
  } catch (e) {
    console.log(`${name} | ERROR ${e.message.slice(0, 60)}`);
  }
}
