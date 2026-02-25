"use client";

import { useEffect } from "react";
import Header from "@/components/layout/Header";
import ReportPanel from "@/components/report/ReportPanel";
import InventoryPanel from "@/components/inventory/InventoryPanel";
import { useReportStore } from "@/stores/reportStore";
import { useInventoryStore } from "@/stores/inventoryStore";

export default function Home() {
  const currentReport = useReportStore((s) => s.currentReport);

  useEffect(() => {
    const { selectedWeek, fetchReport } = useReportStore.getState();
    fetchReport(selectedWeek.year, selectedWeek.week);
    useInventoryStore.getState().fetchProducts();
  }, []);

  useEffect(() => {
    if (currentReport) {
      useInventoryStore.getState().refreshWeeklyChanges(currentReport.start_date, currentReport.end_date);
    }
  }, [currentReport]);

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ReportPanel />
        <InventoryPanel />
      </div>
    </div>
  );
}
