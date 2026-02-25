import { describe, it, expect } from "vitest";
import { generateWeeklyReport } from "@/utils/exportDocx";
import type { DailyTask } from "@/types";

describe("exportDocx", () => {
  it("빈 작업 목록으로 DOCX 버퍼를 생성한다", async () => {
    const result = await generateWeeklyReport({
      startDate: "2026-02-23",
      endDate: "2026-02-27",
      tasks: [],
    });

    expect(result).toBeDefined();
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("작업이 있는 보고서를 생성한다", async () => {
    const tasks: DailyTask[] = [
      {
        id: 1,
        report_id: 1,
        day_of_week: 0,
        sort_order: 0,
        description: "문 손잡이 교체",
        materials: [
          {
            id: 1,
            task_id: 1,
            product_id: 1,
            quantity: 2,
            product: {
              id: 1,
              code: "A01",
              name: "도어록(문손잡이)_원통형",
              category: "A",
              unit: "개",
              current_stock: 35,
              total_in: 52,
              total_out: 17,
              min_stock: 0,
              is_active: true,
            },
          },
        ],
      },
      {
        id: 2,
        report_id: 1,
        day_of_week: 1,
        sort_order: 0,
        description: "선반 설치",
      },
    ];

    const result = await generateWeeklyReport({
      startDate: "2026-02-23",
      endDate: "2026-02-27",
      tasks,
    });

    expect(result).toBeDefined();
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("여러 자재가 있는 작업을 처리한다", async () => {
    const tasks: DailyTask[] = [
      {
        id: 1,
        report_id: 1,
        day_of_week: 0,
        sort_order: 0,
        description: "종합 보수 작업",
        materials: [
          {
            id: 1,
            task_id: 1,
            product_id: 1,
            quantity: 2,
            product: {
              id: 1, code: "A01", name: "도어록_원통형", category: "A",
              unit: "개", current_stock: 35, total_in: 52, total_out: 17,
              min_stock: 0, is_active: true,
            },
          },
          {
            id: 2,
            task_id: 1,
            product_id: 3,
            quantity: 1,
            product: {
              id: 3, code: "A03", name: "도어클로저_방화문용", category: "A",
              unit: "개", current_stock: 8, total_in: 23, total_out: 15,
              min_stock: 0, is_active: true,
            },
          },
        ],
      },
    ];

    const result = await generateWeeklyReport({
      startDate: "2026-02-23",
      endDate: "2026-02-27",
      tasks,
    });

    expect(result).toBeDefined();
    expect(result.byteLength).toBeGreaterThan(0);
  });
});
