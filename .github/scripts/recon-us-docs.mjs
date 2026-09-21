// tics/all 의 수익률이 국내만인지, 미국 포함인지 판정
import fs from "node:fs";
const H = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json", "content-type": "application/json",
  "accept-language": "ko-KR,ko;q=0.9", referer: "https://tossinvest.com/", origin: "https://tossinvest.com",
};
const OUT = []; const log = (...a) => { const s = a.join(" "); console.log(s); OUT.push(s); };
const INFO = "https://wts-info-api.tossinvest.com";

async function j(url, init) { const r = await fetch(url, { headers: H, ...init }); return r.ok ? r.json() : { __status: r.status }; }

// 1) tics/all — 태그 없이(현재 앱이 쓰는 방식)
const all = await j(`${INFO}/api/v1/tics/all`);
const items = all?.result?.ticsItems ?? [];
log(`### tics/all 기준시각 ${all?.result?.baseDateTime} · 산업 ${items.length}개`);
const pick = (id) => items.find((i) => String(i.id) === String(id));
for (const id of [169, 77, 111]) {
  const n = pick(id);
  if (n) log(`  ${n.id} ${n.title}: 1일 ${n.fluctuations?.oneDayRate} · 1개월 ${n.fluctuations?.oneMonthRate} · 3개월 ${n.fluctuations?.threeMonthsRate} (기준 ${n.fluctuations?.baseDateTime})`);
}

// 2) tics/all 에 tag를 붙이면 값이 달라지나
for (const tag of ["kr_normal", "us_normal", "kr", "us"]) {
  const t = await j(`${INFO}/api/v1/tics/all?tag=${tag}`);
  const n = (t?.result?.ticsItems ?? []).find((i) => String(i.id) === "169");
  log(`### tics/all?tag=${tag} → ${t.__status ? `HTTP ${t.__status}` : `반도체 1일 ${n?.fluctuations?.oneDayRate} · 3개월 ${n?.fluctuations?.threeMonthsRate}`}`);
}

// 3) 랭킹 API의 kr_normal / us_normal / 태그없음 과 비교
for (const q of ["tag=kr_normal&depths=0&depths=1", "tag=us_normal&depths=0&depths=1", "depths=0&depths=1"]) {
  const r = await j(`${INFO}/api/v2/dashboard/wts/overview/tics/ranking?${q}`);
  const rows = r?.result?.data ?? [];
  const n = rows.find((x) => String(x.ticsId) === "169");
  log(`### ranking ${q} → ${r.__status ? `HTTP ${r.__status}` : `반도체 ${n?.preciseValue ?? n?.value} (총 ${rows.length}행, 기준 ${r?.result?.dateTime})`}`);
}

// 4) 구성 종목 국적 분포 — 반도체(169)
const s = await j(`${INFO}/api/v2/tics/169/stocks`, { method: "POST", body: JSON.stringify({ ticsId: 169, page: 1 }) });
const rows = s?.result?.stocks ?? [];
log(`### 반도체 구성 종목 총 ${s?.result?.totalCount}개, 1페이지 국적: ${rows.map((x) => `${x.name}(${String(x.code).startsWith("A") ? "KR" : "해외"})`).join(", ")}`);

fs.mkdirSync("audit-out", { recursive: true });
fs.writeFileSync("audit-out/toss-company-recon.txt", OUT.join("\n"));
