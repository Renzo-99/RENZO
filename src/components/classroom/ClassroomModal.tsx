"use client";

import { useState, useEffect, useMemo } from "react";
import { useRoomStore, type Room } from "@/stores/roomStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, Edit2, Save } from "lucide-react";

export default function ClassroomModal({ onClose }: { onClose: () => void }) {
  const { rooms, currentBld, loadRooms, addRoom, updateRoom, deleteRoom, setCurrentBld, getBuildings } = useRoomStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Room, "id">>({
    bld: "", floor: 1, room: "", type: "", desc: "", dept: "", damage: 0, repaired: 0, note: "",
  });

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const buildings = useMemo(() => getBuildings(), [rooms, getBuildings]);

  const filteredRooms = useMemo(() => {
    if (!currentBld) return rooms;
    return rooms.filter((r) => r.bld === currentBld);
  }, [rooms, currentBld]);

  const groupedByFloor = useMemo(() => {
    const groups: Record<number, Room[]> = {};
    for (const r of filteredRooms) {
      if (!groups[r.floor]) groups[r.floor] = [];
      groups[r.floor].push(r);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([floor, rooms]) => ({ floor: Number(floor), rooms }));
  }, [filteredRooms]);

  const stats = useMemo(() => ({
    total: filteredRooms.length,
    damaged: filteredRooms.reduce((s, r) => s + r.damage, 0),
    repaired: filteredRooms.reduce((s, r) => s + r.repaired, 0),
  }), [filteredRooms]);

  const resetForm = () => {
    setForm({ bld: currentBld || "", floor: 1, room: "", type: "", desc: "", dept: "", damage: 0, repaired: 0, note: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.bld || !form.room) return;
    if (editingId !== null) {
      updateRoom(editingId, form);
    } else {
      addRoom(form);
    }
    resetForm();
  };

  const handleEdit = (room: Room) => {
    setForm({ bld: room.bld, floor: room.floor, room: room.room, type: room.type, desc: room.desc, dept: room.dept, damage: room.damage, repaired: room.repaired, note: room.note });
    setEditingId(room.id);
    setShowForm(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">건물 호실 현황</h2>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>총 <b className="text-gray-800">{stats.total}</b>실</span>
              <span>파손 <b className="text-red-600">{stats.damaged}</b>건</span>
              <span>수리 <b className="text-green-600">{stats.repaired}</b>건</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...form, bld: currentBld || "" }); }}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              호실 추가
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Building tabs */}
        {buildings.length > 0 && (
          <div className="flex gap-1 px-4 py-2 border-b overflow-x-auto">
            <button
              onClick={() => setCurrentBld("")}
              className={`px-3 py-1 text-xs rounded-full border shrink-0 ${
                !currentBld ? "bg-gray-900 text-white border-gray-900" : "text-gray-600 border-gray-300"
              }`}
            >
              전체 ({rooms.length})
            </button>
            {buildings.map((bld) => (
              <button
                key={bld}
                onClick={() => setCurrentBld(bld)}
                className={`px-3 py-1 text-xs rounded-full border shrink-0 ${
                  currentBld === bld ? "bg-gray-900 text-white border-gray-900" : "text-gray-600 border-gray-300"
                }`}
              >
                {bld} ({rooms.filter((r) => r.bld === bld).length})
              </button>
            ))}
          </div>
        )}

        {/* Add/Edit form */}
        {showForm && (
          <div className="p-4 border-b bg-gray-50 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <Input placeholder="건물명 *" value={form.bld} onChange={(e) => setForm({ ...form, bld: e.target.value })} className="text-xs" />
              <Input type="number" placeholder="층" value={form.floor} onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })} className="text-xs" />
              <Input placeholder="호실 *" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className="text-xs" />
              <Input placeholder="유형 (예: 2인 책상)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="text-xs" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Input placeholder="설명" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} className="text-xs" />
              <Input placeholder="부서" value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} className="text-xs" />
              <Input type="number" placeholder="파손" value={form.damage} onChange={(e) => setForm({ ...form, damage: Number(e.target.value) })} className="text-xs" />
              <Input type="number" placeholder="수리" value={form.repaired} onChange={(e) => setForm({ ...form, repaired: Number(e.target.value) })} className="text-xs" />
            </div>
            <div className="flex gap-2">
              <Input placeholder="비고" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="text-xs flex-1" />
              <Button size="sm" onClick={handleSave} disabled={!form.bld || !form.room}>
                <Save className="h-3.5 w-3.5 mr-1" />
                {editingId !== null ? "수정" : "추가"}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>취소</Button>
            </div>
          </div>
        )}

        {/* Room list */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredRooms.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">등록된 호실이 없습니다</p>
          ) : (
            <div className="space-y-4">
              {groupedByFloor.map(({ floor, rooms }) => (
                <div key={floor}>
                  <h4 className="text-xs font-medium text-gray-500 mb-2">{floor}층</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">호실</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">유형</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">설명</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">부서</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">파손</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">수리</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">비고</th>
                          <th className="px-3 py-2 w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map((r) => (
                          <tr key={r.id} className="border-t hover:bg-gray-50 group">
                            <td className="px-3 py-2 font-medium">{r.room}</td>
                            <td className="px-3 py-2 text-gray-600">{r.type}</td>
                            <td className="px-3 py-2 text-gray-600">{r.desc}</td>
                            <td className="px-3 py-2 text-gray-600">{r.dept}</td>
                            <td className="px-3 py-2 text-center">
                              {r.damage > 0 ? <Badge variant="destructive" className="text-[9px]">{r.damage}</Badge> : "-"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {r.repaired > 0 ? <Badge variant="success" className="text-[9px]">{r.repaired}</Badge> : "-"}
                            </td>
                            <td className="px-3 py-2 text-gray-400">{r.note}</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(r)} className="text-gray-400 hover:text-blue-500">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => { if (confirm(`${r.room}호를 삭제하시겠습니까?`)) deleteRoom(r.id); }} className="text-gray-400 hover:text-red-500">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
