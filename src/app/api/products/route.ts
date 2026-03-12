import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category");
  const filter = searchParams.get("filter");

  try {
    let query = supabase
      .from("products")
      .select("*")
      .eq("is_active", true);

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (filter === "zero") {
      query = query.eq("current_stock", 0);
    } else if (filter === "low") {
      query = query.gt("current_stock", 0).lte("current_stock", 5);
    }

    query = query.order("code");

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
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
    const { data, error } = await supabase
      .from("products")
      .insert({
        code: code.trim(),
        name: name.trim(),
        category: category || "A",
        unit: unit || "개",
        min_stock: min_stock ?? 5,
      })
      .select()
      .single();

    if (error) {
      const isDuplicate = error.code === "23505";
      return NextResponse.json(
        { error: isDuplicate ? "이미 존재하는 품목코드입니다" : error.message },
        { status: isDuplicate ? 409 : 500 }
      );
    }
    return NextResponse.json(data);
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

  const { id, name, category, unit, min_stock } = body;
  if (!id) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .update({
        name,
        category,
        unit,
        min_stock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("is_active", true)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
