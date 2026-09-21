// 토스 companies API — 기업 한 줄 설명(description) 커버리지 확인
import fs from "node:fs";
const H = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json", "content-type": "application/json",
  "accept-language": "ko-KR,ko;q=0.9", referer: "https://tossinvest.com/", origin: "https://tossinvest.com",
};
const OUT = [];
const log = (...a) => { const s = a.join(" "); console.log(s); OUT.push(s); };
const URL_ = "https://wts-info-api.tossinvest.com/api/v1/companies";

async function batch(codes) {
  const r = await fetch(URL_, { method: "POST", headers: H, body: JSON.stringify({ codes }) });
  if (!r.ok) { log(`[${r.status}] ${codes.length}개 실패`); return []; }
  const j = await r.json();
  return j.result ?? [];
}

// 1) 한국 대표 종목 + 중소형 + 해외
const KR = ["005930","000660","042700","357780","058470","000990","036930","095340","240810","032500",
  "005380","051910","068270","207940","035420","035720","105560","055550","000270","012450",
  "196170","145020","278280","950140","900140","007700","014990","064350","011200","003230"];
const FG = ["NAS00208X-E0"];

const rows = [...(await batch(KR)), ...(await batch(FG))];
log(`### 받은 회사 ${rows.length}개 / 요청 ${KR.length + FG.length}개`);
let have = 0;
for (const c of rows) {
  const d = c.description;
  if (d) have++;
  log(`- ${c.code} ${c.name} | 산업:${c.industry?.displayName ?? c.wics?.displayName ?? "-"} | 설립:${c.establishYear ?? "-"} | 설명:${d ? `"${d}"` : "(없음)"}`);
}
log(`### description 있는 비율 ${have}/${rows.length}`);
log(`### 첫 레코드 키: ${rows[0] ? Object.keys(rows[0]).join(",") : "-"}`);

// 2) 배치 상한 — 200개 요청
const BIG = Array.from({ length: 200 }, (_, i) => String(1 + i * 10).padStart(6, "0"));
const big = await batch(BIG);
log(`### 200개 배치 → ${big.length}개 반환`);

// 3) tics(테마) 붙어오는지 — 종목이 속한 테마 id 목록
const one = rows.find((c) => c.code === "005930");
log(`### 005930 tics ids: ${(one?.tics ?? []).map((t) => `${t.id}:${t.title}`).slice(0, 12).join(", ")}`);

fs.mkdirSync("audit-out", { recursive: true });
fs.writeFileSync("audit-out/toss-company-recon.txt", OUT.join("\n"));
