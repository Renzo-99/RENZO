"use client";

/**
 * 클라이언트에서 직접 Yahoo Finance 데이터를 가져오는 유틸
 * GitHub Pages (static export) 환경에서 사용
 *
 * Yahoo Finance는 CORS를 차단하므로 allorigins proxy를 경유
 */

const PROXY = "https://api.allorigins.win/raw?url=";

interface StockResult {
  code: string;
  price: number;
  changePercent: number;
}

const suffixCache = new Map<string, string>();

async function fetchSingleStock(code: string): Promise<StockResult | null> {
  const cached = suffixCache.get(code);
  const suffixes = cached ? [cached] : [".KS", ".KQ"];

  for (const suffix of suffixes) {
    const symbol = `${code}${suffix}`;
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const url = `${PROXY}${encodeURIComponent(yahooUrl)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) continue;

      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const changePercent =
        prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

      suffixCache.set(code, suffix);
      return {
        code,
        price: Math.round(price),
        changePercent: Math.round(changePercent * 100) / 100,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchStockPrices(
  codes: string[]
): Promise<StockResult[]> {
  const results = await Promise.allSettled(codes.map(fetchSingleStock));
  return results
    .filter(
      (r): r is PromiseFulfilledResult<StockResult | null> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value!);
}

export interface ChartPoint {
  time: number;
  close: number;
}

export interface ChartData {
  code: string;
  points: ChartPoint[];
  previousClose: number;
  currentPrice: number;
}

const INTERVAL_MAP: Record<string, string> = {
  "1d": "5m",
  "5d": "15m",
  "1mo": "1d",
  "3mo": "1d",
  "6mo": "1wk",
  "1y": "1wk",
};

export async function fetchStockChart(
  code: string,
  range: string
): Promise<ChartData | null> {
  const cached = suffixCache.get(code);
  const suffixes = cached ? [cached] : [".KS", ".KQ"];
  const interval = INTERVAL_MAP[range] ?? "1d";

  for (const suffix of suffixes) {
    const symbol = `${code}${suffix}`;
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
    const url = `${PROXY}${encodeURIComponent(yahooUrl)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
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

      suffixCache.set(code, suffix);
      return {
        code,
        points,
        previousClose: meta?.chartPreviousClose ?? meta?.previousClose ?? 0,
        currentPrice: meta?.regularMarketPrice ?? 0,
      };
    } catch {
      continue;
    }
  }
  return null;
}
