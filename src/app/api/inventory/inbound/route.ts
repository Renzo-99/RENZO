import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// 입고 처리
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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: [product] } = await client.query(
      "SELECT current_stock, total_in FROM products WHERE id = $1",
      [productId]
    );

    if (!product) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }

    await client.query(
      "UPDATE products SET current_stock = current_stock + $1, total_in = total_in + $1, updated_at = NOW() WHERE id = $2",
      [quantity, productId]
    );

    await client.query(
      "INSERT INTO inventory_logs (product_id, type, quantity, unit_price, total_price, memo, logged_date) VALUES ($1, 'inbound', $2, $3, $4, $5, CURRENT_DATE)",
      [productId, quantity, unitPrice || 0, (unitPrice || 0) * quantity, memo || null]
    );

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
