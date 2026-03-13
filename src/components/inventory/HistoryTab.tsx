"use client";

import { useState, useEffect } from "react";
import type { InventoryLog } from "@/types";
import { Badge } from "@/components/ui/badge";

export default function HistoryTab() {
  const [logs, setLogs] = useState<(InventoryLog & { product?: { code: string; name: string } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inventory/logs?limit=200");
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error("입출고 내역 로드 실패:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-400 text-center py-8">불러오는 중...</p>;
  }

  if (logs.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">입출고 내역이 없습니다</p>;
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant={log.type === "inbound" ? "success" : "destructive"} className="text-[10px] shrink-0">
              {log.type === "inbound" ? "입고" : "출고"}
            </Badge>
            <span className="text-gray-500 text-xs shrink-0">{log.logged_date}</span>
            <span className="truncate font-medium text-gray-800">
              {log.product?.name || `#${log.product_id}`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className={`font-semibold ${log.type === "inbound" ? "text-green-600" : "text-red-600"}`}>
              {log.type === "inbound" ? "+" : "-"}{log.quantity}
            </span>
            {log.memo && (
              <span className="text-xs text-gray-400 max-w-[80px] truncate" title={log.memo}>
                {log.memo}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
