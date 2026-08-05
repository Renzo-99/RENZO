import { NextRequest, NextResponse } from "next/server";

interface StockData {
  code: string;
  price: number;
  changePercent: number;
}

// 종목코드별 마켓 접미사 캐시 (.KS = KOSPI, .KQ = KOSDAQ)
const marketSuffixCache = new Map<string, string>();

/**
 * Yahoo Finance API로 실시간 주가 조회
 * GET /api/stock?codes=005930,000660,035720
 */
export async function GET(request: NextRequest) {
  const codes = request.nextUrl.searchParams.get("codes");

  if (!codes) {
    return NextResponse.json(
      { error: "codes 파라미터가 필요합니다" },
      { status: 400 }
    );
  }

  const codeList = codes.split(",").filter(Boolean);
  if (codeList.length === 0) {
    return NextResponse.json(
      { error: "유효한 종목코드가 없습니다" },
      { status: 400 }
    );
  }

  const limitedCodes = codeList.slice(0, 50);

  try {
    const results = await fetchStockPrices(limitedCodes);
    return NextResponse.json(
      { data: results },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("주가 조회 실패:", error);
    return NextResponse.json(
      { error: "주가 데이터를 가져올 수 없습니다" },
      { status: 500 }
    );
  }
}

async function fetchStockPrices(codes: string[]): Promise<StockData[]> {
  const promises = codes.map((code) => fetchSingleStock(code));
  const results = await Promise.allSettled(promises);

  return results
    .filter(
      (r): r is PromiseFulfilledResult<StockData | null> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value!);
}

async function fetchSingleStock(code: string): Promise<StockData | null> {
  const cachedSuffix = marketSuffixCache.get(code);
  const suffixes = cachedSuffix ? [cachedSuffix] : [".KS", ".KQ"];

  for (const suffix of suffixes) {
    const symbol = `${code}${suffix}`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 30 },
    });

    if (!response.ok) continue;

    const json = await response.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) continue;

    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const changePercent =
      previousClose > 0
        ? ((price - previousClose) / previousClose) * 100
        : 0;

    marketSuffixCache.set(code, suffix);

    return {
      code,
      price: Math.round(price),
      changePercent: Math.round(changePercent * 100) / 100,
    };
  }

  return null;
}
