import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 작업 추가
export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다" }, { status: 400 });
  }
  const { reportId, dayOfWeek } = body;

  if (!reportId || dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 4) {
    return NextResponse.json({ error: "reportId와 dayOfWeek(0-4) 필수" }, { status: 400 });
  }

  try {
    // 현재 최대 sort_order 조회
    const { data: existing } = await supabase
      .from("daily_tasks")
      .select("sort_order")
      .eq("report_id", reportId)
      .eq("day_of_week", dayOfWeek)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data, error } = await supabase
      .from("daily_tasks")
      .insert({
        report_id: reportId,
        day_of_week: dayOfWeek,
        sort_order: nextOrder,
        description: "",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 작업 수정
export async function PUT(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다" }, { status: 400 });
  }
  const { id, description, note } = body;

  if (!id) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("daily_tasks")
      .update({
        description,
        note: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 작업 삭제 (RPC로 자재 재고 복원 후 삭제)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc("delete_task_with_materials", {
      p_task_id: id,
    });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
