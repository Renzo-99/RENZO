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

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다" }, { status: 400 });
  }

  const { code, name, category, unit, min_stock } = body;
  if (!code?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "code, name 필수" }, { status: 400 });
  }

  try {
    const { rows: [data] } = await pool.query(
      "INSERT INTO products (code, name, category, unit, min_stock) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [code.trim(), name.trim(), category || "A", unit || "개", min_stock ?? 5]
    );
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    const isDuplicate = message.includes("unique") || message.includes("duplicate");
    return NextResponse.json(
      { error: isDuplicate ? "이미 존재하는 품목코드입니다" : message },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다" }, { status: 400 });
  }

  const { id, name, category, unit, min_stock } = body;
  if (!id) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }

  try {
    const { rowCount } = await pool.query(
      "UPDATE products SET name = $1, category = $2, unit = $3, min_stock = $4, updated_at = NOW() WHERE id = $5 AND is_active = true",
      [name, category, unit, min_stock, id]
    );
    if (rowCount === 0) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
