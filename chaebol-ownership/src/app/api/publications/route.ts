import { NextResponse } from "next/server";
import { fetchAllPublications } from "@/lib/publications";

/** 1일 1회 갱신 (ISR) — 이후 요청은 캐시로 응답하고 백그라운드에서 재수집 */
export const revalidate = 86400;

export async function GET() {
  const feed = await fetchAllPublications();
  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
