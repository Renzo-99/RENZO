/**
 * 정찰: 미국 문서 소스 응답 형태 확인 (연준 RSS + Federal Register API).
 * GitHub Actions 러너에서만 실행 — 개발 컨테이너는 해당 도메인 접근 불가.
 */

const UA = { "user-agent": "Mozilla/5.0 (compatible; stock-dashboard-recon)" };

async function show(name, url, opts = {}) {
  console.log(`\n===== ${name} =====\n${url}`);
  try {
    const res = await fetch(url, { headers: { ...UA, ...(opts.headers ?? {}) } });
    console.log("status:", res.status, "| content-type:", res.headers.get("content-type"));
    const text = await res.text();
    console.log("length:", text.length);
    console.log(text.slice(0, opts.len ?? 3500));
  } catch (e) {
    console.log("FETCH ERROR:", e.message);
  }
}

// 1) 연준 통화정책 보도자료 RSS (FOMC 성명·의사록)
await show("Fed press: monetary policy RSS", "https://www.federalreserve.gov/feeds/press_monetary.xml");

// 2) 연준 전체 보도자료 RSS
await show("Fed press: all RSS", "https://www.federalreserve.gov/feeds/press_all.xml", { len: 1500 });

// 3) Federal Register API — 최신 문서 (요약 포함)
const frFields = ["title", "abstract", "publication_date", "html_url", "document_number", "type", "agencies"]
  .map((f) => `fields[]=${f}`)
  .join("&");
await show(
  "Federal Register: newest (BIS 산업안보국)",
  `https://www.federalregister.gov/api/v1/documents.json?per_page=3&order=newest&${frFields}&conditions[agencies][]=industry-and-security-bureau`
);
await show(
  "Federal Register: term=semiconductor",
  `https://www.federalregister.gov/api/v1/documents.json?per_page=3&order=newest&${frFields}&conditions[term]=semiconductor`
);

// 4) 연준 RSS가 막혔을 때의 대안 후보 — FOMC 캘린더/최근 자료 JSON 존재 여부
await show("Fed ne-press JSON(있으면 사용)", "https://www.federalreserve.gov/json/ne-press.json", { len: 1500 });
