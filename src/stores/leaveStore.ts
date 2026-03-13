import { create } from "zustand";

export interface Leave {
  date: string;
  type: string;
  who: string;
}

export const LEAVE_TYPES = ["전일", "오전반차", "오후반차", "오전반반차", "오후반반차"];
export const AUTHORS = ["백영인", "전서원"];

interface LeaveState {
  leaves: Leave[];
  loadLeaves: () => void;
  addLeave: (leave: Leave) => void;
  removeLeave: (date: string, who: string) => void;
  getLeavesForDate: (date: string) => Leave[];
}

const LS_KEY = "ws3_leaves";

function loadFromLS(): Leave[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLS(leaves: Leave[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(leaves));
}

export const useLeaveStore = create<LeaveState>((set, get) => ({
  leaves: [],

  loadLeaves: () => {
    set({ leaves: loadFromLS() });
  },

  addLeave: (leave) => {
    const newLeaves = [...get().leaves, leave];
    set({ leaves: newLeaves });
    saveToLS(newLeaves);
  },

  removeLeave: (date, who) => {
    const newLeaves = get().leaves.filter(
      (l) => !(l.date === date && l.who === who)
    );
    set({ leaves: newLeaves });
    saveToLS(newLeaves);
  },

  getLeavesForDate: (date) => {
    return get().leaves.filter((l) => l.date === date);
  },
}));
