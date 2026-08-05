import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000_000_000) {
    return `${(num / 1_000_000_000_000).toFixed(1)}조`;
  }
  if (num >= 100_000_000) {
    return `${(num / 100_000_000).toFixed(0)}억`;
  }
  if (num >= 10_000) {
    return `${(num / 10_000).toFixed(0)}만`;
  }
  return num.toLocaleString("ko-KR");
}

export function formatPercent(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

export function getPriceChangeColor(change: number): string {
  if (change > 0) return "text-red-500";
  if (change < 0) return "text-blue-500";
  return "text-gray-500";
}

export function getPriceChangeBgColor(change: number): string {
  if (change > 0) return "bg-red-500/10";
  if (change < 0) return "bg-blue-500/10";
  return "bg-gray-500/10";
}
