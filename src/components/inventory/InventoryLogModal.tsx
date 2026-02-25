"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Trash2, ArrowDown, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useReportStore } from "@/stores/reportStore";

interface LogRow {
  id: number;
  product_id: number;
  type: "inbound" | "outbound";
  quantity: number;
  memo?: string;
  logged_date: string;
  task_material_id?: number;
  product_name: string;
  product_code: string;
  product_unit: string;
}

interface InventoryLogModalProps {
  onClose: () => void;
}

export default function InventoryLogModal({ onClose }: InventoryLogModalProps) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/logs?limit=100");
      if (!res.ok) throw new Error("조회 실패");
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error("입출고 내역 로드 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDelete = async (log: LogRow) => {
    const typeLabel = log.type === "inbound" ? "입고" : "출고";
    if (!confirm(`${log.product_name} ${typeLabel} ${log.quantity}${log.product_unit} 내역을 삭제하시겠습니까?\n재고가 자동으로 조정됩니다.`)) return;

    setDeletingId(log.id);
    try {
      const res = await fetch(`/api/inventory/logs?id=${log.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      // 재고 갱신
      useInventoryStore.getState().fetchProducts();
      // 출고 내역이면 보고서도 갱신
      if (log.task_material_id) {
        const { selectedWeek, fetchReport } = useReportStore.getState();
        fetchReport(selectedWeek.year, selectedWeek.week);
      }
      await fetchLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split("T")[0].split("-");
    return `${parts[1]}.${parts[2]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] shadow-lg w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">입출고 내역</h2>
            <p className="text-xs text-gray-400 mt-0.5">총 {total}건</p>
          </div>
          <button onClick={onClose} className="cursor-pointer">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-8">불러오는 중...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">입출고 내역이 없습니다</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 group transition-colors"
                >
                  <div className="shrink-0">
                    {log.type === "inbound" ? (
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                        <ArrowDown className="h-3.5 w-3.5 text-toss-blue" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
                        <ArrowUp className="h-3.5 w-3.5 text-toss-red" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {log.product_code}
                      </span>
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {log.product_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400">{formatDate(log.logged_date)}</span>
                      {log.memo && (
                        <span className="text-[11px] text-gray-400 truncate">{log.memo}</span>
                      )}
                      {log.task_material_id && (
                        <span className="text-[10px] text-gray-300">작업연동</span>
                      )}
                    </div>
                  </div>

                  <Badge variant={log.type === "inbound" ? "success" : "destructive"}>
                    {log.type === "inbound" ? "+" : "-"}{log.quantity}{log.product_unit}
                  </Badge>

                  <button
                    onClick={() => handleDelete(log)}
                    disabled={deletingId === log.id}
                    className="p-1.5 rounded-[6px] hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-toss-red" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
