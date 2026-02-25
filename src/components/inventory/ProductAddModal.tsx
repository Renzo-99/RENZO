"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventoryStore } from "@/stores/inventoryStore";

interface ProductAddModalProps {
  onClose: () => void;
}

export default function ProductAddModal({ onClose }: ProductAddModalProps) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "A",
    unit: "개",
    min_stock: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      useInventoryStore.getState().fetchProducts();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] shadow-lg w-full max-w-sm p-6 space-y-4 mx-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">품목 추가</h2>
          <button onClick={onClose} className="cursor-pointer">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">품목코드 *</label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="예: A-068"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">품목명 *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="품목명"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-1 block">분류</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-9 rounded-[8px] border border-gray-200 px-3 text-sm bg-white"
              >
                <option value="A">A (소모품)</option>
                <option value="B">B (비품)</option>
              </select>
            </div>
            <div className="w-20">
              <label className="text-sm text-gray-600 mb-1 block">단위</label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="w-20">
              <label className="text-sm text-gray-600 mb-1 block">최소재고</label>
              <Input
                type="number"
                value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!form.code.trim() || !form.name.trim() || isSubmitting}
          >
            추가
          </Button>
        </div>
      </div>
    </div>
  );
}
