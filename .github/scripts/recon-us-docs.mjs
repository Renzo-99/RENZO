/** 정찰: 토스 채권 지표 응답 원본 구조 (키 이름 확정) */
const UA = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
  referer: "https://tossinvest.com/",
  origin: "https://tossinvest.com",
};
const res = await fetch("https://wts-cert-api.tossinvest.com/api/v1/dashboard/wts/overview/indicator/bond", {
  headers: UA, signal: AbortSignal.timeout(12000),
});
const text = await res.text();
console.log(`HTTP ${res.status} · ${text.length}B`);
const body = JSON.parse(text);
console.log("result 키:", Object.keys(body.result ?? {}));
const arrKey = Object.keys(body.result ?? {}).find((k) => Array.isArray(body.result[k]));
console.log("배열 키:", arrKey, "길이:", body.result?.[arrKey]?.length);
const first = body.result?.[arrKey]?.[0];
console.log("\n=== 첫 항목 ===\n" + JSON.stringify(first, null, 1).slice(0, 1400));
const kr10 = (body.result?.[arrKey] ?? []).find((i) => JSON.stringify(i).includes("10년") || i.code === "KR1BENCH0010");
console.log("\n=== 한국 10년 ===\n" + JSON.stringify(kr10, null, 1).slice(0, 1400));
