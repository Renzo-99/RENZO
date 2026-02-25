import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// 입출고 내역 조회
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || "50");
  const offset = Number(searchParams.get("offset") || "0");

  try {
    const { rows } = await pool.query(
      `SELECT il.*, p.name as product_name, p.code as product_code, p.unit as product_unit
       FROM inventory_logs il
       JOIN products p ON il.product_id = p.id
       ORDER BY il.logged_date DESC, il.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const { rows: [{ count }] } = await pool.query("SELECT COUNT(*) FROM inventory_logs");

    return NextResponse.json({ logs: rows, total: Number(count) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 입출고 내역 삭제 (재고 자동 연동)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id 파라미터 필수" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 삭제 대상 로그 조회
    const { rows: [log] } = await client.query(
      "SELECT * FROM inventory_logs WHERE id = $1",
      [id]
    );

    if (!log) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "내역을 찾을 수 없습니다" }, { status: 404 });
    }

    // 재고 복원: 입고 삭제 → 재고 감소, 출고 삭제 → 재고 증가
    if (log.type === "inbound") {
      await client.query(
        "UPDATE products SET current_stock = current_stock - $1, total_in = total_in - $1, updated_at = NOW() WHERE id = $2",
        [log.quantity, log.product_id]
      );
    } else {
      await client.query(
        "UPDATE products SET current_stock = current_stock + $1, total_out = total_out - $1, updated_at = NOW() WHERE id = $2",
        [log.quantity, log.product_id]
      );
    }

    // 출고 로그에 연결된 task_material이 있으면 함께 삭제
    if (log.task_material_id) {
      await client.query(
        "DELETE FROM task_materials WHERE id = $1",
        [log.task_material_id]
      );
    }

    await client.query("DELETE FROM inventory_logs WHERE id = $1", [id]);

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
