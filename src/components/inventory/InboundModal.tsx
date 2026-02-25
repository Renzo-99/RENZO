"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterProducts } from "@/lib/utils";
import { useInventoryStore } from "@/stores/inventoryStore";
import type { Product } from "@/types";

interface InboundModalProps {
  onClose: () => void;
}

export default function InboundModal({ onClose }: InboundModalProps) {
  const { products, fetchProducts, processInbound } = useInventoryStore();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [memo, setMemo] = useState("");

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = filterProducts(products, search);

  const handleConfirm = async () => {
    if (!selectedProduct || quantity < 1) return;
    try {
      await processInbound({
        productId: selectedProduct.id,
        quantity,
        memo: memo || undefined,
      });
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "오류 발생");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] shadow-lg w-full max-w-md p-6 space-y-4 mx-4">
        <h2 className="text-lg font-semibold text-gray-900">입고 등록</h2>

        {!selectedProduct ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="상품 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-gray-50 text-left cursor-pointer"
                >
                  <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-12 text-center">
                    {p.code}
                  </span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{p.name}</span>
                  <span className="text-sm font-bold text-gray-900">
                    {p.current_stock}{p.unit}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-50 rounded-[12px] p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {selectedProduct.code}
                </span>
                <span className="text-sm font-medium">{selectedProduct.name}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                현재 재고: {selectedProduct.current_stock}{selectedProduct.unit}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">입고 수량</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">메모 (선택)</label>
              <Input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="입고 사유..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                취소
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={quantity < 1}>
                입고 처리
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
