// 스톡나우 한글 속보·틱 라이브 확인
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const base = "https://stock-dashboard-jaeyeon.vercel.app";
let b = null;
for (let i = 0; i < 40; i++) {
  b = await fetch(`${base}/api/stocknow/feed?kind=breaking`).then((r) => r.json()).catch(() => null);
  if (b?.items?.some((x) => /[가-힣]/.test(x.title))) break;
  await new Promise((r) => setTimeout(r, 20000));
}
const t = await fetch(`${base}/api/stocknow/tick`).then((r) => r.json()).catch((e) => String(e));
const st = await fetch(`${base}/api/stocknow/status`).then((r) => r.json());
writeFileSync("audit-out/sn-ko.json", JSON.stringify({
  n: b?.items?.length, ko: b?.items?.filter((x) => /[가-힣]/.test(x.title)).length, withImpact: b?.items?.filter((x) => x.impact != null).length,
  sample: b?.items?.slice(0, 6).map((x) => [x.at, x.title, x.impact, x.section, x.mine, x.summary?.slice(0, 60)]), names: Object.keys(b?.names ?? {}).length, tick: t, status: st,
}, null, 1));
