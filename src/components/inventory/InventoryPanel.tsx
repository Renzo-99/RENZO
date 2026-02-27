"use client";

import { useState, useMemo, useCallback } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";
import InventorySearch from "./InventorySearch";
import InventoryItem from "./InventoryItem";
import InboundModal from "./InboundModal";
import LocationManager from "./LocationManager";
import InventoryLogModal from "./InventoryLogModal";
import ProductAddModal from "./ProductAddModal";
import { Button } from "@/components/ui/button";
import { PackagePlus, Building2, ClipboardList, Plus, Download } from "lucide-react";

export default function InventoryPanel() {
  const { products, searchQuery, filter, weeklyChanges, isLoading } = useInventoryStore();
  const [showInbound, setShowInbound] = useState(false);
  const [showLocationManager, setShowLocationManager] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showProductAdd, setShowProductAdd] = useState(false);
  const closeInbound = useCallback(() => setShowInbound(false), []);
  const closeLocationManager = useCallback(() => setShowLocationManager(false), []);
  const closeLogModal = useCallback(() => setShowLogModal(false), []);
  const closeProductAdd = useCallback(() => setShowProductAdd(false), []);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await useInventoryStore.getState().exportInventory();
    } catch {
      alert("내보내기에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  }, []);

  const filtered = useMemo(() => products.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filter === "zero") return p.current_stock === 0;
    if (filter === "low") return p.current_stock > 0 && p.current_stock <= 5;
    if (filter === "changed") return weeklyChanges[p.id] !== undefined && weeklyChanges[p.id] !== 0;
    return true;
  }), [products, searchQuery, filter, weeklyChanges]);

  return (
    <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col shrink-0">
      <InventorySearch />

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            {searchQuery ? "검색 결과가 없습니다" : "해당하는 품목이 없습니다"}
          </p>
        ) : (
          filtered.map((p) => (
            <InventoryItem
              key={p.id}
              product={p}
              weeklyChange={weeklyChanges[p.id] || 0}
            />
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setShowInbound(true)}>
            <PackagePlus className="h-4 w-4 mr-2" />
            입고 등록
          </Button>
          <Button variant="outline" onClick={() => setShowProductAdd(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            품목 추가
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setShowLogModal(true)}>
            <ClipboardList className="h-4 w-4 mr-1.5" />
            입출고 내역
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setShowLocationManager(true)}>
            <Building2 className="h-4 w-4 mr-1.5" />
            건물 관리
          </Button>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download className="h-4 w-4 mr-1.5" />
          {isExporting ? "내보내는 중..." : "재고 내보내기 (CSV)"}
        </Button>
      </div>

      {showInbound && <InboundModal onClose={closeInbound} />}
      {showLocationManager && <LocationManager onClose={closeLocationManager} />}
      {showLogModal && <InventoryLogModal onClose={closeLogModal} />}
      {showProductAdd && <ProductAddModal onClose={closeProductAdd} />}
    </div>
  );
}
