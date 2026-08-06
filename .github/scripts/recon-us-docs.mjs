/**
 * 정찰 2차: 한국 기관 피드 가용성 — korea.kr 부처별 보도자료 RSS +
 * 구글뉴스 한국판 site: 검색 + Big4 코리아 경로 검색.
 */

const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };

const gko = (d) =>
  "https://news.google.com/rss/search?q=" + encodeURIComponent(`site:${d} when:30d`) + "&hl=ko&gl=KR&ceid=KR:ko";

const LIST = [
  // 정책브리핑 부처별 보도자료 RSS
  ["korea.kr 기재부", "https://www.korea.kr/rss/dept_moef.xml"],
  ["korea.kr 산업부", "https://www.korea.kr/rss/dept_motie.xml"],
  ["korea.kr 외교부", "https://www.korea.kr/rss/dept_mofa.xml"],
  ["korea.kr 국토부", "https://www.korea.kr/rss/dept_molit.xml"],
  ["korea.kr 환경부", "https://www.korea.kr/rss/dept_me.xml"],
  // 한국은행 공식 RSS 후보
  ["BOK 보도자료 RSS", "https://www.bok.or.kr/portal/bbs/B0000338/news.rss?menuNo=200761"],
  // 금융·연구기관 — 구글뉴스 한국판
  ["gko bok.or.kr", gko("bok.or.kr")],
  ["gko fsc.go.kr", gko("fsc.go.kr")],
  ["gko fss.or.kr", gko("fss.or.kr")],
  ["gko ftc.go.kr", gko("ftc.go.kr")],
  ["gko kcif.or.kr", gko("kcif.or.kr")],
  ["gko kdi.re.kr", gko("kdi.re.kr")],
  ["gko kiep.go.kr", gko("kiep.go.kr")],
  ["gko asaninst.org", gko("asaninst.org")],
  ["gko kotra.or.kr", gko("kotra.or.kr")],
  ["gko kita.net", gko("kita.net")],
  ["gko inss.re.kr", gko("inss.re.kr")],
  ["gko nabo.go.kr", gko("nabo.go.kr")],
  // Big4 코리아 (경로 포함 site: 검색)
  ["gko deloitte.com/kr", gko("deloitte.com/kr")],
  ["gko ey.com/ko_kr", gko("ey.com/ko_kr")],
  ["gko kpmg.com/kr", gko("kpmg.com/kr")],
  ["gko pwc.com/kr", gko("pwc.com/kr")],
];

for (const [name, url] of LIST) {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15_000), redirect: "follow" });
    const text = await res.text();
    const items = [...text.matchAll(/<item[\s>]/g)].length;
    const t = text.match(/<item[\s>][\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.slice(0, 70);
    const p = text.match(/<item[\s>][\s\S]*?<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/)?.[1]?.slice(0, 32);
    console.log(`${name} | ${res.status} | items=${items}${items ? ` | ${t} | ${p}` : ""}`);
  } catch (e) {
    console.log(`${name} | ERROR ${e.message.slice(0, 60)}`);
  }
}
