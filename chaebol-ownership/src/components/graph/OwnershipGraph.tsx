"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import CompanyNode from "./CompanyNode";
import OwnershipEdge from "./OwnershipEdge";
import { getLayoutedElements } from "@/lib/layout";
import type { Company, OwnershipLink } from "@/types/database";

const nodeTypes = { company: CompanyNode };
const edgeTypes = { ownership: OwnershipEdge };

const NODE_COLORS: Record<string, string> = {
  holding: "#3182F6",
  subsidiary: "#00B386",
  individual: "#8B5CF6",
};

// 소스 그룹별 선 색상 팔레트
const EDGE_PALETTE = [
  "#3182F6", // 토스 블루
  "#00B386", // 그린
  "#8B5CF6", // 퍼플
  "#F04452", // 레드
  "#FF9800", // 오렌지
  "#E91E63", // 핑크
  "#00BCD4", // 시안
  "#6D4C41", // 브라운
  "#546E7A", // 블루그레이
  "#7CB342", // 라이트그린
];

interface Props {
  companies: Company[];
  links: OwnershipLink[];
  onNodeClick?: (company: Company) => void;
}

function buildNodes(companies: Company[]): Node[] {
  return companies.map((c) => ({
    id: c.id,
    type: "company",
    position: { x: 0, y: 0 },
    data: {
      companyName: c.name,
      ticker: c.ticker ?? "",
      stockCode: c.stock_code,
      entityType: c.entity_type,
      isListed: c.is_listed,
      stockPrice: c.stock_price,
      priceChangePercent: c.price_change_percent,
      marketCap: c.market_cap_billion,
    },
  }));
}

function buildEdges(links: OwnershipLink[]): Edge[] {
  // 소스별 색상 매핑
  const uniqueSources = [...new Set(links.map((l) => l.source_company_id))];
  const sourceColorMap = new Map<string, string>();
  uniqueSources.forEach((src, i) => {
    sourceColorMap.set(src, EDGE_PALETTE[i % EDGE_PALETTE.length]);
  });

  return links.map((l) => ({
    id: l.id,
    source: l.source_company_id,
    target: l.target_company_id,
    type: "ownership",
    data: {
      ownershipPercent: l.ownership_percent,
      ownershipType: l.ownership_type,
      groupColor: sourceColorMap.get(l.source_company_id) ?? "#B0B8C1",
    },
  }));
}

export default function OwnershipGraph({ companies, links, onNodeClick }: Props) {
  const [direction, setDirection] = useState<"TB" | "LR">("TB");

  const initialLayout = useMemo(() => {
    const nodes = buildNodes(companies);
    const edges = buildEdges(links);
    return getLayoutedElements(nodes, edges);
  }, [companies, links]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges);

  // companies 변경 시 (주가 데이터 enrichment 등) 노드 data 업데이트 (위치 유지)
  useEffect(() => {
    setNodes((prev) => {
      const dataMap = new Map(
        buildNodes(companies).map((n) => [n.id, n.data])
      );
      return prev.map((node) => {
        const newData = dataMap.get(node.id);
        return newData ? { ...node, data: newData } : node;
      });
    });
  }, [companies, setNodes]);

  const onLayout = useCallback(
    (dir: "TB" | "LR") => {
      setDirection(dir);
      const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, dir);
      setNodes([...ln]);
      setEdges([...le]);
    },
    [nodes, edges, setNodes, setEdges]
  );

  const entityTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of companies) map.set(c.id, c.entity_type);
    return map;
  }, [companies]);

  const companyMap = useMemo(() => {
    const map = new Map<string, Company>();
    for (const c of companies) map.set(c.id, c);
    return map;
  }, [companies]);

  // 범례용: 소스별 색상 + 회사명
  const edgeLegend = useMemo(() => {
    const uniqueSources = [...new Set(links.map((l) => l.source_company_id))];
    return uniqueSources.map((src, i) => {
      const company = companyMap.get(src);
      return {
        name: company?.name ?? "알 수 없음",
        color: EDGE_PALETTE[i % EDGE_PALETTE.length],
      };
    });
  }, [links, companyMap]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const company = companyMap.get(node.id);
      if (company && onNodeClick) onNodeClick(company);
    },
    [companyMap, onNodeClick]
  );

  return (
    <div className="w-full h-full relative">
      {/* 상단 컨트롤 */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        {/* 노드 범례 */}
        <div className="hidden sm:flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-[10px] px-3 py-1.5 shadow-[var(--shadow-toss)] text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "#3182F6" }} />
            지주
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "#00B386" }} />
            계열사
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "#8B5CF6" }} />
            총수
          </span>
          <span className="w-px h-3 bg-gray-200" />
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-white border border-gray-200" />
            상장
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-gray-50 border border-dashed border-gray-300" />
            비상장
          </span>
        </div>

        {/* 레이아웃 토글 */}
        <div className="flex bg-white rounded-[10px] shadow-[var(--shadow-toss)] p-1 gap-0.5">
          <button
            onClick={() => onLayout("TB")}
            className={`px-3 py-1 rounded-[8px] text-[12px] font-medium transition-colors ${
              direction === "TB"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            세로
          </button>
          <button
            onClick={() => onLayout("LR")}
            className={`px-3 py-1 rounded-[8px] text-[12px] font-medium transition-colors ${
              direction === "LR"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            가로
          </button>
        </div>
      </div>

      {/* 선 색상 범례 (좌측 하단) */}
      {edgeLegend.length > 1 && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-[10px] px-3 py-2 shadow-[var(--shadow-toss)] text-[11px] text-gray-600 flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">소유 출처</span>
          {edgeLegend.map((item) => (
            <span key={item.name} className="flex items-center gap-1.5">
              <span
                className="w-4 h-[3px] rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
          ))}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
        panOnDrag
        minZoom={0.1}
        maxZoom={3}
      >
        <Background gap={20} color="#E5E8EB" size={1} />
        <Controls className="!rounded-[10px] !shadow-[var(--shadow-toss)] !border-gray-200" />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const et = entityTypeMap.get(node.id) ?? "subsidiary";
            return NODE_COLORS[et] ?? "#8B95A1";
          }}
          className="!bg-white !rounded-[10px] !shadow-[var(--shadow-toss)]"
        />
      </ReactFlow>
    </div>
  );
}
