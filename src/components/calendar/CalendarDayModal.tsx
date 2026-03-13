"use client";

import { useMemo } from "react";
import { useHolidayStore } from "@/stores/holidayStore";
import { useLeaveStore, LEAVE_TYPES, AUTHORS } from "@/stores/leaveStore";
import { usePlanStore } from "@/stores/planStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface CalendarTask {
  desc: string;
  building?: string;
  note?: string;
  weekYear: number;
  weekNum: number;
  dayIndex: number;
}

interface Props {
  dateStr: string;
  tasks: CalendarTask[];
  onClose: () => void;
  onGoToWeek: (dateStr: string) => void;
}

export default function CalendarDayModal({ dateStr, tasks, onClose, onGoToWeek }: Props) {
  const { holidays, addHoliday, removeHoliday } = useHolidayStore();
  const { leaves, addLeave, removeLeave } = useLeaveStore();
  const { plans } = usePlanStore();

  const date = new Date(dateStr + "T00:00:00");
  const dateLabel = format(date, "M월 d일 (EEE)", { locale: ko });
  const holidayName = holidays[dateStr];

  const dayLeaves = useMemo(
    () => leaves.filter((l) => l.date === dateStr),
    [leaves, dateStr]
  );

  const dayPlans = useMemo(
    () =>
      plans.filter((p) => {
        if (p.dateEnd) return dateStr >= p.date && dateStr <= p.dateEnd;
        return p.date === dateStr;
      }),
    [plans, dateStr]
  );

  const handleAddLeave = (who: string, type: string) => {
    addLeave({ date: dateStr, who, type });
  };

  const handleAddHoliday = () => {
    const name = prompt("휴일 이름을 입력하세요:");
    if (name) addHoliday(dateStr, name);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="font-bold text-base">{dateLabel}</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onGoToWeek(dateStr)}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              해당 주차로 이동
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Holiday */}
          {holidayName ? (
            <div className="flex items-center justify-between bg-red-50 rounded-lg p-3">
              <span className="text-sm text-red-600 font-medium">{holidayName}</span>
              <button onClick={() => removeHoliday(dateStr)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddHoliday}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              + 휴일 추가
            </button>
          )}

          {/* Leaves */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">연차/휴가</h4>
            {dayLeaves.length > 0 ? (
              <div className="space-y-1">
                {dayLeaves.map((l, i) => (
                  <div key={i} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                    <span className="text-sm">
                      <span className="font-medium text-purple-700">{l.who}</span>
                      <span className="text-purple-500 ml-1.5">{l.type}</span>
                    </span>
                    <button onClick={() => removeLeave(l.date, l.who)} className="text-purple-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-300">등록된 연차가 없습니다</p>
            )}
            {/* Quick add leave */}
            <div className="mt-2 flex flex-wrap gap-1">
              {AUTHORS.filter((a) => !dayLeaves.find((l) => l.who === a)).map((who) => (
                <div key={who} className="relative group">
                  <button className="text-[10px] border border-dashed border-gray-300 rounded px-2 py-1 text-gray-400 hover:border-purple-400 hover:text-purple-500">
                    + {who}
                  </button>
                  <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-lg border p-1 hidden group-hover:block z-10">
                    {LEAVE_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleAddLeave(who, type)}
                        className="block w-full text-left text-xs px-2 py-1 hover:bg-purple-50 rounded"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">
              작업 ({tasks.length}건)
            </h4>
            {tasks.length > 0 ? (
              <div className="space-y-1">
                {tasks.map((t, i) => (
                  <div key={i} className="bg-blue-50 rounded-lg px-3 py-2">
                    <p className="text-sm text-blue-800">{t.desc}</p>
                    {t.building && (
                      <Badge variant="outline" className="text-[9px] mt-1">
                        {t.building}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-300">등록된 작업이 없습니다</p>
            )}
          </div>

          {/* Plans */}
          {dayPlans.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2">
                작업 예정 ({dayPlans.length}건)
              </h4>
              <div className="space-y-1">
                {dayPlans.map((p) => (
                  <div key={p.id} className={`rounded-lg px-3 py-2 ${p.done ? "bg-gray-50" : "bg-amber-50"}`}>
                    <p className={`text-sm ${p.done ? "text-gray-400 line-through" : "text-amber-800"}`}>
                      {p.desc}
                    </p>
                    {p.building && (
                      <Badge variant="outline" className="text-[9px] mt-1">
                        {p.building}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
