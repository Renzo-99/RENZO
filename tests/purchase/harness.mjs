// purchase.html의 실제 인라인 스크립트를 추출해 jsdom 환경에서 실행하는 테스트 하네스.
// 스크립트를 파일(.build/purchase.js)로 떨궈 require 하므로 c8 커버리지가 원본 코드 기준으로 집계된다.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.resolve(HERE, '../../purchase.html');
const BUILD = path.join(HERE, '.build', 'purchase.js');

const EXPORTS = [
  'esc', 'num', 'won', 'parseTSV', 'blankItem', 'aModel', 'aPlace', 'aApplicant', 'itemAmount',
  'itemPlace', 'itemRoom', 'validItems', 'canAdd', 'addItem', 'moveItem', 'dupItem', 'delItem', 'clearAll',
  'doPaste', 'openPaste', 'checkBeforeOutput', 'fileBase', 'buildASpecWorkbook', 'aspecCtx',
  'buildASpecPrint', 'buildBSpecPrint', 'printDoc', 'renderItems', 'renderSum', 'openDetail', 'saveDetail',
  'saveState', 'loadState', 'exportJSON', 'importJSON', 'openStockPicker', 'renderStockPick', 'addStockPicked',
  'getStock', 'onNamePicked', 'toggleSettings', 'goBack', 'downloadASpecXlsx', 'closeModal', 'removeStamp',
  'removeItemPhoto', 'fillStockDatalist', 'renderSettings', 'onCellInput',
  'wsGrab', 'bookmarkletHref', 'openNaverSetup', 'consumeHashAdd', 'cleanProductName', 'fetchImageAsData', 'IDB'
];

function extractScript() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!blocks.length) throw new Error('purchase.html 인라인 스크립트를 찾지 못함');
  const src = blocks[blocks.length - 1];
  const exp = '\nmodule.exports={' + EXPORTS.join(',') +
    ',get state(){return state},set state(v){state=v},photoCache,get stampData(){return stampData},set stampData(v){stampData=v},MAX_ITEMS,PASTE_COLS,DEFAULT_SETTINGS};\n';
  fs.mkdirSync(path.dirname(BUILD), { recursive: true });
  fs.writeFileSync(BUILD, src + exp);
  return html;
}

const HTML = extractScript();

/**
 * 새 DOM + 새 모듈 인스턴스로 앱을 띄운다.
 * @param {{ls?:Record<string,string>, confirm?:boolean|((m:string)=>boolean)}} opt
 */
export async function loadApp(opt = {}) {
  const dom = new JSDOM(HTML, { url: opt.url || 'https://renzo-99.github.io/RENZO/purchase.html', pretendToBeVisual: true });
  const w = dom.window;
  for (const [k, v] of Object.entries(opt.ls || {})) w.localStorage.setItem(k, v);
  const calls = { confirm: [], prints: 0, downloads: [], toasts: [] };
  const conf = opt.confirm ?? true;
  w.confirm = m => { calls.confirm.push(m); return typeof conf === 'function' ? conf(m) : conf; };
  w.prompt = () => null;
  w.print = () => { calls.prints++; };
  w.URL.createObjectURL = b => { calls.downloads.push(b); return 'blob:test'; };
  w.URL.revokeObjectURL = () => {};
  w.Element.prototype.scrollIntoView = function () {}; // jsdom 미구현
  w.HTMLAnchorElement.prototype.click = function () { calls.downloads.push(this.download); };
  const G = ['window', 'document', 'localStorage', 'navigator', 'Blob', 'URL', 'FileReader', 'Image',
    'HTMLElement', 'confirm', 'prompt', 'getComputedStyle'];
  for (const k of G) Object.defineProperty(globalThis, k, { value: k === 'window' ? w : w[k], configurable: true, writable: true });
  // 네트워크 없는 테스트: 기본은 사진 다운로드 실패(→ 주소 그대로 사용)
  globalThis.fetch = opt.fetch || (() => Promise.reject(new Error('offline')));
  globalThis.File = w.File;
  globalThis.history = w.history; globalThis.location = w.location;
  globalThis.indexedDB = undefined; // IDB 없는 환경 → 사진 저장 계층은 null로 폴백
  delete require.cache[require.resolve(BUILD)];
  const app = require(BUILD);
  await new Promise(r => setTimeout(r, 0)); // init()의 async 부분 대기
  const toastEl = w.document.getElementById('toast');
  const obs = new w.MutationObserver(() => calls.toasts.push(toastEl.textContent));
  obs.observe(toastEl, { childList: true, characterData: true, subtree: true });
  return { app, w, doc: w.document, calls, close: () => w.close() };
}

/** 네이버 상품 페이지(가짜)에서 즐겨찾기 버튼 코드를 실행하고, 열려는 주소를 돌려준다 */
export function runGrabOn(pageHtml, { url = 'https://smartstore.naver.com/doorshop/products/123?NaPm=x', state = null, target = 'https://renzo-99.github.io/RENZO/purchase.html' } = {}) {
  const src = fs.readFileSync(HTML_PATH, 'utf8').split('/*WSGRAB_START*/')[1].split('/*WSGRAB_END*/')[0];
  const dom = new JSDOM(pageHtml, { url, runScripts: 'outside-only' });
  const w = dom.window;
  if (state) w.__PRELOADED_STATE__ = state;
  const opened = [];
  w.open = (u, name) => { opened.push({ u, name }); return null; };
  w.eval(src + ';wsGrab(' + JSON.stringify(target) + ');');
  const o = opened[0];
  const data = JSON.parse(decodeURIComponent(o.u.split('#add=')[1]));
  return { opened, data, url: o.u };
}

export function item(app, over = {}) {
  return Object.assign(app.blankItem(), over);
}
export const ExcelJS = require('exceljs');
export const JSZip = require('jszip');
/** jsdom Blob → 문자열 (jsdom Blob엔 text()가 없음) */
export function blobText(w, blob) {
  return new Promise((res, rej) => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsText(blob); });
}
/** 앱 토스트 현재 문구 */
export const toastText = doc => doc.getElementById('toast').textContent;
