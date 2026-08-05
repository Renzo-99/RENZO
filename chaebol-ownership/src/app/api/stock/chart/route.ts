import { NextRequest, NextResponse } from "next/server";

/**
 * Yahoo Finance 차트 데이터 조회
 * GET /api/stock/chart?code=005930&range=1mo
 *
 * range: 1d, 5d, 1mo, 3mo, 6mo, 1y
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const range = request.nextUrl.searchParams.get("range") ?? "1mo";

  if (!code) {
    return NextResponse.json({ error: "code 파라미터가 필요합니다" }, { status: 400 });
  }

  const validRanges = ["1d", "5d", "1mo", "3mo", "6mo", "1y"];
  if (!validRanges.includes(range)) {
    return NextResponse.json({ error: "유효하지 않은 range" }, { status: 400 });
  }

  // range에 따른 interval 결정
  const intervalMap: Record<string, string> = {
    "1d": "5m",
    "5d": "15m",
    "1mo": "1d",
    "3mo": "1d",
    "6mo": "1wk",
    "1y": "1wk",
  };

  const interval = intervalMap[range] ?? "1d";

  try {
    const data = await fetchChart(code, range, interval);
    if (!data) {
      return NextResponse.json({ error: "차트 데이터를 찾을 수 없습니다" }, { status: 404 });
    }

    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "차트 데이터 조회 실패" }, { status: 500 });
  }
}

interface ChartPoint {
  time: number;
  close: number;
}

interface ChartData {
  code: string;
  points: ChartPoint[];
  previousClose: number;
  currentPrice: number;
}

async function fetchChart(
  code: string,
  range: string,
  interval: string
): Promise<ChartData | null> {
  const suffixes = [".KS", ".KQ"];

  for (const suffix of suffixes) {
    const symbol = `${code}${suffix}`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 60 },
    });

    if (!response.ok) continue;

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    if (!result) continue;

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] =
      result.indicators?.quote?.[0]?.close ?? [];
    const meta = result.meta;

    if (timestamps.length === 0) continue;

    const points: ChartPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null) {
        points.push({ time: timestamps[i], close: closes[i]! });
      }
    }

    return {
      code,
      points,
      previousClose: meta?.chartPreviousClose ?? meta?.previousClose ?? 0,
      currentPrice: meta?.regularMarketPrice ?? 0,
    };
  }

  return null;
}
