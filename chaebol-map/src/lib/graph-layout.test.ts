import { describe, it, expect } from "vitest";
import type { Company, OwnershipRelation, ControllerHolding } from "@/types";
import { buildGraphData } from "./graph-layout";

// 테스트용 데이터 팩토리
function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: "test-company",
    groupId: "test-group",
    name: "테스트 회사",
    isListed: false,
    isHolding: false,
    isController: false,
    category: "기타",
    ...overrides,
  };
}

function makeRelation(overrides: Partial<OwnershipRelation> = {}): OwnershipRelation {
  return {
    id: "rel-1",
    groupId: "test-group",
    fromCompanyId: "company-a",
    toCompanyId: "company-b",
    ownershipPct: 30,
    ...overrides,
  };
}

describe("buildGraphData", () => {
  it("returns empty graph for empty input", () => {
    const result = buildGraphData([], [], []);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("creates a controller node at the top", () => {
    const controller = makeCompany({
      id: "controller",
      name: "이재용",
      isController: true,
    });

    const { nodes } = buildGraphData([controller], [], []);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("controller");
    expect(nodes[0].position.y).toBe(0);
    expect(nodes[0].type).toBe("company");
    expect(nodes[0].data.company.isController).toBe(true);
  });

  it("lays out tree hierarchy: controller → parent → child", () => {
    const companies: Company[] = [
      makeCompany({ id: "ctrl", name: "총수", isController: true }),
      makeCompany({ id: "holding", name: "지주사", isHolding: true }),
      makeCompany({ id: "listed", name: "상장A", isListed: true }),
      makeCompany({ id: "unlisted", name: "비상장A" }),
    ];
    const ctrlHoldings: ControllerHolding[] = [
      { groupId: "test-group", companyId: "holding", ownershipPct: 30 },
    ];
    const relations: OwnershipRelation[] = [
      makeRelation({ id: "r1", fromCompanyId: "holding", toCompanyId: "listed", ownershipPct: 51 }),
      makeRelation({ id: "r2", fromCompanyId: "listed", toCompanyId: "unlisted", ownershipPct: 100 }),
    ];

    const { nodes } = buildGraphData(companies, relations, ctrlHoldings);
    expect(nodes).toHaveLength(4);

    const yPositions = new Map(nodes.map((n) => [n.id, n.position.y]));
    // Controller at top (y=0)
    expect(yPositions.get("ctrl")).toBe(0);
    // Holding below controller
    expect(yPositions.get("holding")!).toBeGreaterThan(yPositions.get("ctrl")!);
    // Listed below holding
    expect(yPositions.get("listed")!).toBeGreaterThan(yPositions.get("holding")!);
    // Unlisted below listed
    expect(yPositions.get("unlisted")!).toBeGreaterThan(yPositions.get("listed")!);
  });

  it("creates edges for relations", () => {
    const companies: Company[] = [
      makeCompany({ id: "a", name: "회사A" }),
      makeCompany({ id: "b", name: "회사B" }),
    ];
    const relations: OwnershipRelation[] = [
      makeRelation({ id: "r1", fromCompanyId: "a", toCompanyId: "b", ownershipPct: 51 }),
    ];

    const { edges } = buildGraphData(companies, relations, []);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe("a");
    expect(edges[0].target).toBe("b");
    expect(edges[0].data?.ownershipPct).toBe(51);
    expect(edges[0].markerEnd).toBeDefined(); // 화살표 마커 존재
  });

  it("all edges have arrow markers", () => {
    const companies: Company[] = [
      makeCompany({ id: "a", name: "회사A" }),
      makeCompany({ id: "b", name: "회사B" }),
    ];
    const relations: OwnershipRelation[] = [
      makeRelation({ id: "r1", fromCompanyId: "a", toCompanyId: "b", ownershipPct: 30 }),
    ];

    const { edges } = buildGraphData(companies, relations, []);
    expect(edges[0].markerEnd).toBeDefined();
  });

  it("creates controller holding edges", () => {
    const companies: Company[] = [
      makeCompany({ id: "ctrl", name: "총수", isController: true }),
      makeCompany({ id: "a", name: "회사A", isListed: true }),
    ];
    const ctrlHoldings: ControllerHolding[] = [
      { groupId: "test-group", companyId: "a", ownershipPct: 5.4 },
    ];

    const { edges } = buildGraphData(companies, [], ctrlHoldings);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe("ctrl");
    expect(edges[0].target).toBe("a");
    expect(edges[0].data?.isControllerEdge).toBe(true);
  });

  it("ignores relations with unknown company IDs", () => {
    const companies: Company[] = [makeCompany({ id: "a" })];
    const relations: OwnershipRelation[] = [
      makeRelation({ fromCompanyId: "a", toCompanyId: "nonexistent" }),
    ];

    const { edges } = buildGraphData(companies, relations, []);
    expect(edges).toHaveLength(0);
  });

  it("handles large group with adaptive scaling", () => {
    const companies: Company[] = [
      makeCompany({ id: "ctrl", name: "총수", isController: true }),
    ];
    for (let i = 0; i < 54; i++) {
      companies.push(
        makeCompany({ id: `c${i}`, name: `회사${i}`, isListed: i < 30 })
      );
    }
    const ctrlHoldings: ControllerHolding[] = [
      { groupId: "test-group", companyId: "c0", ownershipPct: 30 },
    ];

    const { nodes } = buildGraphData(companies, [], ctrlHoldings);
    expect(nodes).toHaveLength(55);
    // Verify all nodes have valid positions
    nodes.forEach((n) => {
      expect(typeof n.position.x).toBe("number");
      expect(typeof n.position.y).toBe("number");
    });
  });

  it("sets all node types to 'company'", () => {
    const companies: Company[] = [
      makeCompany({ id: "a", isController: true }),
      makeCompany({ id: "b", isHolding: true }),
      makeCompany({ id: "c", isListed: true }),
      makeCompany({ id: "d" }),
    ];

    const { nodes } = buildGraphData(companies, [], []);
    nodes.forEach((n) => {
      expect(n.type).toBe("company");
    });
  });

  it("includes company data in node.data", () => {
    const company = makeCompany({
      id: "samsung-e",
      name: "삼성전자",
      isListed: true,
      stockPrice: 194500,
    });

    const { nodes } = buildGraphData([company], [], []);
    expect(nodes[0].data.company).toEqual(company);
    expect(nodes[0].data.label).toBe("삼성전자");
  });

  it("creates virtual controller when none exists but controllerHoldings present", () => {
    const companies: Company[] = [
      makeCompany({ id: "a", name: "회사A" }),
      makeCompany({ id: "b", name: "회사B" }),
    ];
    const ctrlHoldings: ControllerHolding[] = [
      { groupId: "test-group", companyId: "a", ownershipPct: 20 },
    ];

    const { nodes } = buildGraphData(companies, [], ctrlHoldings, "최태원");
    // Should have 3 nodes: virtual controller + 2 companies
    expect(nodes).toHaveLength(3);
    const ctrlNode = nodes.find((n) => n.data.company.isController);
    expect(ctrlNode).toBeDefined();
    expect(ctrlNode!.data.company.name).toBe("최태원");
    expect(ctrlNode!.position.y).toBe(0);
  });

  it("positions children below parent based on strongest ownership", () => {
    const companies: Company[] = [
      makeCompany({ id: "ctrl", isController: true, name: "총수" }),
      makeCompany({ id: "parent", isHolding: true, name: "지주사" }),
      makeCompany({ id: "child1", name: "자회사1" }),
      makeCompany({ id: "child2", name: "자회사2" }),
    ];
    const ctrlHoldings: ControllerHolding[] = [
      { groupId: "test-group", companyId: "parent", ownershipPct: 30 },
    ];
    const relations: OwnershipRelation[] = [
      makeRelation({ id: "r1", fromCompanyId: "parent", toCompanyId: "child1", ownershipPct: 60 }),
      makeRelation({ id: "r2", fromCompanyId: "parent", toCompanyId: "child2", ownershipPct: 40 }),
    ];

    const { nodes } = buildGraphData(companies, relations, ctrlHoldings);
    const yPositions = new Map(nodes.map((n) => [n.id, n.position.y]));

    // child1 and child2 should be at the same level (both children of parent)
    expect(yPositions.get("child1")).toBe(yPositions.get("child2"));
    // Both below parent
    expect(yPositions.get("child1")!).toBeGreaterThan(yPositions.get("parent")!);
  });
});
