import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: rows, error } = await supabase
      .from("products")
      .select("code, name, category, unit, current_stock, total_in, total_out, min_stock, note")
      .eq("is_active", true)
      .order("code");

    if (error) throw error;

    // BOM + CSV 헤더
    const BOM = "\uFEFF";
    const headers = ["품목코드", "품목명", "분류", "단위", "현재재고", "총입고", "총출고", "안전재고", "비고"];

    const csvRows = (rows || []).map((r) =>
      [
        r.code,
        `"${(r.name || "").replace(/"/g, '""')}"`,
        r.category,
        r.unit,
        r.current_stock,
        r.total_in,
        r.total_out,
        r.min_stock,
        `"${(r.note || "").replace(/"/g, '""')}"`,
      ].join(",")
    );

    const csv = BOM + [headers.join(","), ...csvRows].join("\r\n");

    const today = new Date().toISOString().split("T")[0];
    const filename = encodeURIComponent(`재고현황_${today}.csv`);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
