"use client";

import { memo, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useInventoryStore } from "@/stores/inventoryStore";
import type { Product } from "@/types";

interface InventoryItemProps {
  product: Product;
  weeklyChange: number;
}

export default memo(function InventoryItem({ product, weeklyChange }: InventoryItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", unit: "", min_stock: 5 });

  const stockColor =
    product.current_stock === 0
      ? "text-gray-400"
      : product.current_stock <= 5
      ? "text-toss-red"
      : "text-gray-900";

  const startEdit = () => {
    setEditForm({
      name: product.name,
      unit: product.unit,
      min_stock: product.min_stock,
    });
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) return;
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          name: editForm.name,
          category: product.category,
          unit: editForm.unit,
          min_stock: editForm.min_stock,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setIsEditing(false);
      useInventoryStore.getState().fetchProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "수정 실패");
    }
  };

  if (isEditing) {
    return (
      <div className="bg-gray-50 rounded-[8px] p-3 space-y-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded shrink-0">
            {product.code}
          </span>
          <Input
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="h-7 text-sm flex-1"
            placeholder="품목명"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={editForm.unit}
            onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
            className="h-7 text-sm w-16"
            placeholder="단위"
          />
          <label className="text-[11px] text-gray-500">최소재고</label>
          <Input
            type="number"
            value={editForm.min_stock}
            onChange={(e) => setEditForm({ ...editForm, min_stock: Number(e.target.value) })}
            className="h-7 text-sm w-16"
          />
          <div className="flex gap-1 ml-auto">
            <button onClick={() => setIsEditing(false)} className="p-1 rounded hover:bg-gray-200 cursor-pointer">
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
            <button onClick={saveEdit} className="p-1 rounded hover:bg-toss-blue-light cursor-pointer">
              <Check className="h-3.5 w-3.5 text-toss-blue" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-gray-50 transition-colors group">
      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded w-12 text-center shrink-0">
        {product.code}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
        <p className="text-[11px] text-gray-400">
          입고 {product.total_in} · 출고 {product.total_out}
        </p>
      </div>

      <button
        onClick={startEdit}
        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 cursor-pointer shrink-0"
      >
        <Pencil className="h-3 w-3 text-gray-400" />
      </button>

      <div className="flex items-center gap-2 shrink-0">
        {weeklyChange !== 0 && (
          <Badge variant={weeklyChange > 0 ? "success" : "destructive"}>
            {weeklyChange > 0 ? `+${weeklyChange}` : weeklyChange}
          </Badge>
        )}
        <span className={`text-lg font-extrabold ${stockColor} min-w-[32px] text-right`}>
          {product.current_stock}
        </span>
        <span className="text-xs text-gray-400">{product.unit}</span>
      </div>
    </div>
  );
});
