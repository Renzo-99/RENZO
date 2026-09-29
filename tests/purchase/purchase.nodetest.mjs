// 물품 구매 A/B-Spec 도구 테스트 — 중요도 순 (P1 제출물 > P2 대량입력 > P3 표기규칙 > P4 편집/저장)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, item, ExcelJS, JSZip, blobText, toastText } from './harness.mjs';

const wait = ms => new Promise(r => setTimeout(r, ms));
const NUMFMT = '_-* #,##0_-;\\-* #,##0_-;_-* "-"_-;_-@_-';
// 제출 양식(A-Spec 원본)에서 추출한 기준값
const ORIG_WIDTHS = [8.5546875, 9.44140625, 12.88671875, 25.77734375, 35.5546875, 6.109375, 4.6640625, 12.44140625, 13.21875, 8.88671875, 13.109375, 17.77734375, 9.77734375];
const ORIG_HEADS = ['연번', '단과대학', '학과명', '품명', '제조사 및 모델명(규격)', '수량', '단위', '예정단가\n(부가세·설치비 포함)', '예정금액\n(부가세·설치비 포함)', '신청자명\n(전화번호)', '추천업체명\n(전화번호)', '설치장소', '비고'];

function sampleItems(app, n) {
  const out = [];
  for (let i = 1; i <= n; i++) out.push(item(app, { name: '품목' + i, maker: '제조' + i, model: 'M-' + i, qty: (i % 7) + 1, unit: '개', price: 1000 * i }));
  return out;
}
async function roundTrip(wb) {
  const buf = await wb.xlsx.writeBuffer();
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(buf);
  return wb2.getWorksheet('A-SPEC');
}

