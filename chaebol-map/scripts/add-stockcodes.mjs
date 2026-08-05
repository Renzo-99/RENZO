#!/usr/bin/env node
/**
 * 누락된 stockCode 추가 스크립트
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dirname, "../src/data");

// 회사명 → stockCode 매핑
const STOCK_CODES = {
  // 삼성
  "삼성전자": "005930",
  "삼성물산": "028260",
  "삼성생명보험": "032830",
  "삼성화재해상보험": "000810",
  "삼성SDI": "006400",
  "삼성전기": "009150",
  "삼성에스디에스": "018260",
  "삼성바이오로직스": "207940",
  "삼성증권": "016360",
  "호텔신라": "008770",
  "제일기획": "030000",
  "삼성카드": "029780",
  "삼성중공업": "010140",
  "에스원": "012750",
  "삼성이엔에이": "028050",
};

const filePath = join(DATA_DIR, "samsung.json");
const data = JSON.parse(readFileSync(filePath, "utf-8"));
let updated = 0;

for (const company of data.companies) {
  if (company.isListed && !company.stockCode) {
    const code = STOCK_CODES[company.name];
    if (code) {
      company.stockCode = code;
      updated++;
      console.log(`  + ${company.name} → ${code}`);
    }
  }
}

writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log(`\n삼성 ${updated}개 종목 stockCode 추가 완료`);
