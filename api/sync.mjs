// 목공실 관리 — 공유 데이터 저장 API (Vercel Blob, private)
// GET  /api/sync?probe=1          → 사용 가능 여부
// GET  /api/sync?rev=1            → 마지막 변경 시각만 (가벼운 확인용)
// GET  /api/sync?since=<ms>       → since 이후 바뀐 항목 [{key, t, value}] (용량 초과 시 more:true)
// POST /api/sync {items:[{key,value}]} → 저장. 삭제는 value를 ''(빈 값)으로 저장해 다른 사람에게도 전달
import { put, list, get, head, BlobPreconditionFailedError } from './_lib/blob.mjs';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const PREFIX = 'ws3/';
const REV = 'meta/rev.json';
const KEY_RE = /^[A-Za-z0-9_.-]{1,150}$/;
const MAX_OUT = 3_500_000; // 응답 4.5MB 제한 아래로
const MAX_ITEM = 4_000_000;

const ADMIN = 'meta/admin.json'; // 관리자 코드(변환값). ws3/ 밖이라 목록·동기화에 안 나옴

async function readAdmin() { try { const t = await readText(ADMIN); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function hashCode(code, salt) { return scryptSync(String(code), salt, 32).toString('hex'); }
function checkCode(rec, code) {
  if (!rec || !code) return false;
  const a = Buffer.from(hashCode(code, rec.salt), 'hex'), b = Buffer.from(rec.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
async function saveAdmin(code) {
  const salt = randomBytes(16).toString('hex');
  await put(ADMIN, JSON.stringify({ salt, hash: hashCode(code, salt), t: Date.now() }), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 });
}
// POST {admin:{action:'status'|'verify'|'set', code, newCode}}
async function handleAdmin(a, res) {
  const rec = await readAdmin();
  const action = a && a.action;
  if (action === 'status') return res.status(200).json({ ok: true, configured: !!rec });
  if (action === 'verify') {
    if (!rec) return res.status(200).json({ ok: true, valid: false, configured: false });
    const valid = checkCode(rec, a.code);
    if (!valid) await new Promise(r => setTimeout(r, 600)); // 연속 추측 늦추기
    return res.status(200).json({ ok: true, valid, configured: true });
  }
  if (action === 'set') {
    const nc = String(a.newCode || '');
    if (nc.length < 4 || nc.length > 64) return res.status(400).json({ ok: false, error: 'code-length' });
    if (rec && !checkCode(rec, a.code)) { await new Promise(r => setTimeout(r, 600)); return res.status(200).json({ ok: true, valid: false }); }
    await saveAdmin(nc);
    return res.status(200).json({ ok: true, valid: true, configured: true });
  }
  return res.status(400).json({ ok: false, error: 'bad-admin-action' });
}

const pathOf = key => PREFIX + key + '.json';
const keyOf = pathname => pathname.slice(PREFIX.length).replace(/\.json$/, '');

async function readText(pathname) {
  const r = await get(pathname, { access: 'private', useCache: false });
  if (!r || !r.stream) return null;
  return await new Response(r.stream).text();
}
// 값 + etag (동시 저장 충돌 확인용)
async function readWithEtag(pathname) {
  const r = await get(pathname, { access: 'private', useCache: false });
  if (!r || !r.stream) return { value: '', etag: '' };
  const etag = (r.blob && r.blob.etag) || (r.headers && r.headers.get && r.headers.get('etag')) || '';
  return { value: await new Response(r.stream).text(), etag };
}
function isPrecondition(e) { return (BlobPreconditionFailedError && e instanceof BlobPreconditionFailedError) || /precondition/i.test(String(e && (e.name + ' ' + e.message))); }
async function listAll() {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix: PREFIX, limit: 1000, cursor });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}
async function revTime() {
  try { const h = await head(REV); return new Date(h.uploadedAt).getTime(); } catch (e) { return 0; }
}
async function bumpRev() {
  await put(REV, JSON.stringify({ t: Date.now() }), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ ok: false, error: 'storage-not-configured' });
  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      if (q.probe) return res.status(200).json({ ok: true });
      if (q.rev) return res.status(200).json({ ok: true, rev: await revTime() });
      if (q.get) { // 한 항목만 (첨부파일 열 때)
        const key = String(q.get);
        if (!KEY_RE.test(key)) return res.status(400).json({ ok: false, error: 'bad-key' });
        const { value, etag } = await readWithEtag(pathOf(key));
        return res.status(200).json({ ok: true, key, value: value || '', etag });
      }
      const since = Number(q.since || 0) || 0;
      const exclude = String(q.exclude || '').split(',').filter(Boolean); // 예: 목공실 화면은 구매스펙 사진 제외
      const only = String(q.only || '').split(',').filter(Boolean); // 예: 구매스펙 화면은 구매스펙 값만
      const blobs = (await listAll())
        .map(b => ({ key: keyOf(b.pathname), pathname: b.pathname, t: new Date(b.uploadedAt).getTime(), size: b.size }))
        .filter(b => b.t > since && KEY_RE.test(b.key) && !exclude.some(p => b.key.startsWith(p)) && (!only.length || only.some(p => b.key.startsWith(p))))
        .sort((a, b) => a.t - b.t || (a.key < b.key ? -1 : 1));
      let total = 0, cut = blobs.length;
      for (let i = 0; i < blobs.length; i++) {
        if (i > 0 && total + blobs[i].size > MAX_OUT) { cut = i; break; }
        total += blobs[i].size;
      }
      let page = blobs.slice(0, cut);
      const more = cut < blobs.length;
      // 같은 시각에 저장된 항목이 페이지 경계에서 잘리지 않게
      if (more && page.length > 1) {
        const tNext = blobs[cut].t;
        const trimmed = page.filter(b => b.t !== tNext);
        if (trimmed.length) page = trimmed;
      }
      const values = await Promise.all(page.map(b => readText(b.pathname)));
      return res.status(200).json({
        ok: true,
        rev: await revTime(),
        more,
        cursor: page.length ? page[page.length - 1].t : since,
        items: page.map((b, i) => ({ key: b.key, t: b.t, value: values[i] })).filter(x => x.value !== null)
      });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (body.admin) return handleAdmin(body.admin, res);
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return res.status(400).json({ ok: false, error: 'no-items' });
      const done = [];
      for (const it of items) {
        if (!it || !KEY_RE.test(String(it.key || ''))) return res.status(400).json({ ok: false, error: 'bad-key', key: it && it.key });
        const v = it.value == null ? '' : String(it.value);
        if (v.length > MAX_ITEM) return res.status(413).json({ ok: false, error: 'too-large', key: it.key });
        const opt = { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 };
        if (it.ifMatch) opt.ifMatch = String(it.ifMatch); // 읽은 뒤 누가 바꿨으면 저장 거부 → 클라이언트가 다시 합침
        try { await put(pathOf(it.key), v, opt); }
        catch (e) {
          if (!isPrecondition(e)) throw e;
          if (done.length) await bumpRev();
          return res.status(409).json({ ok: false, error: 'conflict', key: it.key, saved: done });
        }
        done.push(it.key);
      }
      await bumpRev();
      return res.status(200).json({ ok: true, saved: done, rev: await revTime() });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method-not-allowed' });
  } catch (e) {
    console.error('[sync]', e);
    return res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
}
