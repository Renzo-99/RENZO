import { describe, it, expect, vi, beforeEach } from "vitest";

// fetch 모킹
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("inventoryStore", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it("fetchProducts가 성공적으로 데이터를 로드한다", async () => {
    const mockProducts = [
      { id: 1, code: "A01", name: "도어록", category: "A", unit: "개", current_stock: 37 },
      { id: 2, code: "A02", name: "도어록_상자형", category: "A", unit: "개", current_stock: 48 },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts,
    });

    const { useInventoryStore } = await import("@/stores/inventoryStore");
    const store = useInventoryStore.getState();

    await store.fetchProducts();

    const state = useInventoryStore.getState();
    expect(state.products).toEqual(mockProducts);
    expect(state.isLoading).toBe(false);
  });

  it("fetchProducts가 HTTP 에러 시 isLoading을 false로 설정한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { useInventoryStore } = await import("@/stores/inventoryStore");
    await useInventoryStore.getState().fetchProducts();

    expect(useInventoryStore.getState().isLoading).toBe(false);
  });

  it("setSearch가 검색어를 설정한다", async () => {
    const { useInventoryStore } = await import("@/stores/inventoryStore");
    useInventoryStore.getState().setSearch("도어록");
    expect(useInventoryStore.getState().searchQuery).toBe("도어록");
  });

  it("setFilter가 필터를 설정한다", async () => {
    const { useInventoryStore } = await import("@/stores/inventoryStore");
    useInventoryStore.getState().setFilter("zero");
    expect(useInventoryStore.getState().filter).toBe("zero");
  });

  it("processInbound가 성공적으로 입고를 처리한다", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { useInventoryStore } = await import("@/stores/inventoryStore");
    await useInventoryStore.getState().processInbound({
      productId: 1,
      quantity: 5,
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/inventory/inbound");
  });

  it("processInbound가 에러 시 예외를 던진다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "상품을 찾을 수 없습니다" }),
    });

    const { useInventoryStore } = await import("@/stores/inventoryStore");

    await expect(
      useInventoryStore.getState().processInbound({ productId: 999, quantity: 1 })
    ).rejects.toThrow("상품을 찾을 수 없습니다");
  });

  it("refreshWeeklyChanges가 빈 날짜 시 조기 반환한다", async () => {
    const { useInventoryStore } = await import("@/stores/inventoryStore");
    await useInventoryStore.getState().refreshWeeklyChanges("", "");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("reportStore", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it("초기 상태가 올바르다", async () => {
    const { useReportStore } = await import("@/stores/reportStore");
    const state = useReportStore.getState();

    expect(state.currentReport).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.days).toEqual([]);
    expect(state.selectedWeek).toHaveProperty("year");
    expect(state.selectedWeek).toHaveProperty("week");
  });

  it("fetchReport가 HTTP 에러 시 isLoading을 false로 설정한다", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { useReportStore } = await import("@/stores/reportStore");
    await useReportStore.getState().fetchReport(2026, 9);

    expect(useReportStore.getState().isLoading).toBe(false);
  });

  it("setWeek이 선택된 주차를 변경한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1, year: 2026, week_number: 10,
        start_date: "2026-03-02", end_date: "2026-03-06",
        tasks: [],
      }),
    });

    const { useReportStore } = await import("@/stores/reportStore");
    useReportStore.getState().setWeek(2026, 10);

    expect(useReportStore.getState().selectedWeek).toEqual({ year: 2026, week: 10 });
  });

  it("navigateWeek('next')이 주차를 증가시킨다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1, year: 2026, week_number: 10,
        start_date: "2026-03-02", end_date: "2026-03-06",
        tasks: [],
      }),
    });

    const { useReportStore } = await import("@/stores/reportStore");
    const { week } = useReportStore.getState().selectedWeek;
    useReportStore.getState().navigateWeek("next");

    const newState = useReportStore.getState();
    expect(newState.selectedWeek.week).toBe(week + 1);
  });

  it("navigateWeek('prev')이 주차를 감소시킨다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, year: 2026, week_number: 8,
        start_date: "2026-02-16", end_date: "2026-02-20",
        tasks: [],
      }),
    });

    const { useReportStore } = await import("@/stores/reportStore");
    useReportStore.getState().setWeek(2026, 10);
    useReportStore.getState().navigateWeek("prev");

    expect(useReportStore.getState().selectedWeek.week).toBe(9);
  });
});
