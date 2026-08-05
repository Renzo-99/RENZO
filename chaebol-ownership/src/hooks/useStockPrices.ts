"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { fetchStockPrices as fetchViaProxy } from "@/lib/yahoo";
import type { Company } from "@/types/database";

interface StockPrice {
  code: string;
  price: number;
  changePercent: number;
}

type StockPriceMap = Record<string, StockPrice>;

const REFRESH_INTERVAL = 60_000;

/** API 라우트로 주가 조회 (로컬/Vercel) */
async function fetchViaApi(codes: string[]): Promise<StockPrice[]> {
  const res = await fetch(`/api/stock?codes=${codes.join(",")}`);
  if (!res.ok) throw new Error("API failed");
  const json = await res.json();
  return json.data ?? [];
}

/** API 우선 시도, 실패 시 Yahoo 프록시 fallback */
async function fetchStockPrices(codes: string[]): Promise<StockPrice[]> {
  try {
    return await fetchViaApi(codes);
  } catch {
    return fetchViaProxy(codes);
  }
}

export function useStockPrices(companies: Company[]) {
  const [prices, setPrices] = useState<StockPriceMap>({});
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stockCodes = useMemo(
    () =>
      companies
        .filter((c) => c.is_listed && c.stock_code)
        .map((c) => c.stock_code as string)
        .sort(),
    [companies]
  );

  const codesKey = stockCodes.join(",");

  const fetchPrices = useCallback(async () => {
    if (!codesKey) return;
    const codes = codesKey.split(",");

    setLoading(true);
    try {
      const data = await fetchStockPrices(codes);
      const map: StockPriceMap = {};
      for (const item of data) {
        map[item.code] = item;
      }
      setPrices(map);
    } catch {
      // 주가 조회 실패는 무시
    } finally {
      setLoading(false);
    }
  }, [codesKey]);

  useEffect(() => {
    fetchPrices();

    if (!codesKey) return;
    intervalRef.current = setInterval(fetchPrices, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPrices, codesKey]);

  const enrichedCompanies: Company[] = companies.map((c) => {
    if (!c.stock_code || !prices[c.stock_code]) return c;
    const p = prices[c.stock_code];
    return {
      ...c,
      stock_price: p.price,
      price_change_percent: p.changePercent,
    };
  });

  return { enrichedCompanies, loading, refetch: fetchPrices };
}
