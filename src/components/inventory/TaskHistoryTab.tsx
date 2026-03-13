"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface WeekInfo {
  id: number;
  year: number;
  week_number: number;
  start_date: string;
  end_date: string;
  task_count?: number;
}

export default function TaskHistoryTab() {
  const [weeks, setWeeks] = useState<WeekInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWeeks();
  }, []);

  const fetchWeeks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports/weeks");
      if (!res.ok) throw new Error("Failed to fetch weeks");
      const data = await res.json();
      setWeeks(data.sort((a: WeekInfo, b: WeekInfo) =>
        b.year !== a.year ? b.year - a.year : b.week_number - a.week_number
      ));
    } catch (err) {
      console.error("주간 보고서 목록 로드 실패:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-400 text-center py-8">불러오는 중...</p>;
  }

  if (weeks.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">작업 내역이 없습니다</p>;
  }

  return (
    <div className="space-y-1">
      {weeks.map((w) => (
        <div
          key={w.id}
          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
          onClick={() => {
            const { useReportStore } = require("@/stores/reportStore");
            useReportStore.getState().setWeek(w.year, w.week_number);
          }}
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {w.year}년 {w.week_number}주차
            </Badge>
            <span className="text-xs text-gray-400">
              {w.start_date} ~ {w.end_date}
            </span>
          </div>
          {w.task_count !== undefined && (
            <span className="text-xs text-gray-500">{w.task_count}건</span>
          )}
        </div>
      ))}
    </div>
  );
}
