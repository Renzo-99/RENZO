"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GroupData, Company } from "@/types";
import { buildGraphData, type CompanyNodeData } from "@/lib/graph-layout";
import { CompanyNode } from "./CompanyNode";
import { OwnershipEdge } from "./OwnershipEdge";
import { CompanyDetailPanel } from "./CompanyDetailPanel";

const nodeTypes = { company: CompanyNode };
const edgeTypes = { ownership: OwnershipEdge };

type NodeFilter = "all" | "listed" | "holding" | "unlisted";

interface OwnershipGraphProps {
  data: GroupData;
}

export function OwnershipGraph({ data }: OwnershipGraphProps) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [minPct, setMinPct] = useState(0);
  const [nodeFilter, setNodeFilter] = useState<NodeFilter>("all");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildGraphData(
      data.companies,
      data.relations,
      data.controllerHoldings,
      data.group.controllerName
    );
    return { initialNodes: nodes, initialEdges: edges };
  }, [data]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // 동일인 주식보유현황 데이터
  const controllerHoldingsList = useMemo(() => {
    const companyMap = new Map(data.companies.map((c) => [c.id, c]));
    return data.controllerHoldings
      .filter((h) => h.ownershipPct > 0)
      .map((h) => ({
        name: companyMap.get(h.companyId)?.name ?? h.companyId,
        pct: h.ownershipPct,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [data]);

  // 호버 연결 노드/엣지
  const hoverConnected = useMemo(() => {
    if (!hoveredNodeId) return null;
    const connectedNodeIds = new Set<string>([hoveredNodeId]);
    const connectedEdgeIds = new Set<string>();
    edges.forEach((e) => {
      if (e.source === hoveredNodeId || e.target === hoveredNodeId) {
        connectedEdgeIds.add(e.id);
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
      }
    });
    return { nodeIds: connectedNodeIds, edgeIds: connectedEdgeIds };
  }, [hoveredNodeId, edges]);

  // 지분율 필터
  const pctFilteredEdges = useMemo(() => {
    if (minPct === 0) return edges;
    return edges.filter((e) => {
      const pct = (e.data?.ownershipPct as number) ?? 0;
      return pct >= minPct;
    });
  }, [edges, minPct]);

  // 노드 필터링
  const filteredNodes = useMemo(() => {
    let result = nodes;

    if (minPct > 0) {
      const pctNodeIds = new Set<string>();
      pctFilteredEdges.forEach((e) => {
        pctNodeIds.add(e.source);
        pctNodeIds.add(e.target);
      });
      result = result.filter((n) => pctNodeIds.has(n.id));
    }

    if (nodeFilter !== "all") {
      result = result.filter((n) => {
        const company = (n.data as CompanyNodeData).company;
        if (company.isController) return true;
        switch (nodeFilter) {
          case "listed":
            return company.isListed;
          case "holding":
            return company.isHolding;
          case "unlisted":
            return !company.isListed && !company.isHolding;
          default:
            return true;
        }
      });
    }

    if (hoverConnected) {
      result = result.map((n) => ({
        ...n,
        data: { ...n.data, dimmed: !hoverConnected.nodeIds.has(n.id) },
      }));
    }

    return result;
  }, [nodes, minPct, pctFilteredEdges, nodeFilter, hoverConnected]);

  // 엣지 필터링
  const finalEdges = useMemo(() => {
    const nodeIdSet = new Set(filteredNodes.map((n) => n.id));
    let result = pctFilteredEdges.filter(
      (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
    );

    if (hoverConnected) {
      result = result.map((e) => ({
        ...e,
        data: {
          ...e.data,
          dimmed: !hoverConnected.edgeIds.has(e.id),
        },
      }));
    }

    return result;
  }, [pctFilteredEdges, filteredNodes, hoverConnected]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<CompanyNodeData>) => {
      setSelectedCompany(node.data.company);
    },
    []
  );

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedCompany(null);
  }, []);

  const filterButtons: { key: NodeFilter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "listed", label: "상장사" },
    { key: "holding", label: "지주사" },
    { key: "unlisted", label: "비상장" },
  ];

  return (
    <div className="relative h-full w-full" style={{ background: "#fff" }}>
      {/* 필터 바 */}
      <div className="ftc-toolbar">
        <div className="ftc-toolbar-group">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setNodeFilter(btn.key)}
              className={`ftc-toolbar-btn ${nodeFilter === btn.key ? "ftc-toolbar-btn-active" : ""}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <span className="ftc-toolbar-sep" />
        <span className="ftc-toolbar-label">지분율</span>
        <input
          type="range"
          min={0}
          max={50}
          value={minPct}
          onChange={(e) => setMinPct(Number(e.target.value))}
          className="ftc-toolbar-slider"
        />
        <span className="ftc-toolbar-value">{minPct}%+</span>
      </div>

      {/* FTC 범례 (우측 상단) */}
      <div className="ftc-legend">
        <div className="ftc-legend-title">범례</div>
        <span className="ftc-legend-item">
          <span className="ftc-legend-oval" />동일인
        </span>
        <span className="ftc-legend-item">
          <span className="ftc-legend-star">★</span>상장사
        </span>
        <span className="ftc-legend-item">
          <span className="ftc-legend-shade" />지주사(음영)
        </span>
        <div className="ftc-legend-sep" />
        <span className="ftc-legend-item">
          <span className="ftc-legend-line ftc-legend-line-ctrl" />동일인 지분
        </span>
        <span className="ftc-legend-item">
          <span className="ftc-legend-line ftc-legend-line-tree" />회사간 지분
        </span>
        <span className="ftc-legend-item">
          <span className="ftc-legend-line ftc-legend-line-cross" />교차출자
        </span>
      </div>

      {/* 동일인 주식보유현황 (FTC 원본 우측 상단 정보) */}
      {controllerHoldingsList.length > 0 && (
        <div className="ftc-ctrl-holdings">
          <div className="ftc-ctrl-holdings-title">
            동일인 {data.group.controllerName} 주식보유현황
          </div>
          <table className="ftc-ctrl-holdings-table">
            <tbody>
              {controllerHoldingsList.map((h, i) => (
                <tr key={i}>
                  <td className="ftc-ctrl-holdings-name">{h.name}</td>
                  <td className="ftc-ctrl-holdings-pct">
                    {h.pct === 100 ? "100" : h.pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReactFlow
        nodes={filteredNodes}
        edges={finalEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.02}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "ownership" }}
      >
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            const company = (node.data as CompanyNodeData)?.company;
            if (!company) return "#bbb";
            if (company.isController) return "#D97706";
            if (company.isHolding) return "#999";
            return "#333";
          }}
          maskColor="rgba(0, 0, 0, 0.08)"
          style={{ background: "#f9f9f9", border: "1px solid #ddd" }}
        />
      </ReactFlow>

      {selectedCompany && (
        <CompanyDetailPanel
          company={selectedCompany}
          relations={data.relations}
          companies={data.companies}
          controllerHoldings={data.controllerHoldings}
          controllerName={data.group.controllerName}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </div>
  );
}
