import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 입고 처리 (RPC 트랜잭션)
export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다" }, { status: 400 });
  }
  const { productId, quantity, unitPrice, memo } = body;

  if (!productId || !quantity || quantity < 1) {
    return NextResponse.json({ error: "productId, quantity(1이상) 필수" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc("process_inbound", {
      p_product_id: productId,
      p_quantity: quantity,
      p_unit_price: unitPrice || 0,
      p_memo: memo || null,
    });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
