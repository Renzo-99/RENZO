"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useReportStore } from "@/stores/reportStore";
import { useHolidayStore } from "@/stores/holidayStore";
import { useLeaveStore } from "@/stores/leaveStore";
import { usePlanStore } from "@/stores/planStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday, getISOWeek, getISOWeekYear } from "date-fns";
import { ko } from "date-fns/locale";
import CalendarDayModal from "./CalendarDayModal";

interface CalendarTask {
  desc: string;
  building?: string;
  note?: string;
  weekYear: number;
  weekNum: number;
  dayIndex: number;
}

export default function CalendarModal({ onClose }: { onClose: () => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { holidays, loadHolidays } = useHolidayStore();
  const { leaves, loadLeaves } = useLeaveStore();
  const { plans, loadPlans } = usePlanStore();

  useEffect(() => {
    loadHolidays();
    loadLeaves();
    loadPlans();
  }, [loadHolidays, loadLeaves, loadPlans]);

  // Fetch tasks for the displayed month from reports
  const [monthTasks, setMonthTasks] = useState<Record<string, CalendarTask[]>>({});

  const fetchMonthTasks = useCallback(async () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Calculate weeks that overlap this month
    const tasks: Record<string, CalendarTask[]> = {};
    const startWeek = getISOWeek(monthStart);
    const startYear = getISOWeekYear(monthStart);
    const endWeek = getISOWeek(monthEnd);
    const endYear = getISOWeekYear(monthEnd);

    // Fetch reports for each week in this month
    const weeksToFetch: { year: number; week: number }[] = [];
    let y = startYear, w = startWeek;
    for (let i = 0; i < 7; i++) {
      weeksToFetch.push({ year: y, week: w });
      if (y === endYear && w === endWeek) break;
      w++;
      if (w > 52) { w = 1; y++; }
    }

    for (const { year, week } of weeksToFetch) {
      try {
        const res = await fetch(`/api/reports?year=${year}&week=${week}`);
        if (!res.ok) continue;
        const report = await res.json();
        if (!report || !report.tasks) continue;

        const startDate = new Date(report.start_date + "T00:00:00");
        for (const task of report.tasks) {
          const taskDate = addDays(startDate, task.day_of_week);
          const dateStr = format(taskDate, "yyyy-MM-dd");
          if (!tasks[dateStr]) tasks[dateStr] = [];
          tasks[dateStr].push({
            desc: task.description || "(내용 없음)",
            building: task.note,
            weekYear: year,
            weekNum: week,
            dayIndex: task.day_of_week,
          });
        }
      } catch { /* skip */ }
    }

    setMonthTasks(tasks);
  }, [currentMonth]);

  useEffect(() => {
    fetchMonthTasks();
  }, [fetchMonthTasks]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const getDateInfo = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayOfWeek = date.getDay();
    const holidayName = holidays[dateStr];
    const dayLeaves = leaves.filter((l) => l.date === dateStr);
    const dayTasks = monthTasks[dateStr] || [];
    const dayPlans = plans.filter((p) => {
      if (p.dateEnd) {
        return dateStr >= p.date && dateStr <= p.dateEnd;
      }
      return p.date === dateStr;
    });

    return {
      dateStr,
      dayOfWeek,
      holidayName,
      dayLeaves,
      dayTasks,
      dayPlans,
      isCurrentMonth: isSameMonth(date, currentMonth),
      isToday: isToday(date),
      isSunday: dayOfWeek === 0,
      isSaturday: dayOfWeek === 6,
    };
  };

  const goToWeek = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const year = getISOWeekYear(date);
    const week = getISOWeek(date);
    useReportStore.getState().setWeek(year, week);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-bold">
              {format(currentMonth, "yyyy년 M월", { locale: ko })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              오늘
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {["월", "화", "수", "목", "금", "토", "일"].map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-xs font-medium ${
                i === 6 ? "text-red-400" : i === 5 ? "text-blue-400" : "text-gray-500"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 auto-rows-[minmax(80px,1fr)]">
            {calendarDays.map((date) => {
              const info = getDateInfo(date);
              return (
                <div
                  key={info.dateStr}
                  className={`border-b border-r p-1 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !info.isCurrentMonth ? "bg-gray-50/50" : ""
                  }`}
                  onClick={() => setSelectedDate(info.dateStr)}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs leading-none ${
                        info.isToday
                          ? "bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center"
                          : info.holidayName || info.isSunday
                            ? "text-red-500"
                            : info.isSaturday
                              ? "text-blue-500"
                              : !info.isCurrentMonth
                                ? "text-gray-300"
                                : "text-gray-700"
                      }`}
                    >
                      {format(date, "d")}
                    </span>
                    {info.holidayName && (
                      <span className="text-[9px] text-red-400 truncate">{info.holidayName}</span>
                    )}
                  </div>

                  {/* Events */}
                  <div className="mt-0.5 space-y-0.5">
                    {info.dayLeaves.map((l, i) => (
                      <div key={i} className="text-[9px] bg-purple-50 text-purple-600 rounded px-1 truncate">
                        {l.who} {l.type}
                      </div>
                    ))}
                    {info.dayTasks.slice(0, 2).map((t, i) => (
                      <div key={i} className="text-[9px] bg-blue-50 text-blue-700 rounded px-1 truncate">
                        {t.desc}
                      </div>
                    ))}
                    {info.dayTasks.length > 2 && (
                      <div className="text-[9px] text-gray-400">+{info.dayTasks.length - 2}건</div>
                    )}
                    {info.dayPlans.slice(0, 1).map((p, i) => (
                      <div key={i} className="text-[9px] bg-amber-50 text-amber-700 rounded px-1 truncate">
                        [예정] {p.desc}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDate && (
        <CalendarDayModal
          dateStr={selectedDate}
          tasks={monthTasks[selectedDate] || []}
          onClose={() => setSelectedDate(null)}
          onGoToWeek={goToWeek}
        />
      )}
    </div>
  );
}
