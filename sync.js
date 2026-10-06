/* 목공실 관리 — 공유 저장 (Vercel)
 * 이 기기 브라우저(localStorage)에 저장되는 ws3_* 값을 서버(/api/sync)와 자동으로 맞춘다.
 * - 내가 바꾼 값: 1초쯤 뒤 서버로 올림
 * - 남이 바꾼 값: 몇 초마다 확인해서 받아오고 'ws3-remote' 이벤트로 화면에 알림
 * - 사진처럼 큰 값은 localStorage에 넣지 않고 ws3Sync.put / ws3Sync.on 으로 따로 주고받음
 * GitHub Pages 주소(renzo-99.github.io)로 열어도 Vercel 서버에 저장해 같은 내용을 본다.
 */
(function () {
  'use strict';
  var VERCEL = 'https://woodroom-hongik.vercel.app';
  var host = location.hostname || '';
  var onPages = /^renzo-99\.github\.io$/i.test(host); // 예전 주소로 연 사람도 같은 데이터
  var API = (onPages ? VERCEL : '') + '/api/sync';
  var LOCAL_ONLY = /^ws3_(backups|lastModified|script_url|sb_url|sb_key|autoSync|plan_reminder_ack|purchase_setHidden|test_.*|sync_.*)$/;
  var EXTRA_PREFIX = ['pphoto_', 'pstamp']; // localStorage에 넣지 않는 큰 값(구매스펙 사진·도장)
  // 공유 모드: Vercel 주소·GitHub Pages(위 주소). 파일·로컬 테스트 서버는 제외
  var shared = window.__WS3_FORCE_SHARED === true || onPages ||
    (/^https?:$/.test(location.protocol) && !/github\.io$/.test(host) && host !== 'localhost' && !/^127\./.test(host) && host !== '');
  window.WS3_SHARED = shared;

  var ls = window.localStorage;
  var proto = Object.getPrototypeOf(ls);
  var origSet = proto.setItem, origRemove = proto.removeItem, origGet = proto.getItem;
  var S = { enabled: false, ready: false, pending: {}, pre: {}, base: {}, loaded: {}, writeBase: {}, cursor: 0, rev: 0, status: 'off', listeners: [], inflight: false, applying: false, lastOk: 0 };

  // ── 3방향 합치기: 마지막으로 맞춘 값(base) / 내 값(mine) / 서버 최신 값(theirs)
  // 서로 추가한 건 둘 다 남기고, 한쪽만 바꾼 건 바꾼 쪽, 둘 다 같은 걸 다르게 바꾸면 내 값.
  function same(a, b) { return a === b || JSON.stringify(a) === JSON.stringify(b); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function idOf(e) {
    if (!isObj(e)) return 'v:' + JSON.stringify(e);
    if (e.id != null) return 'id:' + e.id;
    if (e.aid != null) return 'aid:' + e.aid;
    if (e.dn != null && e.dt != null) return 'day:' + e.dn + '|' + e.dt; // 주간 보고서의 요일
    return 'v:' + JSON.stringify(e);
  }
  function maxNumId(arr) { var m = 0; arr.forEach(function (e) { if (isObj(e) && typeof e.id === 'number' && e.id > m) m = e.id; }); return m; }
  function merge3(b, m, t) {
    if (same(m, t)) return m;
    if (same(b, m)) return t;
    if (same(b, t)) return m;
    if (Array.isArray(m) && Array.isArray(t)) return mergeArr(Array.isArray(b) ? b : [], m, t);
    if (isObj(m) && isObj(t)) {
      var bb = isObj(b) ? b : {}, out = {}, keys = {};
      Object.keys(t).concat(Object.keys(m)).forEach(function (k) { keys[k] = 1; });
      Object.keys(keys).forEach(function (k) {
        var inM = k in m, inT = k in t, inB = k in bb;
        if (k === 'nextId' && typeof m[k] === 'number' && typeof t[k] === 'number') { out[k] = Math.max(m[k], t[k]); return; }
        if (inM && inT) { out[k] = merge3(bb[k], m[k], t[k]); return; }
        if (inM) { if (!inB || !same(bb[k], m[k])) out[k] = m[k]; return; }       // 서버에서 지웠어도 내가 바꿨으면 유지
        if (inT) { if (!inB || !same(bb[k], t[k])) out[k] = t[k]; return; }       // 내가 지웠으면 지움(서버가 안 바꿨을 때)
      });
      return out;
    }
    return m;
  }
  function mergeArr(b, m, t) {
    var B = {}, M = {}, T = {};
    b.forEach(function (e) { B[idOf(e)] = e; }); m.forEach(function (e) { M[idOf(e)] = e; }); t.forEach(function (e) { T[idOf(e)] = e; });
    var out = [], seen = {}, extra = [];
    t.forEach(function (e) {
      var k = idOf(e); if (seen[k]) return; seen[k] = 1;
      if (k in M) {
        if (!(k in B) && !same(M[k], e) && isObj(e) && e.id != null) { out.push(e); extra.push(M[k]); return; } // 같은 번호로 서로 다른 걸 추가 → 둘 다 남김
        out.push(merge3(B[k], M[k], e)); return;
      }
      if (k in B) { if (!same(B[k], e)) out.push(e); return; } // 내가 지움 — 서버가 그사이 바꿨으면 남김
      out.push(e);                                              // 서버에 새로 생김
    });
    m.forEach(function (e) {
      var k = idOf(e); if (seen[k]) return; seen[k] = 1;
      if (k in B) { if (!same(B[k], e)) out.push(e); return; } // 서버에서 지움 — 내가 바꿨으면 남김
      out.push(e);                                              // 내가 새로 추가
    });
    if (extra.length) { var n = maxNumId(out); extra.forEach(function (e) { var c = JSON.parse(JSON.stringify(e)); if (typeof c.id === 'number') c.id = ++n; else c.id = String(c.id) + '_' + Math.random().toString(36).slice(2, 6); out.push(c); }); }
    return out;
  }
  function mergeText(base, mine, theirs) {
    try {
      var b = base ? JSON.parse(base) : undefined, m = JSON.parse(mine), t = JSON.parse(theirs);
      return JSON.stringify(merge3(b, m, t));
    } catch (e) { return mine; } // JSON이 아니면 내 값
  }
  window.__ws3Merge = merge3;
  var exclude = window.__WS3_SYNC_EXCLUDE || '';
  var only = window.__WS3_SYNC_ONLY || ''; // 이 화면이 맡는 값만 (구매스펙 화면: purchase_,pphoto_,pstamp)
  var excludeList = exclude.split(',').filter(Boolean), onlyList = only.split(',').filter(Boolean);
  function startsAny(k, list) { for (var i = 0; i < list.length; i++) if (k.indexOf(list[i]) === 0) return true; return false; }
  function excluded(k) { return startsAny(k, excludeList) || (onlyList.length > 0 && !startsAny(k, onlyList)); }

  function isExtra(k) { for (var i = 0; i < EXTRA_PREFIX.length; i++) if (k.indexOf(EXTRA_PREFIX[i]) === 0) return true; return false; }
  function syncable(k) { return typeof k === 'string' && k.indexOf('ws3_') === 0 && !LOCAL_ONLY.test(k); }

  // 합치기 기준: 화면이 실제로 불러온 값(markLoaded로 알려줌), 없으면 마지막으로 맞춘 값
  // → 화면이 옛 상태를 바탕으로 저장해도, 그 사이 남이 넣은 건 지우지 않고 합침
  function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function noteWrite(key, v) {
    if (!hasOwn(S.writeBase, key)) S.writeBase[key] = hasOwn(S.loaded, key) ? S.loaded[key] : S.base[key];
    if (hasOwn(S.loaded, key)) S.loaded[key] = v;
  }
  if (shared) {
    proto.setItem = function (k, v) {
      origSet.call(this, k, v);
      if (this === ls && !S.applying && syncable(k) && !excluded(k.slice(4))) { noteWrite(k.slice(4), String(v)); queue(k.slice(4), String(v)); }
    };
    proto.removeItem = function (k) {
      origRemove.call(this, k);
      if (this === ls && !S.applying && syncable(k) && !excluded(k.slice(4))) { noteWrite(k.slice(4), ''); queue(k.slice(4), ''); }
    };
  }

  var PEND_KEY = 'ws3_sync_pend' + (only ? '_p' : ''); // 화면별 (목공실 / 구매스펙)
  function savePend() {
    if (!shared) return;
    var o = {};
    Object.keys(S.pending).forEach(function (k) { if (!isExtra(k)) o[k] = hasOwn(S.writeBase, k) ? (S.writeBase[k] == null ? null : S.writeBase[k]) : null; });
    try { if (Object.keys(o).length) origSet.call(ls, PEND_KEY, JSON.stringify(o)); else origRemove.call(ls, PEND_KEY); } catch (e) {}
  }
  function queue(key, value) {
    if (!shared) return;
    if (!S.ready) { S.pre[key] = value; return; }
    if (!S.enabled) return;
    S.pending[key] = value; savePend();
    clearTimeout(S.flushT); S.flushT = setTimeout(flush, 1000);
    setStatus('saving');
  }

  function req(method, url, body, ms) {
    var c = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (c) c.abort(); }, ms || 20000);
    return fetch(url, { method: method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: c ? c.signal : undefined })
      .then(function (r) { clearTimeout(t); return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status }; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); })
      .catch(function (e) { clearTimeout(t); throw e; });
  }

  function byteLen(v) { try { return new Blob([v]).size; } catch (e) { return v.length * 3; } }
  function flush() {
    if (!S.enabled || S.inflight) { if (S.enabled) { clearTimeout(S.flushT); S.flushT = setTimeout(flush, 800); } return; }
    var keys = Object.keys(S.pending);
    if (!keys.length) { setStatus('ok'); return; }
    var batch = [], size = 0;
    for (var i = 0; i < keys.length; i++) {
      var v = S.pending[keys[i]];
      var bytes = byteLen(v); // 한글은 3바이트 — 요청 4.5MB 제한 아래로
      if (batch.length && (S.small || size + bytes > 2500000)) break;
      batch.push({ key: keys[i], value: v }); size += bytes;
    }
    S.inflight = true; S.inflightKeys = {};
    batch.forEach(function (it) { S.inflightKeys[it.key] = 1; });
    var merged = [];
    // 1) 서버 최신 값을 읽어 다른 사람 변경과 합침 (사진 같은 큰 값은 그대로)
    Promise.all(batch.map(function (it) {
      if (isExtra(it.key) || it.value === '') return Promise.resolve(it);
      return req('GET', API + '?get=' + encodeURIComponent(it.key), null, 20000).then(function (g) {
        var server = g.value || '';
        it.ifVer = g.ver != null ? g.ver : null;
        it.orig = it.value; // 화면이 저장한 그대로의 값
        var base = Object.prototype.hasOwnProperty.call(S.writeBase, it.key) ? S.writeBase[it.key] : S.base[it.key];
        if (!server || server === it.value || server === base) return it;
        var mv = mergeText(base, it.value, server);
        if (mv !== it.value) {
          if (S.pending[it.key] === it.value) S.pending[it.key] = mv;
          var lk = 'ws3_' + it.key;
          S.applying = true; try { origSet.call(ls, lk, mv); } catch (e) {} finally { S.applying = false; }
          merged.push(it.key);
          it.value = mv;
        }
        return it;
      });
    })).then(function () {
      if (merged.length) emit({ keys: merged, initial: false, merged: true }); // 합쳐진 내용으로 화면 갱신
      // 2) 읽은 뒤 누가 또 바꿨으면(409) 다시 합치기
      // 충돌이 계속 반복되면(저장소 응답 형식 차이 등) 방금 합친 값으로 그냥 저장 — 저장이 막혀 남의 변경도 못 받는 일 방지
      var noCheck = (S.conflicts || 0) >= 3;
      return req('POST', API, { items: batch.map(function (it) { var o = { key: it.key, value: it.value }; if (it.ifVer != null && !noCheck) o.ifVer = it.ifVer; return o; }) }, 30000);
    }).then(function (j) {
      S.inflight = false; S.lastOk = Date.now(); S.conflicts = 0; S.lastErr = ''; S.inflightKeys = {};
      batch.forEach(function (it) {
        S.base[it.key] = it.value;
        if (S.pending[it.key] === it.value) { delete S.pending[it.key]; delete S.writeBase[it.key]; }
        else if (Object.prototype.hasOwnProperty.call(S.pending, it.key)) S.writeBase[it.key] = it.orig != null ? it.orig : it.value; // 올리는 사이 화면이 또 고침 → 기준은 화면이 그때 가진 값
      });
      if (j.rev) S.knownOwnRev = j.rev;
      savePend(); S.lastPush = Date.now();
      if (Object.keys(S.pending).length) flush(); else setStatus('ok');
    }).catch(function (e) {
      S.inflight = false; S.inflightKeys = {};
      if (/conflict/.test(String(e && e.message))) { S.conflicts = (S.conflicts || 0) + 1; S.lastErr = '충돌(다른 사람과 동시에 저장) ' + S.conflicts + '회'; S.lastErrT = Date.now(); clearTimeout(S.flushT); S.flushT = setTimeout(flush, 300); return; } // 바로 다시 합침
      console.warn('[공유 저장 실패 — 다시 시도]', e);
      S.lastErr = String(e && e.message || e); S.lastErrT = Date.now();
      if (batch.length > 1) S.small = true; // 여러 개를 한꺼번에 올리다 실패 → 다음엔 하나씩
      setStatus('error');
      clearTimeout(S.flushT); S.flushT = setTimeout(flush, 5000);
    });
  }

  // 서버 → 이 기기
  function applyItems(items, initial) {
    var changed = [], extra = [];
    items.forEach(function (it) {
      if (it.t > S.cursor) S.cursor = it.t;
      if (hasOwn(S.pending, it.key)) {
        // 아직 못 올린 내 변경이 있어도 남의 변경은 바로 합쳐서 보여 줌 (올리는 중인 값은 올릴 때 합침)
        if (isExtra(it.key) || (S.inflightKeys && S.inflightKeys[it.key])) return;
        var wb = hasOwn(S.writeBase, it.key) ? S.writeBase[it.key] : S.base[it.key];
        var mine = S.pending[it.key];
        if (it.value === '' || it.value === mine || it.value === wb) return;
        var mv = mergeText(wb, mine, it.value);
        S.writeBase[it.key] = it.value; S.base[it.key] = it.value;
        if (mv === it.value) { delete S.pending[it.key]; delete S.writeBase[it.key]; }
        else S.pending[it.key] = mv;
        savePend();
        if (ls.getItem('ws3_' + it.key) !== mv) { S.applying = true; try { origSet.call(ls, 'ws3_' + it.key, mv); } catch (e) {} finally { S.applying = false; } changed.push(it.key); }
        return;
      }
      if (!isExtra(it.key)) S.base[it.key] = it.value;
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
      S.lastPoll = Date.now();
      var force = !S.lastFull || Date.now() - S.lastFull > 20000; // 변경 시각이 늦게 갱신돼도 놓치지 않게
      if ((!j.rev || j.rev <= S.rev) && !force) return null;
      S.lastFull = Date.now();
      if (force && !(j.rev > S.rev)) return pullFrom(Math.max(0, S.cursor - 120000), false).then(function (acc) { applyItems(acc.items, false); });
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
      var serverVal = {};
      acc.items.forEach(function (it) { serverVal[it.key] = it.value; });
      // 지난번에 못 올린 변경 (창을 바로 닫은 경우 등)
      var pend = null; try { pend = JSON.parse(origGet.call(ls, PEND_KEY) || 'null'); } catch (e) {}
      var carry = {};
      if (pend) Object.keys(pend).forEach(function (k) {
        if (excluded(k)) return;
        var lv = origGet.call(ls, 'ws3_' + k);
        if (lv === null) return;
        if (pend[k] == null ? lv !== serverVal[k] : lv !== pend[k]) { carry[k] = lv; S.writeBase[k] = pend[k] == null ? undefined : pend[k]; }
      });
      // 공유 저장을 처음 쓰는 기기: 이 기기에만 있던 캘린더·작업 등은 서버 내용과 합쳐서 올림 (재고·입출고는 서버 우선)
      var firstTime = !origGet.call(ls, 'ws3_sync_seen');
      if (firstTime) {
        Object.keys(serverVal).forEach(function (k) {
          if (carry[k] != null || excluded(k) || isExtra(k) || !/^(leaves|holidays|plans|repairs|rooms|buildings|week_\d+_\d+)$/.test(k)) return;
          var lv = origGet.call(ls, 'ws3_' + k);
          if (lv !== null && lv !== serverVal[k] && serverVal[k] !== '') { carry[k] = lv; S.writeBase[k] = undefined; }
        });
      }
      applyItems(acc.items.filter(function (it) { return carry[it.key] == null; }), true);
      Object.keys(carry).forEach(function (k) { S.pending[k] = carry[k]; S.base[k] = serverVal[k]; });
      if (Object.keys(carry).length) console.log('[공유 저장] 이 기기에만 있던 변경 이어서 올림:', Object.keys(carry).join(','));
      try { origSet.call(ls, 'ws3_sync_seen', '1'); } catch (e) {}
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
      savePend();
      if (Object.keys(S.pending).length) flush(); else setStatus('ok');
      S.lastFull = Date.now();
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
      badge.style.cssText = 'position:fixed;left:10px;z-index:9990;font:600 11px/1 Pretendard,-apple-system,"Malgun Gothic",sans-serif;padding:6px 10px;border-radius:99px;box-shadow:0 2px 8px rgba(0,0,0,.15);cursor:pointer;transition:opacity .3s';
      badge.title = '눌러서 공유 상태 보기';
      badge.onclick = openDiag;
      document.body.appendChild(badge);
    }
    badge.style.bottom = document.getElementById('sumBar') ? '62px' : '10px';
    var m = { ok: ['☁ 공유 저장됨', '#ecfdf5', '#047857'], saving: ['⟳ 공유 저장 중…', '#eff6ff', '#1d4ed8'], error: ['⚠ 연결 끊김 — 다시 시도 중 (이 기기엔 저장됨)', '#fff7ed', '#c2410c'], off: ['⚠ 공유 저장 꺼짐 — 이 기기에만 저장', '#fef2f2', '#b91c1c'] }[s] || ['', '#fff', '#000'];
    badge.textContent = m[0]; badge.style.background = m[1]; badge.style.color = m[2];
  }

  // ── 공유 상태 창 (배지를 누르면): 이 기기와 서버의 상태를 비교해 문제를 바로 확인
  function fmtT(t) { if (!t) return '-'; var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0'); }
  function ago(t) { if (!t) return '없음'; var s = Math.round((Date.now() - t) / 1000); return s < 60 ? s + '초 전' : Math.round(s / 60) + '분 전'; }
  function openDiag() {
    var old = document.getElementById('ws3Diag'); if (old) { old.remove(); return; }
    var box = document.createElement('div'); box.id = 'ws3Diag';
    box.style.cssText = 'position:fixed;left:10px;bottom:' + (document.getElementById('sumBar') ? '96px' : '44px') + ';z-index:9991;width:min(430px,94vw);max-height:70vh;overflow:auto;background:#fff;border:1px solid #d1d6db;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);font:12px/1.55 Pretendard,-apple-system,"Malgun Gothic",sans-serif;color:#333;padding:12px 14px';
    box.innerHTML = '<b style="font-size:13px">☁ 공유 상태</b> <span style="color:#888">확인 중…</span>';
    document.body.appendChild(box);
    var lines = [
      '주소: ' + location.host + (shared ? '' : ' <b style="color:#b91c1c">(공유 저장 안 되는 주소)</b>'),
      '상태: <b>' + ({ ok: '공유 저장됨', saving: '저장 중', error: '연결 끊김', off: '꺼짐' }[S.status] || S.status) + '</b>',
      '못 올린 변경: ' + (Object.keys(S.pending).length ? '<b style="color:#c2410c">' + Object.keys(S.pending).join(', ') + '</b>' : '없음'),
      '마지막 확인: ' + ago(S.lastPoll) + ' · 마지막 올림: ' + ago(S.lastPush),
      S.lastErr ? '<span style="color:#b91c1c">최근 저장 실패: ' + String(S.lastErr).replace(/</g, '&lt;') + ' (' + ago(S.lastErrT) + ')</span>' : ''
    ].filter(Boolean);
    var render = function (extra) {
      box.innerHTML = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><b style="font-size:13px">☁ 공유 상태</b><span style="flex:1"></span>' +
        '<button id="ws3DiagSync" style="border:1px solid #3182f6;background:#3182f6;color:#fff;border-radius:6px;padding:3px 9px;cursor:pointer;font-size:12px">지금 다시 맞추기</button>' +
        '<button id="ws3DiagClose" style="border:1px solid #d1d6db;background:#fff;border-radius:6px;padding:3px 8px;cursor:pointer">✕</button></div>' + lines.join('<br>') + (extra || '');
      document.getElementById('ws3DiagClose').onclick = function () { box.remove(); };
      document.getElementById('ws3DiagSync').onclick = function () { this.disabled = true; this.textContent = '맞추는 중…'; resync().then(function () { box.remove(); openDiag(); }); };
    };
    render();
    if (!S.enabled) return;
    req('GET', API + '?diag=1', null, 15000).then(function (j) {
      var rows = (j.keys || []).filter(function (k) { return !isExtra(k.key) && !excluded(k.key); }).sort(function (a, b) { return b.t - a.t; });
      var diff = 0;
      var tr = rows.slice(0, 40).map(function (k) {
        var lv = origGet.call(ls, 'ws3_' + k.key);
        var st = lv === null ? (k.size ? '<span style="color:#b91c1c">이 기기에 없음</span>' : '') : (S.base[k.key] !== undefined && lv !== S.base[k.key] && !hasOwn(S.pending, k.key) ? '<span style="color:#c2410c">다름</span>' : (hasOwn(S.pending, k.key) ? '<span style="color:#c2410c">올리는 중</span>' : '✓'));
        if (st && st !== '✓') diff++;
        return '<tr><td>' + k.key + '</td><td>' + fmtT(k.t) + '</td><td style="text-align:right">' + Math.round(k.size / 102.4) / 10 + 'KB</td><td>' + st + '</td></tr>';
      }).join('');
      render('<div style="margin-top:8px;color:#666">서버에 저장된 항목 ' + rows.length + '개' + (diff ? ' · <b style="color:#c2410c">맞지 않는 항목 ' + diff + '개 → 「지금 다시 맞추기」</b>' : ' · 이 기기와 모두 일치') + '</div>' +
        '<table style="width:100%;border-collapse:collapse;margin-top:4px;font-size:11px"><tr style="color:#888;text-align:left"><th>항목</th><th>서버 저장 시각</th><th>크기</th><th>이 기기</th></tr>' + tr + '</table>');
    }).catch(function (e) { render('<div style="margin-top:8px;color:#b91c1c">서버 확인 실패: ' + (e && e.message) + '</div>'); });
  }
  // 처음부터 다시 받아 맞추기 (못 올린 변경은 먼저 올림)
  function resync() {
    var p = Object.keys(S.pending).length ? new Promise(function (r) { flush(); var t = setInterval(function () { if (!S.inflight && !Object.keys(S.pending).length) { clearInterval(t); r(); } }, 300); setTimeout(function () { clearInterval(t); r(); }, 15000); }) : Promise.resolve();
    return p.then(function () { return pullFrom(0, false); }).then(function (acc) { applyItems(acc.items, false); S.rev = Math.max(S.rev, acc.rev || 0); S.lastFull = Date.now(); setStatus(Object.keys(S.pending).length ? 'saving' : 'ok'); }).catch(function () { setStatus('error'); });
  }

  window.ws3Sync = {
    shared: shared,
    get enabled() { return S.enabled; },
    get ready() { return S.ready; },
    get serverEmpty() { return !!S.serverEmpty; },
    get status() { return S.status; },
    api: API,
    hasPending: function () { return Object.keys(S.pending).length > 0; },
    put: function (key, value) { if (syncable('ws3_' + key) && !excluded(key)) queue(key, value == null ? '' : String(value)); },
    on: function (prefix, fn) { S.listeners.push({ prefix: prefix, fn: fn }); },
    flushNow: flush,
    resync: resync,
    openDiag: openDiag,
    pollNow: function () { clearTimeout(S.pollT); poll(); },
    // 화면이 이 값을 불러와 화면 상태로 삼았다고 알림 (입력 중이라 새 값 반영을 미뤄둔 경우의 합치기 기준)
    markLoaded: function (lsKey) { if (shared && syncable(lsKey)) { var v = origGet.call(ls, lsKey); S.loaded[lsKey.slice(4)] = v === null ? undefined : v; } },
    _state: S
  };

  if (shared) start();
})();
