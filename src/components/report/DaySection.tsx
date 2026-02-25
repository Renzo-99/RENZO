"use client";

import { memo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportStore } from "@/stores/reportStore";
import TaskCard from "./TaskCard";
import type { DayData } from "@/types";

interface DaySectionProps {
  day: DayData;
}

export default memo(function DaySection({ day }: DaySectionProps) {
  const { addTask } = useReportStore();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-toss-blue" />
          <h3 className="text-base font-semibold text-gray-800">{day.dayName}</h3>
          <span className="text-sm text-gray-500">{day.date}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-toss-blue hover:text-toss-blue-dark"
          onClick={() => addTask(day.dayOfWeek)}
        >
          <Plus className="h-4 w-4 mr-1" />
          작업 추가
        </Button>
      </div>

      <div className="space-y-2">
        {day.tasks.length === 0 ? (
          <p className="text-sm text-gray-400 pl-4">작업이 없습니다</p>
        ) : (
          day.tasks.map((task, idx) => (
            <TaskCard key={task.id} task={task} index={idx + 1} />
          ))
        )}
      </div>
    </div>
  );
});
