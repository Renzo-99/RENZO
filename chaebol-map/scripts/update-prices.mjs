#!/usr/bin/env node
/**
 * 주가 업데이트 스크립트
 * 2026-02-27 기준 WebSearch 수집 데이터 반영
 *
 * 사용법:
 *   node scripts/update-prices.mjs
 *
 * 향후 API 연동 시:
 *   STOCK_API_KEY=xxx node scripts/update-prices.mjs --live
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dirname, "../src/data");

// 2026-02-27 기준 수집 주가 데이터 (stockCode → { price, change, changePct, marketCap })
// marketCap 단위: 억원
const PRICE_DATA = {
  // ── 삼성 ──
  "005930": { price: 194500, change: 3500, changePct: 1.83, marketCap: 11614000 },   // 삼성전자
  "028260": { price: 128500, change: 1500, changePct: 1.18, marketCap: 242000 },      // 삼성물산
  "032830": { price: 105000, change: 2000, changePct: 1.94, marketCap: 210000 },      // 삼성생명
  "000810": { price: 385000, change: 5000, changePct: 1.32, marketCap: 182000 },      // 삼성화재
  "006400": { price: 380000, change: -5500, changePct: -1.43, marketCap: 261400 },    // 삼성SDI
  "009150": { price: 421500, change: 44500, changePct: 11.80, marketCap: 314000 },    // 삼성전기
  "207940": { price: 1715000, change: -35000, changePct: -2.0, marketCap: 1133900 },  // 삼성바이오로직스
  "016360": { price: 62000, change: 800, changePct: 1.31, marketCap: 47800 },         // 삼성증권
  "010140": { price: 62300, change: 300, changePct: 0.48, marketCap: 37200 },         // 삼성중공업
  "000830": { price: 285000, change: -3000, changePct: -1.04, marketCap: 28500 },     // 삼성물산(건설)
  "029780": { price: 40800, change: 350, changePct: 0.87, marketCap: 24500 },         // 삼성카드
  "018260": { price: 168000, change: 2000, changePct: 1.20, marketCap: 130000 },     // 삼성에스디에스
  "008770": { price: 78000, change: 500, changePct: 0.65, marketCap: 30600 },        // 호텔신라
  "030000": { price: 23000, change: 200, changePct: 0.88, marketCap: 27300 },        // 제일기획
  "012750": { price: 62000, change: 500, changePct: 0.81, marketCap: 23400 },        // 에스원
  "028050": { price: 8500, change: 100, changePct: 1.19, marketCap: 2800 },          // 삼성이엔에이
  // ── SK ──
  "000660": { price: 1005000, change: 54000, changePct: 5.68, marketCap: 6900000 },   // SK하이닉스
  "017670": { price: 78000, change: -1400, changePct: -1.76, marketCap: 190000 },     // SK텔레콤
  "096770": { price: 108200, change: 1800, changePct: 1.69, marketCap: 102000 },      // SK이노베이션
  "034730": { price: 82000, change: 1200, changePct: 1.49, marketCap: 170000 },       // SK
  "402340": { price: 526000, change: 8000, changePct: 1.54, marketCap: 359000 },      // SK스퀘어
  "018670": { price: 195000, change: 2500, changePct: 1.30, marketCap: 140000 },      // SK가스
  // ── 현대차 ──
  "005380": { price: 580000, change: 21400, changePct: 3.82, marketCap: 1160000 },    // 현대자동차
  "000270": { price: 196100, change: 11100, changePct: 5.98, marketCap: 795000 },     // 기아
  "012330": { price: 400000, change: 12000, changePct: 3.09, marketCap: 380000 },     // 현대모비스
  "000720": { price: 63000, change: 500, changePct: 0.80, marketCap: 70300 },         // 현대건설
  "086280": { price: 213000, change: 3000, changePct: 1.43, marketCap: 80000 },       // 현대글로비스
  "267250": { price: 29500, change: 250, changePct: 0.85, marketCap: 24700 },         // 현대건설기계 (HD현대건설기계)
  // ── LG ──
  "066570": { price: 117200, change: -4300, changePct: -3.54, marketCap: 192000 },    // LG전자
  "051910": { price: 338000, change: 16500, changePct: 5.13, marketCap: 239000 },     // LG화학
  "373220": { price: 427000, change: 1000, changePct: 0.23, marketCap: 999180 },      // LG에너지솔루션
  "051900": { price: 269000, change: 1000, changePct: 0.37, marketCap: 41164 },       // LG생활건강
  "003550": { price: 103400, change: 3500, changePct: 3.50, marketCap: 168000 },      // LG
  "011070": { price: 345000, change: 57600, changePct: 20.03, marketCap: 81500 },     // LG이노텍
  "034220": { price: 14500, change: 150, changePct: 1.04, marketCap: 51800 },         // LG디스플레이
  // ── 롯데 ──
  "004990": { price: 33000, change: 300, changePct: 0.92, marketCap: 30000 },         // 롯데지주
  "011170": { price: 85000, change: 2000, changePct: 2.41, marketCap: 29100 },        // 롯데케미칼
  "023530": { price: 16000, change: -200, changePct: -1.23, marketCap: 10700 },       // 롯데쇼핑
  "004000": { price: 135000, change: 1500, changePct: 1.12, marketCap: 8100 },        // 롯데정밀화학
  // ── POSCO ──
  "005490": { price: 408500, change: 2000, changePct: 0.49, marketCap: 345000 },      // POSCO홀딩스
  "058430": { price: 68000, change: 1500, changePct: 2.26, marketCap: 59000 },        // 포스코인터내셔널
  // ── 한화 ──
  "012450": { price: 1185000, change: -27000, changePct: -2.23, marketCap: 611000 },  // 한화에어로스페이스
  "000880": { price: 42000, change: 500, changePct: 1.20, marketCap: 126000 },        // 한화
  "009830": { price: 7500, change: 120, changePct: 1.63, marketCap: 14000 },          // 한화솔루션
  // ── 기타 대형 ──
  "035420": { price: 263750, change: 10750, changePct: 4.25, marketCap: 432000 },     // 네이버(NAVER)
  "035720": { price: 55100, change: -800, changePct: -1.43, marketCap: 245000 },      // 카카오
  "068270": { price: 200000, change: 4500, changePct: 2.30, marketCap: 274000 },      // 셀트리온
  "068760": { price: 82000, change: 1000, changePct: 1.23, marketCap: 56000 },        // 셀트리온제약
  "030200": { price: 54000, change: 700, changePct: 1.31, marketCap: 141000 },        // KT
  "180640": { price: 125000, change: 100, changePct: 0.08, marketCap: 49000 },        // 한진칼
  "097950": { price: 216000, change: -3500, changePct: -1.59, marketCap: 32500 },     // CJ제일제당
  "001040": { price: 130000, change: 1000, changePct: 0.78, marketCap: 39800 },       // CJ
  "000120": { price: 108000, change: -1200, changePct: -1.10, marketCap: 33500 },     // CJ대한통운
  "035760": { price: 20000, change: 250, changePct: 1.27, marketCap: 31500 },         // CJ ENM
  "034020": { price: 145000, change: 2500, changePct: 1.75, marketCap: 97000 },       // 두산에너빌리티
  "000150": { price: 210000, change: 3000, changePct: 1.45, marketCap: 38500 },       // 두산
  "241560": { price: 58000, change: 800, changePct: 1.40, marketCap: 54000 },         // 두산밥캣
  "000210": { price: 78000, change: 1500, changePct: 1.96, marketCap: 41000 },        // DL
  "375500": { price: 42000, change: 500, changePct: 1.20, marketCap: 22000 },         // DL이앤씨
  // ── HD현대 ──
  "267260": { price: 95000, change: 1500, changePct: 1.60, marketCap: 45000 },        // HD현대
  "329180": { price: 232000, change: 4000, changePct: 1.75, marketCap: 48000 },       // HD한국조선해양
  "009540": { price: 168000, change: 3000, changePct: 1.82, marketCap: 96000 },       // HD현대미포
  "010620": { price: 189000, change: 2500, changePct: 1.34, marketCap: 114000 },      // HD현대중공업
  // ── GS ──
  "078930": { price: 55000, change: 500, changePct: 0.92, marketCap: 52000 },         // GS
  "006360": { price: 46000, change: 800, changePct: 1.77, marketCap: 35000 },         // GS건설
  // ── 효성 ──
  "004800": { price: 68000, change: 1200, changePct: 1.80, marketCap: 15200 },        // 효성
  "298050": { price: 420000, change: -3000, changePct: -0.71, marketCap: 22800 },     // 효성첨단소재
  "298040": { price: 280000, change: 8000, changePct: 2.94, marketCap: 35700 },       // 효성중공업
  "298020": { price: 340000, change: -5000, changePct: -1.45, marketCap: 34200 },     // 효성티앤씨
  // ── 영풍 ──
  "000670": { price: 635000, change: 12000, changePct: 1.93, marketCap: 12700 },      // 영풍
  "010130": { price: 890000, change: -15000, changePct: -1.66, marketCap: 168000 },   // 고려아연
  // ── 한국앤컴퍼니 ──
  "000240": { price: 18500, change: 200, changePct: 1.09, marketCap: 10200 },         // 한국앤컴퍼니
  "161390": { price: 56000, change: 800, changePct: 1.45, marketCap: 74000 },         // 한국타이어앤테크놀로지
  // ── LS ──
  "006260": { price: 145000, change: 3000, changePct: 2.11, marketCap: 46800 },       // LS
  "010120": { price: 260000, change: 5000, changePct: 1.96, marketCap: 82000 },       // LS일렉트릭
  // ── 신세계 ──
  "031440": { price: 235000, change: 2000, changePct: 0.86, marketCap: 23100 },       // 신세계
  "139480": { price: 153000, change: 1000, changePct: 0.66, marketCap: 43400 },       // 이마트
  // ── 하림 ──
  "136480": { price: 5500, change: -80, changePct: -1.43, marketCap: 4400 },          // 하림
  "003380": { price: 12500, change: 200, changePct: 1.63, marketCap: 7800 },          // 하림지주
  "012630": { price: 8200, change: 150, changePct: 1.86, marketCap: 8800 },           // 팬오션
  "294870": { price: 15500, change: -300, changePct: -1.90, marketCap: 11600 },       // HDC현대산업개발
  // ── SM (한진중공업→SM) ──
  "028670": { price: 4100, change: 50, changePct: 1.23, marketCap: 28900 },           // 팬오션(SM)
  "222810": { price: 3800, change: 50, changePct: 1.33, marketCap: 4500 },            // SM
};

// 모든 JSON 파일 처리
const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
let totalUpdated = 0;

for (const file of files) {
  const filePath = join(DATA_DIR, file);
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  let fileUpdated = 0;

  for (const company of data.companies) {
    if (!company.stockCode) continue;
    const priceInfo = PRICE_DATA[company.stockCode];
    if (!priceInfo) continue;

    company.stockPrice = priceInfo.price;
    company.priceChange = priceInfo.change;
    company.priceChangePercent = priceInfo.changePct;
    company.marketCap = priceInfo.marketCap;
    fileUpdated++;
  }

  // 데이터 날짜 업데이트
  if (fileUpdated > 0) {
    data.group.dataDate = "2026-02-27";
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    console.log(`✓ ${file}: ${fileUpdated}개 종목 업데이트`);
    totalUpdated += fileUpdated;
  }
}

console.log(`\n총 ${totalUpdated}개 종목 주가 업데이트 완료 (2026-02-27 기준)`);
