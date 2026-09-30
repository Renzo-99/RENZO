// 스톡나우 Pro 기본값 라이브 확인 (읽기 전용)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const base = "https://stock-dashboard-jaeyeon.vercel.app";
let s = null;
for (let i = 0; i < 40; i++) {
  s = await fetch(`${base}/api/stocknow/status`).then((r) => r.json()).catch(() => null);
  if (s?.plan === "pro") break;
  await new Promise((r) => setTimeout(r, 15000));
}
writeFileSync("audit-out/sn-pro.json", JSON.stringify(s, null, 1));
