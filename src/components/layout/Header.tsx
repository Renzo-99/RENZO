"use client";

import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportStore } from "@/stores/reportStore";
import { formatWeekRangeWithDay } from "@/utils/dateUtils";

export default function Header() {
  const { currentReport, selectedWeek, navigateWeek } = useReportStore();

  const dateRangeWithDay = currentReport
    ? formatWeekRangeWithDay(currentReport.start_date, currentReport.end_date)
    : "";

  const handleExport = async () => {
    if (!currentReport) return;
    try {
      const res = await fetch(`/api/export?reportId=${currentReport.id}`);
      if (!res.ok) throw new Error(`보고서 생성 실패 (HTTP ${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `주간업무보고_${selectedWeek.year}_${selectedWeek.week}주차.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "보고서 다운로드 실패");
    }
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-gray-900">목공실 관리</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigateWeek("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center min-w-[200px]">
          <p className="text-sm font-semibold text-gray-800">
            {selectedWeek.year}년 {selectedWeek.week}주차
          </p>
          {dateRangeWithDay && (
            <p className="text-[11px] text-gray-400 mt-0.5">{dateRangeWithDay}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigateWeek("next")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button variant="outline" size="sm" onClick={handleExport}>
        <FileDown className="h-4 w-4 mr-1.5" />
        보고서 다운로드
      </Button>
    </header>
  );
}
