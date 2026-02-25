import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// 자재 추가 (PostgreSQL 함수 호출 → 트랜잭션으로 재고 자동 차감)
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
    const { rows: [result] } = await pool.query(
      "SELECT add_material_to_task($1, $2, $3, $4, $5) as data",
      [taskId, productId, quantity, locationId || null, detailLocation || null]
    );
    return NextResponse.json(result.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// 자재 삭제 (PostgreSQL 함수 호출 → 트랜잭션으로 재고 자동 복원)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }

  try {
    const { rows: [result] } = await pool.query(
      "SELECT remove_material_from_task($1) as data",
      [id]
    );
    return NextResponse.json(result.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
