"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { Chaebol } from "@/types/database";

interface Props {
  chaebol: Chaebol;
  onClick: (id: string) => void;
}

export default function ChaebolCard({ chaebol, onClick }: Props) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(chaebol.id)}
      className="w-full text-left bg-white rounded-[16px] border border-gray-200 hover:shadow-[var(--shadow-toss-card)] transition-all overflow-hidden"
    >
      <div className="flex">
        <div
          className="w-1 shrink-0 rounded-l-[16px]"
          style={{ backgroundColor: chaebol.color }}
        />
        <div className="flex-1 p-5">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-[17px] font-bold text-gray-900">
              {chaebol.name}
            </span>
            <span className="text-[13px] text-gray-400">
              {chaebol.name_en}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {chaebol.chairman && (
              <span className="inline-flex items-center bg-gray-100 text-gray-600 rounded-[6px] px-2 py-0.5 text-[12px]">
                총수 {chaebol.chairman}
              </span>
            )}
            {chaebol.total_assets_trillion && (
              <span className="inline-flex items-center bg-gray-100 text-gray-600 rounded-[6px] px-2 py-0.5 text-[12px]">
                자산 {chaebol.total_assets_trillion}조
              </span>
            )}
            {chaebol.holding_company && (
              <span className="inline-flex items-center bg-gray-100 text-gray-600 rounded-[6px] px-2 py-0.5 text-[12px]">
                {chaebol.holding_company}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center pr-4 text-gray-300">
          <ChevronRight size={20} />
        </div>
      </div>
    </motion.button>
  );
}
