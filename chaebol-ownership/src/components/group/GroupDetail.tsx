"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChaebolDetail } from "@/hooks/useChaebolData";
import { useStockPrices } from "@/hooks/useStockPrices";
import OwnershipGraph from "@/components/graph/OwnershipGraph";
import CompanyPanel from "@/components/graph/CompanyPanel";
import type { Company } from "@/types/database";

interface Props {
  id: string;
}

export default function GroupDetail({ id }: Props) {
  const { data, loading, error } = useChaebolDetail(id);
  const { enrichedCompanies, loading: stockLoading } = useStockPrices(
    data?.companies ?? []
  );
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const handleNodeClick = useCallback(
    (company: Company) => {
      setSelectedCompany((prev) => (prev?.id === company.id ? null : company));
    },
    []
  );

  const panelCompany =
    selectedCompany &&
    enrichedCompanies.find((c) => c.id === selectedCompany.id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-[15px] text-gray-500">
          {error ?? "데이터를 찾을 수 없습니다."}
        </p>
        <Link
          href="/"
          className="text-[#3182F6] text-[14px] font-medium hover:underline"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center h-14 px-4 bg-white shadow-[var(--shadow-toss-header)]"
      >
        <Link
          href="/"
          className="flex items-center justify-center w-8 h-8 -ml-1 rounded-[8px] text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>

        <div className="flex items-center gap-2 ml-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.chaebol.color }}
          />
          <h1 className="text-[17px] font-semibold text-gray-900">
            {data.chaebol.name}
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12px] text-gray-400 bg-gray-100 rounded-[6px] px-2 py-0.5">
            {data.companies.length}개 계열사
          </span>
          {stockLoading && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#3182F6] animate-pulse" />
          )}
        </div>
      </motion.header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <OwnershipGraph
            companies={enrichedCompanies}
            links={data.links}
            onNodeClick={handleNodeClick}
          />
        </div>

        <AnimatePresence>
          {panelCompany && (
            <motion.div
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <CompanyPanel
                company={panelCompany}
                onClose={() => setSelectedCompany(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
