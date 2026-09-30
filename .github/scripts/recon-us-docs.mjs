// 배포된 키워드 API — 사전 종목과 사전에 없는 종목(자동 생성) 확인. 와치리스트는 건드리지 않는다
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
await new Promise((r) => setTimeout(r, 200_000)); // 배포 대기
const post = async () => {
  const r = await fetch("https://stock-dashboard-jaeyeon.vercel.app/api/watchlist/keywords", {
    method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(60000),
    body: JSON.stringify({ items: [
      { symbol: "NVDA", name: "NVIDIA" }, { symbol: "BA", name: "Boeing" }, { symbol: "ISRG", name: "Intuitive Surgical" },
      { symbol: "SOFI", name: "SoFi Technologies" }, { symbol: "DUOL", name: "Duolingo" }, { symbol: "000990", name: "DB하이텍" },
    ] }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const first = await post();
const second = await post();
writeFileSync("audit-out/keywords.json", JSON.stringify({ at: new Date().toISOString(), first, second }, null, 1));
console.log(JSON.stringify({ first, second }, null, 1));
