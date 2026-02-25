import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

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
    const { rows: existing } = await pool.query(
      "SELECT sort_order FROM daily_tasks WHERE report_id = $1 AND day_of_week = $2 ORDER BY sort_order DESC LIMIT 1",
      [reportId, dayOfWeek]
    );
    const nextOrder = existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { rows: [data] } = await pool.query(
      "INSERT INTO daily_tasks (report_id, day_of_week, sort_order, description) VALUES ($1, $2, $3, $4) RETURNING *",
      [reportId, dayOfWeek, nextOrder, ""]
    );
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
    const { rows: [data] } = await pool.query(
      "UPDATE daily_tasks SET description = $1, note = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
      [description, note || null, id]
    );
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 작업 삭제
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }

  try {
    await pool.query("DELETE FROM daily_tasks WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
