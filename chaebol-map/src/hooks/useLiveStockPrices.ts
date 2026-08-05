"use client";

import { useEffect, useRef, useState } from "react";
import type { Company } from "@/types";

interface StockQuote {
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
}

type PriceMap = Record<string, StockQuote>;

const CACHE_KEY = "chaebol-stock-prices";
const CACHE_TTL = 5 * 60 * 1000; // 5분 캐시

// Yahoo Finance API를 통해 한국 주가 조회
// KRX(KOSPI): 005930.KS, KOSDAQ: 068270.KQ
// CORS 프록시를 통해 브라우저에서 직접 호출
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

async function fetchWithCorsProxy(url: string): Promise<Response | null> {
  // 1) 직접 호출 시도 (같은 도메인이거나 CORS 허용된 경우)
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) return res;
  } catch { /* CORS 차단 등 */ }

  // 2) CORS 프록시 순차 시도
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url), { signal: AbortSignal.timeout(8000) });
      if (res.ok) return res;
    } catch { continue; }
  }
  return null;
}

async function fetchYahooQuote(stockCode: string): Promise<StockQuote | null> {
  const suffixes = [".KS", ".KQ"];

  for (const suffix of suffixes) {
    const ticker = stockCode + suffix;
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
      const res = await fetchWithCorsProxy(url);
      if (!res) continue;

      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) continue;

      const meta = result.meta;
      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose;
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
      const marketCap = Math.round(price * (meta.sharesOutstanding ?? 0) / 100_000_000);

      return {
        price: Math.round(price),
        change: Math.round(change),
        changePercent: Math.round(changePercent * 100) / 100,
        marketCap: marketCap > 0 ? marketCap : 0,
      };
    } catch {
      continue;
    }
  }
  return null;
}

// 여러 종목 배치 조회
async function fetchBatchQuotes(stockCodes: string[]): Promise<PriceMap> {
  const results: PriceMap = {};

  // 동시 요청 제한 (5개씩)
  const batchSize = 5;
  for (let i = 0; i < stockCodes.length; i += batchSize) {
    const batch = stockCodes.slice(i, i + batchSize);
    const promises = batch.map(async (code) => {
      const quote = await fetchYahooQuote(code);
      if (quote) results[code] = quote;
    });
    await Promise.all(promises);
  }

  return results;
}

// 캐시 관리
function getCachedPrices(): { data: PriceMap; timestamp: number } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCachedPrices(data: PriceMap) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // sessionStorage 용량 초과 등
  }
}

/** 회사 목록에 실시간 주가를 적용한 새 배열 반환 */
export function applyLivePrices(companies: Company[], prices: PriceMap): Company[] {
  return companies.map((c) => {
    if (!c.stockCode || !prices[c.stockCode]) return c;
    const q = prices[c.stockCode];
    return {
      ...c,
      stockPrice: q.price,
      priceChange: q.change,
      priceChangePercent: q.changePercent,
      marketCap: q.marketCap > 0 ? q.marketCap : c.marketCap,
    };
  });
}

/** 실시간 주가 조회 훅 */
export function useLiveStockPrices(companies: Company[]) {
  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;

    const stockCodes = companies
      .filter((c) => c.isListed && c.stockCode)
      .map((c) => c.stockCode!);

    if (stockCodes.length === 0) return;

    fetchedRef.current = true;

    async function loadPrices() {
      // 캐시 확인
      const cached = getCachedPrices();
      const now = Date.now();
      if (cached && now - cached.timestamp < CACHE_TTL) {
        return { data: cached.data, timestamp: cached.timestamp };
      }

      setLoading(true);
      const result = await fetchBatchQuotes(stockCodes);
      setLoading(false);

      if (Object.keys(result).length > 0) {
        setCachedPrices(result);
        return { data: result, timestamp: Date.now() };
      }
      return null;
    }

    loadPrices().then((result) => {
      if (result) {
        setPrices(result.data);
        setLastUpdate(new Date(result.timestamp));
      }
    });
  }, [companies]);

  const updatedCompanies = Object.keys(prices).length > 0
    ? applyLivePrices(companies, prices)
    : companies;

  return {
    companies: updatedCompanies,
    loading,
    lastUpdate,
    isLive: Object.keys(prices).length > 0,
  };
}
