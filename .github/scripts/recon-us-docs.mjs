/**
 * 진단: 라이브 피드의 번역 누락 실태 + 크론 실행의 번역 동작 관찰.
 */

const BASE = "https://stock-dashboard-jaeyeon.vercel.app";

async function getJson(url, timeoutMs = 120_000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text.slice(0, 500) };
  }
}

function summarizeUsDocs(feed, label) {
  const items = feed.items ?? [];
  const missing = items.filter((i) => !i.title_ko);
  const fedMissingBody = items.filter((i) => i.source === "federal-reserve" && !i.abstract_ko);
  console.log(`\n[${label}] updatedAt=${feed.updatedAt} items=${items.length} 번역누락=${missing.length} 연준본문누락=${fedMissingBody.length}`);
  for (const i of missing.slice(0, 8)) console.log(`  누락: ${i.id} ${i.date} ${i.title_en?.slice(0, 60)}`);
}

console.log("===== 1) 현재 us-docs 피드 =====");
const before = await getJson(`${BASE}/api/us-docs`, 30_000);
if (before.body.items) summarizeUsDocs(before.body, "before");
else console.log(before.status, before.body);

console.log("\n===== 2) us-docs 크론 실행 =====");
const cron = await getJson(`${BASE}/api/cron/us-docs`);
console.log(JSON.stringify(cron.body).slice(0, 600));

console.log("\n===== 3) 실행 후 피드 =====");
const after = await getJson(`${BASE}/api/us-docs`, 30_000);
if (after.body.items) summarizeUsDocs(after.body, "after");

console.log("\n===== 4) 인사이트 허브 피드 =====");
const hub = await getJson(`${BASE}/api/firm-insights`, 30_000);
if (hub.body.items) {
  const items = hub.body.items;
  const missing = items.filter((i) => i.lang === "en" && !i.title_ko);
  console.log(`updatedAt=${hub.body.updatedAt} items=${items.length} 영문번역누락=${missing.length}`);
  for (const i of missing.slice(0, 6)) console.log(`  누락: ${i.firmId} ${i.date} ${i.title_en?.slice(0, 60)}`);
}

console.log("\n===== 5) 허브 크론 실행 =====");
const hubCron = await getJson(`${BASE}/api/cron/firm-insights`);
const hb = hubCron.body;
console.log(JSON.stringify({ ok: hb.ok, collected: hb.collected, added: hb.added, translated: hb.translated, translateFailed: hb.translateFailed, items: hb.items }).slice(0, 400));
