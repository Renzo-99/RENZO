"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { filterProducts } from "@/lib/utils";
import { useReportStore } from "@/stores/reportStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import type { Product } from "@/types";

interface MaterialPickerProps {
  taskId: number;
  onClose: () => void;
}

export default function MaterialPicker({ taskId, onClose }: MaterialPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addMaterial } = useReportStore();
  const { products, fetchProducts } = useInventoryStore();

  const filtered = filterProducts(products, search);

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
  };

  const handleConfirm = async () => {
    if (!selectedProduct) return;
    try {
      await addMaterial(taskId, {
        productId: selectedProduct.id,
        quantity,
      });
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "오류 발생");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-[16px] shadow-[0_8px_28px_rgba(0,0,0,0.12)] max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* 핸들 바 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>

        {selectedProduct ? (
          // 수량 입력 뷰
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">수량 입력</h3>
              <button onClick={() => setSelectedProduct(null)} className="cursor-pointer">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-[12px] p-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {selectedProduct.code}
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {selectedProduct.name}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                현재 재고: {selectedProduct.current_stock}{selectedProduct.unit}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">사용 수량</label>
              <Input
                type="number"
                min={1}
                max={selectedProduct.current_stock}
                value={quantity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setQuantity(Math.max(1, Math.min(v, selectedProduct.current_stock)));
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                취소
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={quantity < 1 || quantity > selectedProduct.current_stock}
              >
                출고 확인
              </Button>
            </div>
          </div>
        ) : (
          // 자재 검색 뷰
          <>
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="자재 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-gray-100 border-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-gray-50 text-left cursor-pointer transition-colors"
                  onClick={() => handleSelect(p)}
                  disabled={p.current_stock === 0}
                >
                  <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-12 text-center shrink-0">
                    {p.code}
                  </span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{p.name}</span>
                  <span
                    className={`text-sm font-bold ${
                      p.current_stock === 0
                        ? "text-gray-400"
                        : p.current_stock <= 5
                        ? "text-toss-red"
                        : "text-gray-900"
                    }`}
                  >
                    {p.current_stock}{p.unit}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  검색 결과가 없습니다
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
