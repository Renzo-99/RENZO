import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category");
  const filter = searchParams.get("filter");

  try {
    let sql = "SELECT * FROM products WHERE is_active = true";
    const params: (string | number)[] = [];
    let idx = 1;

    if (search) {
      sql += ` AND (name ILIKE $${idx} OR code ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    if (category) {
      sql += ` AND category = $${idx}`;
      params.push(category);
      idx++;
    }

    if (filter === "zero") {
      sql += " AND current_stock = 0";
    } else if (filter === "low") {
      sql += " AND current_stock > 0 AND current_stock <= 5";
    }

    sql += " ORDER BY code";

    const { rows } = await pool.query(sql, params);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
