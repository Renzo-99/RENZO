import { describe, it, expect } from "vitest";
import { getCurrentWeek, getWeekDates, getDayInfo, formatWeekRange } from "@/utils/dateUtils";

describe("dateUtils", () => {
  describe("getCurrentWeek", () => {
    it("현재 연도와 주차를 반환한다", () => {
      const result = getCurrentWeek();
      expect(result).toHaveProperty("year");
      expect(result).toHaveProperty("week");
      expect(result.year).toBeGreaterThanOrEqual(2024);
      expect(result.week).toBeGreaterThanOrEqual(1);
      expect(result.week).toBeLessThanOrEqual(53);
    });
  });

  describe("getWeekDates", () => {
    it("2026년 1주차의 시작일과 종료일을 반환한다", () => {
      const result = getWeekDates(2026, 1);
      expect(result.startDate).toBe("2025-12-29");
      expect(result.endDate).toBe("2026-01-02");
    });

    it("2026년 9주차의 날짜를 반환한다", () => {
      const result = getWeekDates(2026, 9);
      expect(result.startDate).toBe("2026-02-23");
      expect(result.endDate).toBe("2026-02-27");
    });

    it("연말 주차도 올바르게 계산한다", () => {
      const result = getWeekDates(2025, 52);
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getDayInfo", () => {
    it("월요일 정보를 반환한다", () => {
      const result = getDayInfo("2026-02-23", 0);
      expect(result.dayOfWeek).toBe(0);
      expect(result.dayName).toBe("월요일");
      expect(result.date).toBe("2월 23일");
    });

    it("금요일 정보를 반환한다", () => {
      const result = getDayInfo("2026-02-23", 4);
      expect(result.dayOfWeek).toBe(4);
      expect(result.dayName).toBe("금요일");
      expect(result.date).toBe("2월 27일");
    });

    it("fullDate 필드가 yyyy-MM-dd 형식이다", () => {
      const result = getDayInfo("2026-02-23", 2);
      expect(result.fullDate).toBe("2026-02-25");
    });
  });

  describe("formatWeekRange", () => {
    it("날짜 범위를 포맷한다", () => {
      const result = formatWeekRange("2026-02-23", "2026-02-27");
      expect(result).toBe("2026.02.23 ~ 02.27");
    });

    it("월이 다른 경우도 처리한다", () => {
      const result = formatWeekRange("2026-01-26", "2026-01-30");
      expect(result).toBe("2026.01.26 ~ 01.30");
    });
  });
});
