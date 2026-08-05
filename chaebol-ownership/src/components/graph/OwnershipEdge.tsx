"use client";

import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
  type EdgeProps,
} from "@xyflow/react";

export default function OwnershipEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const percent = (data?.ownershipPercent as number) ?? 0;
  const isIndirect = data?.ownershipType === "indirect";
  const groupColor = (data?.groupColor as string) ?? "#B0B8C1";

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 0,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: groupColor,
          strokeWidth: 2,
          strokeDasharray: isIndirect ? "5,5" : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-none absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm border"
            style={{
              backgroundColor: groupColor,
              borderColor: groupColor,
              color: "#fff",
            }}
          >
            {percent.toFixed(1)}%
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
