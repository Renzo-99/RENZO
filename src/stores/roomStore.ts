import { create } from "zustand";

export interface Room {
  id: number;
  bld: string;
  floor: number;
  room: string;
  type: string;
  desc: string;
  dept: string;
  damage: number;
  repaired: number;
  note: string;
}

interface RoomState {
  rooms: Room[];
  currentBld: string;
  loadRooms: () => void;
  addRoom: (room: Omit<Room, "id">) => void;
  updateRoom: (id: number, updates: Partial<Room>) => void;
  deleteRoom: (id: number) => void;
  setCurrentBld: (bld: string) => void;
  getBuildings: () => string[];
}

const LS_KEY = "ws3_rooms";

function loadFromLS(): Room[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLS(rooms: Room[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(rooms));
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  currentBld: "",

  loadRooms: () => {
    const rooms = loadFromLS();
    const buildings = [...new Set(rooms.map((r) => r.bld))];
    set({ rooms, currentBld: buildings[0] || "" });
  },

  addRoom: (room) => {
    const rooms = get().rooms;
    const maxId = rooms.reduce((m, r) => Math.max(m, r.id), 0);
    const newRooms = [...rooms, { ...room, id: maxId + 1 }];
    set({ rooms: newRooms });
    saveToLS(newRooms);
  },

  updateRoom: (id, updates) => {
    const newRooms = get().rooms.map((r) =>
      r.id === id ? { ...r, ...updates } : r
    );
    set({ rooms: newRooms });
    saveToLS(newRooms);
  },

  deleteRoom: (id) => {
    const newRooms = get().rooms.filter((r) => r.id !== id);
    set({ rooms: newRooms });
    saveToLS(newRooms);
  },

  setCurrentBld: (bld) => set({ currentBld: bld }),

  getBuildings: () => {
    return [...new Set(get().rooms.map((r) => r.bld))];
  },
}));