// ───────────────────────── P1. 제출물: A-Spec 엑셀 ─────────────────────────
describe('P1 A-Spec 엑셀 (제출 양식 재현)', () => {
  test('헤더 13열·2행 병합·열너비·행높이가 원본과 같다', async () => {
    const { app } = await loadApp();
    const ws = await roundTrip(app.buildASpecWorkbook(ExcelJS, sampleItems(app, 2), app.aspecCtx()));
    ORIG_HEADS.forEach((h, i) => assert.equal(ws.getCell(1, i + 1).value, h, '헤더 ' + (i + 1)));
    ORIG_WIDTHS.forEach((w, i) => assert.ok(Math.abs(ws.getColumn(i + 1).width - w) < 0.01, '열너비 ' + (i + 1)));
    assert.equal(ws.getRow(1).height, 37.5);
    assert.equal(ws.getRow(2).height, 33.75);
    assert.equal(ws.getRow(3).height, 66);
    const merges = ws.model.merges;
    for (const c of 'ABCDEFGHIJKLM') assert.ok(merges.includes(c + '1:' + c + '2'), c + '1:' + c + '2 병합');
    assert.ok(merges.includes('A5:E5'), '계 행 A:E 병합');
  });

  test('100품목: 행 수·수식·합계 결과값이 정확하다', async () => {
    const { app } = await loadApp();
    const items = sampleItems(app, 100);
    const ws = await roundTrip(app.buildASpecWorkbook(ExcelJS, items, app.aspecCtx()));
    assert.equal(ws.rowCount, 103); // 헤더 2 + 품목 100 + 계 1
    let sq = 0, sa = 0;
    items.forEach((it, i) => {
      const r = 3 + i;
      assert.equal(ws.getCell(r, 1).value, i + 1, '연번');
      assert.deepEqual(ws.getCell(r, 9).value, { formula: 'F' + r + '*H' + r, result: it.qty * it.price });
      sq += it.qty; sa += it.qty * it.price;
    });
    assert.equal(ws.getCell('A103').value, '계');
    assert.deepEqual(ws.getCell('F103').value, { formula: 'SUM(F3:F102)', result: sq });
    assert.deepEqual(ws.getCell('I103').value, { formula: 'SUM(I3:I102)', result: sa });
  });

  test('셀 서식: 글꼴·색·정렬·숫자서식·채우기', async () => {
    const { app } = await loadApp();
    const ws = await roundTrip(app.buildASpecWorkbook(ExcelJS, sampleItems(app, 1), app.aspecCtx()));
    const h = ws.getCell('A1');
    assert.equal(h.font.name, '맑은 고딕'); assert.equal(h.font.size, 10); assert.equal(h.font.bold, true);
    assert.equal(h.fill.fgColor.argb, 'FFC6D9F1');
    const d = ws.getCell('D3');
    assert.equal(d.font.name, '돋움'); assert.equal(d.font.size, 9);
    assert.equal(d.alignment.horizontal, 'center'); assert.equal(d.alignment.wrapText, true);
    assert.equal(ws.getCell('E3').font.color.argb, 'FFFF0000', '모델명 열 빨간 글씨(원본과 동일)');
    for (const c of ['F3', 'H3', 'I3']) { assert.match(ws.getCell(c).numFmt, /^_-\* #,##0_-;\\?-\* #,##0_-;_-\* "-"_-;_-@_-$/, c); assert.equal(ws.getCell(c).alignment.horizontal, 'right', c); }
    assert.equal(ws.getCell('A4').fill.fgColor.argb, 'FFD7E4BD', '계 행 채우기');
    for (const s of ['top', 'left', 'bottom', 'right']) assert.equal(ws.getCell('M3').border[s].style, 'thin');
  });

  test('원본 XML에 제출 양식과 동일한 회계 숫자서식·전체 재계산 설정이 기록된다', async () => {
    const { app } = await loadApp();
    const buf = await app.buildASpecWorkbook(ExcelJS, sampleItems(app, 1), app.aspecCtx()).xlsx.writeBuffer();
    const zip = await JSZip.loadAsync(buf);
    const styles = await zip.file('xl/styles.xml').async('string');
    const wbx = await zip.file('xl/workbook.xml').async('string');
    assert.ok(styles.includes('formatCode="' + NUMFMT.replace(/"/g, '&quot;') + '"'), '원본과 같은 서식 코드');
    assert.match(wbx, /fullCalcOnLoad="1"/, '엑셀 열 때 수식 재계산');
  });

  test('인쇄 설정: A4 가로·너비 1페이지 맞춤·머리글 반복·페이지 번호·틀고정', async () => {
    const { app } = await loadApp();
    const ws = await roundTrip(app.buildASpecWorkbook(ExcelJS, sampleItems(app, 5), app.aspecCtx()));
    const ps = ws.pageSetup;
    assert.equal(ps.paperSize, 9); assert.equal(ps.orientation, 'landscape');
    assert.equal(ps.fitToPage, true); assert.equal(ps.fitToWidth, 1); assert.equal(ps.fitToHeight, 0);
    assert.equal(ps.printTitlesRow, '1:2');
    assert.match(ps.printArea, /A1:M8$/);
    assert.equal(ws.headerFooter.oddFooter, '&C&P / &N');
    assert.equal(ws.views[0].state, 'frozen'); assert.equal(ws.views[0].ySplit, 2);
    assert.equal(ws.views[0].showGridLines, false);
  });

  test('공통 정보·표기 규칙이 셀에 반영되고 빈 수량/단가는 빈 칸', async () => {
    const { app } = await loadApp();
    Object.assign(app.state.settings, { college: '공과대학', dept: '시설팀', applicant: '홍길동', applicantTel: '320-0000', place: '창고', room: 'B101' });
    const its = [item(app, { name: '손잡이', maker: 'HYUNDAE DL', model: 'DL-900BSS', qty: 3, price: 100 }),
      item(app, { name: '환풍기', aspec: 'DWV-200DRA\n(날개지름 200mm)', qty: '', price: '', room: 'LB103', place: '목공실' })];
    const ws = await roundTrip(app.buildASpecWorkbook(ExcelJS, its, app.aspecCtx()));
    assert.equal(ws.getCell('B3').value, '공과대학'); assert.equal(ws.getCell('C3').value, '시설팀');
    assert.equal(ws.getCell('E3').value, 'HYUNDAE DL DL-900BSS');
    assert.equal(ws.getCell('J3').value, '홍길동\n(320-0000)');
    assert.equal(ws.getCell('L3').value, '창고\n(B101)');
    assert.equal(ws.getCell('E4').value, 'DWV-200DRA\n(날개지름 200mm)', 'A-Spec 표기 직접입력 우선');
    assert.equal(ws.getCell('L4').value, '목공실\n(LB103)', '품목별 설치장소 우선');
    assert.equal(ws.getCell('F4').value, null); assert.equal(ws.getCell('H4').value, null);
    assert.equal(ws.getCell('I4').value.formula, 'F4*H4', '금액은 수식 유지 (0원 캐시값은 fullCalcOnLoad로 재계산)');
  });

  test('다운로드: 제출 파일명으로 .xlsx 생성', async () => {
    const { app, calls } = await loadApp();
    globalThis.ExcelJS = ExcelJS;
    app.state.settings.title = '26년 1차';
    app.state.items.push(...sampleItems(app, 3));
    await app.downloadASpecXlsx();
    assert.ok(calls.downloads.includes('1. 물품구입리스트(A-Spec)_26년 1차.xlsx'), JSON.stringify(calls.downloads));
    delete globalThis.ExcelJS;
  });

  test('다운로드: 엑셀 모듈이 없으면 안내만 하고 중단', async () => {
    const { app, calls } = await loadApp();
    delete globalThis.ExcelJS;
    app.state.items.push(...sampleItems(app, 1));
    await app.downloadASpecXlsx();
    assert.equal(calls.downloads.length, 0);
  });
});

// ───────────────────────── P1. 제출물: B-Spec PDF ─────────────────────────
describe('P1 B-Spec 인쇄 페이지', () => {
  test('품목당 1페이지, No·품명·8개 사양·수량(단위)·비고 포함', async () => {
    const { app, doc } = await loadApp();
    const its = [item(app, { name: '방화문용 원형 손잡이', maker: 'HYUNDAE DL', model: 'HYUNDAE DL-900BSS', spec: '문 두께_ 35~45MM', color: '은색', material: '금속', qty: 40, bnote: '※ 열쇠 확인' }),
      item(app, { name: '자동개폐식 환풍기', model: 'DWV-200DRA', qty: 20, special: '자동개폐식' })];
    const root = doc.getElementById('printRoot');
    root.innerHTML = app.buildBSpecPrint(its);
    const pages = root.querySelectorAll('.bs-page');
    assert.equal(pages.length, 2);
    const p1 = pages[0];
    assert.match(p1.querySelector('.bs-title').textContent, /물품 상세 사양서 \(B-Spec\.\)/);
    const body = p1.querySelector('tr.body').querySelectorAll('td');
    assert.equal(body[0].textContent, '1');
    assert.equal(body[1].textContent, '방화문용 원형 손잡이');
    const li = [...body[2].querySelectorAll('li')].map(x => x.textContent);
    assert.equal(li.length, 8);
    assert.deepEqual(li.slice(0, 7), ['1. 모델명: HYUNDAE DL-900BSS', '2. 제조사: HYUNDAE DL', '3. 규격(세부사양): 문 두께_ 35~45MM', '4. 색상: 은색', '5. 재질: 금속', '6. 설치장소: LB103', '7. 특이사항: 없음']);
    assert.equal(li[7], '8. 사진첨부');
    assert.equal(body[3].textContent, '40(개)');
    assert.match(body[4].textContent, /※ 열쇠 확인/);
    assert.match(body[4].textContent, /목공실 지하 1층까지 배송/);
    assert.equal(pages[1].querySelector('tr.body td').textContent, '2');
    assert.match(pages[1].textContent, /7\. 특이사항: 자동개폐식/);
    assert.match(p1.querySelector('.bs-foot').textContent, /A-Spec\)의 번호와 일치/);
  });

  test('헤더: 부서장·신청부서·담당자·연락처, 동의 체크, 도장/사진 이미지', async () => {
    const { app, doc } = await loadApp();
    const it = item(app, { name: 'x', qty: 1 });
    const root = doc.getElementById('printRoot');
    root.innerHTML = app.buildBSpecPrint([it]);
    let t = root.textContent;
    for (const s of ['김 욱 진', '관재팀 목공실', '전 서 원', '02-320-1581']) assert.ok(t.includes(s), s);
    assert.ok(t.includes('□ 입찰공고'));
    assert.equal(root.querySelectorAll('img').length, 0);
    app.state.settings.agree = true;
    app.stampData = 'data:image/png;base64,AAAA';
    app.photoCache[it.id] = 'data:image/jpeg;base64,BBBB';
    root.innerHTML = app.buildBSpecPrint([it]);
    assert.ok(root.textContent.includes('☑ 입찰공고'));
    assert.equal(root.querySelector('.stamp-wrap img').getAttribute('src'), 'data:image/png;base64,AAAA');
    assert.equal(root.querySelector('td.spec img').getAttribute('src'), 'data:image/jpeg;base64,BBBB');
  });

  test('입력값의 HTML은 이스케이프된다 (인쇄물 깨짐/스크립트 삽입 방지)', async () => {
    const { app, doc } = await loadApp();
    const root = doc.getElementById('printRoot');
    root.innerHTML = app.buildBSpecPrint([item(app, { name: '<img src=x onerror=alert(1)>', qty: 1, model: 'a&b "c"' })]);
    assert.equal(root.querySelectorAll('td.c img').length, 0);
    assert.ok(root.textContent.includes('<img src=x onerror=alert(1)>'));
    assert.ok(root.textContent.includes('a&b "c"'));
  });

  test('printDoc: 인쇄 영역 채우고 print 호출, 문서 제목=제출 파일명', async () => {
    const { app, w, doc, calls } = await loadApp();
    app.state.settings.title = '26년 1차';
    app.state.items.push(...sampleItems(app, 3));
    app.printDoc('b');
    assert.equal(doc.getElementById('printRoot').querySelectorAll('.bs-page').length, 3);
    assert.equal(doc.title, '2. 물품상세사양서(B-Spec)_26년 1차');
    await wait(250);
    assert.equal(calls.prints, 1);
    w.dispatchEvent(new w.Event('afterprint'));
    assert.equal(doc.getElementById('printRoot').innerHTML, '');
    assert.equal(doc.title, '물품 구매 스펙 작성');
  });
});

// ───────────────────────── P1. A-Spec 인쇄표 ─────────────────────────
describe('P1 A-Spec 인쇄(PDF) 표', () => {
  test('행 수·합계·빈 금액 표시', async () => {
    const { app, doc } = await loadApp();
    const its = [item(app, { name: 'a', qty: 2, price: 1500 }), item(app, { name: 'b', qty: 3, price: '' })];
    const root = doc.getElementById('printRoot');
    root.innerHTML = app.buildASpecPrint(its);
    const rows = root.querySelectorAll('table.as tbody tr');
    assert.equal(rows.length, 3);
    assert.equal(root.querySelectorAll('table.as thead th').length, 13);
    const tot = rows[2].querySelectorAll('td');
    assert.equal(tot[0].textContent, '계');
    assert.equal(tot[1].textContent, '5');
    assert.equal(tot[4].textContent, '3,000');
    assert.equal(rows[1].querySelectorAll('td')[8].textContent, '-');
  });
});

// ───────────────────────── P2. 대량 입력 (엑셀 붙여넣기 / 100품목) ─────────────────────────
describe('P2 엑셀 붙여넣기 & 100품목 제한', () => {
  test('parseTSV: 탭·CRLF·따옴표 안 줄바꿈·이스케이프 따옴표·빈 줄', async () => {
    const { app } = await loadApp();
    const rows = app.parseTSV('a\tb\tc\r\n"여러\n줄"\t"말 ""따옴표"""\t\r\n\r\n\t\t\nx\ty');
    assert.deepEqual(rows, [['a', 'b', 'c'], ['여러\n줄', '말 "따옴표"', ''], ['x', 'y']]);
  });

  test('doPaste: 제목행 건너뛰기, 열 매핑, 쉼표 숫자 변환', async () => {
    const { app, doc } = await loadApp();
    app.openPaste();
    doc.getElementById('pasteArea').value =
      '품명\t제조사\t모델명\t규격\t색상\t재질\t수량\t단위\t단가\n' +
      '도어록\tHYUNDAE\tDL-1\t원통형\t은색\t금속\t12\t개\t"10,000"\t업체A(02-1)\tLB103\t급함\n' +
      '경첩\t\t\t\t\t\t4\t조\t2500';
    app.doPaste();
    const it = app.state.items;
    assert.equal(it.length, 2);
    assert.equal(it[0].name, '도어록'); assert.equal(it[0].maker, 'HYUNDAE'); assert.equal(it[0].model, 'DL-1');
    assert.equal(it[0].spec, '원통형'); assert.equal(it[0].qty, 12); assert.equal(it[0].price, 10000);
    assert.equal(it[0].vendor, '업체A(02-1)'); assert.equal(it[0].room, 'LB103'); assert.equal(it[0].note, '급함');
    assert.equal(it[1].unit, '조'); assert.equal(it[1].price, 2500); assert.equal(it[1].maker, '');
    assert.equal(doc.getElementById('modalRoot').innerHTML, '', '붙여넣기 후 창 닫힘');
    assert.equal(doc.querySelectorAll('#itemBody tr').length, 2);
    await wait(60); // openPaste의 지연 focus가 닫힌 창에서 에러 내지 않아야 함
  });

  test('doPaste: 120줄 붙여넣으면 100품목까지만 추가', async () => {
    const { app, doc } = await loadApp();
    app.openPaste();
    doc.getElementById('pasteArea').value = Array.from({ length: 120 }, (_, i) => 'p' + i + '\t\t\t\t\t\t1').join('\n');
    app.doPaste();
    assert.equal(app.state.items.length, 100);
    assert.match(toastText(doc), /20개는 100품목 초과로 제외/);
    app.openPaste();
    doc.getElementById('pasteArea').value = 'more\t\t\t\t\t\t1';
    app.doPaste();
    assert.equal(app.state.items.length, 100);
  });

  test('doPaste: 빈 입력은 추가 안 함', async () => {
    const { app, doc } = await loadApp();
    app.openPaste();
    doc.getElementById('pasteArea').value = '  \n\t\n';
    app.doPaste();
    assert.equal(app.state.items.length, 0);
  });

  test('addItem/canAdd: 100개 초과 불가', async () => {
    const { app } = await loadApp();
    for (let i = 0; i < 105; i++) app.addItem();
    assert.equal(app.state.items.length, 100);
    assert.equal(app.canAdd(), false);
    assert.equal(app.state.items.length, app.MAX_ITEMS);
  });

  test('재고 품목에서 추가: 품명·단위를 가져온다', async () => {
    const { app } = await loadApp({ ls: { ws3_products: JSON.stringify([{ id: 1, code: 'A01', name: '도어록_원통형', unit: '개', stock: 3 }, { id: 2, code: 'B19', name: '합판', unit: '장', stock: 8 }]) } });
    app.openStockPicker();
    globalThis.window._spSel.add(2);
    app.addStockPicked();
    assert.equal(app.state.items.length, 1);
    assert.equal(app.state.items[0].name, '합판'); assert.equal(app.state.items[0].unit, '장');
  });
});

// ───────────────────────── P3. 표기 규칙 / 유틸 ─────────────────────────
describe('P3 표기 규칙 및 유틸', () => {
  test('num/won/esc', async () => {
    const { app } = await loadApp();
    assert.equal(app.num('10,000원'), 10000); assert.equal(app.num(''), 0); assert.equal(app.num(null), 0); assert.equal(app.num('abc'), 0);
    assert.equal(app.won(1234567), '1,234,567'); assert.equal(app.won(0), '0');
    assert.equal(app.esc('<a href="x">&\''), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
  test('aModel/aPlace/aApplicant/itemAmount', async () => {
    const { app } = await loadApp();
    assert.equal(app.aModel(item(app, { maker: 'A', model: 'B' })), 'A B');
    assert.equal(app.aModel(item(app, { maker: '', model: 'B' })), 'B');
    assert.equal(app.aModel(item(app, { maker: 'A', model: 'B', aspec: '  직접 ' })), '직접');
    assert.equal(app.aPlace(item(app)), '목공실\n(LB103)');
    app.state.settings.room = '';
    assert.equal(app.aPlace(item(app)), '목공실');
    assert.equal(app.aApplicant(), '전진수\n(320-1581)');
    app.state.settings.applicantTel = '';
    assert.equal(app.aApplicant(), '전진수');
    assert.equal(app.itemAmount(item(app, { qty: '3', price: '1,500' })), 4500);
  });
  test('fileBase: 제출 차수 반영', async () => {
    const { app } = await loadApp();
    assert.equal(app.fileBase('a'), '1. 물품구입리스트(A-Spec)');
    app.state.settings.title = '26년 2차';
    assert.equal(app.fileBase('b'), '2. 물품상세사양서(B-Spec)_26년 2차');
  });
});

// ───────────────────────── P4. 출력 전 검증 / 편집 / 저장 ─────────────────────────
describe('P4 출력 전 검증', () => {
  test('품목 없으면 중단', async () => {
    const { app } = await loadApp();
    assert.equal(app.checkBeforeOutput(), null);
  });
  test('품명 빈 줄 제외·수량 없음 경고 → 확인 시 진행 / 취소 시 중단', async () => {
    const { app, calls } = await loadApp({ confirm: true });
    app.state.items.push(item(app, { name: 'a', qty: 1 }), item(app, { name: '' }), item(app, { name: 'b', qty: '' }));
    const r = app.checkBeforeOutput();
    assert.deepEqual(r.map(x => x.name), ['a', 'b']);
    assert.match(calls.confirm[0], /수량이 없는 품목 1개/);
    assert.match(calls.confirm[0], /제외되는 줄 1개/);
    const { app: app2 } = await loadApp({ confirm: false });
    app2.state.items.push(item(app2, { name: 'b', qty: '' }));
    assert.equal(app2.checkBeforeOutput(), null);
  });
  test('문제 없으면 확인창 없이 진행', async () => {
    const { app, calls } = await loadApp();
    app.state.items.push(item(app, { name: 'a', qty: 1 }));
    assert.equal(app.checkBeforeOutput().length, 1);
    assert.equal(calls.confirm.length, 0);
  });
});

describe('P4 편집 & 저장/복원', () => {
  test('표에서 수량/단가 입력 → 금액·합계·저장 갱신', async () => {
    const { app, w, doc } = await loadApp();
    app.addItem();
    const tr = doc.querySelector('#itemBody tr');
    const q = tr.querySelector('input[data-k=qty]'), p = tr.querySelector('input[data-k=price]');
    q.value = '4'; q.dispatchEvent(new w.Event('input'));
    p.value = '2,500'; p.dispatchEvent(new w.Event('input'));
    assert.equal(tr.querySelector('[data-amt]').textContent, '10,000');
    assert.equal(doc.getElementById('sumAmt').textContent, '10,000');
    p.dispatchEvent(new w.Event('blur'));
    assert.equal(p.value, '2,500');
    const saved = JSON.parse(w.localStorage.getItem('ws3_purchase_v1'));
    assert.equal(saved.items[0].qty, 4); assert.equal(saved.items[0].price, 2500);
  });
  test('새로고침 후 목록·공통정보 복원, id 중복 없음', async () => {
    const { app, w } = await loadApp();
    app.state.settings.title = 'X';
    app.addItem(); app.addItem();
    app.state.items[0].name = '유지됨'; app.saveState();
    const ls = { ws3_purchase_v1: w.localStorage.getItem('ws3_purchase_v1') };
    const { app: b } = await loadApp({ ls });
    assert.equal(b.state.settings.title, 'X');
    assert.equal(b.state.items[0].name, '유지됨');
    b.addItem();
    const ids = b.state.items.map(x => x.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  test('상세 모달 저장 → B-Spec 필드 반영', async () => {
    const { app, doc } = await loadApp();
    app.addItem();
    const id = app.state.items[0].id;
    app.openDetail(id);
    doc.getElementById('d_color').value = '흰색';
    doc.getElementById('d_spec').value = '날개지름 200MM';
    doc.getElementById('d_bnote').value = '※ 주의';
    app.saveDetail(id);
    assert.equal(app.state.items[0].color, '흰색');
    assert.equal(app.state.items[0].spec, '날개지름 200MM');
    assert.equal(app.state.items[0].bnote, '※ 주의');
    assert.equal(doc.getElementById('modalRoot').innerHTML, '');
  });
  test('복제·이동·삭제', async () => {
    const { app } = await loadApp({ confirm: true });
    app.state.items.push(item(app, { name: 'a' }), item(app, { name: 'b' }), item(app, { name: 'c' }));
    await app.dupItem(app.state.items[0].id);
    assert.deepEqual(app.state.items.map(x => x.name), ['a', 'a', 'b', 'c']);
    assert.notEqual(app.state.items[0].id, app.state.items[1].id);
    app.moveItem(app.state.items[3].id, -1);
    assert.deepEqual(app.state.items.map(x => x.name), ['a', 'a', 'c', 'b']);
    app.moveItem(app.state.items[0].id, -1); // 맨 위에서 위로 → 변화 없음
    assert.deepEqual(app.state.items.map(x => x.name), ['a', 'a', 'c', 'b']);
    await app.delItem(app.state.items[2].id);
    assert.deepEqual(app.state.items.map(x => x.name), ['a', 'a', 'b']);
  });
  test('삭제 확인에서 취소하면 유지 / 전체 비우기', async () => {
    const { app } = await loadApp({ confirm: false });
    app.state.items.push(item(app, { name: 'a' }));
    await app.delItem(app.state.items[0].id);
    assert.equal(app.state.items.length, 1);
    const { app: b } = await loadApp({ confirm: true });
    b.state.items.push(item(b, { name: 'a' }), item(b, { name: 'b' }));
    await b.clearAll();
    assert.equal(b.state.items.length, 0);
  });
  test('목록 파일 저장 → 열기 왕복 (사진·도장 포함, id 연속)', async () => {
    const { app, w, calls } = await loadApp();
    app.state.settings.title = '왕복';
    app.state.items.push(item(app, { name: 'a', qty: 1 }), item(app, { name: 'b', qty: 2 }));
    app.photoCache[app.state.items[1].id] = 'data:image/jpeg;base64,PPP';
    app.stampData = 'data:image/png;base64,SSS';
    app.exportJSON();
    const blob = calls.downloads.find(x => x && typeof x === 'object');
    const text = await blobText(w, blob);
    assert.ok(calls.downloads.includes('구매목록_왕복.json'));
    const { app: b, w: w2 } = await loadApp({ confirm: true });
    const file = new w2.File([text], 'l.json', { type: 'application/json' });
    const input = { files: [file], value: 'x' };
    b.importJSON(input);
    await wait(50);
    assert.deepEqual(b.state.items.map(x => x.name), ['a', 'b']);
    assert.deepEqual(b.state.items.map(x => x.id), [1, 2], '불러온 품목 id는 1부터 연속');
    assert.equal(b.state.settings.title, '왕복');
    assert.equal(b.photoCache[b.state.items[1].id], 'data:image/jpeg;base64,PPP');
    assert.equal(b.state.items[1].hasPhoto, true);
    assert.equal(b.stampData, 'data:image/png;base64,SSS');
    assert.equal(input.value, '');
  });
  test('잘못된 파일은 거부', async () => {
    const { app, w } = await loadApp();
    app.importJSON({ files: [new w.File(['{"a":1}'], 'x.json')], value: 'x' });
    await wait(50);
    assert.equal(app.state.items.length, 0);
    assert.match(toastText(w.document), /올바른 구매목록 파일이 아닙니다/);
  });
  test('공통 정보 접기/펼치기 상태 기억, 앱 안(iframe)이 아니면 goBack은 링크 이동 허용', async () => {
    const { app, doc, w } = await loadApp();
    app.toggleSettings();
    assert.equal(doc.getElementById('setBody').style.display, 'none');
    assert.equal(w.localStorage.getItem('ws3_purchase_setHidden'), '1');
    app.toggleSettings();
    assert.equal(doc.getElementById('setBody').style.display, '');
    assert.equal(app.goBack(), true);
  });
});
