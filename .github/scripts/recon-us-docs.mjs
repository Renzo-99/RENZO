// 스톡나우 연동 라이브 확인 (읽기 전용 — 스톡나우 도구 호출 없음)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const base = "https://stock-dashboard-jaeyeon.vercel.app";
const out = {};
const want = "bcc9475";
for (let i = 0; i < 40; i++) {
  const r = await fetch(`${base}/api/stocknow/status`).catch(() => null);
  if (r && r.ok) { out.status = await r.json(); break; }
  await new Promise((s) => setTimeout(s, 15000));
}
const c = await fetch(`${base}/api/stocknow/connect`, { redirect: "manual" });
const loc = c.headers.get("location") ?? "";
out.connect = { status: c.status, host: loc ? new URL(loc).host + new URL(loc).pathname : null, hasClient: /client_id=/.test(loc), err: new URL(loc, base).searchParams.get("sn_error") };
const html = await fetch(`${base}/`).then((r) => r.text());
out.section = html.includes('id="stocknow"');
out.feed = await fetch(`${base}/api/stocknow/feed?kind=filings`).then((r) => r.json()).catch((e) => String(e));
writeFileSync("audit-out/sn-live.json", JSON.stringify(out, null, 1));
