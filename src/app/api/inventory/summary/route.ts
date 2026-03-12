import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 주간 재고 변동 요약
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from, to 파라미터 필요" }, { status: 400 });
  }

  try {
    const { data: rows, error } = await supabase
      .from("inventory_logs")
      .select("product_id, type, quantity")
      .gte("logged_date", from)
      .lte("logged_date", to);

    if (error) throw error;

    const changes: Record<number, { inbound: number; outbound: number }> = {};
    for (const log of rows || []) {
      if (!changes[log.product_id]) {
        changes[log.product_id] = { inbound: 0, outbound: 0 };
      }
      if (log.type === "inbound") {
        changes[log.product_id].inbound += log.quantity;
      } else {
        changes[log.product_id].outbound += log.quantity;
      }
    }

    const result: Record<number, number> = {};
    for (const [pid, val] of Object.entries(changes)) {
      result[Number(pid)] = val.inbound - val.outbound;
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
