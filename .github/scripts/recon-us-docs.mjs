// 스톡나우 OAuth 메타데이터 (읽기 전용, 호출 한도 안 씀)
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("audit-out", { recursive: true });
const out = {};
for (const p of ["/.well-known/oauth-authorization-server", "/.well-known/oauth-protected-resource/mcp", "/.well-known/openid-configuration"]) {
  out[p] = await fetch("https://mcp.stocknow.ai" + p).then(async (r) => ({ s: r.status, t: (await r.text()).slice(0, 1500) })).catch((e) => String(e));
}
writeFileSync("audit-out/stocknow-oauth.json", JSON.stringify(out, null, 1));
