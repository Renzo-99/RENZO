"use client";

import { useEffect, useMemo, useState } from "react";
import { useLeaveStore, LEAVE_TYPES, AUTHORS } from "@/stores/leaveStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Trash2, Plus } from "lucide-react";

export default function LeaveManager({ onClose }: { onClose: () => void }) {
  const { leaves, loadLeaves, addLeave, removeLeave } = useLeaveStore();
  const [formDate, setFormDate] = useState("");
  const [formWho, setFormWho] = useState(AUTHORS[0]);
  const [formType, setFormType] = useState(LEAVE_TYPES[0]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const sortedLeaves = useMemo(
    () => [...leaves].sort((a, b) => b.date.localeCompare(a.date)),
    [leaves]
  );

  const handleAdd = () => {
    if (!formDate) return;
    addLeave({ date: formDate, who: formWho, type: formType });
    setFormDate("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">연차/휴가 관리</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Add form */}
        <div className="p-4 border-b space-y-2">
          <div className="flex gap-2">
            <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="text-xs flex-1" />
            <select value={formWho} onChange={(e) => setFormWho(e.target.value)} className="border rounded-md px-2 py-1 text-xs">
              {AUTHORS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <select value={formType} onChange={(e) => setFormType(e.target.value)} className="border rounded-md px-2 py-1 text-xs flex-1">
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Button size="sm" onClick={handleAdd} disabled={!formDate}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              등록
            </Button>
          </div>
        </div>

        {/* Leave list */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortedLeaves.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">등록된 연차가 없습니다</p>
          ) : (
            <div className="space-y-1">
              {sortedLeaves.map((l, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 group">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-gray-400 font-mono">{l.date}</span>
                    <Badge variant="outline" className="text-[10px]">{l.who}</Badge>
                    <span className="text-purple-600">{l.type}</span>
                  </div>
                  <button
                    onClick={() => removeLeave(l.date, l.who)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
