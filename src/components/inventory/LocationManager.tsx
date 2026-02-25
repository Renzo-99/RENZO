"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Location } from "@/types";

interface LocationManagerProps {
  onClose: () => void;
}

export default function LocationManager({ onClose }: LocationManagerProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", dong: "", building_code: "", phone: "" });

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("조회 실패");
      const data = await res.json();
      setLocations(data);
    } catch (err) {
      console.error("건물 목록 로드 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditForm({
      name: loc.name,
      dong: loc.dong || "",
      building_code: loc.building_code || "",
      phone: loc.phone || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    try {
      const res = await fetch("/api/locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setEditingId(null);
      await fetchLocations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "수정 실패");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" 건물을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/locations?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await fetchLocations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] shadow-lg w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">건물 관리</h2>
          <button onClick={onClose} className="cursor-pointer">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-8">불러오는 중...</p>
          ) : locations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">등록된 건물이 없습니다</p>
          ) : (
            locations.map((loc) =>
              editingId === loc.id ? (
                <div key={loc.id} className="bg-gray-50 rounded-[8px] p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-0.5 block">건물명 *</label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-0.5 block">동</label>
                      <Input
                        value={editForm.dong}
                        onChange={(e) => setEditForm({ ...editForm, dong: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-0.5 block">건물코드</label>
                      <Input
                        value={editForm.building_code}
                        onChange={(e) => setEditForm({ ...editForm, building_code: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-0.5 block">전화번호</label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>취소</Button>
                    <Button size="sm" onClick={saveEdit} disabled={!editForm.name.trim()}>
                      <Check className="h-3.5 w-3.5 mr-1" />저장
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={loc.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-gray-50 group transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {loc.name}
                      {loc.dong && <span className="text-gray-400 ml-1">({loc.dong})</span>}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {[loc.building_code, loc.phone].filter(Boolean).join(" · ") || "추가 정보 없음"}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => startEdit(loc)}
                      className="p-1.5 rounded-[6px] hover:bg-gray-200 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(loc.id, loc.name)}
                      className="p-1.5 rounded-[6px] hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-toss-red" />
                    </button>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}
