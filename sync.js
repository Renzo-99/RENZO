/* 목공실 관리 — 공유 저장 (Vercel)
 * 이 기기 브라우저(localStorage)에 저장되는 ws3_* 값을 서버(/api/sync)와 자동으로 맞춘다.
 * - 내가 바꾼 값: 1초쯤 뒤 서버로 올림
 * - 남이 바꾼 값: 몇 초마다 확인해서 받아오고 'ws3-remote' 이벤트로 화면에 알림
 * - 사진처럼 큰 값은 localStorage에 넣지 않고 ws3Sync.put / ws3Sync.on 으로 따로 주고받음
 * GitHub Pages 등 서버(API)가 없는 곳에서는 아무것도 하지 않는다(그 기기에만 저장).
 */
(function () {
  'use strict';
  var API = '/api/sync';
  var LOCAL_ONLY = /^ws3_(backups|lastModified|script_url|sb_url|sb_key|autoSync|plan_reminder_ack|purchase_setHidden|test_.*)$/;
  var EXTRA_PREFIX = ['pphoto_', 'pstamp']; // localStorage에 넣지 않는 큰 값(구매스펙 사진·도장)
  var host = location.hostname || '';
  // 공유 모드: Vercel 주소(또는 직접 연결한 도메인). GitHub Pages·파일·로컬 테스트 서버는 제외
  var shared = window.__WS3_FORCE_SHARED === true ||
    (/^https?:$/.test(location.protocol) && !/github\.io$/.test(host) && host !== 'localhost' && !/^127\./.test(host) && host !== '');
  window.WS3_SHARED = shared;

  var ls = window.localStorage;
  var proto = Object.getPrototypeOf(ls);
  var origSet = proto.setItem, origRemove = proto.removeItem;
  var S = { enabled: false, ready: false, pending: {}, pre: {}, cursor: 0, rev: 0, status: 'off', listeners: [], inflight: false, applying: false, lastOk: 0 };
  var exclude = window.__WS3_SYNC_EXCLUDE || '';
  var only = window.__WS3_SYNC_ONLY || ''; // 이 화면이 맡는 값만 (구매스펙 화면: purchase_,pphoto_,pstamp)
  var excludeList = exclude.split(',').filter(Boolean), onlyList = only.split(',').filter(Boolean);
  function startsAny(k, list) { for (var i = 0; i < list.length; i++) if (k.indexOf(list[i]) === 0) return true; return false; }
  function excluded(k) { return startsAny(k, excludeList) || (onlyList.length > 0 && !startsAny(k, onlyList)); }

  function isExtra(k) { for (var i = 0; i < EXTRA_PREFIX.length; i++) if (k.indexOf(EXTRA_PREFIX[i]) === 0) return true; return false; }
  function syncable(k) { return typeof k === 'string' && k.indexOf('ws3_') === 0 && !LOCAL_ONLY.test(k); }

  if (shared) {
    proto.setItem = function (k, v) {
      origSet.call(this, k, v);
      if (this === ls && !S.applying && syncable(k) && !excluded(k.slice(4))) queue(k.slice(4), String(v));
    };
    proto.removeItem = function (k) {
      origRemove.call(this, k);
      if (this === ls && !S.applying && syncable(k) && !excluded(k.slice(4))) queue(k.slice(4), '');
    };
  }

  function queue(key, value) {
    if (!shared) return;
    if (!S.ready) { S.pre[key] = value; return; }
    if (!S.enabled) return;
    S.pending[key] = value;
    clearTimeout(S.flushT); S.flushT = setTimeout(flush, 1000);
    setStatus('saving');
  }

  function req(method, url, body, ms) {
    var c = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (c) c.abort(); }, ms || 20000);
    return fetch(url, { method: method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: c ? c.signal : undefined })
      .then(function (r) { clearTimeout(t); return r.json().then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); })
      .catch(function (e) { clearTimeout(t); throw e; });
  }

  function flush() {
    if (!S.enabled || S.inflight) { if (S.enabled) { clearTimeout(S.flushT); S.flushT = setTimeout(flush, 800); } return; }
    var keys = Object.keys(S.pending);
    if (!keys.length) { setStatus('ok'); return; }
    var batch = [], size = 0;
    for (var i = 0; i < keys.length; i++) {
      var v = S.pending[keys[i]];
      if (batch.length && size + v.length > 3000000) break;
      batch.push({ key: keys[i], value: v }); size += v.length;
    }
    S.inflight = true;
    req('POST', API, { items: batch }, 30000).then(function (j) {
      S.inflight = false; S.lastOk = Date.now();
      batch.forEach(function (it) { if (S.pending[it.key] === it.value) delete S.pending[it.key]; });
      if (j.rev) S.knownOwnRev = j.rev;
      if (Object.keys(S.pending).length) flush(); else setStatus('ok');
    }).catch(function (e) {
      S.inflight = false; console.warn('[공유 저장 실패 — 다시 시도]', e);
      setStatus('error');
      clearTimeout(S.flushT); S.flushT = setTimeout(flush, 5000);
    });
  }

  // 서버 → 이 기기
  function applyItems(items, initial) {
    var changed = [], extra = [];
    items.forEach(function (it) {
      if (it.t > S.cursor) S.cursor = it.t;
      if (Object.prototype.hasOwnProperty.call(S.pending, it.key)) return; // 아직 못 올린 내 변경이 우선
      if (isExtra(it.key)) { extra.push(it); return; }
      var lk = 'ws3_' + it.key;
      var cur = ls.getItem(lk);
      if (it.value === '') { if (cur !== null) { S.applying = true; try { origRemove.call(ls, lk); } finally { S.applying = false; } changed.push(it.key); } return; }
      if (cur === it.value) return;
      S.applying = true;
      try { origSet.call(ls, lk, it.value); } catch (e) { console.warn('[공유 저장] 이 기기에 저장 실패', it.key, e); }
      finally { S.applying = false; }
      changed.push(it.key);
    });
    if (extra.length) S.listeners.forEach(function (l) { extra.forEach(function (it) { if (it.key.indexOf(l.prefix) === 0) { try { l.fn(it.key, it.value); } catch (e) { console.error(e); } } }); });
    if (changed.length || initial) emit({ keys: changed, initial: !!initial });
    return changed;
  }

  function pullFrom(since, initial, acc) {
    acc = acc || { items: [], rev: 0 };
    return req('GET', API + '?since=' + since + (exclude ? '&exclude=' + encodeURIComponent(exclude) : '') + (only ? '&only=' + encodeURIComponent(only) : ''), null, 30000).then(function (j) {
      acc.items = acc.items.concat(j.items || []); acc.rev = j.rev || acc.rev;
      if (j.more) return pullFrom(j.cursor, initial, acc);
      return acc;
    });
  }

  function poll() {
    if (!S.enabled) return;
    var next = function () { clearTimeout(S.pollT); S.pollT = setTimeout(poll, document.hidden ? 60000 : 4000); };
    if (S.polling) return next();
    S.polling = true;
    req('GET', API + '?rev=1', null, 10000).then(function (j) {
      if (!j.rev || j.rev <= S.rev) return null;
      // 저장소 목록 반영 지연 대비: 마지막으로 본 시각보다 30초 앞부터 다시 확인 (같은 값은 건너뜀)
      return pullFrom(Math.max(0, S.cursor - 30000), false).then(function (acc) { applyItems(acc.items, false); S.rev = Math.max(acc.rev || 0, j.rev); });
    }).then(function () {
      S.polling = false; S.lastOk = Date.now();
      if (S.status === 'error' && !Object.keys(S.pending).length) setStatus('ok');
      next();
    }).catch(function (e) { S.polling = false; console.warn('[공유 저장 확인 실패]', e); setStatus('error'); next(); });
  }

  function start() {
    req('GET', API + '?probe=1', null, 8000).then(function () {
      S.enabled = true;
      setStatus('saving');
      return pullFrom(0, true);
    }).then(function (acc) {
      var serverKeys = {};
      acc.items.forEach(function (it) { serverKeys[it.key] = true; });
      S.serverEmpty = !acc.items.some(function (it) { return !isExtra(it.key); });
      applyItems(acc.items, true);
      S.rev = acc.rev || 0;
      S.ready = true;
      // 시작 전에 화면이 저장한 값: 서버에 이미 있으면 서버 값 우선, 없을 때만 올림
      Object.keys(S.pre).forEach(function (k) { if (!serverKeys[k] && !excluded(k)) S.pending[k] = S.pre[k]; });
      S.pre = {};
      // 이 기기에만 있고 서버에 없는 값은 올림 (처음 쓰는 기기·처음 옮겨오는 데이터)
      for (var i = 0; i < ls.length; i++) {
        var k = ls.key(i);
        if (syncable(k) && !excluded(k.slice(4)) && !serverKeys[k.slice(4)] && !Object.prototype.hasOwnProperty.call(S.pending, k.slice(4))) S.pending[k.slice(4)] = ls.getItem(k);
      }
      if (Object.keys(S.pending).length) flush(); else setStatus('ok');
      S.pollT = setTimeout(poll, 4000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) { clearTimeout(S.pollT); poll(); } });
      window.addEventListener('beforeunload', function (e) { if (Object.keys(S.pending).length) { flush(); e.preventDefault(); e.returnValue = ''; } });
    }).catch(function (e) {
      console.warn('[공유 저장 사용 불가 — 이 기기에만 저장]', e);
      S.ready = true; S.enabled = false; S.pre = {};
      setStatus('off');
      emit({ keys: [], initial: true, offline: true });
    });
  }

  // 화면 스크립트가 다 준비된 뒤에 알림 (먼저 보내면 화면이 못 받음)
  function emit(detail) {
    var fire = function () { try { window.dispatchEvent(new CustomEvent('ws3-remote', { detail: detail })); } catch (e) {} };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(fire, 0); });
    else setTimeout(fire, 0);
  }

  // 상태 표시 (왼쪽 아래 작은 배지)
  var badge;
  function setStatus(s) {
    S.status = s;
    if (!shared) return;
    if (!badge) {
      if (!document.body) { document.addEventListener('DOMContentLoaded', function () { setStatus(S.status); }); return; }
      badge = document.createElement('div');
      badge.id = 'ws3SyncBadge';
      badge.style.cssText = 'position:fixed;left:10px;z-index:9990;font:600 11px/1 Pretendard,-apple-system,"Malgun Gothic",sans-serif;padding:6px 10px;border-radius:99px;box-shadow:0 2px 8px rgba(0,0,0,.15);pointer-events:none;transition:opacity .3s';
      document.body.appendChild(badge);
    }
    badge.style.bottom = document.getElementById('sumBar') ? '62px' : '10px';
    var m = { ok: ['☁ 공유 저장됨', '#ecfdf5', '#047857'], saving: ['⟳ 공유 저장 중…', '#eff6ff', '#1d4ed8'], error: ['⚠ 연결 끊김 — 다시 시도 중 (이 기기엔 저장됨)', '#fff7ed', '#c2410c'], off: ['⚠ 공유 저장 꺼짐 — 이 기기에만 저장', '#fef2f2', '#b91c1c'] }[s] || ['', '#fff', '#000'];
    badge.textContent = m[0]; badge.style.background = m[1]; badge.style.color = m[2];
  }

  window.ws3Sync = {
    shared: shared,
    get enabled() { return S.enabled; },
    get ready() { return S.ready; },
    get serverEmpty() { return !!S.serverEmpty; },
    get status() { return S.status; },
    hasPending: function () { return Object.keys(S.pending).length > 0; },
    put: function (key, value) { if (syncable('ws3_' + key) && !excluded(key)) queue(key, value == null ? '' : String(value)); },
    on: function (prefix, fn) { S.listeners.push({ prefix: prefix, fn: fn }); },
    flushNow: flush,
    pollNow: function () { clearTimeout(S.pollT); poll(); },
    _state: S
  };

  if (shared) start();
})();
