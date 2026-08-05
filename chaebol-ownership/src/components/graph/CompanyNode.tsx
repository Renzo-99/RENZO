"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

const ACCENT_COLORS: Record<string, string> = {
  holding: "var(--color-node-holding)",
  subsidiary: "var(--color-node-subsidiary)",
  individual: "var(--color-node-individual)",
};

const ENTITY_LABELS: Record<string, string> = {
  holding: "지주",
  subsidiary: "계열사",
  individual: "총수",
};

function CompanyNode({ data }: NodeProps) {
  const entityType = data.entityType as string;
  const accentColor = ACCENT_COLORS[entityType] ?? "#8B95A1";
  const entityLabel = ENTITY_LABELS[entityType] ?? "";
  const price = data.stockPrice as number | null;
  const changePercent = data.priceChangePercent as number | null;
  const isListed = data.isListed as boolean;
  const stockCode = data.stockCode as string | null;
  const ticker = data.ticker as string;

  const sign = changePercent && changePercent > 0 ? "+" : "";

  return (
    <div
      className={cn(
        "min-w-[210px] rounded-[12px] shadow-[var(--shadow-toss)] overflow-hidden transition-shadow hover:shadow-[var(--shadow-toss-lg)]",
        isListed ? "bg-white" : "bg-gray-50 border border-dashed border-gray-200"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300 !w-2 !h-2" />

      {/* 상단 컬러 바 */}
      <div className="h-[3px]" style={{ backgroundColor: accentColor }} />

      <div className="px-3 pt-2.5 pb-3">
        {/* 회사명 + entity/상장 뱃지 */}
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-[13px] font-bold text-gray-900 leading-tight">
            {data.companyName as string}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={cn(
                "text-[9px] rounded-[4px] px-1 py-px font-medium",
                isListed
                  ? "bg-[#E8F3FF] text-[#3182F6]"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              {isListed ? "상장" : "비상장"}
            </span>
            {entityLabel && (
              <span className="text-[9px] text-gray-400 bg-gray-100 rounded-[4px] px-1 py-px">
                {entityLabel}
              </span>
            )}
          </div>
        </div>

        {/* 티커 / 종목코드 */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {ticker && (
            <span className="text-[11px] text-gray-400">{ticker}</span>
          )}
          {stockCode && stockCode !== ticker && (
            <span className="text-[10px] text-gray-300">{stockCode}</span>
          )}
        </div>

        {/* 주가 영역 (상장사만) */}
        {isListed && price != null && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[13px] font-bold text-gray-900">
              {Number(price).toLocaleString()}원
            </span>
            {changePercent != null && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold",
                  changePercent > 0
                    ? "bg-[#FFF0F1] text-stock-up"
                    : changePercent < 0
                      ? "bg-[#F0F5FF] text-stock-down"
                      : "bg-gray-100 text-gray-500"
                )}
              >
                {changePercent > 0 ? "▲" : changePercent < 0 ? "▼" : ""}
                {sign}
                {Math.abs(changePercent).toFixed(2)}%
              </span>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-2 !h-2" />
    </div>
  );
}

export default memo(CompanyNode);
