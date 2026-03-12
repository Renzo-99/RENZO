import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .order("name");

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

  const { name, dong, building_code, phone } = body;
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "건물명(name) 필수" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("locations")
      .insert({
        name: name.trim(),
        dong: dong || null,
        building_code: building_code || null,
        phone: phone || null,
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
    const { data, error } = await supabase
      .from("locations")
      .update({
        name,
        dong: dong || null,
        building_code: building_code || null,
        phone: phone || null,
      })
      .eq("id", id)
      .eq("is_active", true)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
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
    const { data, error } = await supabase
      .from("locations")
      .update({ is_active: false })
      .eq("id", Number(id))
      .eq("is_active", true)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "건물을 찾을 수 없습니다" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
