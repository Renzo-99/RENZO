import { create } from "zustand";
import { getISOWeeksInYear } from "date-fns";
import type { DailyTask, WeeklyReport, AddMaterialRequest, DayData } from "@/types";
import { getCurrentWeek, getDayInfo } from "@/utils/dateUtils";
import { useInventoryStore } from "@/stores/inventoryStore";

interface ReportState {
  currentReport: (WeeklyReport & { tasks: DailyTask[] }) | null;
  selectedWeek: { year: number; week: number };
  isLoading: boolean;
  days: DayData[];

  fetchReport: (year: number, week: number) => Promise<void>;
  addTask: (dayOfWeek: number) => Promise<void>;
  updateTask: (taskId: number, description: string) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
  addMaterial: (taskId: number, req: AddMaterialRequest) => Promise<void>;
  removeMaterial: (taskMaterialId: number) => Promise<void>;
  navigateWeek: (direction: "prev" | "next") => void;
  setWeek: (year: number, week: number) => void;
}

export const useReportStore = create<ReportState>((set, get) => ({
  currentReport: null,
  selectedWeek: getCurrentWeek(),
  isLoading: false,
  days: [],

  fetchReport: async (year: number, week: number) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/reports?year=${year}&week=${week}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const report = await res.json();

      const days: DayData[] = Array.from({ length: 5 }, (_, i) => {
        const info = getDayInfo(report.start_date, i);
        return {
          ...info,
          tasks: (report.tasks || []).filter((t: DailyTask) => t.day_of_week === i),
        };
      });

      set({ currentReport: report, days, isLoading: false });
    } catch (err) {
      console.error("보고서 로드 실패:", err);
      set({ isLoading: false });
    }
  },

  addTask: async (dayOfWeek: number) => {
    const { currentReport, selectedWeek, fetchReport } = get();
    if (!currentReport) return;

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: currentReport.id, dayOfWeek }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "작업 추가 실패");
    }

    await fetchReport(selectedWeek.year, selectedWeek.week);
  },

  updateTask: async (taskId: number, description: string) => {
    const res = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, description }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "작업 수정 실패");
    }

    const { selectedWeek, fetchReport } = get();
    await fetchReport(selectedWeek.year, selectedWeek.week);
  },

  deleteTask: async (taskId: number) => {
    const res = await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "작업 삭제 실패");
    }

    const { selectedWeek, fetchReport } = get();
    await fetchReport(selectedWeek.year, selectedWeek.week);
    useInventoryStore.getState().fetchProducts();
  },

  addMaterial: async (taskId: number, req: AddMaterialRequest) => {
    const res = await fetch("/api/task-materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        productId: req.productId,
        quantity: req.quantity,
        locationId: req.locationId,
        detailLocation: req.detailLocation,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }

    const { selectedWeek, fetchReport } = get();
    await fetchReport(selectedWeek.year, selectedWeek.week);
    useInventoryStore.getState().fetchProducts();
  },

  removeMaterial: async (taskMaterialId: number) => {
    const res = await fetch(`/api/task-materials?id=${taskMaterialId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "자재 삭제 실패");
    }

    const { selectedWeek, fetchReport } = get();
    await fetchReport(selectedWeek.year, selectedWeek.week);
    useInventoryStore.getState().fetchProducts();
  },

  navigateWeek: (direction: "prev" | "next") => {
    const { selectedWeek, fetchReport } = get();
    let { year, week } = selectedWeek;

    if (direction === "next") {
      week++;
      const maxWeeks = getISOWeeksInYear(new Date(year, 11, 28));
      if (week > maxWeeks) { week = 1; year++; }
    } else {
      week--;
      if (week < 1) {
        year--;
        week = getISOWeeksInYear(new Date(year, 11, 28));
      }
    }

    set({ selectedWeek: { year, week } });
    fetchReport(year, week);
  },

  setWeek: (year: number, week: number) => {
    set({ selectedWeek: { year, week } });
    get().fetchReport(year, week);
  },
}));
