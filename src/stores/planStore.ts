import { create } from "zustand";

export interface PlanAttachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64
}

export interface Plan {
  id: number;
  date: string;
  dateEnd: string | null;
  building: string;
  desc: string;
  note: string;
  done: boolean;
  attachments?: PlanAttachment[];
}

type PlanFilter = "all" | "pending" | "done";

interface PlanState {
  plans: Plan[];
  planFilter: PlanFilter;
  loadPlans: () => void;
  savePlans: () => void;
  addPlan: (plan: Omit<Plan, "id">) => void;
  updatePlan: (id: number, updates: Partial<Plan>) => void;
  deletePlan: (id: number) => void;
  togglePlan: (id: number) => void;
  setPlanFilter: (f: PlanFilter) => void;
}

const LS_KEY = "ws3_plans";

function loadFromLS(): Plan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLS(plans: Plan[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(plans));
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  planFilter: "all",

  loadPlans: () => {
    set({ plans: loadFromLS() });
  },

  savePlans: () => {
    saveToLS(get().plans);
  },

  addPlan: (plan) => {
    const plans = get().plans;
    const maxId = plans.reduce((m, p) => Math.max(m, p.id), 0);
    const newPlans = [...plans, { ...plan, id: maxId + 1 }];
    set({ plans: newPlans });
    saveToLS(newPlans);
  },

  updatePlan: (id, updates) => {
    const newPlans = get().plans.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    set({ plans: newPlans });
    saveToLS(newPlans);
  },

  deletePlan: (id) => {
    const newPlans = get().plans.filter((p) => p.id !== id);
    set({ plans: newPlans });
    saveToLS(newPlans);
  },

  togglePlan: (id) => {
    const newPlans = get().plans.map((p) =>
      p.id === id ? { ...p, done: !p.done } : p
    );
    set({ plans: newPlans });
    saveToLS(newPlans);
  },

  setPlanFilter: (f) => set({ planFilter: f }),
}));
