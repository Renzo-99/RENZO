"use client";

import { useReportStore } from "@/stores/reportStore";

export default function WeeklySummary() {
  const { days } = useReportStore();

  const totalTasks = days.reduce((sum, d) => sum + d.tasks.length, 0);
  const totalMaterials = days.reduce(
    (sum, d) => sum + d.tasks.reduce((s, t) => s + (t.materials?.length || 0), 0),
    0
  );
  const uniqueProducts = new Set(
    days.flatMap((d) =>
      d.tasks.flatMap((t) => (t.materials || []).map((m) => m.product_id))
    )
  ).size;

  return (
    <div className="bg-white rounded-[12px] border border-gray-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-extrabold text-gray-900">{totalTasks}</p>
          <p className="text-xs text-gray-500 mt-0.5">작업</p>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-extrabold text-toss-blue">{totalMaterials}</p>
          <p className="text-xs text-gray-500 mt-0.5">자재 사용</p>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-extrabold text-gray-900">{uniqueProducts}</p>
          <p className="text-xs text-gray-500 mt-0.5">품목</p>
        </div>
      </div>
    </div>
  );
}
