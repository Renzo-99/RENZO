/**
 * 국회입법조사처(nars.go.kr) 발간물/연구보고서 일일 수집기
 *
 * 사용법:
 *   node collect-nars.mjs <출력경로.json>   # 수집 후 JSON 저장
 *   RECON=true node collect-nars.mjs        # 정찰 모드: 페이지 구조만 로그로 출력
 *
 * GitHub Actions에서 매일 1회 실행되어 publications.json을 갱신한다.
 * 공개 웹페이지 목록을 직접 수집하므로 API 인증키가 필요 없다.
 */

/** 투자 트랙 분류 키워드 */
const TRACKS = {
  semiconductor: { label: "반도체·공급망", keywords: ["반도체", "HBM", "공급망", "핵심광물", "수출통제", "팍스 실리카"] },
  trade: { label: "통상·무역", keywords: ["통상", "관세", "FTA", "대미투자", "무역법"] },
  security: { label: "안보·지정학", keywords: ["북한", "중국", "한미동맹", "방위산업", "안보"] },
  energy: { label: "에너지·원자재", keywords: ["전력", "원전", "재생에너지", "에너지", "원자재", "유류"] },
  finance: { label: "금융·지배구조", keywords: ["자본시장", "기업지배구조", "금융", "세제"] },
};

/**
 * 수집 대상 카테고리 (cmsCode는 정찰 모드로 실측 확정, 2026-08-05).
 * CM0043(분류전체)은 나머지 4종의 상위집합이므로 수집 시 중복을 제거해
 * '발간물'에는 4종 외 기타 자료만 남긴다.
 */
const CATEGORIES = [
  { sourceId: "nars-analysis", sourceName: "연구보고서(NARS 현안분석)", cmsCode: "CM0155" },
  { sourceId: "issue-point", sourceName: "연구보고서(이슈와 논점)", cmsCode: "CM0018" },
  { sourceId: "policy-report", sourceName: "연구보고서(입법·정책보고서)", cmsCode: "CM0156" },
  { sourceId: "impact-analysis", sourceName: "연구보고서(입법영향분석보고서)", cmsCode: "CM0152" },
  { sourceId: "publication", sourceName: "국회입법조사처_발간물", cmsCode: "CM0043" },
];

const BASE = "https://www.nars.go.kr";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function get(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko" },
    redirect: "follow",
  });
  const text = await res.text();
  return { status: res.status, type: res.headers.get("content-type"), text };
}

function classifyTracks(title) {
  return Object.entries(TRACKS)
    .filter(([, t]) => t.keywords.some((kw) => title.includes(kw)))
    .map(([id]) => id);
}

/* ---------------- 정찰 모드 ---------------- */

