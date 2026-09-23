// 검사가 남긴 '검증*' 그룹만 지운다 — 화면 조작 없이 저장소에 직접, 지우기 전후를 그대로 찍는다
const BASE = "https://stock-dashboard-jaeyeon.vercel.app";

const show = (b) => (b?.groups ?? []).map((g) => {
  const parent = (b.groups.find((x) => x.id === g.parentId) ?? {}).name;
  return `${parent ? `${parent} > ` : ""}${g.name}: [${g.items.map((i) => `${i.symbol} ${i.name}`).join(", ")}]`;
});

const before = (await fetch(`${BASE}/api/watchlist/board`).then((r) => r.json())).board;
console.log("[지우기 전]");
for (const l of show(before)) console.log(`  ${l}`);

const doomed = new Set((before?.groups ?? []).filter((g) => g.name.startsWith("검증")).map((g) => g.id));
if (doomed.size === 0) {
  console.log("\n검증 그룹이 없습니다 — 치울 것 없음");
} else {
  const next = { ...before, groups: before.groups.filter((g) => !doomed.has(g.id)) };
  const res = await fetch(`${BASE}/api/watchlist/board`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ board: next }),
  });
  console.log(`\n[삭제] ${doomed.size}개 그룹 · HTTP ${res.status}`);
  await new Promise((r) => setTimeout(r, 3000));
  const after = (await fetch(`${BASE}/api/watchlist/board`).then((r) => r.json())).board;
  console.log("[지운 뒤]");
  for (const l of show(after)) console.log(`  ${l}`);
  console.log(`[남은 검증 그룹] ${(after?.groups ?? []).filter((g) => g.name.startsWith("검증")).length}개`);
}
