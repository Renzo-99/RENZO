import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 입출고 내역 조회
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || "50");
  const offset = Number(searchParams.get("offset") || "0");

  try {
    const { data: rows, error } = await supabase
      .from("inventory_logs")
      .select("*, product:products(name, code, unit)", { count: "exact" })
      .order("logged_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // 기존 API 형태 유지 (플랫 필드)
    const logs = (rows || []).map((row) => {
      const { product, ...rest } = row;
      return {
        ...rest,
        product_name: product?.name,
        product_code: product?.code,
        product_unit: product?.unit,
      };
    });

    // 전체 건수 조회
    const { count, error: countErr } = await supabase
      .from("inventory_logs")
      .select("*", { count: "exact", head: true });

    if (countErr) throw countErr;

    return NextResponse.json({ logs, total: count || 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 입출고 내역 삭제 (RPC 트랜잭션으로 재고 복원)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id 파라미터 필수" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc("delete_inventory_log", {
      p_log_id: Number(id),
    });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
