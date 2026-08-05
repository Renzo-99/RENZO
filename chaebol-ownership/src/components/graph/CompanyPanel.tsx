"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchStockChart as fetchChartViaProxy, type ChartData } from "@/lib/yahoo";
import type { Company } from "@/types/database";

const RANGES = [
  { label: "1일", value: "1d" },
  { label: "5일", value: "5d" },
  { label: "1개월", value: "1mo" },
  { label: "3개월", value: "3mo" },
  { label: "1년", value: "1y" },
] as const;

interface Props {
  company: Company;
  onClose: () => void;
}

export default function CompanyPanel({ company, onClose }: Props) {
  const [range, setRange] = useState("1mo");
  const [chart, setChart] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [memo, setMemo] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 메모 로드
  useEffect(() => {
    const saved = localStorage.getItem(`memo:${company.id}`);
    if (saved) setMemo(saved);
  }, [company.id]);

  // 메모 저장
  const saveMemo = useCallback(
    (value: string) => {
      setMemo(value);
      if (value.trim()) {
        localStorage.setItem(`memo:${company.id}`, value);
      } else {
        localStorage.removeItem(`memo:${company.id}`);
      }
    },
    [company.id]
  );

  // 차트 fetch: API 우선, 실패 시 Yahoo 프록시 fallback
  useEffect(() => {
    if (!company.is_listed || !company.stock_code) return;
    const code = company.stock_code;

    async function load() {
      setChartLoading(true);
      try {
        // API 라우트 우선 시도 (로컬/Vercel)
        const res = await fetch(`/api/stock/chart?code=${code}&range=${range}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) { setChart(json.data); return; }
        }
        throw new Error("API unavailable");
      } catch {
        // fallback: Yahoo 프록시 (GitHub Pages)
        const data = await fetchChartViaProxy(code, range);
        if (data) setChart(data);
      } finally {
        setChartLoading(false);
      }
    }
    load();
  }, [company.stock_code, company.is_listed, range]);

  // 캔버스에 차트 그리기
  useEffect(() => {
    if (!chart || chart.points.length < 2 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const points = chart.points;
    const prevClose = chart.previousClose;

    const closes = points.map((p) => p.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const padding = (max - min) * 0.1 || 1;

    const yMin = min - padding;
    const yMax = max + padding;

    const toX = (i: number) => (i / (points.length - 1)) * w;
    const toY = (v: number) => h - ((v - yMin) / (yMax - yMin)) * h;

    // 배경
    ctx.fillStyle = "#191F28";
    ctx.fillRect(0, 0, w, h);

    // 기준선 (전일 종가)
    if (prevClose >= yMin && prevClose <= yMax) {
      const baseY = toY(prevClose);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#4E5968";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.lineTo(w, baseY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 현재가가 전일 종가보다 높으면 빨강, 낮으면 파랑
    const lastClose = points[points.length - 1].close;
    const isUp = lastClose >= prevClose;
    const lineColor = isUp ? "#F04452" : "#3182F6";

    // 그라데이션 영역
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, isUp ? "rgba(240,68,82,0.15)" : "rgba(49,130,246,0.15)");
    gradient.addColorStop(1, "rgba(25,31,40,0)");

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(closes[0]));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(toX(i), toY(closes[i]));
    }
    ctx.lineTo(toX(points.length - 1), h);
    ctx.lineTo(toX(0), h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 라인
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(closes[0]));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(toX(i), toY(closes[i]));
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // 마지막 점
    const lastX = toX(points.length - 1);
    const lastY = toY(lastClose);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
  }, [chart]);

  const changePercent = company.price_change_percent;
  const isUp = changePercent != null && changePercent > 0;
  const isDown = changePercent != null && changePercent < 0;

  return (
    <div className="w-[360px] h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900">{company.name}</h2>
          <p className="text-[12px] text-gray-400">
            {company.stock_code ?? "비상장"}
            {company.ticker ? ` · ${company.ticker}` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-[8px] text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* 주가 정보 */}
      {company.is_listed && company.stock_price != null && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-[24px] font-bold text-gray-900 tracking-tight">
            {company.stock_price.toLocaleString()}원
          </p>
          {changePercent != null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-[6px] px-2 py-0.5 text-[13px] font-semibold mt-1",
                isUp
                  ? "bg-[#FFF0F1] text-stock-up"
                  : isDown
                    ? "bg-[#F0F5FF] text-stock-down"
                    : "bg-gray-100 text-gray-500"
              )}
            >
              {isUp ? "▲" : isDown ? "▼" : ""}
              {isUp ? "+" : ""}
              {changePercent.toFixed(2)}%
            </span>
          )}
        </div>
      )}

      {/* 차트 (상장사만) */}
      {company.is_listed && company.stock_code && (
        <div className="px-4 py-3 border-b border-gray-100">
          {/* range 탭 */}
          <div className="flex gap-1 mb-3">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors",
                  range === r.value
                    ? "bg-gray-900 text-white"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* 캔버스 차트 */}
          <div className="relative rounded-[10px] overflow-hidden bg-[#191F28]">
            {chartLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ height: 160 }}
            />
          </div>
        </div>
      )}

      {/* 비상장 안내 */}
      {!company.is_listed && (
        <div className="px-4 py-6 text-center border-b border-gray-100">
          <p className="text-[13px] text-gray-400">비상장 기업</p>
          <p className="text-[12px] text-gray-300 mt-1">주가 데이터가 없습니다</p>
        </div>
      )}

      {/* 메모 */}
      <div className="flex-1 flex flex-col px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-gray-700">메모</span>
          {memo.trim() && (
            <span className="text-[10px] text-gray-300">자동 저장</span>
          )}
        </div>
        <textarea
          value={memo}
          onChange={(e) => saveMemo(e.target.value)}
          placeholder="이 기업에 대한 메모를 남겨보세요..."
          className="flex-1 resize-none rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#3182F6] focus:bg-white transition-colors"
        />
      </div>
    </div>
  );
}
