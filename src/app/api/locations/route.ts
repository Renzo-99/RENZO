import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM locations WHERE is_active = true ORDER BY name"
    );
    return NextResponse.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다" }, { status: 400 });
  }

  const { id, name, dong, building_code, phone } = body;
  if (!id || !name) {
    return NextResponse.json({ error: "id, name 필수" }, { status: 400 });
  }

  try {
    const { rowCount } = await pool.query(
      "UPDATE locations SET name = $1, dong = $2, building_code = $3, phone = $4 WHERE id = $5 AND is_active = true",
      [name, dong || null, building_code || null, phone || null, id]
    );
    if (rowCount === 0) {
      return NextResponse.json({ error: "건물을 찾을 수 없습니다" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id 파라미터 필수" }, { status: 400 });
  }

  try {
    const { rowCount } = await pool.query(
      "UPDATE locations SET is_active = false WHERE id = $1 AND is_active = true",
      [id]
    );
    if (rowCount === 0) {
      return NextResponse.json({ error: "건물을 찾을 수 없습니다" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
