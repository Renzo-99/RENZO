"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatPrice, formatPercent } from "@/lib/utils";

interface StockPriceChipProps {
  price: number;
  change: number;
  changePercent: number;
  size?: "sm" | "md";
}

export function StockPriceChip({
  price,
  change,
  changePercent,
  size = "sm",
}: StockPriceChipProps) {
  const isUp = change > 0;
  const isDown = change < 0;

  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const colorClass = isUp
    ? "text-red-400"
    : isDown
    ? "text-blue-400"
    : "text-gray-400";
  const bgClass = isUp
    ? "bg-red-500/10"
    : isDown
    ? "bg-blue-500/10"
    : "bg-gray-500/10";

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        size === "sm" ? "text-xs" : "text-sm"
      )}
    >
      <span className="font-bold text-foreground">{formatPrice(price)}</span>
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg px-2 py-0.5 font-semibold",
          bgClass,
          colorClass
        )}
      >
        <Icon className={cn(size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />
        <span>
          {isUp ? "+" : ""}
          {formatPercent(changePercent)}
        </span>
      </div>
    </div>
  );
}
