import { describe, it, expect } from "vitest";
import { getGroupData, getAllGroups, groupSlugs } from "./data";

describe("groupSlugs", () => {
  it("contains 29 group slugs", () => {
    expect(groupSlugs).toHaveLength(29);
  });

  it("includes major groups", () => {
    expect(groupSlugs).toContain("samsung");
    expect(groupSlugs).toContain("sk");
    expect(groupSlugs).toContain("hyundai");
    expect(groupSlugs).toContain("lg");
    expect(groupSlugs).toContain("lotte");
    expect(groupSlugs).toContain("posco");
    expect(groupSlugs).toContain("hanwha");
  });

  it("includes all hyphenated slugs", () => {
    expect(groupSlugs).toContain("hd-hyundai");
    expect(groupSlugs).toContain("mirae-asset");
  });
});

describe("getGroupData", () => {
  it("returns samsung group data", async () => {
    const data = await getGroupData("samsung");
    expect(data).not.toBeNull();
    expect(data!.group.id).toBe("samsung");
    expect(data!.group.name).toBe("삼성");
    expect(data!.group.controllerName).toBe("이재용");
    expect(data!.companies.length).toBeGreaterThan(0);
    expect(data!.relations.length).toBeGreaterThan(0);
  });

  it("returns null for unknown slug", async () => {
    const data = await getGroupData("nonexistent");
    expect(data).toBeNull();
  });

  it("returns sk group data with correct structure", async () => {
    const data = await getGroupData("sk");
    expect(data).not.toBeNull();
    expect(data!.group.slug).toBe("sk");
    // Verify data shape
    expect(data!.companies).toBeInstanceOf(Array);
    expect(data!.relations).toBeInstanceOf(Array);
    expect(data!.controllerHoldings).toBeInstanceOf(Array);
  });

  it("returns company with expected fields", async () => {
    const data = await getGroupData("samsung");
    const listed = data!.companies.find((c) => c.isListed);
    expect(listed).toBeDefined();
    expect(listed!.id).toBeDefined();
    expect(listed!.name).toBeDefined();
    expect(listed!.groupId).toBe("samsung");
  });

  it("returns relations with valid company references", async () => {
    const data = await getGroupData("samsung");
    const companyIds = new Set(data!.companies.map((c) => c.id));
    data!.relations.forEach((r) => {
      expect(companyIds.has(r.fromCompanyId)).toBe(true);
      expect(companyIds.has(r.toCompanyId)).toBe(true);
    });
  });
});

describe("getAllGroups", () => {
  it("returns all 29 groups", async () => {
    const groups = await getAllGroups();
    expect(groups).toHaveLength(29);
  });

  it("each group has required fields", async () => {
    const groups = await getAllGroups();
    groups.forEach((g) => {
      expect(g.group.id).toBeDefined();
      expect(g.group.name).toBeDefined();
      expect(g.group.slug).toBeDefined();
      expect(g.group.controllerName).toBeDefined();
      expect(g.companies).toBeInstanceOf(Array);
      expect(g.companies.length).toBeGreaterThan(0);
    });
  });

  it("includes updated stock prices", async () => {
    const groups = await getAllGroups();
    const samsung = groups.find((g) => g.group.id === "samsung");
    expect(samsung).toBeDefined();
    const samsungElec = samsung!.companies.find(
      (c) => c.stockCode === "005930"
    );
    expect(samsungElec).toBeDefined();
    expect(samsungElec!.stockPrice).toBeGreaterThan(0);
    expect(samsungElec!.marketCap).toBeGreaterThan(0);
  });
});
