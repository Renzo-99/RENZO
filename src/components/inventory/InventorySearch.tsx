"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useInventoryStore } from "@/stores/inventoryStore";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "changed", label: "금주 변동" },
  { key: "low", label: "부족" },
  { key: "zero", label: "없음" },
] as const;

export default function InventorySearch() {
  const { searchQuery, filter, setSearch, setFilter } = useInventoryStore();

  return (
    <div className="p-4 space-y-3 border-b border-gray-200">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="품목 검색..."
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              filter === f.key
                ? "bg-toss-blue text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
