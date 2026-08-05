/**
 * 파서/분류 로직 단위 테스트 (외부 네트워크 불필요)
 * 실행: npx tsx scripts/test-publications.ts
 */
import {
  classifyTracks,
  extractFields,
  normalizeDate,
  parseAssemblyRows,
  parseXmlItems,
} from "../src/lib/publications";

let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`✅ ${name}`);
  } else {
    failed++;
    console.error(`❌ ${name}`, detail ?? "");
  }
}

// 1) 트랙 분류
check(
  "반도체 키워드 분류",
  JSON.stringify(classifyTracks("HBM 수출통제 현황과 과제")) ===
    JSON.stringify(["semiconductor"])
);
check(
  "복수 트랙 분류 (통상+안보)",
  classifyTracks("미국 관세 정책과 한미동맹").length === 2
);
check("무관 제목은 빈 배열", classifyTracks("농촌 고령화 대책").length === 0);
check(
  "금융 트랙 분류",
  classifyTracks("자본시장법 개정 논의").includes("finance")
);

// 2) 날짜 정규화
check("YYYY.MM.DD", normalizeDate("2026.8.5") === "2026-08-05");
check("YYYYMMDD", normalizeDate("20260805") === "2026-08-05");
check("YYYY-MM-DD 유지", normalizeDate("2026-08-05") === "2026-08-05");

// 3) 열린국회정보 응답 파싱
const assemblyOk = {
  someServiceCode: [
    { head: [{ list_total_count: 2 }, { RESULT: { CODE: "INFO-000" } }] },
    {
      row: [
        { RPT_TITLE: "반도체 공급망 재편", PUB_DT: "2026-08-01", LINK_URL: "https://nars.go.kr/1" },
        { RPT_TITLE: "원전 정책 방향", PUB_DT: "2026-07-30", LINK_URL: "https://nars.go.kr/2" },
      ],
    },
  ],
};
const rows = parseAssemblyRows(assemblyOk);
check("열린국회정보 row 추출", rows.length === 2, rows);

const assemblyErr = { RESULT: { CODE: "INFO-200", MESSAGE: "데이터 없음" } };
let threw = false;
try {
  parseAssemblyRows(assemblyErr);
} catch {
  threw = true;
}
check("열린국회정보 오류코드 감지", threw);

// 4) 필드 휴리스틱 추출
const f1 = extractFields(rows[0]);
check(
  "제목/날짜/링크 추출",
  f1?.title === "반도체 공급망 재편" &&
    f1?.date === "2026-08-01" &&
    f1?.link === "https://nars.go.kr/1",
  f1
);
const f2 = extractFields({ unknownField: "국회 입법 동향 보고", cnt: 3 });
check("필드명 불명일 때 최장 텍스트를 제목으로", f2?.title === "국회 입법 동향 보고", f2);

// 5) data.go.kr XML 파싱
const xml = `<?xml version="1.0"?><response><header><resultCode>00</resultCode></header>
<body><items>
<item><title>미 무역법 301조 동향</title><pubDate>2026.07.28</pubDate><url>https://nars.go.kr/x</url></item>
<item><title><![CDATA[핵심광물 확보 전략 &amp; 과제]]></title><pubDate>20260725</pubDate></item>
</items></body></response>`;
const xmlItems = parseXmlItems(xml);
check("XML item 2건 파싱", xmlItems.length === 2, xmlItems);
check("CDATA/엔티티 처리", xmlItems[1].title === "핵심광물 확보 전략 & 과제", xmlItems[1]);
const xf = extractFields(xmlItems[0]);
check(
  "XML→필드 추출 + 트랙 분류",
  xf?.title === "미 무역법 301조 동향" &&
    xf?.date === "2026-07-28" &&
    classifyTracks(xf.title).includes("trade"),
  xf
);

console.log(failed === 0 ? "\n전체 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
