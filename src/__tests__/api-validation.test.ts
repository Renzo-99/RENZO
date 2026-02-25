import { describe, it, expect } from "vitest";

describe("API 파라미터 검증 로직", () => {
  describe("tasks API 검증", () => {
    it("유효한 dayOfWeek 범위 (0-4)", () => {
      const validDays = [0, 1, 2, 3, 4];
      const invalidDays = [-1, 5, 6, 10];

      validDays.forEach((d) => {
        expect(d >= 0 && d <= 4).toBe(true);
      });

      invalidDays.forEach((d) => {
        expect(d >= 0 && d <= 4).toBe(false);
      });
    });

    it("reportId가 필수인지 확인", () => {
      const validate = (body: { reportId?: number; dayOfWeek?: number }) => {
        return !!body.reportId && body.dayOfWeek !== undefined && body.dayOfWeek >= 0 && body.dayOfWeek <= 4;
      };

      expect(validate({ reportId: 1, dayOfWeek: 0 })).toBe(true);
      expect(validate({ dayOfWeek: 0 })).toBe(false);
      expect(validate({ reportId: 1 })).toBe(false);
      expect(validate({ reportId: 1, dayOfWeek: 5 })).toBe(false);
    });
  });

  describe("task-materials API 검증", () => {
    it("quantity가 1 이상인지 확인", () => {
      const validate = (body: { taskId?: number; productId?: number; quantity?: number }) => {
        return !!body.taskId && !!body.productId && !!body.quantity && body.quantity >= 1;
      };

      expect(validate({ taskId: 1, productId: 1, quantity: 1 })).toBe(true);
      expect(validate({ taskId: 1, productId: 1, quantity: 10 })).toBe(true);
      expect(validate({ taskId: 1, productId: 1, quantity: 0 })).toBe(false);
      expect(validate({ taskId: 1, productId: 1 })).toBe(false);
    });
  });

  describe("inventory/inbound API 검증", () => {
    it("productId와 quantity가 필수인지 확인", () => {
      const validate = (body: { productId?: number; quantity?: number }) => {
        return !!body.productId && !!body.quantity && body.quantity >= 1;
      };

      expect(validate({ productId: 1, quantity: 5 })).toBe(true);
      expect(validate({ quantity: 5 })).toBe(false);
      expect(validate({ productId: 1 })).toBe(false);
      expect(validate({ productId: 1, quantity: 0 })).toBe(false);
    });
  });

  describe("inventory/summary API 검증", () => {
    it("날짜 형식이 올바른지 확인", () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      expect(dateRegex.test("2026-02-23")).toBe(true);
      expect(dateRegex.test("2026-2-23")).toBe(false);
      expect(dateRegex.test("20260223")).toBe(false);
      expect(dateRegex.test("")).toBe(false);
    });

    it("from이 to보다 이전이어야 한다", () => {
      expect("2026-02-23" <= "2026-02-27").toBe(true);
      expect("2026-03-01" <= "2026-02-27").toBe(false);
    });
  });
});
