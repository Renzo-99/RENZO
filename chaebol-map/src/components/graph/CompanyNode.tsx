"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CompanyNodeData } from "@/lib/graph-layout";

export const CompanyNode = memo(function CompanyNode({
  data,
}: NodeProps) {
  const nodeData = data as CompanyNodeData & { dimmed?: boolean };
  const { company } = nodeData;
  const dimmed = nodeData.dimmed ?? false;

  const dimStyle = dimmed
    ? { opacity: 0.15, transition: "opacity 0.2s" }
    : { transition: "opacity 0.2s" };

  // 동일인(총수) 노드 — 둥근 타원 스타일
  if (company.isController) {
    return (
      <div className="ftc-ctrl" style={dimStyle}>
        <Handle id="top" type="target" position={Position.Top} className="ftc-h" />
        <Handle id="left" type="target" position={Position.Left} className="ftc-h" />
        <div className="ftc-ctrl-sub">동일인</div>
        <div className="ftc-ctrl-name">({company.name})</div>
        <Handle id="bottom" type="source" position={Position.Bottom} className="ftc-h" />
        <Handle id="right" type="source" position={Position.Right} className="ftc-h" />
      </div>
    );
  }

  // 일반 회사 노드
  const cls = company.isHolding ? "ftc-box ftc-shaded" : "ftc-box";

  return (
    <div className={cls} style={dimStyle}>
      <Handle id="top" type="target" position={Position.Top} className="ftc-h" />
      <Handle id="left" type="target" position={Position.Left} className="ftc-h" />
      <span className="ftc-txt">
        {company.isListed && "★ "}
        {company.name}
      </span>
      <Handle id="bottom" type="source" position={Position.Bottom} className="ftc-h" />
      <Handle id="right" type="source" position={Position.Right} className="ftc-h" />
    </div>
  );
});
