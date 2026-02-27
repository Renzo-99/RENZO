import { create } from "zustand";
import type { Product, InboundRequest } from "@/types";

type FilterType = "all" | "changed" | "low" | "zero";

interface InventoryState {
  products: Product[];
  searchQuery: string;
  filter: FilterType;
  weeklyChanges: Record<number, number>;
  isLoading: boolean;

  fetchProducts: () => Promise<void>;
  setSearch: (query: string) => void;
  setFilter: (filter: FilterType) => void;
  processInbound: (req: InboundRequest) => Promise<void>;
  refreshWeeklyChanges: (from: string, to: string) => Promise<void>;
  exportInventory: () => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  searchQuery: "",
  filter: "all",
  weeklyChanges: {},
  isLoading: false,

  fetchProducts: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ products: data, isLoading: false });
    } catch (err) {
      console.error("상품 로드 실패:", err);
      set({ isLoading: false });
    }
  },

  setSearch: (query: string) => set({ searchQuery: query }),
  setFilter: (filter: FilterType) => set({ filter }),

  processInbound: async (req: InboundRequest) => {
    const res = await fetch("/api/inventory/inbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }

    await get().fetchProducts();
  },

  exportInventory: async () => {
    const res = await fetch("/api/inventory/export");
    if (!res.ok) throw new Error("내보내기 실패");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().split("T")[0];
    a.download = `재고현황_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  refreshWeeklyChanges: async (from: string, to: string) => {
    if (!from || !to) return;
    try {
      const res = await fetch(`/api/inventory/summary?from=${from}&to=${to}`);
      if (!res.ok) {
        console.error("주간 변동 조회 실패:", res.status);
        return;
      }
      const data = await res.json();
      set({ weeklyChanges: data });
    } catch (err) {
      console.error("주간 변동 조회 오류:", err);
    }
  },
}));
