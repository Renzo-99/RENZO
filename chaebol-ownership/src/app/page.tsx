"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useChaebolList } from "@/hooks/useChaebolData";
import { Skeleton } from "@/components/ui/skeleton";
import ChaebolCard from "@/components/ui/ChaebolCard";

export default function Home() {
  const router = useRouter();
  const { chaebols, loading, error } = useChaebolList();

  const handleSelect = (id: string) => {
    router.push(`/group/${id}`);
  };

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8"
      >
        <h1 className="text-[24px] font-bold text-gray-900 mb-1">
          재벌 소유지분도
        </h1>
        <p className="text-[14px] text-gray-500">
          한국 주요 재벌의 소유구조를 한눈에 확인하세요
        </p>
        <a
          href="/reports"
          className="inline-block mt-3 text-[13px] text-blue-600 hover:underline"
        >
          📑 투자 참고자료 보드 (국회입법조사처) →
        </a>
      </motion.div>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-[16px]" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 rounded-[12px] p-4 text-[14px]">
          데이터를 불러올 수 없습니다: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {chaebols.map((chaebol, i) => (
            <motion.div
              key={chaebol.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <ChaebolCard chaebol={chaebol} onClick={handleSelect} />
            </motion.div>
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-gray-400 mt-12">
        공정거래위원회 2025.5.1 기준 대규모기업집단
      </p>
    </main>
  );
}
