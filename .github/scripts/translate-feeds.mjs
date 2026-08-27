/**
 * 피드 번역 워커 — 사이트의 미번역 항목을 Actions 러너에서 구글 번역해
 * 번들 브랜치에 translations-*.json으로 커밋한다.
 *
 * 배경: 구글 무료 번역(gtx)이 Vercel 서버 IP를 차단해(2026-08-27 진단)
 * 사이트 자체 번역이 전멸 — 러너 IP(Azure, 매 실행 교체)에서는 정상 동작한다.
 * 사이트 크론이 이 결과 파일을 읽어 피드에 병합한다.
 *
 * 사용: node translate-feeds.mjs <출력 디렉터리(번들 public)>
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://stock-dashboard-jaeyeon.vercel.app";
const OUT_DIR = process.argv[2];
if (!OUT_DIR) {
  console.error("사용법: node translate-feeds.mjs <출력 디렉터리>");
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translate(text, target = "ko") {
  const q = String(text).slice(0, 4500);
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en" +
    `&tl=${target}&dt=t&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const segs = data?.[0];
  if (!Array.isArray(segs)) throw new Error("응답 형식 오류");
  return segs.map((s) => (Array.isArray(s) ? String(s[0] ?? "") : "")).join("").trim();
}

const FEEDS = [
  { api: `${BASE}/api/us-docs`, file: "translations-us.json", isEn: () => true },
  { api: `${BASE}/api/firm-insights`, file: "translations-hub.json", isEn: (i) => i.lang === "en" },
];

const MAX_PER_FEED = 200; // 러너 실행 시간 상한 (200×2콜×~0.5초 ≈ 3~4분)

for (const feed of FEEDS) {
  console.log(`\n===== ${feed.file} =====`);
  // CDN 캐시(s-maxage) 우회 — 방금 크론이 갱신한 최신 피드를 읽어야 누락 없이 번역된다
  const res = await fetch(`${feed.api}?nocache=${Date.now()}`, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    console.log(`피드 조회 실패 HTTP ${res.status} — 건너뜀`);
    continue;
  }
  const { items = [] } = await res.json();

  const path = join(OUT_DIR, feed.file);
  let existing = {};
  try {
    existing = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    /* 첫 실행 — 빈 사전에서 시작 */
  }
  // 피드에서 사라진 항목은 정리해 파일이 무한히 크지 않게 유지
  const validIds = new Set(items.map((i) => i.id));
  const out = Object.fromEntries(Object.entries(existing).filter(([k]) => validIds.has(k)));

  const pending = items
    .filter((i) => feed.isEn(i) && (!i.title_ko || (i.abstract && !i.abstract_ko)))
    .slice(0, MAX_PER_FEED);
  console.log(`항목 ${items.length} · 번역 대상 ${pending.length} · 기존 보유 ${Object.keys(out).length}`);

  let ok = 0;
  let fail = 0;
  for (const item of pending) {
    const entry = out[item.id] ?? {};
    try {
      if (!item.title_ko && !entry.title_ko) entry.title_ko = await translate(item.title_en);
      if (item.abstract && !item.abstract_ko && !entry.abstract_ko) entry.abstract_ko = await translate(item.abstract);
      out[item.id] = entry;
      ok++;
    } catch (e) {
      fail++;
      console.log(`  실패 ${item.id}: ${e.message}`);
    }
    await sleep(150);
  }
  writeFileSync(path, JSON.stringify(out));
  console.log(`번역 완료 ${ok} · 실패 ${fail} · 파일 항목 ${Object.keys(out).length}`);
}