async function recon() {
  console.log("===== 정찰 모드 시작 =====");

  // 1) 메인 페이지에서 메뉴/링크 구조와 cmsCode 목록 파악
  const candidates = [
    `${BASE}/main.do`,
    `${BASE}/`,
    `${BASE}/report/list.do?cmsCode=CM0043`,
    `${BASE}/report/list.do?cmsCode=CM0010`,
  ];
  for (const url of candidates) {
    try {
      const { status, type, text } = await get(url);
      console.log(`\n----- ${url}`);
      console.log(`status=${status} type=${type} bytes=${text.length}`);
      const title = text.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
      console.log(`title=${title}`);

      // cmsCode → 주변 링크 텍스트 매핑 수집
      const codeMap = new Map();
      const linkRe = /<a[^>]+href="([^"]*cmsCode=(CM\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
      let m;
      while ((m = linkRe.exec(text)) !== null) {
        const label = m[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (label && !codeMap.has(m[2] + label)) codeMap.set(m[2] + label, `${m[2]} → ${label} (${m[1].slice(0, 80)})`);
      }
      console.log(`cmsCode 링크 ${codeMap.size}개:`);
      [...codeMap.values()].slice(0, 60).forEach((v) => console.log("  " + v));

      // 목록 아이템 후보 구조 샘플
      const rows = text.match(/<li[\s\S]{0,700}?<\/li>/g) ?? [];
      const withDate = rows.filter((r) => /\d{4}[.\-/]\s?\d{1,2}[.\-/]\s?\d{1,2}/.test(r));
      console.log(`<li> ${rows.length}개 중 날짜 포함 ${withDate.length}개`);
      withDate.slice(0, 3).forEach((r, i) =>
        console.log(`  [샘플${i}] ${r.replace(/\s+/g, " ").slice(0, 500)}`)
      );
      // 테이블 구조도 확인
      const trs = text.match(/<tr[\s\S]{0,700}?<\/tr>/g) ?? [];
      const trDate = trs.filter((r) => /\d{4}[.\-/]\s?\d{1,2}/.test(r));
      console.log(`<tr> ${trs.length}개 중 날짜 포함 ${trDate.length}개`);
      trDate.slice(0, 3).forEach((r, i) =>
        console.log(`  [tr샘플${i}] ${r.replace(/\s+/g, " ").slice(0, 500)}`)
      );
    } catch (e) {
      console.log(`${url} 실패: ${e.message}`);
    }
  }

  // 2) 목록 페이지 세부 구조: 카테고리/날짜/아이템 원문
  const detailTargets = [
    `${BASE}/report/list.do?cmsCode=CM0043`,
    `${BASE}/report/list.do?cmsCode=CM0018`,
    `${BASE}/report/list.do?cmsCode=CM0156`,
  ];
  for (const url of detailTargets) {
    try {
      const { text } = await get(url);
      console.log(`\n===== 세부 정찰: ${url}`);
      // 카테고리 선택지 (categoryId)
      const catLinks = [...text.matchAll(/href="([^"]*categoryId=([^"&]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)]
        .map((m) => `${m[2]} → ${m[3].replace(/<[^>]+>/g, "").trim()}`)
        .filter((v, i, a) => a.indexOf(v) === i);
      console.log(`categoryId 링크 ${catLinks.length}개:`);
      catLinks.slice(0, 30).forEach((v) => console.log("  " + v));
      const options = [...text.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/g)]
        .map((m) => `${m[1]} → ${m[2].trim()}`);
      console.log(`<option> ${options.length}개:`);
      options.slice(0, 30).forEach((v) => console.log("  " + v));
      // '현안' / '입법영향' 주변 문맥
      for (const kw of ["현안", "입법영향"]) {
        let idx = text.indexOf(kw);
        let n = 0;
        while (idx !== -1 && n < 3) {
          console.log(`[${kw} 문맥${n}] ` + text.slice(Math.max(0, idx - 250), idx + 120).replace(/\s+/g, " "));
          idx = text.indexOf(kw, idx + 1);
          n++;
        }
      }
      // 게시물 식별자/이동 함수 패턴 파악
      console.log(`view.do 등장: ${(text.match(/view\.do/g) ?? []).length}회, brdSeq 등장: ${(text.match(/brdSeq/g) ?? []).length}회`);
      const fnCalls = [...text.matchAll(/javascript:([A-Za-z_]\w*)\(([^)]*)\)/g)]
        .map((m) => `${m[1]}(${m[2]})`)
        .filter((v, i, a) => a.indexOf(v) === i);
      console.log(`js 함수 호출 ${fnCalls.length}종:`);
      fnCalls.slice(0, 20).forEach((v) => console.log("  " + v));
      // 게시물로 보이는 <li> 원문 (nav 제외: setCmsCode 미포함 + 텍스트 40자 이상)
      const lis = [...text.matchAll(/<li[\s\S]{0,1200}?<\/li>/g)]
        .map((m) => m[0])
        .filter((li) => !li.includes("setCmsCode") && li.replace(/<[^>]+>/g, "").trim().length > 40);
      console.log(`게시물 후보 <li> ${lis.length}개`);
      lis.slice(0, 4).forEach((li, i) =>
        console.log(`[li원문${i}] ` + li.replace(/\s+/g, " ").slice(0, 800))
      );
      // 인라인 스크립트 속 AJAX 엔드포인트 후보
      const ajax = [...text.matchAll(/["'](\/[\w/]*(?:list|List)\w*\.do[^"']*)["']/g)]
        .map((m) => m[1])
        .filter((v, i, a) => a.indexOf(v) === i);
      console.log(`AJAX/URL 후보: ${ajax.slice(0, 10).join(", ")}`);
    } catch (e) {
      console.log(`${url} 실패: ${e.message}`);
    }
  }
  console.log("\n===== 정찰 모드 끝 =====");
}

/* ---------------- 수집 모드 ---------------- */

/** HTML 엔티티 정리 */
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

/**
 * 목록 페이지 HTML에서 게시물 추출 (2026-08-05 실측 마크업 기준)
 * <div class="tt"><a href="javascript:view('49495');">제목</a></div>
 * <div class="zl"><span> 호수 </span>|<span>저자</span>|<span>2026.07.27</span>|<span>조회수</span></div>
 */
function parseList(html, cmsCode) {
  const items = [];
  const re =
    /javascript:view\('(\d+)'\);?"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div class="zl">([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const brdSeq = m[1];
    const title = decodeEntities(m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
    if (!title) continue;
    const spans = [...m[3].matchAll(/<span>([\s\S]*?)<\/span>/g)].map((s) =>
      decodeEntities(s[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    );
    const dateRaw = spans.find((s) => /^\d{4}\.\d{1,2}\.\d{1,2}$/.test(s)) ?? "";
    const dm = dateRaw.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    const date = dm ? `${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}` : "";
    const meta = spans.filter((s) => s && !/^\d{4}\./.test(s) && !s.startsWith("조회수")).join(" · ");
    items.push({
      brdSeq,
      title,
      date,
      meta,
      link: `${BASE}/report/view.do?cmsCode=${cmsCode}&brdSeq=${brdSeq}`,
    });
  }
  return items;
}

async function collect(outPath) {
  const { writeFile } = await import("node:fs/promises");
  const allItems = [];
  const statuses = [];
  const seenBrdSeq = new Set();
  const PAGES = 2; // 카테고리당 2페이지(약 20건)씩 수집

  for (const cat of CATEGORIES) {
    try {
      let parsed = [];
      for (let page = 1; page <= PAGES; page++) {
        const url = `${BASE}/report/list.do?page=${page}&cmsCode=${cat.cmsCode}`;
        const { status, text } = await get(url);
        if (status !== 200) throw new Error(`HTTP ${status}`);
        parsed.push(...parseList(text, cat.cmsCode));
      }
      // CM0043(전체)은 이미 수집된 세부 카테고리 항목을 제외해 '기타 발간물'만 남긴다
      parsed = parsed.filter((it) => !seenBrdSeq.has(it.brdSeq));
      parsed.forEach((it) => seenBrdSeq.add(it.brdSeq));

      parsed.forEach((it) =>
        allItems.push({
          id: `${cat.sourceId}-${it.brdSeq}`,
          sourceId: cat.sourceId,
          sourceName: cat.sourceName,
          title: it.title,
          date: it.date,
          meta: it.meta,
          link: it.link,
          tracks: classifyTracks(it.title),
        })
      );
      statuses.push({ id: cat.sourceId, name: cat.sourceName, ok: true, count: parsed.length });
      console.log(`✅ ${cat.sourceName}: ${parsed.length}건`);
    } catch (e) {
      statuses.push({ id: cat.sourceId, name: cat.sourceName, ok: false, count: 0, error: e.message });
      console.log(`❌ ${cat.sourceName}: ${e.message}`);
    }
  }

  allItems.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  const feed = { updatedAt: new Date().toISOString(), items: allItems, statuses };
  if (outPath) {
    await writeFile(outPath, JSON.stringify(feed, null, 1), "utf8");
    console.log(`\n${outPath} 저장 (${allItems.length}건)`);
  }
  const okCount = statuses.filter((s) => s.ok).length;
  console.log(`소스 ${okCount}/${statuses.length} 정상`);
  // 트랙 분류 통계
  const trackCount = {};
  allItems.forEach((it) => it.tracks.forEach((t) => (trackCount[t] = (trackCount[t] ?? 0) + 1)));
  console.log("트랙 분류:", JSON.stringify(trackCount));
  // 정상 소스가 하나도 없으면 실패로 처리해 빈 데이터 커밋을 막는다
  if (okCount === 0) process.exit(1);
}

const RECON = process.env.RECON === "true" || process.env.RECON === "1";
if (RECON) {
  await recon();
} else {
  await collect(process.argv[2]);
}
