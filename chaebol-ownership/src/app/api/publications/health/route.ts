import { NextResponse } from "next/server";
import { fetchAllPublications } from "@/lib/publications";

/**
 * 소스별 연결 상태 실시간 진단 (캐시 없음)
 * 배포 직후 이 주소로 접속하면 어떤 소스가 정상/미설정/오류인지 바로 확인할 수 있다.
 * GET /api/publications/health
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await fetchAllPublications();
  const summary = feed.statuses.map((s) =>
    s.ok ? `✅ ${s.name}: ${s.count}건` : `❌ ${s.name}: ${s.error}`
  );
  return NextResponse.json(
    {
      checkedAt: feed.updatedAt,
      okCount: feed.statuses.filter((s) => s.ok).length,
      total: feed.statuses.length,
      summary,
      statuses: feed.statuses,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
