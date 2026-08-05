"use client";

import { cn } from "@/lib/utils";

interface Props {
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function StockPrice({ name, price, change, changePercent }: Props) {
  const isUp = change > 0;
  const isDown = change < 0;
  const sign = isUp ? "+" : "";

  return (
    <div className="bg-white rounded-[16px] p-5 shadow-[var(--shadow-toss)]">
      <p className="text-[13px] text-gray-500 mb-1">{name}</p>
      <p className="text-[28px] font-bold text-gray-900 tracking-tight">
        {price.toLocaleString()}원
      </p>
      <div className="flex items-center gap-1.5 mt-1">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-[6px] px-2 py-0.5 text-[13px] font-semibold",
            isUp
              ? "bg-[#FFF0F1] text-stock-up"
              : isDown
                ? "bg-[#F0F5FF] text-stock-down"
                : "bg-gray-100 text-gray-500"
          )}
        >
          {isUp ? "▲" : isDown ? "▼" : ""}
          {sign}{change.toLocaleString()}원 ({sign}{changePercent.toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}
