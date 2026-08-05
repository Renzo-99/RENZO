import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatPercent,
  formatPrice,
  getPriceChangeColor,
  getPriceChangeBgColor,
  cn,
} from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("resolves Tailwind conflicts", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });
});

describe("formatNumber", () => {
  it("formats 조 (trillion KRW)", () => {
    expect(formatNumber(1_500_000_000_000)).toBe("1.5조");
    expect(formatNumber(1_000_000_000_000)).toBe("1.0조");
  });

  it("formats 억 (hundred million KRW)", () => {
    expect(formatNumber(345_000_000_000)).toBe("3450억");
    expect(formatNumber(100_000_000)).toBe("1억");
    expect(formatNumber(500_000_000)).toBe("5억");
  });

  it("formats 만 (ten thousand KRW)", () => {
    expect(formatNumber(50_000)).toBe("5만");
    expect(formatNumber(10_000)).toBe("1만");
  });

  it("formats small numbers with locale", () => {
    const result = formatNumber(9999);
    expect(result).toBe("9,999");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("handles exact boundary: 100억", () => {
    expect(formatNumber(10_000_000_000)).toBe("100억");
  });

  it("handles large 억 values", () => {
    expect(formatNumber(11_614_000 * 100_000_000)).toContain("조");
  });
});

describe("formatPercent", () => {
  it("formats positive percent", () => {
    expect(formatPercent(5.678)).toBe("5.7%");
  });

  it("formats negative percent", () => {
    expect(formatPercent(-1.23)).toBe("-1.2%");
  });

  it("formats zero percent", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("formats integer percent", () => {
    expect(formatPercent(50)).toBe("50.0%");
  });
});

describe("formatPrice", () => {
  it("formats price with 원 suffix", () => {
    const result = formatPrice(194500);
    expect(result).toContain("원");
    expect(result).toContain("194");
  });

  it("formats zero price", () => {
    expect(formatPrice(0)).toBe("0원");
  });

  it("formats large price", () => {
    const result = formatPrice(1715000);
    expect(result).toContain("원");
    expect(result).toContain("1,715,000");
  });
});

describe("getPriceChangeColor", () => {
  it("returns red for positive change", () => {
    expect(getPriceChangeColor(100)).toBe("text-red-500");
  });

  it("returns blue for negative change", () => {
    expect(getPriceChangeColor(-50)).toBe("text-blue-500");
  });

  it("returns gray for zero change", () => {
    expect(getPriceChangeColor(0)).toBe("text-gray-500");
  });
});

describe("getPriceChangeBgColor", () => {
  it("returns red bg for positive change", () => {
    expect(getPriceChangeBgColor(100)).toBe("bg-red-500/10");
  });

  it("returns blue bg for negative change", () => {
    expect(getPriceChangeBgColor(-50)).toBe("bg-blue-500/10");
  });

  it("returns gray bg for zero change", () => {
    expect(getPriceChangeBgColor(0)).toBe("bg-gray-500/10");
  });
});
