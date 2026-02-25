"use client";

import { useReportStore } from "@/stores/reportStore";
import DaySection from "./DaySection";
import WeeklySummary from "./WeeklySummary";

export default function ReportPanel() {
  const { days, isLoading } = useReportStore();

  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        <WeeklySummary />
        {days.map((day) => (
          <DaySection key={day.dayOfWeek} day={day} />
        ))}
      </div>
    </div>
  );
}
