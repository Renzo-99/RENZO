"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/types";

interface InventoryItemProps {
  product: Product;
  weeklyChange: number;
}

export default memo(function InventoryItem({ product, weeklyChange }: InventoryItemProps) {
  const stockColor =
    product.current_stock === 0
      ? "text-gray-400"
      : product.current_stock <= 5
      ? "text-toss-red"
      : "text-gray-900";

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-gray-50 transition-colors">
      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded w-12 text-center shrink-0">
        {product.code}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
        <p className="text-[11px] text-gray-400">
          입고 {product.total_in} · 출고 {product.total_out}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {weeklyChange !== 0 && (
          <Badge variant={weeklyChange > 0 ? "success" : "destructive"}>
            {weeklyChange > 0 ? `+${weeklyChange}` : weeklyChange}
          </Badge>
        )}
        <span className={`text-lg font-extrabold ${stockColor} min-w-[32px] text-right`}>
          {product.current_stock}
        </span>
        <span className="text-xs text-gray-400">{product.unit}</span>
      </div>
    </div>
  );
});
