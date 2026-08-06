/**
 * 정찰: 연준 보도자료 상세 페이지의 본문 마크업 구조 확인.
 * RSS description이 제목과 동일해서 본문을 페이지에서 직접 추출해야 한다.
 */

const UA = { "user-agent": "Mozilla/5.0 (compatible; stock-dashboard/1.0)" };

async function inspect(name, url) {
  console.log(`\n===== ${name} =====\n${url}`);
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
    console.log("status:", res.status);
    const html = await res.text();
    console.log("html length:", html.length);
    // 본문 후보 컨테이너들을 찾아 앞부분을 보여준다
    for (const marker of ['id="article"', 'class="col-xs-12 col-sm-8 col-md-8"', "For release at", "<p>"]) {
      const i = html.indexOf(marker);
      console.log(`\n--- marker ${JSON.stringify(marker)} @ ${i} ---`);
      if (i >= 0) console.log(html.slice(i, i + 2500).replace(/\s+/g, " "));
    }
  } catch (e) {
    console.log("FETCH ERROR:", e.message);
  }
}

await inspect("FOMC 성명 페이지", "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260729a.htm");
await inspect("FOMC 의사록 보도자료 페이지", "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260708a.htm");
