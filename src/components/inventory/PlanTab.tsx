"use client";

import { useState, useEffect, useMemo } from "react";
import { usePlanStore, type Plan } from "@/stores/planStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, Trash2, X } from "lucide-react";

const BUILDINGS = [
  "경영대학", "인문사회관C", "제4학관", "제1공학관", "본관", "도서관",
  "학생회관", "과학관", "예술관", "체육관", "기숙사", "연구동",
];

export default function PlanTab() {
  const { plans, planFilter, loadPlans, addPlan, deletePlan, togglePlan, setPlanFilter } = usePlanStore();
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formDateEnd, setFormDateEnd] = useState("");
  const [formUseRange, setFormUseRange] = useState(false);
  const [formBuilding, setFormBuilding] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formNote, setFormNote] = useState("");

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const filtered = useMemo(() => {
    let list = [...plans];
    if (planFilter === "pending") list = list.filter((p) => !p.done);
    if (planFilter === "done") list = list.filter((p) => p.done);
    return list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.date.localeCompare(b.date);
    });
  }, [plans, planFilter]);

  const getDDay = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Today";
    return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
  };

  const handleSubmit = () => {
    if (!formDate || !formDesc) return;
    addPlan({
      date: formDate,
      dateEnd: formUseRange && formDateEnd ? formDateEnd : null,
      building: formBuilding,
      desc: formDesc,
      note: formNote,
      done: false,
    });
    setShowForm(false);
    setFormDate("");
    setFormDateEnd("");
    setFormUseRange(false);
    setFormBuilding("");
    setFormDesc("");
    setFormNote("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter buttons */}
      <div className="flex gap-1 mb-3">
        {([
          ["all", "전체"],
          ["pending", "예정"],
          ["done", "완료"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPlanFilter(key)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              planFilter === key
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex gap-2">
            <Input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="text-xs"
              placeholder="시작일"
            />
            <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
              <input
                type="checkbox"
                checked={formUseRange}
                onChange={(e) => setFormUseRange(e.target.checked)}
              />
              기간
            </label>
          </div>
          {formUseRange && (
            <Input
              type="date"
              value={formDateEnd}
              onChange={(e) => setFormDateEnd(e.target.value)}
              className="text-xs"
              placeholder="종료일"
            />
          )}
          <select
            value={formBuilding}
            onChange={(e) => setFormBuilding(e.target.value)}
            className="w-full border rounded-md px-2 py-1.5 text-xs"
          >
            <option value="">건물 선택 (선택사항)</option>
            {BUILDINGS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <Input
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="작업 내용"
            className="text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <Input
            value={formNote}
            onChange={(e) => setFormNote(e.target.value)}
            placeholder="비고 (선택사항)"
            className="text-xs"
          />
          <Button size="sm" className="w-full" onClick={handleSubmit} disabled={!formDate || !formDesc}>
            저장
          </Button>
        </div>
      )}

      {/* Plan list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            {planFilter === "done" ? "완료된 작업이 없습니다" : "예정된 작업이 없습니다"}
          </p>
        ) : (
          filtered.map((plan) => (
            <PlanItem key={plan.id} plan={plan} onToggle={togglePlan} onDelete={deletePlan} getDDay={getDDay} />
          ))
        )}
      </div>
    </div>
  );
}

function PlanItem({
  plan,
  onToggle,
  onDelete,
  getDDay,
}: {
  plan: Plan;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  getDDay: (d: string) => string;
}) {
  const dday = getDDay(plan.date);
  const isOverdue = dday.startsWith("D+");
  const isToday = dday === "Today";

  return (
    <div
      className={`flex items-start gap-2 py-2 px-3 rounded-lg text-sm group ${
        plan.done ? "bg-gray-50 opacity-60" : "hover:bg-gray-50"
      }`}
    >
      <button
        onClick={() => onToggle(plan.id)}
        className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
          plan.done ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-gray-500"
        }`}
      >
        {plan.done && <Check className="h-3 w-3" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-mono ${isOverdue ? "text-red-500" : isToday ? "text-blue-600 font-bold" : "text-gray-400"}`}>
            {dday}
          </span>
          {plan.building && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              {plan.building}
            </Badge>
          )}
        </div>
        <p className={`text-sm ${plan.done ? "line-through text-gray-400" : "text-gray-800"}`}>
          {plan.desc}
        </p>
        {plan.dateEnd && (
          <p className="text-[10px] text-gray-400">
            {plan.date} ~ {plan.dateEnd}
          </p>
        )}
        {plan.note && (
          <p className="text-[10px] text-gray-400 mt-0.5">{plan.note}</p>
        )}
      </div>
      <button
        onClick={() => onDelete(plan.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity mt-0.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
