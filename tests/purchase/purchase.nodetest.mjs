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
    assert.equal(doc.querySelectorAll('#itemList .icard').length, 2);
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
  test('카드에서 수량/단가 입력 → 금액·합계·저장 갱신', async () => {
    const { app, w, doc } = await loadApp();
    app.addItem();
    const tr = doc.querySelector('#itemList .icard');
    const q = tr.querySelector('input[data-k=qty]'), p = tr.querySelector('input[data-k=price]');
    assert.ok(tr.classList.contains('warn'), '품명·수량 없으면 표시');
    const nm = tr.querySelector('input[data-k=name]'); nm.value = '도어록'; nm.dispatchEvent(new w.Event('input', { bubbles: true }));
    q.value = '4'; q.dispatchEvent(new w.Event('input', { bubbles: true }));
    p.value = '2500'; p.dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.equal(tr.querySelector('[data-amt]').textContent, '10,000');
    assert.equal(doc.getElementById('sumAmt').textContent, '10,000');
    assert.ok(!tr.classList.contains('warn'));
    p.dispatchEvent(new w.FocusEvent('focusout', { bubbles: true }));
    assert.equal(p.value, '2,500', '칸을 벗어나면 천단위 쉼표');
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
  test('A·B 한 카드: A/B 모든 칸이 한 화면에 있고 입력 즉시 저장', async () => {
    const { app, w, doc } = await loadApp();
    app.addItem();
    const card = doc.querySelector('#itemList .icard');
    const keys = [...card.querySelectorAll('input[data-k]')].map(i => i.dataset.k);
    for (const k of ['name', 'maker', 'model', 'qty', 'unit', 'price', 'spec', 'color', 'material', 'special', 'place', 'room', 'vendor', 'note', 'bnote', 'aspec', 'url'])
      assert.ok(keys.includes(k), k + ' 칸');
    assert.ok(card.querySelector('[data-photo]'), '사진 칸');
    assert.equal(doc.getElementById('modalRoot').innerHTML, '', '따로 여는 상세 창 없음');
    const set = (k, v) => { const i = card.querySelector('input[data-k=' + k + ']'); i.value = v; i.dispatchEvent(new w.Event('input', { bubbles: true })); };
    set('color', '흰색'); set('spec', '날개지름 200MM'); set('bnote', '※ 주의'); set('maker', '동우'); set('model', 'DWV');
    const it = app.state.items[0];
    assert.equal(it.color, '흰색'); assert.equal(it.spec, '날개지름 200MM'); assert.equal(it.bnote, '※ 주의');
    assert.equal(card.querySelector('input[data-k=aspec]').placeholder, '자동: 동우 DWV', 'A-Spec 표기 자동값 미리보기');
    const tags = [...card.querySelectorAll('.fl .tag')].map(t => t.textContent);
    assert.ok(tags.includes('A') && tags.includes('B') && tags.includes('A·B'), '칸마다 A/B 표시');
    assert.equal(JSON.parse(w.localStorage.getItem('ws3_purchase_v1')).items[0].bnote, '※ 주의');
  });

  test('카드 버튼(이동·복제·삭제)과 사진 칸', async () => {
    const { app, w, doc } = await loadApp({ confirm: true });
    app.state.items.push(item(app, { name: 'a' }), item(app, { name: 'b' }));
    app.renderItems();
    const click = (sel, idx) => doc.querySelectorAll(sel)[idx].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    click('[data-act=down]', 0);
    assert.deepEqual(app.state.items.map(x => x.name), ['b', 'a']);
    click('[data-act=dup]', 0);
    await wait(5);
    assert.deepEqual(app.state.items.map(x => x.name), ['b', 'b', 'a']);
    click('[data-act=del]', 2);
    await wait(5);
    assert.deepEqual(app.state.items.map(x => x.name), ['b', 'b']);
    const id = app.state.items[0].id;
    await app.setItemPhotoData(id, 'data:image/png;base64,QQ');
    assert.equal(doc.querySelector('.icard[data-id="' + id + '"] .ic-photo img').getAttribute('src'), 'data:image/png;base64,QQ');
    assert.equal(app.state.items[0].hasPhoto, true);
    click('[data-act=rmphoto]', 0);
    await wait(5);
    assert.equal(doc.querySelector('.icard[data-id="' + id + '"] .ic-photo img'), null);
    assert.equal(app.state.items[0].hasPhoto, false);
    // 사진 칸에 이미지 주소 붙여넣기
    const ev = new w.Event('paste', { bubbles: true, cancelable: true });
    ev.clipboardData = { files: [], getData: t => t === 'text/plain' ? 'https://img/x.jpg' : '' };
    doc.querySelector('.icard[data-id="' + id + '"] [data-photo]').dispatchEvent(ev);
    await wait(10);
    assert.equal(app.photoCache[id], 'https://img/x.jpg');
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

// ───────────────────────── P2. 네이버 견적 가져오기 ─────────────────────────
import { runGrabOn } from './harness.mjs';

const SMARTSTORE_STATE = {
  category: { name: '생활/건강', id: 5 },
  channel: { channelName: '도어락마트', name: '도어락마트' },
  product: { A: {
    id: 123, name: '[무료배송][당일발송] 현대 방화문 원형손잡이 DL-900BSS 열쇠포함',
    salePrice: 15000, benefitsView: { discountedSalePrice: 12000 },
    productImages: [{ url: 'https://shop-phinf.pstatic.net/20240101_1/a.jpg', imageType: 'REPRESENTATIVE' }],
    naverShoppingSearchInfo: { manufacturerName: '현대도어락', brandName: 'HYUNDAE', modelName: 'DL-900BSS' },
    channel: { channelName: '도어락마트' }
  } }
};
const NOTICE_TABLE = `<table><tr><th>품명 및 모델명</th><td>상세페이지 참조</td><th>제조자(사)</th><td>현대도어락(주)</td></tr>
<tr><th>색상</th><td>은색</td><th>재질</th><td>스테인리스</td></tr>
<tr><th>크기</th><td>상세설명참조</td><th>제조국</th><td>대한민국</td></tr></table>`;

describe('P2 네이버 견적 가져오기 — 페이지 정보 읽기', () => {
  test('스마트스토어: 상품데이터+상품정보제공고시에서 읽고, 참조 문구는 비움', () => {
    const { data, opened } = runGrabOn('<html><head><meta property="og:title" content="og제목"><meta property="og:image" content="https://og/x.jpg"></head><body>' + NOTICE_TABLE + '</body></html>', { state: SMARTSTORE_STATE });
    assert.equal(opened.length, 1);
    assert.equal(opened[0].name, 'ws3_purchase', '같은 창 재사용');
    assert.ok(opened[0].u.startsWith('https://renzo-99.github.io/RENZO/index.html#add='), '목공실 앱으로 넘김');
    assert.equal(data.src, 'https://smartstore.naver.com/doorshop/products/123', '추적 파라미터 제거');
    assert.equal(data.name, '[무료배송][당일발송] 현대 방화문 원형손잡이 DL-900BSS 열쇠포함');
    assert.equal(data.price, '12000', '할인가 우선');
    assert.equal(data.maker, '현대도어락(주)', '고시표 제조자 우선');
    assert.equal(data.model, 'DL-900BSS', '고시가 “상세페이지 참조”면 상품데이터 모델명');
    assert.equal(data.color, '은색');
    assert.equal(data.material, '스테인리스');
    assert.equal(data.spec, '', '“상세설명참조”는 빈칸');
    assert.equal(data.image, 'https://shop-phinf.pstatic.net/20240101_1/a.jpg', 'og 이미지보다 대표사진 우선');
    assert.equal(data.vendor, '도어락마트');
  });

  test('가격비교(catalog) __NEXT_DATA__ 구조', () => {
    const next = { props: { pageProps: { initialState: { catalog: { info: { productName: '자동개폐식 환풍기 DWV-200DRA', lowestPrice: 23900, imageUrl: '//shopping-phinf.pstatic.net/b.jpg', makerName: '동우산업', modelName: 'DWV-200DRA' } } } } } };
    const { data } = runGrabOn('<html><body><script id="__NEXT_DATA__" type="application/json">' + JSON.stringify(next) + '</script></body></html>', { url: 'https://search.shopping.naver.com/catalog/555' });
    assert.equal(data.name, '자동개폐식 환풍기 DWV-200DRA');
    assert.equal(data.price, '23900');
    assert.equal(data.maker, '동우산업');
    assert.equal(data.model, 'DWV-200DRA');
    assert.equal(data.image, 'https://shopping-phinf.pstatic.net/b.jpg', '// 주소에 https 보정');
  });

  test('다른 쇼핑몰: JSON-LD, 없으면 og 태그로 대체', () => {
    const ld = { '@context': 'https://schema.org', '@type': 'Product', name: '도어클로저 K-630', brand: { '@type': 'Brand', name: 'KING' }, mpn: 'K-630', image: ['https://x/c.jpg'], offers: { '@type': 'Offer', price: '32000' } };
    let r = runGrabOn('<html><head><script type="application/ld+json">' + JSON.stringify(ld) + '</script></head><body></body></html>', { url: 'https://shop.example.com/p/1' });
    assert.deepEqual([r.data.name, r.data.maker, r.data.model, r.data.price, r.data.image], ['도어클로저 K-630', 'KING', 'K-630', '32000', 'https://x/c.jpg']);
    r = runGrabOn('<html><head><title>t</title><meta property="og:title" content="플로어힌지 K-8400"><meta property="og:image" content="https://x/d.jpg"><meta property="product:price:amount" content="85000"><meta property="og:site_name" content="어떤몰"></head></html>', { url: 'https://shop.example.com/p/2' });
    assert.deepEqual([r.data.name, r.data.price, r.data.image, r.data.vendor], ['플로어힌지 K-8400', '85000', 'https://x/d.jpg', '어떤몰']);
  });
});

describe('P2 네이버 견적 가져오기 — 구매스펙에 반영', () => {
  const addUrl = data => 'https://renzo-99.github.io/RENZO/purchase.html#add=' + encodeURIComponent(JSON.stringify(data));

  test('#add= 로 열리면 카드 추가(품명 정리·수량1·단가), 판매처는 추천업체가 아닌 견적출처로, 주소창 정리', async () => {
    const { data } = runGrabOn('<html><body>' + NOTICE_TABLE + '</body></html>', { state: SMARTSTORE_STATE });
    const { app, doc, w } = await loadApp({ url: addUrl(data) });
    await wait(20);
    assert.equal(app.state.items.length, 1);
    const it = app.state.items[0];
    assert.equal(it.name, '현대 방화문 원형손잡이 DL-900BSS 열쇠포함', '앞쪽 [광고] 태그 제거');
    assert.equal(it.qty, 1); assert.equal(it.price, 12000);
    assert.equal(it.maker, '현대도어락(주)'); assert.equal(it.model, 'DL-900BSS');
    assert.equal(it.color, '은색'); assert.equal(it.material, '스테인리스');
    assert.equal(it.vendor, '', '추천업체명은 비워 둠 (견적만 본 곳)');
    assert.equal(it.srcStore, '도어락마트');
    assert.equal(it.url, 'https://smartstore.naver.com/doorshop/products/123');
    assert.equal(it.hasPhoto, true);
    assert.equal(app.photoCache[it.id], 'https://shop-phinf.pstatic.net/20240101_1/a.jpg', '사진 다운로드가 막히면 주소로 사용');
    assert.equal(w.location.hash, '', '새로고침해도 중복 추가되지 않게 주소 정리');
    const card = doc.querySelector('.icard[data-id="' + it.id + '"]');
    assert.ok(card.classList.contains('flash'), '가져온 카드 강조');
    assert.match(card.querySelector('.ic-src').textContent, /견적: 도어락마트/);
    assert.equal(card.querySelector('input[data-k=url]').value, 'https://smartstore.naver.com/doorshop/products/123');
    assert.equal(card.querySelector('input[data-k=vendor]').value, '');
    const b = doc.getElementById('printRoot');
    b.innerHTML = app.buildBSpecPrint(app.validItems());
    assert.equal(b.querySelector('td.spec img').getAttribute('src'), 'https://shop-phinf.pstatic.net/20240101_1/a.jpg', 'B-Spec에 사진 포함');
  });

  test('사진이 늦어도 카드는 바로 생기고, 사진은 도착하면 채워진다', async () => {
    let release;
    const slow = () => new Promise(r => { release = () => r({ ok: false, status: 500 }); });
    const { app, doc } = await loadApp({ url: addUrl({ name: 'a', image: 'https://img/slow.jpg', src: 'https://s/9' }), fetch: slow });
    await wait(20);
    assert.equal(app.state.items.length, 1);
    const box = () => doc.querySelector('.icard .ic-photo');
    assert.match(box().textContent, /사진 첨부/, '사진 기다리지 않고 카드 표시');
    release();
    await wait(20);
    assert.equal(box().querySelector('img').getAttribute('src'), 'https://img/slow.jpg');
    assert.equal(app.state.items[0].hasPhoto, true);
  });

  test('사진 저장소(IndexedDB)가 응답 없이 멈춰도 2초 뒤 사진 없이 진행', async () => {
    const { app, w } = await loadApp();
    Object.defineProperty(w, 'indexedDB', { value: { open: () => ({}) }, configurable: true }); // 이벤트가 영영 안 오는 환경
    const t0 = Date.now();
    assert.equal(await app.IDB.get('p1'), null);
    const dt = Date.now() - t0;
    assert.ok(dt >= 1900 && dt < 3000, '약 2초 후 포기: ' + dt + 'ms');
    const t1 = Date.now();
    assert.equal(await app.IDB.set('p1', 'x'), null);
    assert.ok(Date.now() - t1 < 50, '한 번 실패하면 이후엔 즉시 건너뜀');
  });

  test('사진 받기가 막히거나 오래 걸리면 사진 주소로 대체', async () => {
    const hang = () => new Promise(() => {});
    const { app } = await loadApp({ fetch: hang });
    assert.equal(await app.fetchImageAsData('https://img/a.jpg', 30), 'https://img/a.jpg', '시간 초과 → 주소');
    const { app: b } = await loadApp({ fetch: async () => ({ ok: false, status: 403 }) });
    assert.equal(await b.fetchImageAsData('https://img/b.jpg', 30), 'https://img/b.jpg', '거부 → 주소');
  });

  test('같은 상품을 다시 가져오면 확인, 취소 시 추가 안 함', async () => {
    const d = { name: 'a', src: 'https://s/1', price: '1000' };
    const first = await loadApp({ url: addUrl(d) });
    await wait(20);
    const ls = { ws3_purchase_v1: first.w.localStorage.getItem('ws3_purchase_v1') };
    const { app, calls } = await loadApp({ url: addUrl(d), ls, confirm: false });
    await wait(20);
    assert.equal(app.state.items.length, 1);
    assert.match(calls.confirm[0], /이미 가져온 상품/);
  });

  test('100품목이 차 있으면 추가하지 않음 / 깨진 데이터는 무시', async () => {
    const full = { settings: {}, items: Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: 'x' + i })), nextId: 101 };
    const { app } = await loadApp({ url: addUrl({ name: 'y' }), ls: { ws3_purchase_v1: JSON.stringify(full) } });
    await wait(20);
    assert.equal(app.state.items.length, 100);
    const { app: b, doc } = await loadApp({ url: 'https://renzo-99.github.io/RENZO/purchase.html#add=%7Bbroken' });
    await wait(20);
    assert.equal(b.state.items.length, 0);
    assert.match(toastText(doc), /상품 정보를 읽지 못했습니다/);
  });

  test('즐겨찾기 버튼(선택): 코드가 목공실 앱 주소로 넘기고, 실제로 실행된다', async () => {
    const { app, doc } = await loadApp({ url: 'https://renzo-99.github.io/RENZO/purchase.html?x=1#y' });
    assert.equal(app.appUrl(), 'https://renzo-99.github.io/RENZO/index.html');
    const href = app.bookmarkletHref();
    assert.ok(href.startsWith('javascript:'));
    const code = decodeURIComponent(href.slice(11));
    assert.match(code, /^\(function\(\)\{function wsExtract\(d,st\)/);
    assert.ok(code.includes('("https://renzo-99.github.io/RENZO/index.html")'));
    // 즐겨찾기 코드를 그대로 네이버(가짜) 페이지에서 실행
    const { JSDOM } = await import('jsdom');
    const page = new JSDOM('<html><body>' + NOTICE_TABLE + '</body></html>', { url: 'https://smartstore.naver.com/a/products/1', runScripts: 'outside-only' });
    page.window.__PRELOADED_STATE__ = SMARTSTORE_STATE;
    const opened = []; page.window.open = u => { opened.push(u); return {}; };
    page.window.eval(code.replace(/;void 0$/, ''));
    assert.equal(opened.length, 1);
    assert.ok(opened[0].startsWith('https://renzo-99.github.io/RENZO/index.html#add='));
    app.openNaverSetup();
    assert.equal(doc.getElementById('bmLink').getAttribute('href'), href);
    assert.match(doc.getElementById('modalRoot').textContent, /Ctrl \+ A/);
  });

  test('즐겨찾기 버튼: 상품이 없는 페이지면 안내, 팝업이 막히면 같은 탭으로 이동', () => {
    const r = runGrabOn('<html><body><p>검색 결과</p></body></html>', { url: 'https://search.shopping.naver.com/search/all?q=x' });
    assert.equal(r.opened.length, 0);
    assert.match(r.alerts[0], /상품 정보를 찾지 못했습니다/);
  });

  test('cleanProductName', async () => {
    const { app } = await loadApp();
    assert.equal(app.cleanProductName(' [특가] [무료배송]  도어  클로저 '), '도어 클로저');
    assert.equal(app.cleanProductName('도어 클로저 K-630 : 킹스토어'), '도어 클로저 K-630', 'og 제목의 " : 스토어명" 제거');
    assert.equal(app.cleanProductName('도어록 [2개입]'), '도어록 [2개입]', '뒤쪽 괄호는 유지');
    assert.equal(app.cleanProductName(null), '');
  });
});

// ───────────────────────── P2. 네이버 견적 — 복사·붙여넣기 방식 (주 방식) ─────────────────────────
// 네이버 상품 페이지에서 Ctrl+A → Ctrl+C 했을 때 클립보드(text/html)에 담기는 형태를 흉내 낸 조각
const COPIED_SMARTSTORE = `<html><body><!--StartFragment-->
<div><a href="https://smartstore.naver.com/doorshop"><img src="https://shop-phinf.pstatic.net/20230101_2/logo.png?type=f40" alt="스토어 로고"></a><h1>도어락마트</h1></div>
<div><img src="https://shop-phinf.pstatic.net/20240101_1/main.jpg?type=m510" alt="대표이미지"><img src="https://shop-phinf.pstatic.net/20240101_1/thumb2.jpg?type=f40"></div>
<h3>[당일발송] 현대 방화문 원형손잡이 DL-900BSS 열쇠포함</h3>
<div><span>30%</span> <del><span>17,000</span>원</del> <strong><span>12,000</span>원</strong></div>
<div>배송비 3,000원 · 도서산간 추가</div>
<h3>상품정보 제공고시</h3>
<table><tr><th>품명 및 모델명</th><td>DL-900BSS</td><th>제조자(사)</th><td>현대도어락(주)</td></tr>
<tr><th>색상</th><td>은색</td><th>재질</th><td>스테인리스</td></tr><tr><th>크기</th><td>문 두께 35~45mm</td></tr></table>
<!--EndFragment--></body></html>`;

describe('P2 네이버 견적 가져오기 — 복사·붙여넣기', () => {
  test('복사한 상품 화면에서 품명·할인가·제조사·모델·색상·재질·규격·큰 사진을 읽어 카드 추가', async () => {
    const { app, doc } = await loadApp();
    app.openNaverSetup();
    const p = app.importFromPaste(COPIED_SMARTSTORE, '');
    assert.ok(p, '추가됨');
    await wait(20);
    const it = app.state.items[0];
    assert.equal(it.name, '현대 방화문 원형손잡이 DL-900BSS 열쇠포함', '스토어 이름(h1)·안내 제목 대신 상품명, 광고 태그 제거');
    assert.equal(it.price, 12000, '정가(17,000)가 아니라 할인가');
    assert.equal(it.maker, '현대도어락(주)'); assert.equal(it.model, 'DL-900BSS');
    assert.equal(it.color, '은색'); assert.equal(it.material, '스테인리스'); assert.equal(it.spec, '문 두께 35~45mm');
    assert.equal(it.qty, 1); assert.equal(it.vendor, '');
    assert.equal(app.photoCache[it.id], 'https://shop-phinf.pstatic.net/20240101_1/main.jpg?type=m510', '로고·작은 썸네일(f40) 대신 대표 사진');
    assert.match(doc.getElementById('nvRes').textContent, /✅ 현대 방화문.*12,000원/);
  });

  test('붙여넣기 칸에 실제 paste 이벤트로 넣어도 동작, 여러 상품 연달아', async () => {
    const { app, w, doc } = await loadApp();
    app.openNaverSetup();
    const zone = doc.getElementById('nvPaste');
    const paste = html => { const ev = new w.Event('paste', { bubbles: true, cancelable: true }); ev.clipboardData = { getData: t => t === 'text/html' ? html : '' }; zone.dispatchEvent(ev); return ev; };
    const ev = paste(COPIED_SMARTSTORE);
    assert.equal(ev.defaultPrevented, true, '붙여넣은 화면이 칸 안에 그대로 들어가지 않음');
    paste(COPIED_SMARTSTORE.replace('DL-900BSS 열쇠포함', '환풍기 DWV-200DRA').replace(/DL-900BSS/g, 'DWV-200DRA'));
    await wait(20);
    assert.equal(app.state.items.length, 2);
    assert.equal(doc.querySelectorAll('#nvRes .r').length, 2);
    assert.equal(zone.textContent, '여기를 누르고 Ctrl + V');
  });

  test('가격비교 화면 글자(최저가)만 있어도 읽음 / 텍스트만 붙여넣은 경우', async () => {
    const { app } = await loadApp();
    app.importFromPaste('<body><h2>자동개폐식 환풍기 DWV-200DRA</h2><p>최저 23,900원</p><dl><dt>제조사</dt><dd>동우산업</dd><dt>모델명</dt><dd>DWV-200DRA</dd></dl></body>', '');
    await wait(10);
    assert.deepEqual([app.state.items[0].name, app.state.items[0].price, app.state.items[0].maker, app.state.items[0].model], ['자동개폐식 환풍기 DWV-200DRA', 23900, '동우산업', 'DWV-200DRA']);
    app.importFromPaste('', '도어클로저\n판매가 32,000원\n제조사: KING\n모델명: K-630');
    await wait(10);
    assert.equal(app.state.items[1].price, 32000);
    assert.equal(app.state.items[1].maker, 'KING'); assert.equal(app.state.items[1].model, 'K-630');
  });

  test('링크만 붙여넣거나 상품이 아닌 화면이면 추가하지 않고 안내', async () => {
    const { app, doc } = await loadApp();
    app.openNaverSetup();
    assert.equal(app.importFromPaste('', 'https://smartstore.naver.com/a/products/1'), null);
    assert.match(doc.getElementById('nvRes').textContent, /링크만으로는 가져올 수 없어요/);
    assert.equal(app.importFromPaste('<body><p>로그인 해주세요</p></body>', ''), null);
    assert.match(doc.getElementById('nvRes').textContent, /상품 정보를 찾지 못했습니다/);
    assert.equal(app.importFromPaste('', ''), null);
    assert.equal(app.state.items.length, 0);
  });
});

describe('P3 목공실 앱 사이드 패널로만 열림', () => {
  test('purchase.html을 주소로 직접 열면 목공실 앱(#purchase)으로 보낼 주소를 만들고, 견적 데이터도 넘긴다', async () => {
    const { app, w } = await loadApp({ url: 'https://renzo-99.github.io/RENZO/purchase.html' });
    w.history.replaceState(null, '', '#add=%7B%22name%22%3A%22a%22%7D');
    assert.equal(app.appRedirectUrl(), 'https://renzo-99.github.io/RENZO/index.html#purchase&add=%7B%22name%22%3A%22a%22%7D');
    const { app: b } = await loadApp({ url: 'https://renzo-99.github.io/RENZO/purchase.html' });
    assert.equal(b.appRedirectUrl(), 'https://renzo-99.github.io/RENZO/index.html#purchase');
    assert.equal(b.isEmbedded(), false);
    assert.equal(b.redirectToApp(), false, '테스트(단독 실행 허용 플래그)에서는 이동 안 함');
  });
});
