import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 자재 추가 (RPC 호출 → 트랜잭션으로 재고 자동 차감)
export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다" }, { status: 400 });
  }
  const { taskId, productId, quantity, locationId, detailLocation } = body;

  if (!taskId || !productId || !quantity || quantity < 1) {
    return NextResponse.json({ error: "taskId, productId, quantity(1이상) 필수" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc("add_material_to_task", {
      p_task_id: taskId,
      p_product_id: productId,
      p_quantity: quantity,
      p_location_id: locationId || null,
      p_detail_location: detailLocation || null,
    });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// 자재 삭제 (RPC 호출 → 트랜잭션으로 재고 자동 복원)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc("remove_material_from_task", {
      p_task_material_id: id,
    });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
