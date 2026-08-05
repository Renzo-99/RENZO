/**
 * Seed Runner - seed_v2.sql의 INSERT 데이터를 Supabase에 삽입
 *
 * 두 가지 방식 지원:
 * 1. SUPABASE_SERVICE_ROLE_KEY - REST API (service_role로 RLS 우회)
 * 2. SUPABASE_ACCESS_TOKEN - Management API (SQL 직접 실행)
 *
 * 임시 스크립트: 실행 후 삭제 예정
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Supabase 설정
const SUPABASE_URL = 'https://irdcmmuhidoenhaujzkm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyZGNtbXVoaWRvZW5oYXVqemttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTEzNjMsImV4cCI6MjA4NzkyNzM2M30.rzXWOyIUpTf3wkJHhiHlij4UZ1XQJMz4GZL25loxmu4';
const PROJECT_REF = 'irdcmmuhidoenhaujzkm';

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// SQL 파일 읽기 (UTF-8)
const sqlPath = resolve('src/data/seed_v2.sql');
const sqlContent = readFileSync(sqlPath, 'utf-8');

// ==========================================
// 방법 1: Service Role Key로 REST API 사용
// ==========================================

function parseValueTuple(tupleStr) {
  const values = [];
  let current = '';
  let inString = false;
  let i = 0;

  while (i < tupleStr.length) {
    const ch = tupleStr[i];
    if (inString) {
      if (ch === "'" && i + 1 < tupleStr.length && tupleStr[i + 1] === "'") {
        current += "'";
        i += 2;
        continue;
      } else if (ch === "'") {
        inString = false;
        current += ch;
      } else {
        current += ch;
      }
    } else {
      if (ch === "'") {
        inString = true;
        current += ch;
      } else if (ch === ',') {
        values.push(current.trim());
        current = '';
        i++;
        continue;
      } else {
        current += ch;
      }
    }
    i++;
  }
  if (current.trim()) {
    values.push(current.trim());
  }
  return values;
}

function sqlValueToJS(val) {
  if (val === 'NULL' || val === 'null') return null;
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1).replace(/''/g, "'");
  }
  const num = Number(val);
  if (!isNaN(num) && val !== '') return num;
  return val;
}

function parseInsertStatements(sql) {
  const results = [];
  const insertRegex = /INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);\s*$/gm;

  let match;
  while ((match = insertRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columns = match[2].split(',').map(c => c.trim());
    const valuesBlock = match[3].trim();

    const rows = [];
    let depth = 0;
    let currentTuple = '';
    let inStr = false;

    for (let i = 0; i < valuesBlock.length; i++) {
      const ch = valuesBlock[i];
      if (inStr) {
        if (ch === "'" && i + 1 < valuesBlock.length && valuesBlock[i + 1] === "'") {
          currentTuple += "''";
          i++;
          continue;
        } else if (ch === "'") {
          inStr = false;
        }
        currentTuple += ch;
      } else {
        if (ch === "'") {
          inStr = true;
          currentTuple += ch;
        } else if (ch === '(') {
          depth++;
          if (depth === 1) { currentTuple = ''; continue; }
          currentTuple += ch;
        } else if (ch === ')') {
          depth--;
          if (depth === 0) {
            const values = parseValueTuple(currentTuple);
            const row = {};
            columns.forEach((col, idx) => {
              row[col] = sqlValueToJS(values[idx]);
            });
            rows.push(row);
            currentTuple = '';
            continue;
          }
          currentTuple += ch;
        } else {
          if (depth > 0) currentTuple += ch;
        }
      }
    }
    results.push({ tableName, columns, rows });
  }
  return results;
}

async function insertViaRestApi(tableName, rows, serviceKey, batchSize = 50) {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  [오류] ${tableName} 배치 ${Math.floor(i / batchSize) + 1}: ${errorText}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(`  -> 배치 ${Math.floor(i / batchSize) + 1} 성공 (${batch.length}개)`);
    }
  }
  return { inserted, errors };
}

async function runWithServiceRole() {
  console.log('[모드] Service Role Key로 REST API 사용\n');

  const parsed = parseInsertStatements(sqlContent);
  console.log(`SQL 파싱 완료: ${parsed.length}개 INSERT 문\n`);

  const tableData = {};
  for (const { tableName, rows } of parsed) {
    if (!tableData[tableName]) tableData[tableName] = [];
    tableData[tableName].push(...rows);
  }

  for (const [table, rows] of Object.entries(tableData)) {
    console.log(`  ${table}: ${rows.length}개 행`);
  }
  console.log('');

  const insertOrder = ['chaebols', 'companies', 'ownership_links'];
  let totalSuccess = 0;
  let totalFail = 0;

  for (const tableName of insertOrder) {
    const rows = tableData[tableName];
    if (!rows || rows.length === 0) {
      console.log(`[경고] ${tableName}: 데이터 없음`);
      continue;
    }
    console.log(`[${tableName}] ${rows.length}개 행 삽입 중...`);
    const { inserted, errors } = await insertViaRestApi(tableName, rows, SERVICE_ROLE_KEY);
    console.log(`  => 성공: ${inserted}, 실패: ${errors}\n`);
    totalSuccess += inserted;
    totalFail += errors;
  }

  return { totalSuccess, totalFail };
}

// ==========================================
// 방법 2: Management API로 SQL 직접 실행
// ==========================================

function extractInsertStatements(sql) {
  const lines = sql.split('\n');
  const statements = [];
  let currentStatement = '';
  let inStatement = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed === '') continue;
    if (trimmed.startsWith('DELETE')) continue;

    if (trimmed.startsWith('INSERT INTO')) {
      inStatement = true;
      currentStatement = line;
      if (trimmed.endsWith(';')) {
        statements.push(currentStatement);
        currentStatement = '';
        inStatement = false;
      }
      continue;
    }

    if (inStatement) {
      currentStatement += '\n' + line;
      if (trimmed.endsWith(';')) {
        statements.push(currentStatement);
        currentStatement = '';
        inStatement = false;
      }
    }
  }
  return statements;
}

function getTableName(insertSql) {
  const match = insertSql.match(/INSERT\s+INTO\s+(\w+)/i);
  return match ? match[1] : 'unknown';
}

async function executeSql(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SQL 실행 실패 (${response.status}): ${errorText}`);
  }
  return response.json();
}

async function runWithManagementApi() {
  console.log('[모드] Management API로 SQL 직접 실행\n');

  const insertStatements = extractInsertStatements(sqlContent);
  console.log(`INSERT 문 ${insertStatements.length}개 발견\n`);

  const tableGroups = {};
  for (const stmt of insertStatements) {
    const table = getTableName(stmt);
    if (!tableGroups[table]) tableGroups[table] = [];
    tableGroups[table].push(stmt);
  }

  for (const [table, stmts] of Object.entries(tableGroups)) {
    console.log(`  ${table}: ${stmts.length}개 INSERT 문`);
  }
  console.log('');

  const insertOrder = ['chaebols', 'companies', 'ownership_links'];
  let totalSuccess = 0;
  let totalFail = 0;

  for (const tableName of insertOrder) {
    const stmts = tableGroups[tableName];
    if (!stmts || stmts.length === 0) {
      console.log(`[경고] ${tableName}: INSERT 문 없음`);
      continue;
    }

    console.log(`[${tableName}] ${stmts.length}개 INSERT 문 실행 중...`);
    for (let i = 0; i < stmts.length; i++) {
      try {
        await executeSql(stmts[i]);
        console.log(`  -> INSERT ${i + 1}/${stmts.length} 성공`);
        totalSuccess++;
      } catch (err) {
        console.error(`  -> INSERT ${i + 1}/${stmts.length} 실패: ${err.message}`);
        totalFail++;
      }
    }
    console.log('');
  }

  // 결과 확인
  console.log('=== 삽입 결과 확인 ===');
  for (const tableName of insertOrder) {
    try {
      const result = await executeSql(`SELECT COUNT(*) as count FROM ${tableName}`);
      const count = result?.[0]?.count ?? result;
      console.log(`  ${tableName}: ${JSON.stringify(count)}개 행`);
    } catch (err) {
      console.error(`  ${tableName} 카운트 실패: ${err.message}`);
    }
  }

  return { totalSuccess, totalFail };
}

// ==========================================
// 메인 실행
// ==========================================

async function main() {
  console.log('=== Supabase 시드 데이터 삽입 시작 ===\n');

  let result;

  if (SERVICE_ROLE_KEY) {
    result = await runWithServiceRole();
  } else if (ACCESS_TOKEN) {
    result = await runWithManagementApi();
  } else {
    console.error('오류: 인증 정보가 없습니다.\n');
    console.error('다음 중 하나의 환경변수를 설정하세요:\n');
    console.error('방법 1 (권장): Supabase Service Role Key');
    console.error('  Supabase Dashboard > Settings > API > service_role key');
    console.error('  set SUPABASE_SERVICE_ROLE_KEY=eyJ...\n');
    console.error('방법 2: Supabase Personal Access Token');
    console.error('  https://supabase.com/dashboard/account/tokens');
    console.error('  set SUPABASE_ACCESS_TOKEN=sbp_...\n');
    process.exit(1);
  }

  console.log(`\n=== 완료: 성공 ${result.totalSuccess}, 실패 ${result.totalFail} ===`);

  if (result.totalFail > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('치명적 오류:', err);
  process.exit(1);
});
