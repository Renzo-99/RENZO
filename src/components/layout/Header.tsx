"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, Calendar, Building2, Printer, Palmtree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportStore } from "@/stores/reportStore";
import { formatWeekRangeWithDay } from "@/utils/dateUtils";
import CalendarModal from "@/components/calendar/CalendarModal";
import ClassroomModal from "@/components/classroom/ClassroomModal";
import LeaveManager from "@/components/leave/LeaveManager";

export default function Header() {
  const { currentReport, selectedWeek, navigateWeek } = useReportStore();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showClassroom, setShowClassroom] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
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

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setShowClassroom(true)} title="건물 호실 현황">
            <Building2 className="h-4 w-4 mr-1" />
            호실
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCalendar(true)} title="캘린더 보기">
            <Calendar className="h-4 w-4 mr-1" />
            캘린더
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowLeave(true)} title="연차/휴가 관리">
            <Palmtree className="h-4 w-4 mr-1" />
            연차
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} title="인쇄">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-1" />
            보고서
          </Button>
        </div>
      </header>

      {showCalendar && <CalendarModal onClose={() => setShowCalendar(false)} />}
      {showClassroom && <ClassroomModal onClose={() => setShowClassroom(false)} />}
      {showLeave && <LeaveManager onClose={() => setShowLeave(false)} />}
    </>
  );
}
