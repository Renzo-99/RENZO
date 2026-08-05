import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
      <h2 className="text-[20px] font-bold text-gray-900">
        페이지를 찾을 수 없습니다
      </h2>
      <p className="text-[14px] text-gray-500">
        요청하신 페이지가 존재하지 않습니다.
      </p>
      <Link
        href="/"
        className="flex items-center gap-1 text-[#3182F6] text-[14px] font-medium hover:underline"
      >
        <ArrowLeft size={16} />
        메인으로 돌아가기
      </Link>
    </div>
  );
}
